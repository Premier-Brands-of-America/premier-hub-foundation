import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import type { EntityType, Relation, RelationRef, RelationType } from "@/types/relations";

const IS_PREVIEW = isPreviewEnvironment();

// ─── Mock in-memory store for preview ───
interface MockRow {
  id: string;
  source_type: EntityType;
  source_id: string;
  target_type: EntityType;
  target_id: string;
  relation_type: RelationType;
  created_at: string;
  created_by: string | null;
}
let mockRelations: MockRow[] = [];
let mockIdCounter = 1;
const mockId = () => `mock-rel-${mockIdCounter++}`;

function toRelation(r: MockRow, p_type: EntityType, p_id: string): Relation {
  const outgoing = r.source_type === p_type && r.source_id === p_id;
  return {
    id: r.id,
    direction: outgoing ? "outgoing" : "incoming",
    other_type: outgoing ? r.target_type : r.source_type,
    other_id: outgoing ? r.target_id : r.source_id,
    relation_type: r.relation_type,
    created_at: r.created_at,
    other_title: null,
  };
}

export async function addRelation(input: {
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationType: RelationType;
}): Promise<string> {
  if (IS_PREVIEW) {
    const existing = mockRelations.find(
      (r) =>
        r.source_type === input.sourceType &&
        r.source_id === input.sourceId &&
        r.target_type === input.targetType &&
        r.target_id === input.targetId &&
        r.relation_type === input.relationType,
    );
    if (existing) return existing.id;
    const row: MockRow = {
      id: mockId(),
      source_type: input.sourceType,
      source_id: input.sourceId,
      target_type: input.targetType,
      target_id: input.targetId,
      relation_type: input.relationType,
      created_at: new Date().toISOString(),
      created_by: null,
    };
    mockRelations.push(row);
    return row.id;
  }
  const { data, error } = await supabase.rpc("add_relation", {
    p_source_type: input.sourceType,
    p_source_id: input.sourceId,
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_relation_type: input.relationType,
  });
  if (error) throw error;
  return data as string;
}

export async function removeRelation(id: string): Promise<void> {
  if (IS_PREVIEW) {
    mockRelations = mockRelations.filter((r) => r.id !== id);
    return;
  }
  const { error } = await supabase.rpc("remove_relation", { p_id: id });
  if (error) throw error;
}

export async function bulkAddRelations(
  pairs: Array<{
    sourceType: EntityType;
    sourceId: string;
    targetType: EntityType;
    targetId: string;
    relationType: RelationType;
  }>,
): Promise<string[]> {
  if (IS_PREVIEW) {
    const ids: string[] = [];
    for (const p of pairs) ids.push(await addRelation(p));
    return ids;
  }
  const payload = pairs.map((p) => ({
    source_type: p.sourceType,
    source_id: p.sourceId,
    target_type: p.targetType,
    target_id: p.targetId,
    relation_type: p.relationType,
  }));
  const { data, error } = await supabase.rpc("bulk_add_relations", { p_pairs: payload });
  if (error) throw error;
  return (data ?? []) as string[];
}

export async function listRelations(p_type: EntityType, p_id: string): Promise<Relation[]> {
  if (IS_PREVIEW) {
    return mockRelations
      .filter(
        (r) =>
          (r.source_type === p_type && r.source_id === p_id) ||
          (r.target_type === p_type && r.target_id === p_id),
      )
      .map((r) => toRelation(r, p_type, p_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase.rpc("list_relations", { p_type, p_id });
  if (error) throw error;
  return ((data ?? []) as unknown[]).map((row) => row as Relation);
}

// ─── Minimal search across projects/tasks/requests (FTS comes later) ───
export async function searchEntities(
  query: string,
  entityTypes: EntityType[],
  limit = 20,
): Promise<RelationRef[]> {
  if (!query.trim()) return [];
  if (IS_PREVIEW) return [];

  const q = `%${query.trim()}%`;
  const results: RelationRef[] = [];

  const promises: Promise<void>[] = [];

  if (entityTypes.includes("project")) {
    promises.push(
      (async () => {
        const { data } = await supabase.from("projects").select("id,title").ilike("title", q).limit(limit);
        (data ?? []).forEach((r) =>
          results.push({ entityType: "project", entityId: r.id, title: r.title }),
        );
      })(),
    );
  }
  if (entityTypes.includes("task")) {
    promises.push(
      (async () => {
        const { data } = await supabase.from("tasks").select("id,title").ilike("title", q).limit(limit);
        (data ?? []).forEach((r) =>
          results.push({ entityType: "task", entityId: r.id, title: r.title }),
        );
      })(),
    );
  }
  if (entityTypes.includes("request")) {
    promises.push(
      (async () => {
        const { data } = await supabase
          .from("requests")
          .select("id,title,request_number")
          .ilike("title", q)
          .limit(limit);
        (data ?? []).forEach((r) =>
          results.push({
            entityType: "request",
            entityId: r.id,
            title: r.title,
            subtitle: r.request_number ?? undefined,
          }),
        );
      })(),
    );
  }

  await Promise.all(promises);
  return results.slice(0, limit);
}