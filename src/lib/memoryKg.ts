/**
 * Pure, testable logic for the memory knowledge graph — client mirrors of the
 * server-side SQL/edge-function algorithms:
 *   • canViewMemory  ↔ public.can_view_memory
 *   • selectGodNodes ↔ public.memory_god_nodes
 *   • selectSurprisingEdges ↔ public.memory_surprising_edges
 *   • parseExtraction / chunkText ↔ memory-extract
 *   • formatRagChunks ↔ ai-assistant retrieveMemory
 * These power the preview insights AND are unit-tested to lock the behaviour.
 */
import type { EdgeKind, GraphEdge, GraphNode } from "@/types/graph";

export interface GodNode { node_id: string; node_type: string; label: string; degree: number }
export interface SurprisingEdge {
  edge_id: string; source: string; target: string; relation_type: string;
  edge_kind: string; confidence: number; rationale: string; shared_neighbors: number;
}

export interface MemoryViewer {
  userId: string;
  isAdmin: boolean;
  departmentId: string | null;
}
export interface MemoryGrantLike {
  everyone?: boolean;
  grantee_user_id?: string | null;
  grantee_department_id?: string | null;
}

/** Mirror of can_view_memory: admin OR an active grant (user / department / everyone). */
export function canViewMemory(viewer: MemoryViewer, grants: MemoryGrantLike[]): boolean {
  if (viewer.isAdmin) return true;
  return grants.some((g) =>
    g.everyone === true ||
    (!!g.grantee_user_id && g.grantee_user_id === viewer.userId) ||
    (!!g.grantee_department_id && g.grantee_department_id === viewer.departmentId),
  );
}

const nodeType = (id: string): string => id.split(":")[0] ?? "";

/** Highest-degree nodes ("god nodes"). Degree counts every incident edge. */
export function selectGodNodes(nodes: GraphNode[], edges: GraphEdge[], limit = 8): GodNode[] {
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  return nodes
    .map((n) => ({ node_id: n.id, node_type: n.type, label: n.label, degree: degree.get(n.id) ?? 0 }))
    .filter((n) => n.degree > 0)
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/**
 * Surprising connections: EXTRACTED/INFERRED edges between different entity
 * types, ranked by fewest shared neighbours (then lowest confidence). Mirrors
 * memory_surprising_edges' heuristic.
 */
export function selectSurprisingEdges(_nodes: GraphNode[], edges: GraphEdge[], limit = 8): SurprisingEdge[] {
  // adjacency (undirected)
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const e of edges) { link(e.source, e.target); link(e.target, e.source); }

  const sharedCount = (a: string, b: string): number => {
    const na = adj.get(a); const nb = adj.get(b);
    if (!na || !nb) return 0;
    let n = 0;
    for (const x of na) if (nb.has(x)) n++;
    return n;
  };

  return edges
    .filter((e) => (e.edgeKind === "EXTRACTED" || e.edgeKind === "INFERRED")
      && nodeType(e.source) !== nodeType(e.target))
    .map((e) => ({
      edge_id: e.id,
      source: e.source,
      target: e.target,
      relation_type: e.type,
      edge_kind: e.edgeKind as string,
      confidence: e.confidence ?? 0,
      rationale: e.rationale ?? "",
      shared_neighbors: sharedCount(e.source, e.target),
    }))
    .sort((a, b) => a.shared_neighbors - b.shared_neighbors || a.confidence - b.confidence)
    .slice(0, limit);
}

// ─── Extraction helpers (mirror of the memory-extract edge function) ───

const ALLOWED_RELATION_TYPES = new Set([
  "relates_to", "blocks", "duplicate_of", "parent_of", "belongs_to", "mentions",
]);

export interface ExtractedRelation {
  from: string; to: string; type: string;
  edge_kind: "EXTRACTED" | "INFERRED"; confidence: number; rationale: string;
}
export interface ExtractionResult { concepts: string[]; relations: ExtractedRelation[] }

/** Tolerant parse of the extractor's JSON: strips fences, dedups, validates. */
export function parseExtraction(raw: string): ExtractionResult {
  const empty: ExtractionResult = { concepts: [], relations: [] };
  if (!raw) return empty;
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) return empty;
  s = s.slice(start, end + 1);
  let obj: unknown;
  try { obj = JSON.parse(s); } catch { return empty; }
  const o = obj as Record<string, unknown>;

  const seen = new Set<string>();
  const concepts: string[] = [];
  for (const c of Array.isArray(o.concepts) ? o.concepts : []) {
    const label = String(c ?? "").trim();
    const key = label.toLowerCase();
    if (label && !seen.has(key)) { seen.add(key); concepts.push(label); }
  }
  const conceptKeys = new Set(concepts.map((c) => c.toLowerCase()));

  const relations: ExtractedRelation[] = [];
  for (const r of Array.isArray(o.relations) ? o.relations : []) {
    const rr = r as Record<string, unknown>;
    const from = String(rr.from ?? "").trim();
    const to = String(rr.to ?? "").trim();
    if (!from || !to || from.toLowerCase() === to.toLowerCase()) continue;
    if (!conceptKeys.has(from.toLowerCase()) || !conceptKeys.has(to.toLowerCase())) continue;
    let type = String(rr.type ?? "relates_to").trim();
    if (!ALLOWED_RELATION_TYPES.has(type)) type = "relates_to";
    const edge_kind = rr.edge_kind === "INFERRED" ? "INFERRED" : "EXTRACTED";
    let confidence = Number(rr.confidence);
    if (!Number.isFinite(confidence)) confidence = 0.5;
    confidence = Math.max(0, Math.min(1, confidence));
    relations.push({ from, to, type, edge_kind, confidence, rationale: String(rr.rationale ?? "").slice(0, 200) });
  }
  return { concepts, relations };
}

const CHUNK_CHARS = 1_500;
const MAX_CHUNKS = 6;

/** Split text into embedding chunks (mirror of memory-extract). */
export function chunkText(text: string): string[] {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= CHUNK_CHARS) return [clean];
  const chunks: string[] = [];
  for (let i = 0; i < clean.length && chunks.length < MAX_CHUNKS; i += CHUNK_CHARS) {
    chunks.push(clean.slice(i, i + CHUNK_CHARS));
  }
  return chunks;
}

export interface RagChunk { entity_type: string; chunk: string; similarity?: number }

/** Format retrieved chunks into the ai-assistant "RELEVANT MEMORY" block ("" if empty). */
export function formatRagChunks(results: RagChunk[]): string {
  if (!Array.isArray(results) || results.length === 0) return "";
  const lines = results.map((r) => {
    const snippet = String(r.chunk ?? "").replace(/\s+/g, " ").slice(0, 300);
    const sim = typeof r.similarity === "number" ? ` (${Math.round(r.similarity * 100)}%)` : "";
    return `- [${r.entity_type}${sim}] ${snippet}`;
  });
  return `\n--- RELEVANT MEMORY (semantic) ---\n` +
    `The most relevant passages from the user's authorized data for this question:\n` +
    lines.join("\n");
}

export type { EdgeKind };
