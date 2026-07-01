/**
 * People directory helper — the source of truth for the M365 user list used by
 * pickers and share dialogs. In preview it returns the same mock people the rest
 * of the app uses; in real mode it returns the UNION of the M365 org directory
 * (org_directory, synced from Microsoft Graph) and registered profiles, deduped
 * by email so unregistered staff still appear in pickers and the org chart.
 */

import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import type { StakeholderProfile } from "@/types/projects";

const IS_PREVIEW = isPreviewEnvironment();

/** Mock people for preview — kept in sync with StakeholderPicker + PreviewAuthContext. */
export const DIRECTORY_PEOPLE: StakeholderProfile[] = [
  { user_id: "mock-uid-001", full_name: "Jane Doe", email: "jane.doe@premier-brands.com", title: "Project Coordinator", department: "Marketing", manager_email: "manager@premier-brands.com" },
  { user_id: "mock-uid-002", full_name: "Alex Admin", email: "admin@premier-brands.com", title: "IT Director", department: "Information Technology", manager_email: "cto@premier-brands.com" },
  { user_id: "mock-uid-003", full_name: "Dana Diagnostics", email: "diag.user@premier-brands.com", title: "QA Analyst", department: "Quality Assurance", manager_email: "qa-lead@premier-brands.com" },
  { user_id: "mock-uid-004", full_name: "Sam Smith", email: "sam.smith@premier-brands.com", title: "Brand Manager", department: "Marketing", manager_email: "jane.doe@premier-brands.com" },
  { user_id: "mock-uid-005", full_name: "Casey Chen", email: "casey.chen@premier-brands.com", title: "Software Engineer", department: "Information Technology", manager_email: "admin@premier-brands.com" },
  { user_id: "mock-uid-006", full_name: "Riley Roberts", email: "riley.roberts@premier-brands.com", title: "Financial Analyst", department: "Finance", manager_email: "cfo@premier-brands.com" },
  // Synthetic ACL-demo people (Feature 5) so shares to them resolve to names.
  { user_id: "demo-user-other", full_name: "Morgan Vendel", email: "morgan.vendel@premier-brands.com", title: "Account Manager", department: "Sales", manager_email: null },
  { user_id: "demo-user-report", full_name: "Riley Cho", email: "riley.cho@premier-brands.com", title: "Designer", department: "Marketing", manager_email: null },
];

export async function fetchDirectory(): Promise<StakeholderProfile[]> {
  if (IS_PREVIEW) return DIRECTORY_PEOPLE;

  const [profilesRes, dirRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, full_name, email, title, department, manager_email")
      .eq("is_active", true),
    // org_directory is the M365 org cache; may be empty or missing — tolerate errors.
    supabase
      .from("org_directory" as never)
      .select("user_id, full_name, mail, job_title, department, manager_email"),
  ]);

  // Dedup by lower(email). Directory-only people go in first; a registered
  // profile with the same email overwrites it (so avatar/user_id/is_active win).
  const byEmail = new Map<string, StakeholderProfile>();

  if (!dirRes.error && Array.isArray(dirRes.data)) {
    for (const d of dirRes.data as Array<Record<string, unknown>>) {
      const email = (d.mail as string | null) ?? null;
      if (!email) continue; // no email key → can't dedup or match, skip
      byEmail.set(email.toLowerCase(), {
        user_id: (d.user_id as string | null) ?? null,
        full_name: (d.full_name as string | null) ?? null,
        email,
        title: (d.job_title as string | null) ?? null,
        department: (d.department as string | null) ?? null,
        manager_email: (d.manager_email as string | null) ?? null,
      });
    }
  }

  if (!profilesRes.error && Array.isArray(profilesRes.data)) {
    for (const p of profilesRes.data as StakeholderProfile[]) {
      const key = p.email ? p.email.toLowerCase() : `uid:${p.user_id}`;
      byEmail.set(key, p);
    }
  }

  return Array.from(byEmail.values()).sort((a, b) =>
    (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? ""),
  );
}

/** Synchronous best-effort name lookup (preview directory). */
export function resolvePersonFromDirectory(
  userId: string,
  people: StakeholderProfile[] = DIRECTORY_PEOPLE,
): StakeholderProfile | undefined {
  return people.find((p) => p.user_id === userId);
}
