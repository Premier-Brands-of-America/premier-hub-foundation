// ============================================================================
// graph-webhook  —  verify_jwt = false  (called by Microsoft Graph, no JWT)
// ----------------------------------------------------------------------------
// Receives Graph change notifications for getAllTranscripts. Two duties:
//   1. Subscription validation handshake: echo ?validationToken back as
//      text/plain (Graph does this on subscription create).
//   2. Notifications: validate clientState against GRAPH_WEBHOOK_CLIENT_STATE,
//      map subscriptionId -> our user_id, extract meeting+transcript ids, then
//      hand off to transcribe-summarize (which fetches the .vtt and writes).
// Responds 202 immediately; the fetch/summarize runs in the background.
//
// Secrets used: SUPABASE_URL, SUPABASE_SECRET_KEY, GRAPH_WEBHOOK_CLIENT_STATE.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

interface GraphNotification {
  subscriptionId?: string;
  clientState?: string;
  resource?: string;
  resourceData?: { id?: string; meetingId?: string; meetingOrganizerId?: string };
}

/** Pull meetingId + transcriptId from a notification's resourceData/resource. */
function extractIds(n: GraphNotification): { meetingId?: string; transcriptId?: string } {
  let meetingId = n.resourceData?.meetingId;
  let transcriptId = n.resourceData?.id;
  if ((!meetingId || !transcriptId) && n.resource) {
    const mm = n.resource.match(/onlineMeetings\('([^']+)'\)/i);
    const tt = n.resource.match(/transcripts\('([^']+)'\)/i);
    if (mm) meetingId = meetingId || mm[1];
    if (tt) transcriptId = transcriptId || tt[1];
  }
  return { meetingId, transcriptId };
}

serve(async (req) => {
  // 1) Validation handshake (token arrives as a query param).
  const url = new URL(req.url);
  const validationToken = url.searchParams.get("validationToken");
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SECRET = Deno.env.get("SUPABASE_SECRET_KEY")!;
    const expectedClientState = Deno.env.get("GRAPH_WEBHOOK_CLIENT_STATE");

    const payload = await req.json().catch(() => ({}));
    const notifications: GraphNotification[] = Array.isArray(payload?.value)
      ? payload.value
      : [];

    const admin = createClient(SUPABASE_URL, SECRET);

    const process = async () => {
      for (const n of notifications) {
        // Validate the shared secret — reject spoofed notifications.
        if (!expectedClientState || n.clientState !== expectedClientState) {
          console.warn("[graph-webhook] clientState mismatch; skipping");
          continue;
        }
        const { meetingId, transcriptId } = extractIds(n);
        if (!meetingId) continue;

        // Map the subscription back to our user.
        let userId: string | undefined;
        if (n.subscriptionId) {
          const { data: sub } = await admin
            .from("graph_subscriptions")
            .select("user_id")
            .eq("subscription_id", n.subscriptionId)
            .maybeSingle();
          userId = sub?.user_id;
        }
        if (!userId) {
          console.warn("[graph-webhook] no subscription match; skipping");
          continue;
        }

        // Hand off the heavy lifting (fetch .vtt -> segments -> summary).
        const res = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-summarize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SECRET,
            Authorization: `Bearer ${SECRET}`,
          },
          body: JSON.stringify({
            user_id: userId,
            ms_meeting_id: meetingId,
            transcript_id: transcriptId,
          }),
        });
        if (!res.ok) {
          console.error("[graph-webhook] transcribe-summarize failed", res.status, await res.text());
        }
      }
    };

    // Respond 202 fast; do the work in the background where supported.
    // @ts-ignore — EdgeRuntime is provided by the Supabase Edge runtime.
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(process());
    } else {
      await process();
    }
    return new Response(null, { status: 202 });
  } catch (e) {
    console.error("[graph-webhook]", e);
    // Still 202 so Graph doesn't aggressively retry on our internal errors.
    return new Response(null, { status: 202 });
  }
});
