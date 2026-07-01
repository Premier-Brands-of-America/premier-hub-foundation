/**
 * Planner user directory — the assignee / @mention picker source.
 * In preview it returns the demo users (kept in sync with the demo board);
 * in production it queries the real people directory (profiles).
 */
import { useQuery } from "@tanstack/react-query";
import { fetchDirectory } from "@/lib/directory";
import { isPreviewEnvironment } from "@/lib/environment";
import { DEMO_USERS } from "./demoData";

const IS_PREVIEW = isPreviewEnvironment();

export function usePlannerUsers(): { id: string; name: string }[] {
  const query = useQuery({
    queryKey: ["directory"],
    queryFn: fetchDirectory,
    enabled: !IS_PREVIEW,
  });

  if (IS_PREVIEW) return DEMO_USERS;
  return (query.data ?? []).map((p) => ({
    id: p.user_id,
    name: p.full_name ?? p.email ?? p.user_id,
  }));
}
