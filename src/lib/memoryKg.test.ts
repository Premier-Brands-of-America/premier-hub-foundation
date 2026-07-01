import { describe, it, expect } from "vitest";
import {
  canViewMemory, selectGodNodes, selectSurprisingEdges,
  parseExtraction, chunkText, formatRagChunks,
  type MemoryViewer,
} from "./memoryKg";
import { edgeDash } from "@/components/graph/graphColors";
import type { GraphEdge, GraphNode } from "@/types/graph";

const admin: MemoryViewer = { userId: "u-admin", isAdmin: true, departmentId: "d1" };
const user: MemoryViewer = { userId: "u1", isAdmin: false, departmentId: "d1" };

describe("canViewMemory (mirror of can_view_memory)", () => {
  it("admins always pass regardless of grants", () => {
    expect(canViewMemory(admin, [])).toBe(true);
  });
  it("non-admin with no grants is denied", () => {
    expect(canViewMemory(user, [])).toBe(false);
  });
  it("everyone grant lets any user in", () => {
    expect(canViewMemory(user, [{ everyone: true }])).toBe(true);
  });
  it("direct user grant matches by id", () => {
    expect(canViewMemory(user, [{ grantee_user_id: "u1" }])).toBe(true);
    expect(canViewMemory(user, [{ grantee_user_id: "u2" }])).toBe(false);
  });
  it("department grant matches the viewer's department", () => {
    expect(canViewMemory(user, [{ grantee_department_id: "d1" }])).toBe(true);
    expect(canViewMemory(user, [{ grantee_department_id: "d2" }])).toBe(false);
  });
  it("ignores a null department on the viewer", () => {
    const noDept: MemoryViewer = { userId: "u1", isAdmin: false, departmentId: null };
    expect(canViewMemory(noDept, [{ grantee_department_id: null }])).toBe(false);
  });
});

const NODES: GraphNode[] = [
  { id: "concept:a", entityId: "a", type: "concept", label: "Alpha" },
  { id: "concept:b", entityId: "b", type: "concept", label: "Beta" },
  { id: "page:p", entityId: "p", type: "page", label: "Page" },
  { id: "task:t", entityId: "t", type: "task", label: "Task" },
  { id: "concept:orphan", entityId: "o", type: "concept", label: "Orphan" },
];
const EDGES: GraphEdge[] = [
  { id: "e1", source: "page:p", target: "concept:a", type: "mentions", edgeKind: "EXTRACTED", confidence: 0.9 },
  { id: "e2", source: "task:t", target: "concept:a", type: "mentions", edgeKind: "EXTRACTED", confidence: 0.8 },
  { id: "e3", source: "concept:a", target: "concept:b", type: "relates_to", edgeKind: "INFERRED", confidence: 0.4 },
  { id: "e4", source: "page:p", target: "concept:b", type: "mentions", edgeKind: "EXTRACTED", confidence: 0.7 },
];

describe("selectGodNodes (mirror of memory_god_nodes)", () => {
  it("ranks by degree and drops orphans", () => {
    const gods = selectGodNodes(NODES, EDGES, 3);
    expect(gods[0].node_id).toBe("concept:a"); // degree 3 (e1,e2,e3)
    expect(gods.map((g) => g.node_id)).not.toContain("concept:orphan");
  });
  it("respects the limit", () => {
    expect(selectGodNodes(NODES, EDGES, 2)).toHaveLength(2);
  });
});

describe("selectSurprisingEdges (mirror of memory_surprising_edges)", () => {
  it("only returns EXTRACTED/INFERRED edges between different node types", () => {
    const s = selectSurprisingEdges(NODES, EDGES, 10);
    // e3 is concept→concept (same type) → excluded; e1,e2,e4 are cross-type EXTRACTED
    expect(s.map((e) => e.edge_id).sort()).toEqual(["e1", "e2", "e4"]);
  });
  it("ranks by fewest shared neighbours then lowest confidence", () => {
    const s = selectSurprisingEdges(NODES, EDGES, 10);
    // e1 (page:p→concept:a) and e2 (task:t→concept:a) share neighbour concept:a's peers;
    // ordering is deterministic and confidence breaks ties.
    expect(s[0].shared_neighbors).toBeLessThanOrEqual(s[s.length - 1].shared_neighbors);
  });
});

