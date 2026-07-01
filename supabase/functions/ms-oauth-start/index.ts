// ============================================================================
// ms-oauth-start — begin the MS Graph delegated-consent flow (INTEG-OUTLOOK)
// ----------------------------------------------------------------------------
// verify_jwt = true   ← consolidate into supabase/config.toml at P4 (lead)
//
// The authenticated user calls this; we build the Entra `authorize` URL
// server-side (so MS_GRAPH_CLIENT_ID / scopes / redirect_uri never live in the
// client bundle) and return it. The client then sets window.location to it.
// We embed an HMAC-signed `state` carrying the user id + the app origin so the
// (unauthenticated, browser-redirected) ms-oauth-callback can authenticate the
// request and bounce the user back to where they started.
//
// Scopes (delegated, per findings §4.5 — INTEG-OUTLOOK owns calendar/mail):
//   Calendars.Read  Mail.Read  offline_access openid profile
//
// Secrets: MS_GRAPH_CLIENT_ID, MS_GRAPH_TENANT_ID, MS_GRAPH_REDIRECT_URI,
//          TOKEN_ENCRYPTION_KEY (state signing). See _shared/ms-graph.ts.
// ============================================================================

import { handleOptions, json, getAuthedUserId, signState } from "../_shared/ms-graph.ts";

const SCOPES = "Calendars.ReadWrite Mail.Read Mail.Send User.Read.All Directory.Read.All offline_access openid profile";

/** Allowlisted app origins for post-OAuth redirects (ALLOWED_APP_ORIGINS, comma-separated). */
function allowedAppOrigin(origin: string): string {
  if (!origin) return "";
  let candidate: string;
  try {
    candidate = new URL(origin).origin;
  } catch {
    return "";
  }
  const allow = (Deno.env.get("ALLOWED_APP_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allow.includes(candidate) ? candidate : "";
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    let origin = "";
    try {
      const body = await req.json();
      origin = typeof body?.origin === "string" ? body.origin : "";
    } catch {
      // body is optional
    }
    // Only ever sign an allowlisted origin into the state (prevents an open redirect
    // at the callback). Unknown origins → "" → callback falls back to a relative path.
    origin = allowedAppOrigin(origin);

    const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID");
    const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID");
    const redirectUri = Deno.env.get("MS_GRAPH_REDIRECT_URI");
    if (!clientId || !tenantId || !redirectUri) {
      return json({ error: "MS Graph app is not configured" }, 500);
    }

    const state = await signState({ uid: userId, origin });

    const authorizeUrl =
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
      new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        response_mode: "query",
        scope: SCOPES,
        state,
        prompt: "consent",
      }).toString();

    return json({ authorizeUrl });
  } catch (e) {
    console.error("[ms-oauth-start]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
