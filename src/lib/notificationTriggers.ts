/**
 * Notification trigger builders — pure functions that turn a domain event into
 * the in-app notification rows (and email payloads) that should be created.
 *
 * Triggers (brief §1.2): assignment, new comment, @mention, status change,
 * approaching/overdue due date. The actual insert/email-send happens in the
 * service / edge-function layer; this module decides WHO gets notified and the
 * message, and is unit-tested in isolation.
 */
import { parseMentions } from "./mentions";
import { dueUrgency } from "./dueDate";

export type EntityType = "project" | "task" | "request";

export interface NotificationRow {
  user_id: string; // recipient
  type: "info" | "success" | "warning";
  title: string;
  message: string;
  link: string;
  // enrichment (new columns; degrade gracefully if absent at runtime)
  source_entity_type?: EntityType;
  source_entity_id?: string;
  action_type?:
    | "assigned"
    | "comment"
    | "mention"
    | "status_change"
    | "due_soon"
    | "overdue";
}

export interface ItemRef {
  entityType: EntityType;
  id: string;
  title: string;
  link: string;
}

function dedupeByUser(rows: NotificationRow[]): NotificationRow[] {
  // One notification per (user, action) for a single event.
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.user_id}:${r.action_type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Assignment: notify the new assignee (skip if assigning to self). */
export function onAssignment(
  item: ItemRef,
  assigneeId: string,
  actorId: string,
): NotificationRow[] {
  if (!assigneeId || assigneeId === actorId) return [];
  return [
    {
      user_id: assigneeId,
      type: "info",
      title: `You were assigned: ${item.title}`,
      message: `You are now the assignee on this ${item.entityType}.`,
      link: item.link,
      source_entity_type: item.entityType,
      source_entity_id: item.id,
      action_type: "assigned",
    },
  ];
}

/**
 * New comment: notify watchers (e.g. assignee, lead) plus everyone @mentioned.
 * Mentions take precedence (mention action) over the generic comment action.
 */
export function onComment(
  item: ItemRef,
  commentText: string,
  actorId: string,
  watchers: string[],
): NotificationRow[] {
  const mentioned = parseMentions(commentText).map((m) => m.userId);
  const mentionRows: NotificationRow[] = mentioned
    .filter((u) => u && u !== actorId)
    .map((u) => ({
      user_id: u,
      type: "info",
      title: `You were mentioned in ${item.title}`,
      message: "You were mentioned in a comment.",
      link: item.link,
      source_entity_type: item.entityType,
      source_entity_id: item.id,
      action_type: "mention",
    }));

  const mentionedSet = new Set(mentioned);
  const watcherRows: NotificationRow[] = watchers
    .filter((u) => u && u !== actorId && !mentionedSet.has(u))
    .map((u) => ({
      user_id: u,
      type: "info",
      title: `New comment on ${item.title}`,
      message: "A new comment was added.",
      link: item.link,
      source_entity_type: item.entityType,
      source_entity_id: item.id,
      action_type: "comment",
    }));

  return dedupeByUser([...mentionRows, ...watcherRows]);
}

/** Status change: notify watchers (not the actor). */
export function onStatusChange(
  item: ItemRef,
  from: string,
  to: string,
  actorId: string,
  watchers: string[],
): NotificationRow[] {
  return dedupeByUser(
    watchers
      .filter((u) => u && u !== actorId)
      .map((u) => ({
        user_id: u,
        type: "info" as const,
        title: `${item.title}: ${from} → ${to}`,
        message: `Status changed from ${from} to ${to}.`,
        link: item.link,
        source_entity_type: item.entityType,
        source_entity_id: item.id,
        action_type: "status_change" as const,
      })),
  );
}

/**
 * Due-date sweep: produce overdue / due-soon reminders for the responsible
 * users. Returns [] when there is no due date or it is comfortably in future.
 */
export function onDueDateSweep(
  item: ItemRef,
  due: string | Date | null | undefined,
  responsible: string[],
  now: Date = new Date(),
): NotificationRow[] {
  const urgency = dueUrgency(due, now);
  if (urgency !== "overdue" && urgency !== "soon") return [];
  const action = urgency === "overdue" ? "overdue" : "due_soon";
  const title =
    urgency === "overdue"
      ? `Overdue: ${item.title}`
      : `Due soon: ${item.title}`;
  return dedupeByUser(
    responsible
      .filter(Boolean)
      .map((u) => ({
        user_id: u,
        type: urgency === "overdue" ? ("warning" as const) : ("info" as const),
        title,
        message:
          urgency === "overdue"
            ? "This item is past its due date."
            : "This item is due soon.",
        link: item.link,
        source_entity_type: item.entityType,
        source_entity_id: item.id,
        action_type: action as NotificationRow["action_type"],
      })),
  );
}
