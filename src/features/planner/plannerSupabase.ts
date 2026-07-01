// ============================================================================
// plannerSupabase.ts — client data layer for the Planner / Kanban (PRODUCTION)
// ----------------------------------------------------------------------------
// Reads/writes the real `projects`, `project_buckets`, `tasks` (+ `profiles`
// for assignee names) via the RLS-scoped browser client. RLS requires the user
// to be a project stakeholder (writes) / able to view the project (reads).
//
// SHARED generated types (src/integrations/supabase/types.ts) are off-limits and
// don't yet include the kanban columns, so we cast once at the `.from()`
// boundary and declare local row shapes here. Never edit types.ts.
//
// STATUS MAPPING — base `tasks.status` is text CHECK (status IN ('active',
// 'complete')); the kanban migration did NOT add not_started/in_progress.
//   read : complete -> completed | active & percent_complete>0 -> in_progress
//                                 | otherwise -> not_started
//   write: completed -> complete | otherwise -> active
// (progress is mirrored into percent_complete so the round-trip is stable).
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { DueReasonType } from "@/lib/dueDate";
import type { Board, Bucket, CardStatus, PlannerCard } from "./types";

// SHARED generated types (types.ts) are off-limits and don't yet include these
// columns, so cast once at the `.from()` boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

// ─── Local row shapes (mirror migration 20260627120000) ─────────────────────
interface BucketRow {
  id: string;
  name: string;
  position: number;
}

interface ChecklistItemRow {
  id: string;
  text: string;
  done: boolean;
}

interface TaskRow {
  id: string;
  bucket_id: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  percent_complete: number | null;
  priority: string | null;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  due_reason: string | null;
  due_reason_type: string | null;
  due_linked_event: string | null;
  meeting_required: boolean | null;
  checklist: ChecklistItemRow[] | null;
  position: number | null;
}

// ─── Status mapping ─────────────────────────────────────────────────────────
function readStatus(row: Pick<TaskRow, "status" | "percent_complete">): CardStatus {
  if (row.status === "complete") return "completed";
  if ((row.percent_complete ?? 0) > 0) return "in_progress";
  return "not_started";
}

/** Fields to persist for a PlannerCard.status. */
function writeStatus(status?: CardStatus): { status: string; percent_complete: number } {
  if (status === "completed") return { status: "complete", percent_complete: 100 };
  if (status === "in_progress") return { status: "active", percent_complete: 50 };
  return { status: "active", percent_complete: 0 };
}

// ─── Row → domain mapping ───────────────────────────────────────────────────
function toBucket(row: BucketRow): Bucket {
  return { id: row.id, name: row.name, position: row.position ?? 0 };
}

function toCard(row: TaskRow, nameById: Map<string, string>): PlannerCard {
  const dueJustification =
    row.due_reason || row.due_reason_type
      ? {
          reason: row.due_reason ?? "",
          type: (row.due_reason_type as DueReasonType) ?? "Other",
          linkedEvent: row.due_linked_event ?? null,
        }
      : null;
  return {
    id: row.id,
    bucketId: row.bucket_id ?? "",
    kind: "task",
    title: row.title ?? "Untitled",
    description: row.description ?? undefined,
    status: readStatus(row),
    priority: (row.priority as PlannerCard["priority"]) ?? "medium",
    assigneeId: row.assignee_id ?? null,
    assigneeName: row.assignee_id ? nameById.get(row.assignee_id) ?? null : null,
    startDate: row.start_date ?? null,
    dueDate: row.due_date ?? null,
    dueJustification,
    meetingRequired: row.meeting_required ?? false,
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    attachments: [],
    comments: [],
    position: row.position ?? 0,
  };
}

