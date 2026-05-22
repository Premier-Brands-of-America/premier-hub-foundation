import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchEntities, searchPeople } from "@/services/searchService";
import type { PeopleHit, SearchEntityType, SearchHit } from "@/types/search";

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function useSearch(
  query: string,
  types?: SearchEntityType[],
  limit = 25,
) {
  const debounced = useDebounced(query, 250);
  const typesKey = types?.slice().sort().join(",") ?? "all";
  return useQuery<SearchHit[]>({
    queryKey: ["search", debounced, typesKey, limit],
    queryFn: () => searchEntities(debounced, types, limit),
    enabled: debounced.trim().length >= 2,
    staleTime: 1000 * 30,
  });
}

export function useSearchPeople(query: string, limit = 10) {
  const debounced = useDebounced(query, 250);
  return useQuery<PeopleHit[]>({
    queryKey: ["search", "people", debounced, limit],
    queryFn: () => searchPeople(debounced, limit),
    enabled: debounced.trim().length >= 2,
    staleTime: 1000 * 30,
  });
}

export { useDebounced };