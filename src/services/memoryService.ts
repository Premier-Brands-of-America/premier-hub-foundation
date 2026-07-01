/**
 * Memory knowledge-graph service — insights, wiki summaries, backfill trigger,
 * view logging, and access-grant management. Real mode calls the RLS-scoped
 * RPCs / edge functions from the memory_kg migration; preview mode returns the
 * demo knowledge graph so /memory is fully explorable without a database.
 */
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import { demoMemoryGraph } from "@/lib/memoryGraphDemo";
import {
  selectGodNodes, selectSurprisingEdges,
  type GodNode, type SurprisingEdge,
} from "@/lib/memoryKg";

const IS_PREVIEW = isPreviewEnvironment();

export type { GodNode, SurprisingEdge };

export interface MemoryGrant {
  id: string;
  grantee_user_id: string | null;
  grantee_department_id: string | null;
  everyone: boolean;
  created_at: string;
}

/** Highest-degree nodes — the graph's "key concepts" / hubs. */
export async function fetchGodNodes(limit = 8): Promise<GodNode[]> {
  if (IS_PREVIEW) {
    const g = demoMemoryGraph();
    return selectGodNodes(g.nodes, g.edges, limit);
  }
  const { data, error } = await supabase.rpc("memory_god_nodes" as never, { p_limit: limit } as never);
  if (error) return [];
  return (data ?? []) as GodNode[];
}

/** Cross-cluster EXTRACTED/INFERRED edges — "surprising connections". */
export async function fetchSurprisingEdges(limit = 8): Promise<SurprisingEdge[]> {
  if (IS_PREVIEW) {
    const g = demoMemoryGraph();
    return selectSurprisingEdges(g.nodes, g.edges, limit);
  }
  const { data, error } = await supabase.rpc("memory_surprising_edges" as never, { p_limit: limit } as never);
  if (error) return [];
  return (data ?? []) as SurprisingEdge[];
}

/** On-demand wiki summary for a topic + its connected node labels. */
export async function fetchMemoryWiki(topic: string, related: string[]): Promise<string> {
  if (IS_PREVIEW) {
    return `**${topic}** is a key topic in your knowledge graph.\n\n## Connected to\n` +
      (related.length ? related.slice(0, 8).map((r) => `- ${r}`).join("\n") : "- (no connections yet)") +
      `\n\n_Deploy the memory functions to generate live AI summaries._`;
  }
  const { data, error } = await supabase.functions.invoke("memory-wiki", {
    body: { topic, related: related.slice(0, 40) },
  });
  if (error) throw error;
  return (data as { summary_md?: string })?.summary_md ?? "";
}

/** Admin action: rebuild the memory graph (backfill extraction over entities). */
export async function rebuildMemory(limit = 40): Promise<{ ok: boolean; message: string }> {
  if (IS_PREVIEW) {
    return { ok: true, message: "Preview mode — the demo knowledge graph is already built." };
  }
  const { data, error } = await supabase.functions.invoke("memory-extract", {
    body: { backfill: true, limit },
  });
  if (error) return { ok: false, message: error.message };
  const r = data as { processed?: number; concepts?: number; chunks?: number; started?: boolean; queued?: number };
  if (r?.started) {
    return { ok: true, message: `Rebuild started for ${r.queued ?? 0} items — the graph fills in over the next minute. Refresh shortly.` };
  }
  return { ok: true, message: `Processed ${r?.processed ?? 0} items · ${r?.concepts ?? 0} concepts · ${r?.chunks ?? 0} chunks.` };
}

/**
 * Fire-and-forget knowledge-graph extraction for a saved entity (production
 * only; skipped in preview where the demo graph is static). Mirrors the
 * sharepoint-provision pattern — never blocks the save, errors are logged.
 */
export function fireMemoryExtract(entity_type: "page" | "request" | "task" | "transcript", entity_id: string): void {
  if (IS_PREVIEW || !entity_id) return;
  supabase.functions
    .invoke("memory-extract", { body: { entity_type, entity_id } })
    .catch((e) => console.warn("memory-extract failed", e));
}

/** Append-only view logging (fire-and-forget). */
export function logMemoryView(): void {
  if (IS_PREVIEW) return;
  supabase.rpc("log_memory_view" as never, {} as never).then(
    () => {},
    (e) => console.warn("log_memory_view failed", e),
  );
}

// ─── Access grants (admin) ───

export async function listMemoryGrants(): Promise<MemoryGrant[]> {
  if (IS_PREVIEW) return [];
  const { data, error } = await supabase
    .from("memory_access_grants" as never)
    .select("id, grantee_user_id, grantee_department_id, everyone, created_at");
  if (error) return [];
  return (data ?? []) as unknown as MemoryGrant[];
}

export async function addMemoryGrant(
  grant: { grantee_user_id?: string | null; grantee_department_id?: string | null; everyone?: boolean },
): Promise<void> {
  if (IS_PREVIEW) return;
  const { data: userRes } = await supabase.auth.getUser();
  const { error } = await supabase.from("memory_access_grants" as never).insert({
    grantee_user_id: grant.grantee_user_id ?? null,
    grantee_department_id: grant.grantee_department_id ?? null,
    everyone: grant.everyone ?? false,
    created_by: userRes?.user?.id ?? null,
  } as never);
  if (error) throw error;
}

export async function removeMemoryGrant(id: string): Promise<void> {
  if (IS_PREVIEW) return;
  const { error } = await supabase.from("memory_access_grants" as never).delete().eq("id" as never, id as never);
  if (error) throw error;
}
