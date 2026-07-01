/**
 * Planner user directory — the assignee / @mention picker source.
 * In preview it returns the demo users (kept in sync with the demo board);
 * in production it queries the real people directory (profiles).
 */
import { useQuery } from "@tanstack/react-query";
import { fetchDirectory } from "@/lib/directory";
import { isPreviewEnvironment } from "@/lib/environment";
import type { StakeholderProfile } from "@/types/projects";
import { DEMO_USERS } from "./demoData";

const IS_PREVIEW = isPreviewEnvironment();

export function usePlannerUsers(): { id: string; name: string }[] {
  const query = useQuery({
    queryKey: ["directory"],
    queryFn: fetchDirectory,
    enabled: !IS_PREVIEW,
  });

  if (IS_PREVIEW) return DEMO_USERS;
  // Only registered people can be assignees / @mention targets; directory-only
  // (not-yet-registered) people have no auth user id, so exclude them here.
  return (query.data ?? [])
    .filter((p): p is StakeholderProfile & { user_id: string } => !!p.user_id)
    .map((p) => ({
      id: p.user_id,
      name: p.full_name ?? p.email ?? p.user_id,
    }));
}
