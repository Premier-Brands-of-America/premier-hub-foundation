// ============================================================================
// transcript-action-items  —  verify_jwt = true
// ----------------------------------------------------------------------------
// User-facing. Converts a meeting's extracted action items into rows in the
// existing `tasks` table, owned by the caller.
//
// Body: { transcript_id: uuid, items?: [{ title, due_date? }] }
//   - If `items` is provided (e.g. the user curated a subset in PAGES), those
//     are used verbatim.
//   - Otherwise the "## Action Items" GitHub task list is parsed out of the
//     transcript's summary_md (the deterministic format transcribe-summarize
//     authored).
//
// Reads run through the caller's RLS-scoped client, so a user can only convert
// action items from a transcript they're allowed to see. Tasks are inserted for
// auth.uid() (RLS: auth.uid() = user_id), so no secret key is needed.
//
// Secrets used: SUPABASE_URL, SUPABASE_ANON_KEY.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ActionItem {
  title: string;
  due_date?: string | null;
}

/** Parse a "## Action Items" GitHub task list out of summary markdown. */
function parseActionItems(summaryMd: string): ActionItem[] {
  const items: ActionItem[] = [];
  const lines = summaryMd.replace(/\r\n/g, "\n").split("\n");
  let inSection = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^#{1,6}\s/.test(line)) {
      inSection = /action items/i.test(line);
      continue;
    }
    if (!inSection) continue;

    const m = line.match(/^- \[[ xX]\]\s+(.*)$/);
    if (!m) continue;
    let body = m[1].trim();
    if (!body || /^\(none\)$/i.test(body)) continue;

    // Pull an optional (due: YYYY-MM-DD) hint, then strip trailing (…) hints.
    let due: string | null = null;
    const dueMatch = body.match(/\(due:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\)/i);
    if (dueMatch) due = dueMatch[1];
    const title = body.replace(/\((?:owner|due):[^)]*\)/gi, "").trim();
    if (title) items.push({ title, due_date: due });
  }
  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { transcript_id, items } = await req.json();
    if (!transcript_id) return json({ error: "transcript_id is required" }, 400);

    // RLS ensures the caller can only read transcripts they're allowed to see.
    const { data: transcript, error: tErr } = await supabase
      .from("meeting_transcripts")
      .select("id, subject, summary_md")
      .eq("id", transcript_id)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!transcript) return json({ error: "Transcript not found or not visible" }, 404);

    const actionItems: ActionItem[] = Array.isArray(items) && items.length > 0
      ? items
          .filter((i: any) => i && typeof i.title === "string" && i.title.trim())
          .map((i: any) => ({ title: i.title.trim(), due_date: i.due_date ?? null }))
      : parseActionItems(transcript.summary_md ?? "");

    if (actionItems.length === 0) return json({ created: 0, tasks: [] });

    const subject = transcript.subject ? `Meeting: ${transcript.subject}` : "Meeting action item";
    const rows = actionItems.map((a) => ({
      user_id: user.id,
      title: a.title,
      description: subject,
      due_date: a.due_date ?? null,
      status: "active",
    }));

    const { data: created, error: insErr } = await supabase
      .from("tasks")
      .insert(rows)
      .select("id, title, due_date");
    if (insErr) throw new Error(`tasks insert failed: ${insErr.message}`);

    return json({ created: created?.length ?? 0, tasks: created ?? [] });
  } catch (e) {
    console.error("[transcript-action-items]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
