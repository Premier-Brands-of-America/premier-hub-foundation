/**
 * useMyDay — the data model behind Home / "My Day".
 *
 * It does NOT invent new Supabase calls. It reuses the exact services and
 * preview/prod branches the dashboard cards already speak:
 *   - Art requests via `services/requests.listQueue` (the same source the
 *     ArtRequestQueueCard reads; demo store in preview, RLS query in prod).
 *   - Tasks via the shared `useTasksFlat()` `["tasks"]` infinite query — the
 *     same cache /tasks uses, so a toggle here and a toggle there never
 *     disagree and realtime `tasks` invalidations refresh Home for free.
 *
 * Everything is normalized onto one `DayItem` shape so the greeting KPIs, the
 * "Needs your attention" / "Today" sections, and the Day Rail all read from a
 * single derivation instead of three ad-hoc filters.
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTasksFlat } from "@/hooks/use-queries";
import { listQueue } from "@/services/requests";
import { requestCustomer, requestLead } from "@/lib/requestMeta";
import { daysUntil } from "@/lib/dueDate";
import { requestProofState, taskProofState, isTerminal, type ProofState } from "@/components/pressroom";
import type { ArtRequest } from "@/types/request";
import type { Task } from "@/types/tasks";

/** One work item on Home, normalized from a task or an art request. */
export interface DayItem {
  key: string;
  kind: "task" | "request";
  title: string;
  state: ProofState;
  /** ISO date/timestamp, or null when undated. */
  dueDate: string | null;
  /** Project / brand chip text. */
  context: string | null;
  /** Assignee for the trailing avatar. */
  assignee: { name: string; seed: string } | null;
  /** Machine id: ART-1003 / TSK-478. */
  code: string | null;
  /** Route the row/rail card opens. */
  to: string;
  /** The underlying task (present only for kind === "task"), for toggling. */
  task?: Task;
  /** Whether the request is idle (open + waiting on info / stale intake). */
  idle?: boolean;
}

/** Resolve the request owner to an avatar-ready assignee (shared portal helper). */
function requestAssignee(req: ArtRequest): DayItem["assignee"] {
  const lead = requestLead(req);
  if (lead.key === "__unassigned__") return null;
  return { name: lead.name, seed: lead.key };
}

/** Requests that are open but stalled: explicitly waiting on info. */
function isIdleRequest(req: ArtRequest): boolean {
  return req.status === "waiting_on_info";
}

function requestToItem(req: ArtRequest): DayItem {
  return {
    key: `req-${req.id}`,
    kind: "request",
    title: req.title,
    state: requestProofState(req.status),
    dueDate: req.due_date,
    context: requestCustomer(req),
    assignee: requestAssignee(req),
    code: req.request_number,
    to: `/requests/${req.id}`,
    idle: isIdleRequest(req),
  };
}

function taskToItem(task: Task): DayItem {
  return {
    key: `task-${task.id}`,
    kind: "task",
    title: task.title,
    state: taskProofState(task.status, task.percent_complete),
    dueDate: task.due_date,
    context: null,
    assignee: null,
    code: null,
    to: "/tasks",
    task,
  };
}

/** Non-terminal, still-open work. */
function isOpen(item: DayItem): boolean {
  return !isTerminal(item.state);
}

export interface MyDay {
  isLoading: boolean;
  /** Overdue + idle open work, most urgent first. */
  attention: DayItem[];
  /** Everything due today (tasks + requests), incl. items already done today. */
  today: DayItem[];
  /** Open team work due later this week (after today), not already in attention. */
  teamWeek: DayItem[];
  /** All open items with a due date, for the Day Rail spine. */
  dueItems: DayItem[];
  counts: { overdue: number; dueToday: number; teamQueue: number };
}

/**
 * Assemble the day. Requests use their own query key (a read-only projection of
 * the same `listQueue` service the card uses) so we never reshape the card's
 * cache; tasks piggyback on the shared `["tasks"]` cache.
 */
export function useMyDay(): MyDay {
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id;

  const requestsQuery = useQuery({
    queryKey: ["my-day", "requests", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DayItem[]> => {
      // listQueue already excludes complete/archived (same filter as the card).
      const open = await listQueue();
      return open.map(requestToItem);
    },
  });

  const { tasks, isLoading: tasksLoading } = useTasksFlat();

  const requests = requestsQuery.data ?? [];
  const taskItems = tasks.map(taskToItem);

  const overdue = [...requests, ...taskItems].filter(
    (i) => isOpen(i) && i.dueDate != null && daysUntil(i.dueDate) < 0,
  );
  const idle = requests.filter((i) => i.idle && !overdue.some((o) => o.key === i.key));

  const attention = [...overdue, ...idle].sort(
    (a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
  );

  const today = [...requests, ...taskItems]
    .filter((i) => i.dueDate != null && daysUntil(i.dueDate) === 0)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  const teamWeek = requests
    .filter((i) => {
      if (!isOpen(i) || i.dueDate == null) return false;
      const d = daysUntil(i.dueDate);
      return d > 0 && d <= 6 && !attention.some((a) => a.key === i.key);
    })
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  const dueItems = [...requests, ...taskItems]
    .filter((i) => isOpen(i) && i.dueDate != null)
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  return {
    // The requests query is disabled until we have a user id; treat "no user
    // yet" as not-loading so the shell renders its own auth gate instead of a
    // perpetual skeleton.
    isLoading: !!userId && (requestsQuery.isLoading || tasksLoading),
    attention,
    today,
    teamWeek,
    dueItems,
    counts: {
      overdue: overdue.length,
      dueToday: today.filter(isOpen).length,
      teamQueue: requests.filter(isOpen).length,
    },
  };
}
