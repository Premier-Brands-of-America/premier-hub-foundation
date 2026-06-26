// ============================================================================
// _shared/ms-graph.ts — Shared Microsoft Graph foundation (OWNER: INTEG-OUTLOOK)
// ----------------------------------------------------------------------------
// This module is the single, generic MS-Graph foundation for the whole project.
// INTEG-TEAMS imports it (e.g. for `/me/onlineMeetings/{id}/transcripts`); keep
// everything here service-agnostic — NOTHING calendar- or transcript-specific.
//
// Required Supabase Function secrets (set via `supabase secrets set NAME=…`;
// NEVER as VITE_* — see research/findings.md §4.4 and research/supabase-keys.md):
//   MS_GRAPH_CLIENT_ID      — Entra app (client) id
//   MS_GRAPH_CLIENT_SECRET  — Entra app client secret
//   MS_GRAPH_TENANT_ID      — Entra tenant id
//   MS_GRAPH_REDIRECT_URI   — OAuth redirect (registered in Entra; points at the
//                             ms-oauth-callback function URL)
//   TOKEN_ENCRYPTION_KEY    — AES-256-GCM key material for refresh_token_enc at
//                             rest; also HMAC material for the OAuth `state`.
//   SUPABASE_SECRET_KEY     — sb_secret_… (privileged DB access, BYPASSRLS).
//                             Falls back to SUPABASE_SERVICE_ROLE_KEY for the
//                             legacy-key transition.
//   SUPABASE_PUBLISHABLE_KEY — sb_publishable_… (RLS-scoped user client).
//                             Falls back to SUPABASE_ANON_KEY.
//   ALLOWED_ORIGIN (optional) — CORS allow-origin; defaults to "*".
//
// ─── EXPORTED API (the contract INTEG-TEAMS consumes) ───────────────────────
//   corsHeaders                         : Record<string,string>
//   json(body, status?)                 : Response (JSON + CORS)
//   handleOptions(req)                  : Response | null (CORS preflight)
//   getAdminClient()                    : SupabaseClient (secret key, BYPASSRLS)
//   getUserClient(authHeader)           : SupabaseClient (publishable + user JWT)
//   getAuthedUserId(req)                : Promise<string | null>
//   encryptToken(plaintext)             : Promise<string>  (Postgres `\x…` hex)
//   decryptToken(stored)               : Promise<string>  (accepts `\x…`/base64/bytes)
//   signState(payload, ttlSeconds?)     : Promise<string>  (HMAC-signed OAuth state)
//   verifyState<T>(token)               : Promise<T | null>
//   getAccessToken(userId)              : Promise<string>  (refresh → access token)
//   graphFetch(userId, path, init?)     : Promise<Response> (Graph v1.0 + Bearer)
//   GRAPH_BASE, msTokenEndpoint()       : constants/helpers
// ============================================================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return null;
}

// ─── Supabase clients ───────────────────────────────────────────────────────

function requireEnv(name: string, ...fallbacks: string[]): string {
  for (const key of [name, ...fallbacks]) {
    const v = Deno.env.get(key);
    if (v) return v;
  }
  throw new Error(`Missing required secret: ${name}`);
}

/** Privileged client (sb_secret_… / BYPASSRLS). Server-side use only. */
export function getAdminClient(): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const secret = requireEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, secret, { auth: { persistSession: false } });
}

/** RLS-scoped client carrying the caller's JWT (publishable / anon key). */
export function getUserClient(authHeader: string): SupabaseClient {
  const url = requireEnv("SUPABASE_URL");
  const pub = requireEnv("SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY");
  return createClient(url, pub, { global: { headers: { Authorization: authHeader } } });
}

/** Resolve the authenticated user's id from the request's bearer token. */
export async function getAuthedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const client = getUserClient(authHeader);
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

// ─── Byte / hex helpers (Postgres bytea ↔ Uint8Array) ───────────────────────

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Accept whatever PostgREST returns for a bytea column (`\x…` hex by default,
 *  base64 in some configs) or raw bytes, and normalise to Uint8Array. */
function toBytes(stored: string | Uint8Array | number[]): Uint8Array {
  if (stored instanceof Uint8Array) return stored;
  if (Array.isArray(stored)) return new Uint8Array(stored);
  if (typeof stored === "string") {
    if (stored.startsWith("\\x")) return hexToBytes(stored);
    if (/^[0-9a-fA-F]+$/.test(stored) && stored.length % 2 === 0) return hexToBytes(stored);
    return base64ToBytes(stored);
  }
  throw new Error("Unsupported bytea representation");
}

