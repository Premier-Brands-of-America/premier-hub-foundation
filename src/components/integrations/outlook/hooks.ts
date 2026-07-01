// ============================================================================
// hooks.ts — TanStack Query hooks for the Outlook integration (INTEG-OUTLOOK)
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchConnection,
  fetchEventsInRange,
  fetchProjectEvents,
  fetchUnlinkedEvents,
  linkEvent,
  searchMail,
  startConnect,
  syncCalendar,
  type CalendarEvent,
  type MailMessage,
  type MsConnection,
} from "./outlook-api";

const keys = {
  connection: ["outlook", "connection"] as const,
  projectEvents: (projectId: string) => ["outlook", "events", "project", projectId] as const,
  unlinked: ["outlook", "events", "unlinked"] as const,
  range: (startIso: string, endIso: string) => ["outlook", "events", "range", startIso, endIso] as const,
};

export function useOutlookConnection() {
  return useQuery<MsConnection | null>({
    queryKey: keys.connection,
    queryFn: fetchConnection,
    staleTime: 60_000,
  });
}

export function useProjectCalendarEvents(projectId: string, enabled = true) {
  return useQuery<CalendarEvent[]>({
    queryKey: keys.projectEvents(projectId),
    queryFn: () => fetchProjectEvents(projectId),
    enabled: enabled && !!projectId,
  });
}

export function useUnlinkedEvents(enabled = true) {
  return useQuery<CalendarEvent[]>({
    queryKey: keys.unlinked,
    queryFn: () => fetchUnlinkedEvents(),
    enabled,
  });
}

/** Calendar events whose start falls in [startIso, endIso). Used by the dashboard week card. */
export function useCalendarEventsInRange(startIso: string, endIso: string, enabled = true) {
  return useQuery<CalendarEvent[]>({
    queryKey: keys.range(startIso, endIso),
    queryFn: () => fetchEventsInRange(startIso, endIso),
    enabled,
    staleTime: 60_000,
  });
}

/**
 * Silent calendar sync for the dashboard: pulls Outlook events, then refreshes
 * any cached range queries so the week view populates. No success toast (unlike
 * useSyncCalendar) since it runs automatically on the dashboard.
 */
export function useBackgroundCalendarSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncCalendar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outlook", "events", "range"] });
    },
  });
}

export function useConnectOutlook() {
  return useMutation({
    mutationFn: () => startConnect(window.location.origin + window.location.pathname),
    onSuccess: ({ authorizeUrl }) => {
      window.location.href = authorizeUrl;
    },
    onError: (e: unknown) => {
      toast.error("Couldn't start Outlook connection", {
        description: e instanceof Error ? e.message : undefined,
      });
    },
  });
}

export function useSyncCalendar(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncCalendar,
    onSuccess: ({ synced }) => {
      toast.success(`Synced ${synced} event${synced === 1 ? "" : "s"} from Outlook`);
      qc.invalidateQueries({ queryKey: keys.projectEvents(projectId) });
      qc.invalidateQueries({ queryKey: keys.unlinked });
    },
    onError: (e: unknown) => {
      toast.error("Calendar sync failed", {
        description: e instanceof Error ? e.message : undefined,
      });
    },
  });
}

export function useLinkEvent(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: linkEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.projectEvents(projectId) });
      qc.invalidateQueries({ queryKey: keys.unlinked });
    },
    onError: (e: unknown) => {
      toast.error("Couldn't update meeting link", {
        description: e instanceof Error ? e.message : undefined,
      });
    },
  });
}

export function useMailSearch() {
  return useMutation<{ messages: MailMessage[] }, unknown, string>({
    mutationFn: (query: string) => searchMail(query),
    onError: (e: unknown) => {
      toast.error("Email search failed", {
        description: e instanceof Error ? e.message : undefined,
      });
    },
  });
}
