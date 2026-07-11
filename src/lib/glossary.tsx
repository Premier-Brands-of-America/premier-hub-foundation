/**
 * Central glossary of the hub's computed terms, rendered inside InfoHint "?"
 * tooltips. Keeping the wording here (not inline at each call site) means a
 * term reads the same everywhere and is edited in one place. Each entry is a
 * small JSX block so it can show formulas, weight tables, and emphasis.
 */
import type { ReactNode } from "react";
import { InfoHint } from "@/components/ui/info-hint";

export type GlossaryTerm =
  | "workloadPoints" | "capacity" | "utilization" | "workloadWindow" | "graphWorkload"
  | "proofState" | "smartSort" | "dueHealth" | "intake" | "teamQueue";

/** One-liner: `<GlossaryHint term="utilization" />` renders the shared "?" tooltip. */
export function GlossaryHint({
  term,
  side,
  className,
}: {
  term: GlossaryTerm;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  const g = GLOSSARY[term];
  if (!g) return null;
  return (
    <InfoHint title={g.title} side={side} className={className}>
      {g.body}
    </InfoHint>
  );
}

export const GLOSSARY: Record<string, { title: string; body: ReactNode }> = {
  workloadPoints: {
    title: "Workload Points (WLP)",
    body: (
      <>
        A weight per open item, since the hub tracks no hours. It counts <b>all</b> of a person's
        open work: an art <b>request</b> they lead scores <b>priority × type</b> — urgent <b>3</b>,
        high <b>2</b>, medium <b>1.5</b>, low <b>1</b>, times <b>1.5</b> for a Full Brief (<b>1</b>{" "}
        for Easy); a <b>project</b> counts <b>3</b> if they own it, <b>1.5</b> as a stakeholder;
        and a <b>task</b> assigned to them counts <b>1</b> — the same weights as the graph. Only
        open items count; Done and Archived don't.
      </>
    ),
  },
  capacity: {
    title: "Weekly capacity",
    body: (
      <>
        A planning budget of <b>10 points/week</b> per person — roughly 6–7 medium items, or ~3
        urgent full-briefs. It's a heuristic, <b>not hours</b>. The red line on the chart marks it.
      </>
    ),
  },
  utilization: {
    title: "Utilization",
    body: (
      <>
        A person's open points ÷ their weekly capacity. Colored by band: under 50% has room,
        50–85% healthy (jade), 85–100% near capacity (amber), <b>over 100% over-allocated</b>{" "}
        (vermilion).
      </>
    ),
  },
  workloadWindow: {
    title: "Time window",
    body: (
      <>
        <b>This week</b> counts open items due through Sunday, plus anything overdue and anything
        undated. <b>Next week</b> is the following Mon–Sun. <b>All open</b> ignores due dates.
      </>
    ),
  },
  graphWorkload: {
    title: "Node size = workload",
    body: (
      <>
        A person's circle grows with their <b>total open workload</b> — the same number as the
        Workload report, no matter where the work comes from: art <b>requests</b> they lead
        (priority × type), <b>projects</b> they own (<b>3</b>) or support (<b>1.5</b>), and{" "}
        <b>tasks</b> assigned to them (<b>1</b>). The busiest person in view is the largest; a
        vermilion ring marks someone <b>over capacity</b>.
      </>
    ),
  },
  proofState: {
    title: "Proof state",
    body: (
      <>
        Where a piece of work sits in the pipeline: <b>Intake → In Progress → Proofing → With
        Approver → Done</b>. One shared vocabulary across the list, board, and calendar.
      </>
    ),
  },
  smartSort: {
    title: "Smart order",
    body: (
      <>
        Groups your tasks by urgency — <b>Overdue</b>, <b>Today</b>, <b>This week</b>, <b>Later</b>,
        then undated — so the top of the list is what actually needs you next.
      </>
    ),
  },
  dueHealth: {
    title: "Due-date health",
    body: (
      <>
        Open requests split by deadline: <b>Overdue</b> (past due), <b>Due soon</b> (within 3 days),
        <b> On track</b> (further out), and <b>No date</b> set.
      </>
    ),
  },
  intake: {
    title: "Intake per week",
    body: (
      <>
        How many art requests were <b>submitted</b> each week — arrival rate, not completions. A
        rising line means more work coming in.
      </>
    ),
  },
  teamQueue: {
    title: "Team queue",
    body: (
      <>
        All open art requests across the department, not just yours — what the art team collectively
        owes.
      </>
    ),
  },
};
