// ============================================================================
// _shared/teams-graph.ts  —  Teams-specific Microsoft Graph helpers
// ----------------------------------------------------------------------------
// Layered ON TOP OF the shared _shared/ms-graph.ts (owned by INTEG-OUTLOOK),
// which provides per-user token decrypt/refresh and:
//
//     graphFetch(userId: string, path: string, init?: RequestInit): Promise<Response>
//
// `path` is relative to https://graph.microsoft.com/v1.0 and begins with "/".
// graphFetch resolves the user's delegated token from ms_connections, refreshes
// it if expired, and attaches the Authorization header — so "/me/..." resolves
// to that user's mailbox/meetings.
//
// We do NOT edit ms-graph.ts. Teams-only helpers (transcript fetch, VTT parse,
// subscription lifecycle) live here. The lead reconciles this import at P4.
// ============================================================================

// NOTE: ms-graph.ts is authored in the sibling INTEG-OUTLOOK worktree and is
// merged in at P4; it is intentionally absent here while building in parallel.
import { graphFetch } from "./ms-graph.ts";

export interface TranscriptSegment {
  speaker: string | null;
  text: string;
  start_ms: number | null;
  end_ms: number | null;
}

export interface GraphTranscriptMeta {
  id: string;
  createdDateTime?: string;
  transcriptContentUrl?: string;
  meetingId?: string;
  meetingOrganizerId?: string;
}

export interface GraphSubscription {
  id: string;
  resource: string;
  expirationDateTime: string;
  clientState?: string;
}

// Graph allows up to ~3 days (4230 min) for *.../getAllTranscripts subscriptions.
const SUBSCRIPTION_TTL_MINUTES = 60 * 24 * 3;

async function graphJson(userId: string, path: string): Promise<any> {
  const res = await graphFetch(userId, path, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Graph GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// ── Meeting / transcript reads ─────────────────────────────────────────────

export interface OnlineMeetingInfo {
  id: string;
  subject?: string;
  joinWebUrl?: string;
  startDateTime?: string;
}

/** Read an onlineMeeting's metadata (subject, joinWebUrl, start) for enrichment. */
export async function getOnlineMeeting(
  userId: string,
  meetingId: string,
): Promise<OnlineMeetingInfo> {
  return (await graphJson(
    userId,
    `/me/onlineMeetings/${meetingId}`,
  )) as OnlineMeetingInfo;
}

/** Resolve a Teams onlineMeeting id from a calendar event's JoinWebUrl. */
export async function resolveMeetingId(
  userId: string,
  joinWebUrl: string,
): Promise<string | null> {
  const filter = encodeURIComponent(`JoinWebUrl eq '${joinWebUrl}'`);
  const data = await graphJson(userId, `/me/onlineMeetings?$filter=${filter}`);
  return data?.value?.[0]?.id ?? null;
}

/** List the transcripts attached to an onlineMeeting. */
export async function listTranscripts(
  userId: string,
  meetingId: string,
): Promise<GraphTranscriptMeta[]> {
  const data = await graphJson(
    userId,
    `/me/onlineMeetings/${meetingId}/transcripts`,
  );
  return (data?.value ?? []) as GraphTranscriptMeta[];
}

/** Fetch the raw WebVTT content of a single transcript. */
export async function fetchTranscriptVtt(
  userId: string,
  meetingId: string,
  transcriptId: string,
): Promise<string> {
  const res = await graphFetch(
    userId,
    `/me/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content?$format=text/vtt`,
    { method: "GET" },
  );
  if (!res.ok) {
    throw new Error(
      `Graph transcript content failed: ${res.status} ${await res.text()}`,
    );
  }
  return res.text();
}

// ── VTT parsing ──────────────────────────────────────────────────────────────

/** Convert a WebVTT timestamp (HH:MM:SS.mmm or MM:SS.mmm) to milliseconds. */
export function vttTimestampToMs(ts: string): number {
  const m = ts.trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?/);
  if (!m) return 0;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  const ms = m[4] ? parseInt(m[4].padEnd(3, "0"), 10) : 0;
  return ((h * 60 + min) * 60 + sec) * 1000 + ms;
}

/**
 * Parse a Teams WebVTT transcript into speaker-tagged segments.
 * Teams cues look like:
 *   00:00:00.000 --> 00:00:03.420
 *   <v Jane Doe>Hello everyone.</v>
 * Cue identifier lines and styling/NOTE blocks are tolerated.
 */
export function parseVtt(vtt: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const blocks = vtt.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const tcIndex = lines.findIndex((l) => l.includes("-->"));
    if (tcIndex === -1) continue; // WEBVTT header / NOTE / STYLE block

    const [startRaw, endRaw] = lines[tcIndex].split("-->");
    const start_ms = startRaw ? vttTimestampToMs(startRaw) : null;
    const end_ms = endRaw ? vttTimestampToMs(endRaw) : null;

    const payload = lines.slice(tcIndex + 1).join(" ");
    if (!payload) continue;

    const voice = payload.match(/<v\s+([^>]+)>/i);
    const speaker = voice ? voice[1].trim() : null;
    const text = payload.replace(/<[^>]+>/g, "").trim();
    if (!text) continue;

    segments.push({ speaker, text, start_ms, end_ms });
  }
  return segments;
}

// ── Subscription lifecycle ───────────────────────────────────────────────────

/**
 * Create a change-notification subscription for a user's meeting transcripts.
 * resource = users/{msUserId}/onlineMeetings/getAllTranscripts
 */
export async function createTranscriptSubscription(opts: {
  userId: string;
  msUserId: string;
  notificationUrl: string;
  clientState: string;
  lifecycleNotificationUrl?: string;
  ttlMinutes?: number;
}): Promise<GraphSubscription> {
  const ttl = opts.ttlMinutes ?? SUBSCRIPTION_TTL_MINUTES;
  const expirationDateTime = new Date(Date.now() + ttl * 60_000).toISOString();
  const body: Record<string, unknown> = {
    changeType: "created",
    notificationUrl: opts.notificationUrl,
    resource: `users/${opts.msUserId}/onlineMeetings/getAllTranscripts`,
    expirationDateTime,
    clientState: opts.clientState,
  };
  if (opts.lifecycleNotificationUrl) {
    body.lifecycleNotificationUrl = opts.lifecycleNotificationUrl;
  }
  const res = await graphFetch(opts.userId, `/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `Graph subscription create failed: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

/** Renew an existing subscription, pushing its expiration out. */
export async function renewSubscription(
  userId: string,
  subscriptionId: string,
  ttlMinutes: number = SUBSCRIPTION_TTL_MINUTES,
): Promise<GraphSubscription> {
  const expirationDateTime = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const res = await graphFetch(userId, `/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expirationDateTime }),
  });
  if (!res.ok) {
    throw new Error(
      `Graph subscription renew failed: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}
