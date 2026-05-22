import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import type { PeopleHit, SearchEntityType, SearchHit } from "@/types/search";

const IS_PREVIEW = isPreviewEnvironment();

// ─── Preview mock data ───
const MOCK_HITS: SearchHit[] = [
  { entity_type: "project", id: "mock-p-1", title: "Q1 Brand Refresh", snippet: "Refresh the brand <b>design</b> system across all surfaces.", rank: 0.9 },
  { entity_type: "project", id: "mock-p-2", title: "Holiday Campaign 2026", snippet: "Cross-channel <b>campaign</b> rollout.", rank: 0.8 },
  { entity_type: "task",    id: "mock-t-1", title: "Draft launch checklist", snippet: "Coordinate marketing and <b>design</b> deliverables.", rank: 0.75 },
  { entity_type: "task",    id: "mock-t-2", title: "Review label proofs", snippet: "Inspect color proofs and signoff.", rank: 0.7 },
  { entity_type: "request", id: "mock-r-1", title: "ART-2026-0042 · Trade show booth", snippet: "<b>Booth</b> graphics for industry expo.", rank: 0.85 },
  { entity_type: "page",    id: "mock-pg-1", title: "Brand Guidelines", snippet: "Logo, color, and typography <b>guidelines</b>.", rank: 0.78 },
];

const MOCK_PEOPLE: PeopleHit[] = [
  { user_id: "mock-user-1", full_name: "Alex Designer", email: "alex@example.com", role: "designer", department: "Creative" },
  { user_id: "mock-user-2", full_name: "Jamie Requester", email: "jamie@example.com", role: "requester", department: "Marketing" },
];

function fuzzyFilter(q: string, hits: SearchHit[]): SearchHit[] {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  return hits.filter(
    (h) =>
      h.title.toLowerCase().includes(term) ||
      h.snippet.toLowerCase().includes(term.replace(/[^a-z0-9]/g, "")),
  );
}

export async function searchAll(
  q: string,
  types?: SearchEntityType[],
  limit = 25,
): Promise<SearchHit[]> {
  const query = q.trim();
  if (!query) return [];
  if (IS_PREVIEW) {
    const filtered = fuzzyFilter(query, MOCK_HITS).filter(
      (h) => !types || types.includes(h.entity_type),
    );
    return filtered.slice(0, limit);
  }
  const { data, error } = await supabase.rpc("search_all", {
    p_query: query,
    p_types: types ?? undefined,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as SearchHit[];
}

export async function searchFuzzy(q: string, limit = 10): Promise<SearchHit[]> {
  const query = q.trim();
  if (!query) return [];
  if (IS_PREVIEW) {
    return fuzzyFilter(query, MOCK_HITS).slice(0, limit);
  }
  const { data, error } = await supabase.rpc("search_fuzzy", {
    p_query: query,
    p_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as Array<{ entity_type: string; id: string; title: string; similarity: number }>).map(
    (r) => ({
      entity_type: r.entity_type as SearchEntityType,
      id: r.id,
      title: r.title,
      snippet: "",
      rank: r.similarity,
    }),
  );
}

export async function searchPeople(q: string, limit = 10): Promise<PeopleHit[]> {
  const query = q.trim();
  if (!query) return [];
  if (IS_PREVIEW) {
    const term = query.toLowerCase();
    return MOCK_PEOPLE.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term),
    ).slice(0, limit);
  }
  const { data, error } = await supabase.rpc("search_people", {
    p_query: query,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as PeopleHit[];
}

/**
 * Unified consumer: tries FTS first; falls back to fuzzy when FTS returns 0
 * and query length >= 3.
 */
export async function searchEntities(
  q: string,
  types?: SearchEntityType[],
  limit = 20,
): Promise<SearchHit[]> {
  const query = q.trim();
  if (!query) return [];
  const hits = await searchAll(query, types, limit);
  if (hits.length > 0 || query.length < 3) return hits;
  const fuzzy = await searchFuzzy(query, limit);
  return types ? fuzzy.filter((h) => types.includes(h.entity_type)) : fuzzy;
}