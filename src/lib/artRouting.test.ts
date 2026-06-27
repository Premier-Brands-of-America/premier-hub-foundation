import { describe, it, expect } from "vitest";
import { routeRequest, resolveRecipients, computeRecipients } from "./artRouting";
import { ownersFor, normalizeCustomer, CUSTOMERS } from "@/config/artOwnership";

describe("ownership matrix", () => {
  it("maps single-owner customers to the right manager", () => {
    expect(ownersFor("Kroger")).toEqual(["jaclyn"]);
    expect(ownersFor("Target")).toEqual(["megan"]);
    expect(ownersFor("Trojan")).toEqual(["dan"]);
  });

  it("matches customers case- and whitespace-insensitively", () => {
    expect(ownersFor("  kROGER ")).toEqual(["jaclyn"]);
    expect(normalizeCustomer("  Master   Dielines ")).toBe("master dielines");
  });

  it("returns empty owners for an unknown customer", () => {
    expect(ownersFor("Nonexistent Brand")).toEqual([]);
  });

  it("exposes a sorted customer list", () => {
    expect(CUSTOMERS.length).toBeGreaterThan(20);
    const sorted = [...CUSTOMERS].sort((a, b) => a.localeCompare(b));
    expect(CUSTOMERS).toEqual(sorted);
  });
});

describe("routeRequest", () => {
  it("auto-assigns the lead for a single-owner customer (Kroger → Jaclyn)", () => {
    const r = routeRequest("Kroger");
    expect(r.requiresManagerSelection).toBe(false);
    expect(r.lead).toBe("jaclyn");
    expect(r.unknownCustomer).toBe(false);
  });

  it("requires manager selection for a multi-owner customer (Master Dielines)", () => {
    const r = routeRequest("Master Dielines");
    expect(r.requiresManagerSelection).toBe(true);
    expect(r.owners).toEqual(["jaclyn", "megan", "dan"]);
    expect(r.lead).toBeNull();
  });

  it("honors a valid manager selection for a multi-owner customer", () => {
    const r = routeRequest("Master Dielines", "megan");
    expect(r.lead).toBe("megan");
  });

  it("ignores a selection that is not an owner of the customer", () => {
    const r = routeRequest("Master Dielines", "jaclyn");
    expect(r.lead).toBe("jaclyn");
    const bad = routeRequest("Kroger", "dan");
    // Kroger is single-owner; selection is irrelevant, lead stays Jaclyn.
    expect(bad.lead).toBe("jaclyn");
  });

  it("flags unknown customers", () => {
    const r = routeRequest("Mystery Co");
    expect(r.unknownCustomer).toBe(true);
    expect(r.lead).toBeNull();
  });
});

describe("resolveRecipients (Art Lead CC rule)", () => {
  it("CCs the Art Lead by default when lead differs from the Art Lead", () => {
    const rec = resolveRecipients("jaclyn");
    expect(rec.to).toHaveLength(1);
    // default art lead fallback differs from manager fallbacks
    expect(rec.cc).toHaveLength(1);
    expect(rec.cc[0]).not.toBe(rec.to[0]);
  });

  it("does not double-CC when the lead's inbox is the Art Lead inbox", () => {
    const rec = computeRecipients("lead@x.com", "LEAD@X.COM");
    expect(rec.to).toEqual(["lead@x.com"]);
    expect(rec.cc).toEqual([]);
  });

  it("CCs the Art Lead when inboxes differ (pure)", () => {
    const rec = computeRecipients("megan@x.com", "art-lead@x.com");
    expect(rec.to).toEqual(["megan@x.com"]);
    expect(rec.cc).toEqual(["art-lead@x.com"]);
  });
});
