// Preview/demo state for Microsoft 365 connections shown on the Profile page.
// Real OAuth (ms-oauth-start/callback + the ms_connections token store) is
// deploy-gated — see BLOCKERS.md. In preview we simulate connect/disconnect so
// the Integrations UI and the first-time onboarding prompt are clickable.

export type MsServiceId = "outlook" | "teams" | "sharepoint" | "onedrive";

export interface MsServiceMeta {
  id: MsServiceId;
  name: string;
  description: string;
}

export const MS_SERVICES: MsServiceMeta[] = [
  { id: "outlook", name: "Outlook", description: "Calendar events & email context" },
  { id: "teams", name: "Teams", description: "Meeting transcripts & summaries" },
  { id: "sharepoint", name: "SharePoint", description: "Auto request folders & files" },
  { id: "onedrive", name: "OneDrive", description: "Personal file attachments" },
];

const keyFor = (userId: string) => `phv2:ms-connections:${userId}`;

/** Returns the set of connected service ids for a user (demo). */
export function getConnections(userId: string | null | undefined): MsServiceId[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    return (JSON.parse(raw) as MsServiceId[]).filter((id) =>
      MS_SERVICES.some((s) => s.id === id),
    );
  } catch {
    return [];
  }
}

function save(userId: string, ids: MsServiceId[]): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(ids));
  } catch {
    /* noop */
  }
}

export function connectService(userId: string, id: MsServiceId): MsServiceId[] {
  const next = Array.from(new Set([...getConnections(userId), id]));
  save(userId, next);
  return next;
}

export function disconnectService(userId: string, id: MsServiceId): MsServiceId[] {
  const next = getConnections(userId).filter((s) => s !== id);
  save(userId, next);
  return next;
}

const ONBOARD_KEY = (userId: string) => `phv2:ms-onboard-dismissed:${userId}`;

export function isOnboardingDismissed(userId: string | null | undefined): boolean {
  if (!userId) return true;
  try {
    return localStorage.getItem(ONBOARD_KEY(userId)) === "1";
  } catch {
    return false;
  }
}

export function dismissOnboarding(userId: string): void {
  try {
    localStorage.setItem(ONBOARD_KEY(userId), "1");
  } catch {
    /* noop */
  }
}
