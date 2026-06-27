// ============================================================================
// calendar-create-event — create an Outlook calendar event from a request/item
// ----------------------------------------------------------------------------
// Powers the "Schedule in Outlook" action (meeting toggle). Creates the event
// in the signed-in user's calendar via Microsoft Graph `POST /me/events`.
//
// SCOPE REQUIREMENT: this needs the DELEGATED scope `Calendars.ReadWrite`
//   (and `OnlineMeetings.ReadWrite` if `online: true`). The app currently
//   requests only `Calendars.Read` — see docs/GRAPH-PERMISSIONS.md for the
//   exact delta and the Entra admin steps. Until the scope is granted, Graph
//   returns 403 and the client falls back to the Outlook web deeplink.
//
// Body: {
//   subject: string,
//   attendees?: string[],          // emails (requester + assigned lead)
//   bodyLines?: string[],          // key points + link back to the request
//   startIso?: string,             // optional ISO start
//   durationMin?: number,          // default 30
//   timeZone?: string,             // default America/New_York
//   online?: boolean               // attach a Teams online meeting link
// }
// ============================================================================

import {
  handleOptions,
  json,
  getAuthedUserId,
  graphFetch,
} from "../_shared/ms-graph.ts";

interface Body {
  subject: string;
  attendees?: string[];
  bodyLines?: string[];
  startIso?: string;
  durationMin?: number;
  timeZone?: string;
  online?: boolean;
}

function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    let body: Body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (!body.subject) return json({ error: "subject is required" }, 400);

    const tz = body.timeZone ?? "America/New_York";
    const dur = body.durationMin ?? 30;

    // deno-lint-ignore no-explicit-any
    const event: Record<string, any> = {
      subject: body.subject,
      body: { contentType: "text", content: (body.bodyLines ?? []).join("\n") },
      attendees: (body.attendees ?? [])
        .filter(Boolean)
        .map((address) => ({ emailAddress: { address }, type: "required" })),
    };
    if (body.startIso) {
      event.start = { dateTime: body.startIso, timeZone: tz };
      event.end = { dateTime: addMinutesIso(body.startIso, dur), timeZone: tz };
    }
    if (body.online) {
      event.isOnlineMeeting = true;
      event.onlineMeetingProvider = "teamsForBusiness";
    }

    const res = await graphFetch(userId, "/me/events", {
      method: "POST",
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      const detail = await res.text();
      // 403 here almost always means the Calendars.ReadWrite scope is missing.
      return json(
        { error: "Graph event creation failed", status: res.status, detail },
        res.status === 403 ? 403 : 502,
      );
    }

    const created = await res.json();
    return json({ id: created.id, webLink: created.webLink });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
