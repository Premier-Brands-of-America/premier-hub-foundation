// ============================================================================
// ms-oauth-callback — exchange the OAuth code → tokens; store encrypted (OUTLOOK)
// ----------------------------------------------------------------------------
// verify_jwt = false  ← consolidate into supabase/config.toml at P4 (lead)
//   Rationale: Entra performs a TOP-LEVEL BROWSER REDIRECT to this URL with the
//   auth code, so there is no Authorization header to verify. The request is
//   instead authenticated by the HMAC-signed `state` minted by ms-oauth-start
//   for the logged-in user. (App.tsx is frozen, so a dedicated SPA callback
//   route was not an option.) MS_GRAPH_REDIRECT_URI must point at THIS function.
//
// Flow: validate state → exchange code (authorization_code) → resolve ms_user_id
// via /me → encrypt refresh token → upsert ms_connections (secret key) → 302
// back to the app origin with ?outlook=connected.
//
// Secrets: MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_TENANT_ID,
//          MS_GRAPH_REDIRECT_URI, TOKEN_ENCRYPTION_KEY, SUPABASE_SECRET_KEY.
// ============================================================================

import {
  corsHeaders,
  GRAPH_BASE,
  getAdminClient,
  msTokenEndpoint,
  verifyState,
  encryptToken,
} from "../_shared/ms-graph.ts";

const SCOPES = ["Calendars.Read", "Mail.Read", "offline_access", "openid", "profile"];

function redirect(to: string): Response {
  return new Response(null, { status: 302, headers: { ...corsHeaders, Location: to } });
}

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

function safeRedirectTarget(origin: string, status: string): string {
  // Only redirect to an allowlisted app origin (prevents open redirect); else relative.
  const allowed = allowedAppOrigin(origin);
  if (allowed) {
    const u = new URL(allowed);
    u.searchParams.set("outlook", status);
    return u.toString();
  }
  return `/?outlook=${status}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // Verify state first so we know where to bounce the user back to.
  const state = stateParam
    ? await verifyState<{ uid: string; origin: string }>(stateParam)
    : null;
  const origin = state?.origin ?? "";

  if (oauthError) {
    console.error("[ms-oauth-callback] consent error:", oauthError);
    return redirect(safeRedirectTarget(origin, "error"));
  }
  if (!state) return redirect(safeRedirectTarget(origin, "error"));
  if (!code) return redirect(safeRedirectTarget(origin, "error"));

  try {
    const clientId = Deno.env.get("MS_GRAPH_CLIENT_ID")!;
    const clientSecret = Deno.env.get("MS_GRAPH_CLIENT_SECRET")!;
    const redirectUri = Deno.env.get("MS_GRAPH_REDIRECT_URI")!;
    const tenantId = Deno.env.get("MS_GRAPH_TENANT_ID")!;

    // 1) Exchange the authorization code for tokens.
    const tokRes = await fetch(msTokenEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        scope: SCOPES.join(" "),
      }),
    });
    if (!tokRes.ok) {
      console.error("[ms-oauth-callback] token exchange:", tokRes.status, await tokRes.text());
      return redirect(safeRedirectTarget(origin, "error"));
    }
    const tok = await tokRes.json();
    if (!tok.refresh_token) {
      console.error("[ms-oauth-callback] no refresh_token returned (offline_access?)");
      return redirect(safeRedirectTarget(origin, "error"));
    }

    // 2) Resolve the Graph user id.
    const meRes = await fetch(`${GRAPH_BASE}/me?$select=id`, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    const me = meRes.ok ? await meRes.json() : {};
    const msUserId: string = me?.id ?? "";

    // 3) Encrypt + persist (server-side, secret key).
    const refreshTokenEnc = await encryptToken(tok.refresh_token);
    const admin = getAdminClient();
    const { error } = await admin.from("ms_connections").upsert(
      {
        user_id: state.uid,
        ms_tenant_id: tenantId,
        ms_user_id: msUserId,
        refresh_token_enc: refreshTokenEnc,
        scopes: SCOPES,
        expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.error("[ms-oauth-callback] upsert:", error.message);
      return redirect(safeRedirectTarget(origin, "error"));
    }

    return redirect(safeRedirectTarget(origin, "connected"));
  } catch (e) {
    console.error("[ms-oauth-callback]", e);
    return redirect(safeRedirectTarget(origin, "error"));
  }
});
