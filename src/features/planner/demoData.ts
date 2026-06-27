/**
 * Demo board data for preview/review mode. Lets the owner see and interact with
 * the Kanban/Planner UI without a live database (mock auth → empty RLS results).
 * Mirrors a realistic art-department workflow incl. routing + due-date urgency.
 */
import type { Board, PlannerCard } from "./types";

/** Inline SVG thumbnail so image galleries render fully offline. */
function swatch(label: string, hue: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='hsl(${hue},70%,55%)'/>
      <stop offset='1' stop-color='hsl(${(hue + 40) % 360},70%,42%)'/>
    </linearGradient></defs>
    <rect width='160' height='120' fill='url(#g)'/>
    <text x='80' y='66' font-family='sans-serif' font-size='14' fill='white'
      text-anchor='middle' font-weight='600'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Relative offsets from "today" keep urgency colors meaningful regardless of date.
function dayOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const cards: PlannerCard[] = [
  {
    id: "demo-c1",
    bucketId: "demo-b1",
    kind: "request",
    title: "Kroger summer endcap refresh",
    description: "Refresh the seasonal endcap artwork for the summer reset.",
    status: "not_started",
    priority: "high",
    assigneeId: "u-jaclyn",
    assigneeName: "Jaclyn",
    dueDate: dayOffset(-2), // overdue (red)
    dueJustification: {
      reason: "Printer hard deadline for reset",
      type: "Deadline",
      linkedEvent: dayOffset(-2),
    },
    customer: "Kroger",
    keyPoints: ["Match 2026 seasonal palette", "Include QR to loyalty signup"],
    meetingRequired: true,
    checklist: [
      { id: "k1", text: "Gather brand assets", done: true },
      { id: "k2", text: "Draft v1", done: false },
    ],
    attachments: [
      { id: "a1", name: "reference-shelf.svg", mime: "image/svg+xml", url: swatch("Shelf ref", 12) },
      { id: "a2", name: "moodboard.svg", mime: "image/svg+xml", url: swatch("Mood", 200) },
    ],
    comments: [
      {
        id: "cm1",
        authorId: "u-req",
        authorName: "Taylor (Requester)",
        body: "Flagging this is time-sensitive @[Jaclyn](u-jaclyn) — printer needs files Friday.",
        createdAt: dayOffset(-4) + "T14:00:00Z",
      },
    ],
    position: 0,
  },
  {
    id: "demo-c2",
    bucketId: "demo-b1",
    kind: "request",
    title: "Master Dielines — new carton spec",
    description: "Structural dieline update; multi-owner customer (manager chosen at intake).",
    status: "not_started",
    priority: "medium",
    assigneeId: "u-megan",
    assigneeName: "Megan",
    dueDate: dayOffset(2), // due soon (amber)
    dueJustification: { reason: "Vendor tooling review", type: "Meeting", linkedEvent: dayOffset(2) },
    customer: "Master Dielines",
    keyPoints: ["Confirm board thickness", "Export AI + PDF"],
    checklist: [],
    attachments: [{ id: "a3", name: "carton.svg", mime: "image/svg+xml", url: swatch("Carton", 280) }],
    comments: [],
    position: 1,
  },
  {
    id: "demo-c3",
    bucketId: "demo-b2",
    kind: "task",
    title: "Trojan promo banner set",
    description: "Three web banners for the Q3 promo.",
    status: "in_progress",
    priority: "urgent",
    assigneeId: "u-dan",
    assigneeName: "Dan",
    dueDate: dayOffset(5),
    dueJustification: { reason: "Campaign launch", type: "Launch", linkedEvent: dayOffset(7) },
    customer: "Trojan",
    keyPoints: ["728x90, 300x250, 160x600"],
    checklist: [
      { id: "k3", text: "Leaderboard", done: true },
      { id: "k4", text: "MPU", done: false },
      { id: "k5", text: "Skyscraper", done: false },
    ],
    attachments: [],
    comments: [
      {
        id: "cm2",
        authorId: "u-dan",
        authorName: "Dan",
        body: "Leaderboard done, sharing for review.",
        createdAt: dayOffset(-1) + "T09:30:00Z",
      },
    ],
    position: 0,
  },
  {
    id: "demo-c4",
    bucketId: "demo-b2",
    kind: "task",
    title: "Target back-to-school signage",
    status: "in_progress",
    priority: "high",
    assigneeId: "u-megan",
    assigneeName: "Megan",
    dueDate: dayOffset(12),
    customer: "Target",
    checklist: [],
    attachments: [{ id: "a4", name: "signage.svg", mime: "image/svg+xml", url: swatch("Signage", 110) }],
    comments: [],
    position: 1,
  },
  {
    id: "demo-c5",
    bucketId: "demo-b3",
    kind: "request",
    title: "CVS Caring Mill label proof",
    status: "completed",
    priority: "low",
    assigneeId: "u-jaclyn",
    assigneeName: "Jaclyn",
    dueDate: dayOffset(-10),
    customer: "Caring Mill",
    checklist: [{ id: "k6", text: "Final approval", done: true }],
    attachments: [],
    comments: [],
    position: 0,
  },
];

/** Demo directory for @mentions and assignee pickers in preview mode. */
export const DEMO_USERS: { id: string; name: string }[] = [
  { id: "u-jaclyn", name: "Jaclyn" },
  { id: "u-megan", name: "Megan" },
  { id: "u-dan", name: "Dan" },
  { id: "u-req", name: "Taylor (Requester)" },
];

export function demoBoard(): Board {
  return {
    projectId: "demo-project",
    projectTitle: "Art Department — Active Work",
    buckets: [
      { id: "demo-b1", name: "Intake", position: 0 },
      { id: "demo-b2", name: "In Progress", position: 1 },
      { id: "demo-b3", name: "Approved", position: 2 },
    ],
    cards,
  };
}
