import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import { demoListAudit, type AuditArea, type AuditEntry } from "@/lib/demoAuditStore";

/** Infer the app area from the audited entity_type (production rows only carry
 *  a free-text entity_type). Falls back to "admin" for unknown kinds. */
function inferArea(entityType: string): AuditArea {
  const t = entityType.toLowerCase();
  if (t.includes("request")) return "request";
  if (t.includes("task")) return "task";
  if (t.includes("project")) return "project";
  if (t.includes("page")) return "page";
  if (t.includes("user") || t.includes("session")) return "auth";
  return "admin";
}

/**
 * App-wide audit feed. In preview this returns a seeded cross-app demo feed;
 * in production it reads `public.audit_log` (RLS-scoped to admins, joined to the
 * actor profile). Production rows are sparser than the demo shape — see
 * DECISIONS.md for the column mapping and its limitations.
 */
async function fetchAudit(): Promise<AuditEntry[]> {
  if (isPreviewEnvironment()) return demoListAudit();

  // The audit_log table isn't in the generated Supabase types; query loosely.
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        order: (c: string, o: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
        };
      };
    };
  })
    .from("audit_log")
    .select("id, created_at, actor_id, action, entity_type, entity_id, actor:profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const actor = (row.actor ?? {}) as { full_name?: string; email?: string };
    const entityType = String(row.entity_type ?? "Entity");
    const action = String(row.action ?? "");
    return {
      id: String(row.id),
      created_at: String(row.created_at),
      actor_id: String(row.actor_id ?? ""),
      actor_name: actor.full_name ?? "Unknown",
      actor_email: actor.email ?? "",
      area: inferArea(entityType),
      action_kind: action,
      action: action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      entity_type: entityType,
      entity_label: String(row.entity_id ?? ""),
    } satisfies AuditEntry;
  });
}

export function useAuditLog() {
  return useQuery({
    queryKey: ["audit-log"],
    queryFn: fetchAudit,
  });
}