// ─── Reads ──────────────────────────────────────────────────────────────────
export async function fetchBoard(projectId: string): Promise<Board> {
  const [project, buckets, tasks] = await Promise.all([
    sb.from("projects").select("id, title").eq("id", projectId).maybeSingle(),
    sb
      .from("project_buckets")
      .select("id, name, position")
      .eq("project_id", projectId)
      .eq("is_archived", false)
      .order("position", { ascending: true }),
    sb
      .from("tasks")
      .select(
        "id, bucket_id, title, description, status, percent_complete, priority, assignee_id, start_date, due_date, due_reason, due_reason_type, due_linked_event, meeting_required, checklist, position",
      )
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
  ]);

  if (project.error) throw project.error;
  if (buckets.error) throw buckets.error;
  if (tasks.error) throw tasks.error;

  const taskRows = (tasks.data as TaskRow[]) ?? [];

  // Resolve assignee names in one query.
  const assigneeIds = [...new Set(taskRows.map((t) => t.assignee_id).filter(Boolean))] as string[];
  const nameById = new Map<string, string>();
  if (assigneeIds.length) {
    const { data: profiles } = await sb
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", assigneeIds);
    for (const p of (profiles as { user_id: string; full_name: string | null; email: string | null }[]) ?? []) {
      nameById.set(p.user_id, p.full_name ?? p.email ?? p.user_id);
    }
  }

  return {
    projectId,
    projectTitle: (project.data as { title?: string } | null)?.title ?? "Project",
    buckets: ((buckets.data as BucketRow[]) ?? []).map(toBucket),
    cards: taskRows.map((t) => toCard(t, nameById)),
  };
}

// ─── Bucket CRUD ──────────────────────────────────────────────────────────
export async function insertBucket(input: {
  id: string;
  projectId: string;
  name: string;
  position: number;
}): Promise<void> {
  const { error } = await sb.from("project_buckets").insert({
    id: input.id,
    project_id: input.projectId,
    name: input.name,
    position: input.position,
  });
  if (error) throw error;
}

export async function updateBucketName(id: string, name: string): Promise<void> {
  const { error } = await sb.from("project_buckets").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteBucket(id: string): Promise<void> {
  const { error } = await sb.from("project_buckets").delete().eq("id", id);
  if (error) throw error;
}

/** Persist the new ordering for a set of buckets. */
export async function updateBucketPositions(buckets: Bucket[]): Promise<void> {
  await Promise.all(
    buckets.map((b) =>
      sb
        .from("project_buckets")
        .update({ position: b.position })
        .eq("id", b.id)
        .then(({ error }: { error: unknown }) => {
          if (error) throw error;
        }),
    ),
  );
}

// ─── Task/card CRUD ─────────────────────────────────────────────────────────
export async function insertCard(input: {
  card: PlannerCard;
  projectId: string;
  /** Owner of the row — base `tasks` RLS requires user_id = auth.uid() on insert. */
  userId: string;
}): Promise<void> {
  const c = input.card;
  const { error } = await sb.from("tasks").insert({
    id: c.id,
    user_id: input.userId,
    project_id: input.projectId,
    bucket_id: c.bucketId,
    title: c.title,
    description: c.description ?? null,
    priority: c.priority,
    assignee_id: c.assigneeId ?? null,
    start_date: c.startDate ?? null,
    due_date: c.dueDate ?? null,
    due_reason: c.dueJustification?.reason ?? null,
    due_reason_type: c.dueJustification?.type ?? null,
    due_linked_event: c.dueJustification?.linkedEvent ?? null,
    meeting_required: c.meetingRequired ?? false,
    checklist: c.checklist ?? [],
    position: c.position,
    ...writeStatus(c.status),
  });
  if (error) throw error;
}

/** Persist a patch to an existing task row (only columns that exist). */
export async function updateCardRow(id: string, patch: Partial<PlannerCard>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {};
  if (patch.bucketId !== undefined) row.bucket_id = patch.bucketId;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description ?? null;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId ?? null;
  if (patch.startDate !== undefined) row.start_date = patch.startDate ?? null;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate ?? null;
  if (patch.dueJustification !== undefined) {
    row.due_reason = patch.dueJustification?.reason ?? null;
    row.due_reason_type = patch.dueJustification?.type ?? null;
    row.due_linked_event = patch.dueJustification?.linkedEvent ?? null;
  }
  if (patch.meetingRequired !== undefined) row.meeting_required = patch.meetingRequired ?? false;
  if (patch.checklist !== undefined) row.checklist = patch.checklist ?? [];
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.status !== undefined) Object.assign(row, writeStatus(patch.status));

  if (Object.keys(row).length === 0) return;
  const { error } = await sb.from("tasks").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteCardRow(id: string): Promise<void> {
  const { error } = await sb.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

/** Persist a card move (bucket + position). */
export async function moveCardRow(id: string, bucketId: string, position: number): Promise<void> {
  const { error } = await sb
    .from("tasks")
    .update({ bucket_id: bucketId, position })
    .eq("id", id);
  if (error) throw error;
}
