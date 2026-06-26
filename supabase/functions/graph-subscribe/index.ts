// ============================================================================
// graph-subscribe  —  verify_jwt = true
// ----------------------------------------------------------------------------
// User-facing. The signed-in user authorizes a Microsoft Graph change-
// notification subscription for their own meeting transcripts
// (users/{msUserId}/onlineMeetings/getAllTranscripts). The subscription is
// recorded in graph_subscriptions and renewed by the graph-renew cron.
//
// Secrets used: SUPABASE_URL, SUPABASE_ANON_KEY (verify caller),
//   SUPABASE_SECRET_KEY (privileged writes + read ms_connections.ms_user_id),
//   GRAPH_WEBHOOK_CLIENT_STATE, GRAPH_WEBHOOK_URL (optional override).
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createTranscriptSubscription } from "../_shared/teams-graph.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SECRET = Deno.env.get("SUPABASE_SECRET_KEY")!;
    const clientState = Deno.env.get("GRAPH_WEBHOOK_CLIENT_STATE");
    if (!clientState) throw new Error("GRAPH_WEBHOOK_CLIENT_STATE is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // Verify the caller (RLS-scoped client, Entra->Supabase session JWT).
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    // Privileged client for ms_connections lookup + subscription bookkeeping.
    const admin = createClient(SUPABASE_URL, SECRET);

    const { data: conn } = await admin
      .from("ms_connections")
      .select("ms_user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!conn?.ms_user_id) {
      return json({ error: "No Microsoft connection. Connect Outlook first." }, 409);
    }

    const notificationUrl =
      Deno.env.get("GRAPH_WEBHOOK_URL") ||
      `${SUPABASE_URL}/functions/v1/graph-webhook`;

    const sub = await createTranscriptSubscription({
      userId: user.id,
      msUserId: conn.ms_user_id,
      notificationUrl,
      clientState,
    });

    const { error: insErr } = await admin.from("graph_subscriptions").insert({
      user_id: user.id,
      resource: sub.resource,
      subscription_id: sub.id,
      expiration: sub.expirationDateTime,
      client_state: clientState,
    });
    if (insErr) throw new Error(`graph_subscriptions insert failed: ${insErr.message}`);

    return json({
      subscription_id: sub.id,
      resource: sub.resource,
      expiration: sub.expirationDateTime,
    });
  } catch (e) {
    console.error("[graph-subscribe]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
