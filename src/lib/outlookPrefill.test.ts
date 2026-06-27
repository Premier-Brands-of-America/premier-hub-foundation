import { describe, it, expect } from "vitest";
import { buildGraphEvent, buildOutlookDeeplink } from "./outlookPrefill";

const input = {
  subject: "Master Dielines — kickoff",
  attendees: ["req@x.com", "lead@x.com", ""],
  bodyLines: ["Key points:", "- new dieline", "Link: /portal/requests/r-1"],
  startIso: "2026-07-01T15:00:00.000Z",
  durationMin: 45,
};

describe("buildGraphEvent", () => {
  it("builds a /me/events payload with attendees and time window", () => {
    const ev = buildGraphEvent(input);
    expect(ev.subject).toBe(input.subject);
    expect(ev.attendees.map((a) => a.emailAddress.address)).toEqual([
      "req@x.com",
      "lead@x.com",
    ]);
    expect(ev.body.content).toContain("new dieline");
    expect(ev.start?.dateTime).toBe(input.startIso);
    expect(ev.end?.dateTime).toBe("2026-07-01T15:45:00.000Z");
  });
  it("adds online meeting fields only when requested", () => {
    expect(buildGraphEvent(input).isOnlineMeeting).toBeUndefined();
    expect(buildGraphEvent({ ...input, online: true }).isOnlineMeeting).toBe(true);
  });
});

describe("buildOutlookDeeplink", () => {
  it("builds a compose deeplink with subject, body and attendees", () => {
    const url = buildOutlookDeeplink(input);
    expect(url).toContain("outlook.office.com/calendar/0/deeplink/compose");
    const qs = new URL(url).searchParams;
    expect(qs.get("subject")).toBe(input.subject);
    expect(qs.get("to")).toBe("req@x.com;lead@x.com");
    expect(qs.get("body")).toContain("new dieline");
    expect(qs.get("startdt")).toBe(input.startIso);
  });
});
