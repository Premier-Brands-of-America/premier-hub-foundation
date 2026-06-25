// ============================================================================
// graph-renew  —  verify_jwt = false  (cron; secret-key authorized)
// ----------------------------------------------------------------------------
// Renews Microsoft Graph subscriptions before they expire (getAllTranscripts
// subscriptions last ~3 days). Intended to run on a schedule (e.g. every 12h)
// via Supabase scheduled functions / pg_cron. Authorized by presenting
// SUPABASE_SECRET_KEY — NOT a user JWT, so verify_jwt must be false.
//
// Secrets used: SUPABASE_URL, SUPABASE_SECRET_KEY.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { renewSubscription } from "../_shared/teams-graph.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Renew anything expiring within this window.
const RENEW_WITHIN_MS = 24 * 60 * 60 * 1000; // 1 day

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SECRET = Deno.env.get("SUPABASE_SECRET_KEY")!;

    // Authorize the cron caller via the secret key (apikey or Bearer).
    const presented =
      req.headers.get("apikey") ||
      (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (presented !== SECRET) return json({ error: "Forbidden" }, 403);

    const admin = createClient(SUPABASE_URL, SECRET);

    const cutoff = new Date(Date.now() + RENEW_WITHIN_MS).toISOString();
    const { data: subs, error } = await admin
      .from("graph_subscriptions")
      .select("id, user_id, subscription_id")
      .lt("expiration", cutoff);
    if (error) throw new Error(`graph_subscriptions select failed: ${error.message}`);

    const results: Array<{ subscription_id: string; ok: boolean; error?: string }> = [];
    for (const s of subs ?? []) {
      try {
        const renewed = await renewSubscription(s.user_id, s.subscription_id);
        await admin
          .from("graph_subscriptions")
          .update({ expiration: renewed.expirationDateTime })
          .eq("id", s.id);
        results.push({ subscription_id: s.subscription_id, ok: true });
      } catch (e) {
        // Expired/deleted subscriptions cannot be renewed — drop the stale row.
        await admin.from("graph_subscriptions").delete().eq("id", s.id);
        results.push({
          subscription_id: s.subscription_id,
          ok: false,
          error: e instanceof Error ? e.message : "renew failed",
        });
      }
    }

    return json({ renewed: results.filter((r) => r.ok).length, results });
  } catch (e) {
    console.error("[graph-renew]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