// ─── AES-256-GCM token encryption (refresh_token_enc at rest) ───────────────

let aesKeyPromise: Promise<CryptoKey> | null = null;

function aesKey(): Promise<CryptoKey> {
  if (!aesKeyPromise) {
    aesKeyPromise = (async () => {
      const raw = requireEnv("TOKEN_ENCRYPTION_KEY");
      // Derive a stable 256-bit key from the secret regardless of its format.
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
      return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
        "encrypt",
        "decrypt",
      ]);
    })();
  }
  return aesKeyPromise;
}

/** Encrypt a token. Returns a Postgres bytea hex literal (`\x…`): iv ‖ ciphertext. */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await aesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext),
    ),
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return "\\x" + bytesToHex(combined);
}

/** Decrypt a stored refresh token (iv ‖ ciphertext). */
export async function decryptToken(stored: string | Uint8Array | number[]): Promise<string> {
  const key = await aesKey();
  const combined = toBytes(stored);
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// ─── OAuth `state` signing (HMAC-SHA256 over TOKEN_ENCRYPTION_KEY) ───────────
// The browser carries `state` round-trip through Entra; we must authenticate it
// because ms-oauth-callback runs verify_jwt=false (it's hit by a top-level
// browser redirect with no Authorization header).

let hmacKeyPromise: Promise<CryptoKey> | null = null;

function hmacKey(): Promise<CryptoKey> {
  if (!hmacKeyPromise) {
    hmacKeyPromise = (async () => {
      const raw = requireEnv("TOKEN_ENCRYPTION_KEY");
      return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode("state:" + raw),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
      );
    })();
  }
  return hmacKeyPromise;
}

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return base64ToBytes(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

export async function signState(payload: Record<string, unknown>, ttlSeconds = 600): Promise<string> {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const data = b64url(new TextEncoder().encode(JSON.stringify(body)));
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(data)),
  );
  return `${data}.${b64url(sig)}`;
}

export async function verifyState<T = Record<string, unknown>>(token: string): Promise<T | null> {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(),
    b64urlToBytes(sig),
    new TextEncoder().encode(data),
  );
  if (!ok) return null;
  const body = JSON.parse(new TextDecoder().decode(b64urlToBytes(data)));
  if (typeof body.exp === "number" && body.exp < Math.floor(Date.now() / 1000)) return null;
  return body as T;
}

// ─── Token endpoint + access-token refresh ──────────────────────────────────

export function msTokenEndpoint(): string {
  const tenant = requireEnv("MS_GRAPH_TENANT_ID");
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
}

interface MsConnectionRow {
  refresh_token_enc: string | Uint8Array | number[];
  ms_user_id: string;
  ms_tenant_id: string;
}

// In-process cache so repeated graphFetch calls in one invocation reuse a token.
const accessTokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Exchange the user's stored refresh token for a fresh access token.
 * Rotates the stored refresh token if Entra returns a new one. Caches the
 * access token in-process for the remainder of this function invocation.
 */
export async function getAccessToken(userId: string): Promise<string> {
  const cached = accessTokenCache.get(userId);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("ms_connections")
    .select("refresh_token_enc, ms_user_id, ms_tenant_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`ms_connections lookup failed: ${error.message}`);
  if (!data) throw new Error("NO_CONNECTION");

  const row = data as unknown as MsConnectionRow;
  const refreshToken = await decryptToken(row.refresh_token_enc);

  const res = await fetch(msTokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("MS_GRAPH_CLIENT_ID"),
      client_secret: requireEnv("MS_GRAPH_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`token refresh failed: ${res.status} ${await res.text()}`);
  }
  const tok = await res.json();

  // Rotate the refresh token if a new one was issued.
  const patch: Record<string, unknown> = {
    expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
  };
  if (tok.refresh_token && tok.refresh_token !== refreshToken) {
    patch.refresh_token_enc = await encryptToken(tok.refresh_token);
  }
  await admin.from("ms_connections").update(patch).eq("user_id", userId);

  const expiresAt = Date.now() + (tok.expires_in ?? 3600) * 1000;
  accessTokenCache.set(userId, { token: tok.access_token, expiresAt });
  return tok.access_token as string;
}

/**
 * Generic Microsoft Graph v1.0 fetch on behalf of `userId`.
 * `path` is appended to https://graph.microsoft.com/v1.0 (e.g. "/me/events").
 * Adds the Bearer token + JSON content-type; callers handle the Response.
 */
export async function graphFetch(
  userId: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken(userId);
  return fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}
