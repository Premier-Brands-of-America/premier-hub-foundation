/**
 * Planner / Kanban domain types. Shared by the pure board operations
 * (`plannerBoard.ts`), the demo data, the persistence hook, and the UI.
 */
import type { DueJustification } from "@/lib/dueDate";

export type CardPriority = "low" | "medium" | "high" | "urgent";
export type CardStatus = "not_started" | "in_progress" | "completed";
export type CardKind = "task" | "request" | "project";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface CardAttachment {
  id: string;
  name: string;
  mime: string;
  /** Object/preview URL for image thumbnails (data/blob/remote). */
  url: string;
}

export interface CardComment {
  id: string;
  authorName: string;
  authorId: string;
  /** Body may contain explicit `@[Name](id)` mention tokens. */
  body: string;
  createdAt: string;
}

export interface PlannerCard {
  id: string;
  bucketId: string;
  kind: CardKind;
  title: string;
  description?: string;
  status: CardStatus;
  priority: CardPriority;
  assigneeId?: string | null;
  assigneeName?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  dueJustification?: DueJustification | null;
  meetingRequired?: boolean;
  checklist: ChecklistItem[];
  attachments: CardAttachment[];
  comments: CardComment[];
  /** Art-request specifics (only set when kind === "request"). */
  customer?: string | null;
  keyPoints?: string[];
  position: number;
}

export interface Bucket {
  id: string;
  name: string;
  position: number;
}

export interface Board {
  projectId: string;
  projectTitle: string;
  buckets: Bucket[];
  cards: PlannerCard[];
}
