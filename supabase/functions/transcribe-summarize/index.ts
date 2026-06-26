// ============================================================================
// transcribe-summarize  —  verify_jwt = false  (secret-key authorized)
// ----------------------------------------------------------------------------
// The transcript pipeline. Invoked server-to-server by graph-webhook:
//   1. Ensure a meeting_transcripts row exists (status 'pending').
//   2. Enrich from Graph (subject, started_at, joinWebUrl) and link to a
//      project by matching INTEG-OUTLOOK's calendar_events.join_web_url.
//   3. Fetch the .vtt via Graph, parse to speaker-tagged transcript_segments.
//   4. Summarize via the read-only AI assistant (AI_ASSISTANT_API_KEY) and
//      write meeting_transcripts.summary_md. status -> 'summarized' / 'failed'.
//
// The AI assistant is READ-ONLY: it only reads the transcript text and returns
// a markdown summary; it never writes data.
//
// Secrets used: SUPABASE_URL, SUPABASE_SECRET_KEY, AI_ASSISTANT_API_KEY.
// Reads (server-side, BYPASSRLS): ms_connections (via graphFetch), calendar_events.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  fetchTranscriptVtt,
  getOnlineMeeting,
  listTranscripts,
  parseVtt,
  type TranscriptSegment,
} from "../_shared/teams-graph.ts";

const AI_GATEWAY = "https://agentic.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";
const MAX_TRANSCRIPT_CHARS = 24_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function msToClock(ms: number | null): string {
  if (ms == null) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildTranscriptText(segments: TranscriptSegment[]): string {
  const lines: string[] = [];
  let used = 0;
  for (const seg of segments) {
    const line = `[${msToClock(seg.start_ms)}] ${seg.speaker ?? "Unknown"}: ${seg.text}`;
    if (used + line.length > MAX_TRANSCRIPT_CHARS) {
      lines.push("… (transcript truncated for summarization)");
      break;
    }
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join("\n");
}

async function summarize(transcriptText: string, subject: string | null): Promise<string> {
  const apiKey = Deno.env.get("AI_ASSISTANT_API_KEY");
  if (!apiKey) throw new Error("AI_ASSISTANT_API_KEY is not configured");

  const systemPrompt = `You are Premier Project Hub's READ-ONLY meeting assistant.
You receive a Teams meeting transcript and produce a concise Markdown summary.
You cannot create, edit, or delete anything — you only summarize the text given.

Return GitHub-flavored Markdown with exactly these sections, in order:
## Summary
A 2–4 sentence overview.
## Key Points
- Bullet points of the main discussion items and decisions.
## Action Items
A GitHub task list. Each item MUST be on its own line in this exact format:
- [ ] <action> (owner: <name or "unassigned">) (due: <YYYY-MM-DD or "none">)
If there are no action items, write: "- [ ] (none)".`;

  const userPrompt = `Meeting subject: ${subject ?? "(untitled)"}\n\nTranscript:\n${transcriptText}`;

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`AI summarization failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI summarization returned empty content");
  return content as string;
}

serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SECRET = Deno.env.get("SUPABASE_SECRET_KEY")!;

  // Secret-key authorization (server-to-server only).
  const presented =
    req.headers.get("apikey") ||
    (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (presented !== SECRET) return json({ error: "Forbidden" }, 403);

  const admin = createClient(SUPABASE_URL, SECRET);
  let transcriptRowId: string | undefined;

  try {
    const { user_id, ms_meeting_id, transcript_id, page_id, project_id } =
      await req.json();
    if (!user_id || !ms_meeting_id) {
      return json({ error: "user_id and ms_meeting_id are required" }, 400);
    }

    // 1) Ensure a row exists (idempotent on user_id + ms_meeting_id).
    const { data: existing } = await admin
      .from("meeting_transcripts")
      .select("id")
      .eq("user_id", user_id)
      .eq("ms_meeting_id", ms_meeting_id)
      .maybeSingle();

    if (existing?.id) {
      transcriptRowId = existing.id;
    } else {
      const { data: inserted, error: insErr } = await admin
        .from("meeting_transcripts")
        .insert({
          user_id,
          ms_meeting_id,
          page_id: page_id ?? null,
          project_id: project_id ?? null,
          status: "pending",
        })
        .select("id")
        .single();
      if (insErr) throw new Error(`meeting_transcripts insert failed: ${insErr.message}`);
      transcriptRowId = inserted.id;
    }

    // 2) Enrich + link to a project via the calendar event join URL.
    const meeting = await getOnlineMeeting(user_id, ms_meeting_id);
    let resolvedProjectId: string | null = project_id ?? null;
    if (!resolvedProjectId && meeting.joinWebUrl) {
      const { data: ev } = await admin
        .from("calendar_events")
        .select("project_id")
        .eq("join_web_url", meeting.joinWebUrl)
        .not("project_id", "is", null)
        .maybeSingle();
      resolvedProjectId = ev?.project_id ?? null;
    }

    // 3) Fetch the .vtt and parse to segments.
    let chosenTranscriptId = transcript_id as string | undefined;
    if (!chosenTranscriptId) {
      const list = await listTranscripts(user_id, ms_meeting_id);
      chosenTranscriptId = list.at(-1)?.id;
    }
    if (!chosenTranscriptId) throw new Error("No transcript available for meeting");

    const vtt = await fetchTranscriptVtt(user_id, ms_meeting_id, chosenTranscriptId);
    const segments = parseVtt(vtt);

    await admin
      .from("meeting_transcripts")
      .update({
        subject: meeting.subject ?? null,
        started_at: meeting.startDateTime ?? null,
        project_id: resolvedProjectId,
        vtt_url: meeting.joinWebUrl ?? null,
        status: "fetched",
      })
      .eq("id", transcriptRowId);

    // Replace any prior segments (idempotent re-runs).
    await admin.from("transcript_segments").delete().eq("transcript_id", transcriptRowId);
    if (segments.length > 0) {
      const rows = segments.map((s) => ({ transcript_id: transcriptRowId, ...s }));
      const { error: segErr } = await admin.from("transcript_segments").insert(rows);
      if (segErr) throw new Error(`transcript_segments insert failed: ${segErr.message}`);
    }

    // 4) Summarize via the read-only AI assistant.
    const summary_md = await summarize(buildTranscriptText(segments), meeting.subject ?? null);
    await admin
      .from("meeting_transcripts")
      .update({ summary_md, status: "summarized" })
      .eq("id", transcriptRowId);

    return json({
      transcript_id: transcriptRowId,
      segments: segments.length,
      status: "summarized",
    });
  } catch (e) {
    console.error("[transcribe-summarize]", e);
    if (transcriptRowId) {
      await admin
        .from("meeting_transcripts")
        .update({ status: "failed" })
        .eq("id", transcriptRowId);
    }
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
