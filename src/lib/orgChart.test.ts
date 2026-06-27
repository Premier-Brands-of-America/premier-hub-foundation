import { describe, it, expect } from "vitest";
import {
  buildOrgTree,
  directReportsOf,
  managementChainOf,
  countDescendants,
  flattenOrg,
  type OrgPerson,
} from "./orgChart";

// CEO -> (VP-A, VP-B); VP-A -> (eng1, eng2); VP-B -> (mkt1)
const people: OrgPerson[] = [
  { id: "ceo", name: "Ada", title: "CEO" },
  { id: "vpa", name: "Ben", managerId: "ceo", title: "VP Eng", department: "Engineering" },
  { id: "vpb", name: "Cara", managerId: "ceo", title: "VP Mktg", department: "Marketing" },
  { id: "eng1", name: "Dan", managerId: "vpa", department: "Engineering" },
  { id: "eng2", name: "Eve", managerId: "vpa", department: "Engineering" },
  { id: "mkt1", name: "Fay", managerId: "vpb", department: "Marketing" },
];

describe("buildOrgTree", () => {
  it("builds a single-rooted tree with correct depths", () => {
    const roots = buildOrgTree(people);
    expect(roots).toHaveLength(1);
    expect(roots[0].person.id).toBe("ceo");
    expect(roots[0].depth).toBe(0);
    expect(roots[0].reports.map((r) => r.person.id)).toEqual(["vpa", "vpb"]); // sorted by name
    const vpa = roots[0].reports[0];
    expect(vpa.depth).toBe(1);
    expect(vpa.reports.map((r) => r.person.id)).toEqual(["eng1", "eng2"]);
    expect(vpa.reports[0].depth).toBe(2);
  });

  it("treats people with an unknown manager as roots", () => {
    const roots = buildOrgTree([
      { id: "a", name: "A", managerId: "ghost" },
      { id: "b", name: "B", managerId: "a" },
    ]);
    expect(roots.map((r) => r.person.id)).toEqual(["a"]);
    expect(roots[0].reports[0].person.id).toBe("b");
  });

  it("is cycle-safe (a<->b loop does not hang or duplicate)", () => {
    const roots = buildOrgTree([
      { id: "a", name: "A", managerId: "b" },
      { id: "b", name: "B", managerId: "a" },
    ]);
    expect(flattenOrg(roots)).toHaveLength(2);
  });

  it("de-dupes repeated ids", () => {
    const roots = buildOrgTree([
      { id: "x", name: "X" },
      { id: "x", name: "X dup" },
    ]);
    expect(roots).toHaveLength(1);
  });
});

describe("directReportsOf", () => {
  it("returns one level of reports", () => {
    expect(directReportsOf(people, "ceo").map((p) => p.id)).toEqual(["vpa", "vpb"]);
    expect(directReportsOf(people, "vpa").map((p) => p.id)).toEqual(["eng1", "eng2"]);
    expect(directReportsOf(people, "eng1")).toEqual([]);
  });
});

describe("managementChainOf", () => {
  it("walks from a person up to the root", () => {
    expect(managementChainOf(people, "eng1").map((p) => p.id)).toEqual(["vpa", "ceo"]);
    expect(managementChainOf(people, "ceo")).toEqual([]);
  });

  it("is cycle-safe", () => {
    const chain = managementChainOf(
      [
        { id: "a", managerId: "b" },
        { id: "b", managerId: "a" },
      ],
      "a",
    );
    expect(chain.map((p) => p.id)).toEqual(["b"]);
  });
});

describe("countDescendants", () => {
  it("counts the whole subtree below a node", () => {
    const roots = buildOrgTree(people);
    expect(countDescendants(roots[0])).toBe(5); // everyone except the CEO
  });
});