describe("parseExtraction (mirror of memory-extract)", () => {
  it("parses clean JSON", () => {
    const r = parseExtraction('{"concepts":["A","B"],"relations":[{"from":"A","to":"B","type":"relates_to","edge_kind":"EXTRACTED","confidence":0.8,"rationale":"x"}]}');
    expect(r.concepts).toEqual(["A", "B"]);
    expect(r.relations).toHaveLength(1);
  });
  it("strips markdown fences", () => {
    const r = parseExtraction('```json\n{"concepts":["A"],"relations":[]}\n```');
    expect(r.concepts).toEqual(["A"]);
  });
  it("dedupes concepts case-insensitively", () => {
    const r = parseExtraction('{"concepts":["Brand","brand","BRAND"],"relations":[]}');
    expect(r.concepts).toEqual(["Brand"]);
  });
  it("drops relations whose endpoints are not concepts", () => {
    const r = parseExtraction('{"concepts":["A"],"relations":[{"from":"A","to":"Ghost","type":"relates_to"}]}');
    expect(r.relations).toHaveLength(0);
  });
  it("drops self-relations and coerces bad types/confidence", () => {
    const r = parseExtraction('{"concepts":["A","B"],"relations":[{"from":"A","to":"A","type":"relates_to"},{"from":"A","to":"B","type":"nonsense","confidence":9}]}');
    expect(r.relations).toHaveLength(1);
    expect(r.relations[0].type).toBe("relates_to"); // coerced from "nonsense"
    expect(r.relations[0].confidence).toBe(1);       // clamped
  });
  it("returns empty on garbage", () => {
    expect(parseExtraction("not json at all")).toEqual({ concepts: [], relations: [] });
    expect(parseExtraction("")).toEqual({ concepts: [], relations: [] });
  });
});

describe("chunkText (mirror of memory-extract)", () => {
  it("returns a single chunk for short text", () => {
    expect(chunkText("hello world")).toEqual(["hello world"]);
  });
  it("returns [] for empty/whitespace", () => {
    expect(chunkText("   ")).toEqual([]);
  });
  it("splits long text and caps chunk count", () => {
    const long = "x".repeat(20_000);
    const chunks = chunkText(long);
    expect(chunks.length).toBeLessThanOrEqual(6);
    expect(chunks[0].length).toBe(1_500);
  });
});

describe("formatRagChunks (mirror of ai-assistant retrieveMemory)", () => {
  it("returns empty string when there are no results", () => {
    expect(formatRagChunks([])).toBe("");
  });
  it("formats a labelled block with similarity", () => {
    const out = formatRagChunks([{ entity_type: "page", chunk: "some   text", similarity: 0.83 }]);
    expect(out).toContain("--- RELEVANT MEMORY (semantic) ---");
    expect(out).toContain("[page (83%)] some text");
  });
});

describe("edgeDash (provenance-aware edge styling)", () => {
  it("INFERRED edges are dashed", () => {
    expect(edgeDash("relates_to", "INFERRED")).toEqual([5, 3]);
  });
  it("AMBIGUOUS edges are dotted", () => {
    expect(edgeDash("relates_to", "AMBIGUOUS")).toEqual([1, 3]);
  });
  it("EXTRACTED edges are solid (no dash)", () => {
    expect(edgeDash("mentions", "EXTRACTED")).toBeUndefined();
  });
  it("without an edgeKind, falls back to the relation-type dash", () => {
    expect(edgeDash("blocks")).toEqual([4, 2]);
    expect(edgeDash("owns")).toBeUndefined();
  });
});
