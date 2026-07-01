// ============================================================================
// outlook-api.ts — client data layer for the Outlook integration (OUTLOOK)
// ----------------------------------------------------------------------------
// Reads `ms_connections` / `calendar_events` directly via the RLS-scoped
// browser client (TanStack Query consumes these), and invokes the Edge
// Functions for privileged / Graph-backed actions (connect, sync, link, mail).
//
// SHARED generated types (src/integrations/supabase/types.ts) are off-limits and
// don't yet include these tables, so we declare local row interfaces and cast at
// the `.from()` boundary only. refresh_token_enc is never selected client-side.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

// ─── Local row types (mirror migration 20260601110000) ──────────────────────
export interface MsConnection {
  id: string;
  ms_user_id: string;
  scopes: string[];
  expires_at: string | null;
  created_at: string | null;
}

export interface CalendarEvent {
  id: string;
  ms_event_id: string;
  subject: string | null;
  join_web_url: string | null;
  start_at: string | null;
  end_at: string | null;
  project_id: string | null;
}

export interface MailMessage {
  id: string;
  subject: string;
  preview: string;
  web_link: string | null;
  received_at: string | null;
  from_name: string | null;
}

// SHARED generated types (types.ts) are off-limits and don't yet include these
// tables, so cast once at the `.from()` boundary (lead regenerates types at P4).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

// ─── Reads (RLS-scoped) ─────────────────────────────────────────────────────

export async function fetchConnection(): Promise<MsConnection | null> {
  const { data, error } = await sb
    .from("ms_connections")
    .select("id, ms_user_id, scopes, expires_at, created_at")
    .maybeSingle();
  if (error) throw error;
  return (data as MsConnection) ?? null;
}

export async function fetchProjectEvents(projectId: string): Promise<CalendarEvent[]> {
  const { data, error } = await sb
    .from("calendar_events")
    .select("id, ms_event_id, subject, join_web_url, start_at, end_at, project_id")
    .eq("project_id", projectId)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return (data as CalendarEvent[]) ?? [];
}

export async function fetchUnlinkedEvents(limit = 30): Promise<CalendarEvent[]> {
  const { data, error } = await sb
    .from("calendar_events")
    .select("id, ms_event_id, subject, join_web_url, start_at, end_at, project_id")
    .is("project_id", null)
    .order("start_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as CalendarEvent[]) ?? [];
}

/** Events whose start falls in [startIso, endIso), ascending — used by the dashboard week card. */
export async function fetchEventsInRange(startIso: string, endIso: string): Promise<CalendarEvent[]> {
  const { data, error } = await sb
    .from("calendar_events")
    .select("id, ms_event_id, subject, join_web_url, start_at, end_at, project_id")
    .gte("start_at", startIso)
    .lt("start_at", endIso)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return (data as CalendarEvent[]) ?? [];
}

// ─── Edge-function actions ──────────────────────────────────────────────────

function invoke<T>(fn: string, body?: Record<string, unknown>): Promise<T> {
  return supabase.functions.invoke(fn, body ? { body } : undefined).then(({ data, error }) => {
    if (error) throw error;
    return data as T;
  });
}

/** Returns the Entra consent URL; caller redirects the browser to it. */
export function startConnect(returnTo: string): Promise<{ authorizeUrl: string }> {
  return invoke<{ authorizeUrl: string }>("ms-oauth-start", { origin: returnTo });
}

export function syncCalendar(): Promise<{ synced: number }> {
  return invoke<{ synced: number }>("calendar-sync", {});
}

export function linkEvent(input: {
  project_id: string | null;
  event_id?: string;
  ms_event_id?: string;
  join_web_url?: string;
}): Promise<{ updated: number; project_id: string | null }> {
  return invoke("link-event-to-project", input);
}

export function searchMail(query: string): Promise<{ messages: MailMessage[] }> {
  return invoke<{ messages: MailMessage[] }>("mail-search", { query });
}
