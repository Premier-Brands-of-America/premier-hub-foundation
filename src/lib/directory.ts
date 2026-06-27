/**
 * People directory helper — the source of truth for the M365 user list used by
 * pickers and share dialogs. In preview it returns the same mock people the rest
 * of the app uses; in real mode it queries profiles.
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
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, email, title, department, manager_email")
    .eq("is_active", true)
    .order("full_name");
  if (error || !data) return [];
  return data as StakeholderProfile[];
}

/** Synchronous best-effort name lookup (preview directory). */
export function resolvePersonFromDirectory(
  userId: string,
  people: StakeholderProfile[] = DIRECTORY_PEOPLE,
): StakeholderProfile | undefined {
  return people.find((p) => p.user_id === userId);
}
