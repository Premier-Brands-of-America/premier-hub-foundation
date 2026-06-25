// ============================================================================
// calendar-sync — pull Outlook events into calendar_events (INTEG-OUTLOOK)
// ----------------------------------------------------------------------------
// verify_jwt = true   ← consolidate into supabase/config.toml at P4 (lead)
//   We need the caller's identity (whose calendar to sync). DB writes are
//   performed with the SECRET key (privileged), but every row is scoped to the
//   authenticated user_id. Existing project_id links are preserved across syncs.
//
// Pulls /me/calendarView over a window (default −7d … +30d) AND /me/events,
// then upserts on (user_id, ms_event_id). join_web_url is taken from the
// onlineMeeting.joinUrl so INTEG-TEAMS can later resolve the meeting id.
//
// Secrets: (via _shared/ms-graph.ts) MS_GRAPH_*, TOKEN_ENCRYPTION_KEY,
//          SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY.
// ============================================================================

import {
  handleOptions,
  json,
  getAuthedUserId,
  getAdminClient,
  graphFetch,
} from "../_shared/ms-graph.ts";

interface GraphEvent {
  id: string;
  subject?: string;
  onlineMeeting?: { joinUrl?: string } | null;
  onlineMeetingUrl?: string | null;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
}

function toIso(dt?: { dateTime?: string }): string | null {
  if (!dt?.dateTime) return null;
  // Graph returns UTC (timeZone defaults to UTC on these endpoints); ensure the
  // value is parsed as UTC when it lacks an explicit offset.
  const raw = dt.dateTime;
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
  const d = new Date(hasZone ? raw : raw + "Z");
  return isNaN(d.getTime()) ? null : d.toISOString();
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const now = Date.now();
    const start = new Date(now - 7 * 86400_000).toISOString();
    const end = new Date(now + 30 * 86400_000).toISOString();

    const select = "id,subject,onlineMeeting,onlineMeetingUrl,start,end";
    const collected = new Map<string, GraphEvent>();

    // calendarView expands recurrences within the window.
    const viewRes = await graphFetch(
      userId,
      `/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(
        end,
      )}&$select=${select}&$top=100&$orderby=start/dateTime`,
    );
    if (viewRes.status === 401 || viewRes.status === 403) {
      return json({ error: "Microsoft Graph authorization failed. Reconnect Outlook." }, 401);
    }
    if (viewRes.ok) {
      const body = await viewRes.json();
      for (const ev of (body.value ?? []) as GraphEvent[]) collected.set(ev.id, ev);
    } else {
      console.error("[calendar-sync] calendarView:", viewRes.status, await viewRes.text());
    }

    // /me/events catches upcoming non-instantiated items too.
    const evRes = await graphFetch(
      userId,
      `/me/events?$select=${select}&$top=100&$orderby=start/dateTime`,
    );
    if (evRes.ok) {
      const body = await evRes.json();
      for (const ev of (body.value ?? []) as GraphEvent[]) collected.set(ev.id, ev);
    }

    const events = [...collected.values()];
    const admin = getAdminClient();

    // Preserve existing project_id links across re-syncs.
    const { data: existing } = await admin
      .from("calendar_events")
      .select("ms_event_id, project_id")
      .eq("user_id", userId);
    const projectByEvent = new Map<string, string | null>();
    for (const row of (existing ?? []) as { ms_event_id: string; project_id: string | null }[]) {
      projectByEvent.set(row.ms_event_id, row.project_id);
    }

    const rows = events.map((ev) => ({
      user_id: userId,
      ms_event_id: ev.id,
      subject: ev.subject ?? null,
      join_web_url: ev.onlineMeeting?.joinUrl ?? ev.onlineMeetingUrl ?? null,
      start_at: toIso(ev.start),
      end_at: toIso(ev.end),
      project_id: projectByEvent.get(ev.id) ?? null,
    }));

    let synced = 0;
    if (rows.length > 0) {
      const { error } = await admin
        .from("calendar_events")
        .upsert(rows, { onConflict: "user_id,ms_event_id" });
      if (error) return json({ error: `Upsert failed: ${error.message}` }, 500);
      synced = rows.length;
    }

    return json({ synced });
  } catch (e) {
    if (e instanceof Error && e.message === "NO_CONNECTION") {
      return json({ error: "No Outlook connection. Connect Outlook first." }, 409);
    }
    console.error("[calendar-sync]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
