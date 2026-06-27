/**
 * Outlook / Microsoft Graph meeting prefill.
 *
 * Builds both:
 *  - a Graph event payload for `POST /me/events` (used by the deployed
 *    edge function when scopes are granted), and
 *  - an Outlook web "deeplink/compose" URL as a graceful fallback that opens
 *    the calendar scheduler pre-filled in the browser (no special scopes).
 *
 * Source: brief §1.2 "Meeting toggle + Outlook scheduler".
 */

export interface MeetingPrefillInput {
  subject: string; // e.g. request title / customer
  attendees: string[]; // emails: requester + assigned manager/lead
  /** Plain-text key points + a link back to the request. */
  bodyLines: string[];
  /** Optional ISO start; defaults handled by caller (no Date.now here). */
  startIso?: string;
  /** Duration in minutes (default 30). */
  durationMin?: number;
  /** Whether to attach a Teams online meeting link (needs OnlineMeetings scope). */
  online?: boolean;
}

export interface GraphEventPayload {
  subject: string;
  body: { contentType: "text"; content: string };
  start?: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string };
  attendees: Array<{
    emailAddress: { address: string };
    type: "required";
  }>;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: "teamsForBusiness";
}

function addMinutesIso(iso: string, minutes: number): string {
  const d = new Date(iso);
  return new Date(d.getTime() + minutes * 60_000).toISOString();
}

/** Build a Graph `POST /me/events` payload from request data. */
export function buildGraphEvent(
  input: MeetingPrefillInput,
  timeZone = "America/New_York",
): GraphEventPayload {
  const dur = input.durationMin ?? 30;
  const payload: GraphEventPayload = {
    subject: input.subject,
    body: { contentType: "text", content: input.bodyLines.join("\n") },
    attendees: input.attendees
      .filter(Boolean)
      .map((address) => ({ emailAddress: { address }, type: "required" })),
  };
  if (input.startIso) {
    payload.start = { dateTime: input.startIso, timeZone };
    payload.end = { dateTime: addMinutesIso(input.startIso, dur), timeZone };
  }
  if (input.online) {
    payload.isOnlineMeeting = true;
    payload.onlineMeetingProvider = "teamsForBusiness";
  }
  return payload;
}

/**
 * Build an Outlook web deeplink that opens the calendar compose window
 * pre-filled. Works without elevated Graph scopes (browser-side fallback).
 */
export function buildOutlookDeeplink(input: MeetingPrefillInput): string {
  const params = new URLSearchParams();
  params.set("subject", input.subject);
  params.set("body", input.bodyLines.join("\n"));
  const to = input.attendees.filter(Boolean).join(";");
  if (to) params.set("to", to);
  if (input.startIso) {
    params.set("startdt", input.startIso);
    params.set(
      "enddt",
      addMinutesIso(input.startIso, input.durationMin ?? 30),
    );
  }
  if (input.online) params.set("online", "1");
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}
