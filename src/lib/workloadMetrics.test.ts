import { describe, it, expect } from "vitest";
import {
  itemPoints,
  isOpen,
  inWindow,
  inWindowDate,
  isOverdue,
  isOverdueDate,
  weekBounds,
  bandFor,
  buildTeamLoad,
  buildTotalLoad,
  comparePeople,
  PRIORITY_WEIGHT,
  TYPE_MULT,
  DEFAULT_WEEKLY_CAPACITY_WLP,
  UNASSIGNED_KEY,
  type WindowKey,
} from "./workloadMetrics";
import type { ArtRequest, RequestPriority, RequestStatus, RequestType } from "@/types/request";
import type { Task } from "@/types/tasks";
import type { ProjectWithMeta, EnrichedStakeholder } from "@/types/projects";

// A Wednesday, so the containing ISO week is Mon 2026-06-22 .. Sun 2026-06-28,
// and "next week" is Mon 2026-06-29 .. Sun 2026-07-05. Local-midnight math.
const NOW = new Date("2026-06-24T12:00:00");

let seq = 0;
function req(p: {
  priority?: RequestPriority;
  type?: RequestType;
  status?: RequestStatus;
  due?: string | null;
  lead?: string | null; // project_lead / assigned_manager name
}): ArtRequest {
  seq += 1;
  const meta: Record<string, unknown> = {};
  if (p.lead) {
    meta.project_lead = p.lead;
    meta.assigned_manager = p.lead;
  }
  return {
    id: `r-${seq}`,
    request_number: `ART-${seq}`,
    title: `Request ${seq}`,
    description: "",
    request_type: p.type ?? "easy",
    priority: p.priority ?? "medium",
    status: p.status ?? "submitted",
    requester_id: "u",
    department_id: "d",
    assignee_id: null,
    due_date: p.due ?? null,
    submitted_at: null,
    assigned_at: null,
    completed_at: null,
    archived_at: null,
    sharepoint_folder_url: null,
    sharepoint_folder_id: null,
    metadata: meta,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
  };
}

describe("itemPoints — the spec's worked examples", () => {
  it("urgent full_brief = 4.5", () => {
    expect(itemPoints({ priority: "urgent", request_type: "full_brief" })).toBe(4.5);
  });
  it("urgent easy = 3.0", () => {
    expect(itemPoints({ priority: "urgent", request_type: "easy" })).toBe(3);
  });
  it("high full_brief = 3.0", () => {
    expect(itemPoints({ priority: "high", request_type: "full_brief" })).toBe(3);
  });
  it("medium easy = 1.5", () => {
    expect(itemPoints({ priority: "medium", request_type: "easy" })).toBe(1.5);
  });
  it("low easy = 1.0", () => {
    expect(itemPoints({ priority: "low", request_type: "easy" })).toBe(1);
  });
  it("weights/multipliers match the spec tables", () => {
    expect(PRIORITY_WEIGHT).toEqual({ urgent: 3, high: 2, medium: 1.5, low: 1 });
    expect(TYPE_MULT).toEqual({ full_brief: 1.5, easy: 1 });
  });
});

describe("isOpen", () => {
  it("open statuses count", () => {
    for (const s of [
      "submitted",
      "in_review",
      "assigned",
      "in_progress",
      "waiting_on_info",
      "internal_review",
      "sent_for_approval",
    ] as RequestStatus[]) {
      expect(isOpen(req({ status: s }))).toBe(true);
    }
  });
  it("complete / archived do not", () => {
    expect(isOpen(req({ status: "complete" }))).toBe(false);
    expect(isOpen(req({ status: "archived" }))).toBe(false);
  });
});

describe("weekBounds", () => {
  it("this_week is Mon..next-Mon containing now", () => {
    const { start, end } = weekBounds("this_week", NOW);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(5); // June
    expect(start.getDate()).toBe(22); // Monday
    expect(end.getDate()).toBe(29); // exclusive next Monday
  });
  it("next_week is the following ISO week", () => {
    const { start, end } = weekBounds("next_week", NOW);
    expect(start.getDate()).toBe(29); // Mon Jun 29
    expect(end.getMonth()).toBe(6); // July
    expect(end.getDate()).toBe(6); // exclusive Mon Jul 6
  });
});

describe("inWindow (§1.4)", () => {
  const dueThisWeek = "2026-06-25"; // Thu of this week
  const dueNextWeek = "2026-07-01"; // Wed of next week
  const overdue = "2026-06-20"; // last week
  const far = "2026-08-15";

  it("all_open includes everything", () => {
    for (const d of [dueThisWeek, dueNextWeek, overdue, far, null]) {
      expect(inWindow(req({ due: d }), "all_open", NOW)).toBe(true);
    }
  });

  it("this_week includes due-this-week, overdue, and undated", () => {
    expect(inWindow(req({ due: dueThisWeek }), "this_week", NOW)).toBe(true);
    expect(inWindow(req({ due: overdue }), "this_week", NOW)).toBe(true); // overdue still on plate
    expect(inWindow(req({ due: null }), "this_week", NOW)).toBe(true); // undated load
  });

  it("this_week excludes future weeks", () => {
    expect(inWindow(req({ due: dueNextWeek }), "this_week", NOW)).toBe(false);
    expect(inWindow(req({ due: far }), "this_week", NOW)).toBe(false);
  });

  it("next_week includes only next-week dates (undated & overdue excluded)", () => {
    expect(inWindow(req({ due: dueNextWeek }), "next_week", NOW)).toBe(true);
    expect(inWindow(req({ due: dueThisWeek }), "next_week", NOW)).toBe(false);
    expect(inWindow(req({ due: overdue }), "next_week", NOW)).toBe(false);
    expect(inWindow(req({ due: null }), "next_week", NOW)).toBe(false);
  });
});

describe("isOverdue", () => {
  it("strictly-before-today is overdue; today/future/undated are not", () => {
    expect(isOverdue(req({ due: "2026-06-20" }), NOW)).toBe(true);
    expect(isOverdue(req({ due: "2026-06-24" }), NOW)).toBe(false); // today
    expect(isOverdue(req({ due: "2026-06-30" }), NOW)).toBe(false);
    expect(isOverdue(req({ due: null }), NOW)).toBe(false);
  });
});

describe("bandFor (thresholds 0.5 / 0.85 / 1.0)", () => {
  it("maps utilization to bands", () => {
    expect(bandFor(0.0, false)).toBe("under");
    expect(bandFor(0.49, false)).toBe("under");
    expect(bandFor(0.5, false)).toBe("healthy");
    expect(bandFor(0.84, false)).toBe("healthy");
    expect(bandFor(0.85, false)).toBe("near");
    expect(bandFor(0.99, false)).toBe("near");
    expect(bandFor(1.0, false)).toBe("over");
    expect(bandFor(1.6, false)).toBe("over");
  });
  it("unassigned is always its own neutral band", () => {
    expect(bandFor(2.0, true)).toBe("unassigned");
    expect(bandFor(0, true)).toBe("unassigned");
  });
});

describe("buildTeamLoad — aggregation, banding, unassigned", () => {
  // Jaclyn: 2 urgent full-briefs (4.5+4.5=9) + 1 high easy (2) = 11 pts → over (util 1.1)
  // Dan:    3 medium easy (1.5×3 = 4.5) → under (util 0.45)
  // Unassigned: 1 urgent easy (3) → neutral, excluded from team capacity math
  const requests: ArtRequest[] = [
    req({ lead: "jaclyn", priority: "urgent", type: "full_brief", due: "2026-06-25", status: "in_progress" }),
    req({ lead: "jaclyn", priority: "urgent", type: "full_brief", due: "2026-06-26", status: "assigned" }),
    req({ lead: "jaclyn", priority: "high", type: "easy", due: "2026-06-20", status: "submitted" }), // overdue
    req({ lead: "dan", priority: "medium", type: "easy", due: "2026-06-24", status: "in_progress" }),
    req({ lead: "dan", priority: "medium", type: "easy", due: null, status: "submitted" }), // undated
    req({ lead: "dan", priority: "medium", type: "easy", due: "2026-06-27", status: "in_review" }),
    req({ lead: null, priority: "urgent", type: "easy", due: "2026-06-25", status: "submitted" }), // unassigned
    // A completed item that must be excluded entirely:
    req({ lead: "jaclyn", priority: "urgent", type: "full_brief", due: "2026-06-25", status: "complete" }),
  ];

  const team = buildTeamLoad(requests, "this_week", undefined, NOW);

  it("computes per-person points, count, band", () => {
    const jaclyn = team.people.find((p) => p.person.key === "jaclyn")!;
    const dan = team.people.find((p) => p.person.key === "dan")!;
    expect(jaclyn.points).toBe(11);
    expect(jaclyn.count).toBe(3); // the complete one is excluded
    expect(jaclyn.util).toBeCloseTo(1.1, 5);
    expect(jaclyn.band).toBe("over");
    expect(jaclyn.overdue).toBe(1);
    expect(jaclyn.capacity).toBe(DEFAULT_WEEKLY_CAPACITY_WLP);

    expect(dan.points).toBe(4.5);
    expect(dan.util).toBeCloseTo(0.45, 5);
    expect(dan.band).toBe("under");
    expect(dan.undatedPoints).toBe(1.5);
  });

  it("items are sorted highest-priority-then-soonest-due", () => {
    const jaclyn = team.people.find((p) => p.person.key === "jaclyn")!;
    // two urgents first (soonest due first), then the high
    expect(jaclyn.items[0].priority).toBe("urgent");
    expect(jaclyn.items[0].due_date).toBe("2026-06-25");
    expect(jaclyn.items[1].priority).toBe("urgent");
    expect(jaclyn.items[2].priority).toBe("high");
  });

  it("unassigned is a separate neutral bucket, excluded from team capacity", () => {
    const un = team.people.find((p) => p.person.key === UNASSIGNED_KEY)!;
    expect(un.band).toBe("unassigned");
    expect(un.points).toBe(3);
    expect(team.unassignedPoints).toBe(3);
    // team totals exclude unassigned: 11 (jaclyn) + 4.5 (dan) = 15.5 pts; cap 20
    expect(team.totalPoints).toBe(15.5);
    expect(team.totalCapacity).toBe(20);
    expect(team.teamUtil).toBeCloseTo(15.5 / 20, 5);
    expect(team.overCount).toBe(1);
  });

  it("default sort is util desc with unassigned last", () => {
    expect(team.people[0].person.key).toBe("jaclyn"); // highest util
    expect(team.people[1].person.key).toBe("dan");
    expect(team.people[team.people.length - 1].person.key).toBe(UNASSIGNED_KEY);
  });

  it("respects per-person capacity overrides", () => {
    const caps = new Map<string, number>([["jaclyn", 20]]);
    const t2 = buildTeamLoad(requests, "this_week", caps, NOW);
    const jaclyn = t2.people.find((p) => p.person.key === "jaclyn")!;
    expect(jaclyn.capacity).toBe(20);
    expect(jaclyn.util).toBeCloseTo(11 / 20, 5); // 0.55 → healthy now
    expect(jaclyn.band).toBe("healthy");
    expect(t2.overCount).toBe(0);
  });
});

describe("comparePeople", () => {
  const requests: ArtRequest[] = [
    req({ lead: "zoe", priority: "low", type: "easy", status: "submitted" }),
    req({ lead: "amy", priority: "urgent", type: "full_brief", due: "2026-06-20", status: "submitted" }),
    req({ lead: "amy", priority: "urgent", type: "full_brief", due: "2026-06-20", status: "submitted" }),
  ];
  const team = buildTeamLoad(requests, "all_open", undefined, NOW);

  it("sorts by name asc", () => {
    const sorted = [...team.people].sort(comparePeople("name"));
    expect(sorted.map((p) => p.person.key)).toEqual(["amy", "zoe"]);
  });
  it("sorts by overdue desc", () => {
    const sorted = [...team.people].sort(comparePeople("overdue"));
    expect(sorted[0].person.key).toBe("amy"); // 2 overdue
  });
  it("sorts by points desc", () => {
    const sorted = [...team.people].sort(comparePeople("points"));
    expect(sorted[0].person.key).toBe("amy"); // 9 pts vs 1
  });
});

// Guard: every window key is a valid literal (compile + runtime).
describe("WindowKey literals", () => {
  it("are the three expected windows", () => {
    const keys: WindowKey[] = ["this_week", "next_week", "all_open"];
    expect(keys).toHaveLength(3);
  });
});

// ── buildTotalLoad — requests + projects + tasks ────────────────────────────

let tseq = 0;
function task(p: { owner: string; status?: Task["status"]; due?: string | null; title?: string }): Task {
  tseq += 1;
  return {
    id: `t-${tseq}`,
    user_id: p.owner,
    title: p.title ?? `Task ${tseq}`,
    description: null,
    due_date: p.due ?? null,
    percent_complete: null,
    status: p.status ?? "active",
    completed_at: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
  };
}

let pseq = 0;
function proj(p: {
  owner: string;
  status?: ProjectWithMeta["status"];
  due?: string | null;
  stakeholders?: string[]; // user_ids (with names supplied via the directory)
  title?: string;
}): ProjectWithMeta {
  pseq += 1;
  const stakeholders: EnrichedStakeholder[] = (p.stakeholders ?? []).map((uid, i) => ({
    id: `sh-${pseq}-${i}`,
    project_id: `p-${pseq}`,
    user_id: uid,
    percent_complete: null,
    added_at: NOW.toISOString(),
    full_name: null,
    email: null,
  }));
  return {
    id: `p-${pseq}`,
    owner_id: p.owner,
    title: p.title ?? `Project ${pseq}`,
    description: null,
    visibility: "private",
    status: p.status ?? "active",
    desired_due_date: p.due ?? null,
    updated_due_date: null,
    overall_percent_complete: null,
    completed_at: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    stakeholders,
  };
}

describe("inWindowDate / isOverdueDate (bare-date twins of inWindow/isOverdue)", () => {
  it("match the ArtRequest-based versions for the same date", () => {
    for (const d of ["2026-06-25", "2026-07-01", "2026-06-20", "2026-08-15", null]) {
      for (const w of ["this_week", "next_week", "all_open"] as WindowKey[]) {
        expect(inWindowDate(d, w, NOW)).toBe(inWindow(req({ due: d }), w, NOW));
      }
      expect(isOverdueDate(d, NOW)).toBe(isOverdue(req({ due: d }), NOW));
    }
  });
});

describe("buildTotalLoad — total open load across requests + projects + tasks", () => {
  it("a task-only person (1pt) and a project-owner (3pts) both appear with correct weights", () => {
    const directory = new Map<string, string>([
      ["uid-taylor", "Taylor Task"],
      ["uid-olivia", "Olivia Owner"],
    ]);
    const team = buildTotalLoad(
      {
        requests: [],
        tasks: [task({ owner: "uid-taylor", due: null })], // 1 pt, undated → this-week
        projects: [proj({ owner: "uid-olivia", due: null })], // 3 pts owner
      },
      directory,
      "this_week",
      undefined,
      NOW,
    );

    const taylor = team.people.find((p) => p.person.key === "taylor task")!;
    const olivia = team.people.find((p) => p.person.key === "olivia owner")!;
    expect(taylor).toBeTruthy();
    expect(olivia).toBeTruthy();
    expect(taylor.points).toBe(1);
    expect(taylor.items[0].kind).toBe("task");
    expect(taylor.items[0].role).toBe("Assignee");
    expect(olivia.points).toBe(3);
    expect(olivia.items[0].kind).toBe("project");
    expect(olivia.items[0].role).toBe("Owner");
    // both undated → flagged
    expect(taylor.undatedPoints).toBe(1);
    expect(olivia.undatedPoints).toBe(3);
  });

  it("a request lead and a task owner with the same name merge onto one person", () => {
    // Request lead "jaclyn" (cap → "Jaclyn", key "jaclyn"); task owner id resolves
    // via the directory to display name "Jaclyn" → key "jaclyn" → SAME row.
    const directory = new Map<string, string>([["uid-jaclyn", "Jaclyn"]]);
    const team = buildTotalLoad(
      {
        requests: [
          req({ lead: "jaclyn", priority: "urgent", type: "full_brief", due: "2026-06-25", status: "in_progress" }), // 4.5
        ],
        tasks: [task({ owner: "uid-jaclyn", due: "2026-06-25" })], // 1
        projects: [],
      },
      directory,
      "this_week",
      undefined,
      NOW,
    );

    // Exactly one person row, carrying BOTH contributions.
    expect(team.people).toHaveLength(1);
    const jaclyn = team.people[0];
    expect(jaclyn.person.key).toBe("jaclyn");
    expect(jaclyn.count).toBe(2);
    expect(jaclyn.points).toBe(5.5); // 4.5 request + 1 task
    expect(jaclyn.items.map((i) => i.kind).sort()).toEqual(["request", "task"]);
  });

  it("scores project owner (3) + non-owner stakeholder (1.5), dedupes owner-as-stakeholder", () => {
    const directory = new Map<string, string>([
      ["uid-owner", "Ollie Owner"],
      ["uid-stake", "Sasha Stake"],
    ]);
    const team = buildTotalLoad(
      {
        requests: [],
        tasks: [],
        // Owner also listed as a stakeholder → must NOT get the extra 1.5.
        projects: [proj({ owner: "uid-owner", due: null, stakeholders: ["uid-owner", "uid-stake"] })],
      },
      directory,
      "all_open",
      undefined,
      NOW,
    );

    const owner = team.people.find((p) => p.person.key === "ollie owner")!;
    const stake = team.people.find((p) => p.person.key === "sasha stake")!;
    expect(owner.points).toBe(3); // owner only, not 4.5
    expect(owner.items).toHaveLength(1);
    expect(stake.points).toBe(1.5);
    expect(stake.items[0].role).toBe("Stakeholder");
  });

  it("excludes complete/done work and respects the window", () => {
    const directory = new Map<string, string>([["uid-a", "Alex A"]]);
    const team = buildTotalLoad(
      {
        requests: [],
        tasks: [
          task({ owner: "uid-a", status: "complete", due: "2026-06-25" }), // excluded (done)
          task({ owner: "uid-a", status: "active", due: "2026-07-01" }), // next week → excluded from this_week
        ],
        projects: [
          proj({ owner: "uid-a", status: "complete", due: null }), // excluded (done)
        ],
      },
      directory,
      "this_week",
      undefined,
      NOW,
    );
    // Nothing lands in this_week → Alex should not appear at all.
    expect(team.people.find((p) => p.person.key === "alex a")).toBeUndefined();
    expect(team.totalPoints).toBe(0);
  });

  it("resolves an unknown owner id to a short non-blank label", () => {
    const team = buildTotalLoad(
      { requests: [], tasks: [task({ owner: "abcdef123456", due: null })], projects: [] },
      new Map(),
      "this_week",
      undefined,
      NOW,
    );
    const row = team.people[0];
    expect(row.person.key).toBe("uid:abcdef123456");
    expect(row.person.name).toBe("User abcdef");
    expect(row.points).toBe(1);
  });

  it("bands + team totals mirror buildTeamLoad's math for a mixed team", () => {
    const directory = new Map<string, string>([
      ["uid-olivia", "Olivia"],
      ["uid-taylor", "Taylor"],
    ]);
    // Olivia owns 4 projects (12 pts) → over capacity (util 1.2).
    // Taylor holds 3 tasks (3 pts) → under (util 0.3).
    const team = buildTotalLoad(
      {
        requests: [],
        tasks: [
          task({ owner: "uid-taylor", due: null }),
          task({ owner: "uid-taylor", due: null }),
          task({ owner: "uid-taylor", due: null }),
        ],
        projects: [
          proj({ owner: "uid-olivia", due: null }),
          proj({ owner: "uid-olivia", due: null }),
          proj({ owner: "uid-olivia", due: null }),
          proj({ owner: "uid-olivia", due: null }),
        ],
      },
      directory,
      "all_open",
      undefined,
      NOW,
    );
    const olivia = team.people.find((p) => p.person.key === "olivia")!;
    const taylor = team.people.find((p) => p.person.key === "taylor")!;
    expect(olivia.points).toBe(12);
    expect(olivia.util).toBeCloseTo(1.2, 5);
    expect(olivia.band).toBe("over");
    expect(taylor.points).toBe(3);
    expect(taylor.band).toBe("under");
    expect(team.totalPoints).toBe(15);
    expect(team.totalCapacity).toBe(20);
    expect(team.overCount).toBe(1);
    // default sort: highest util first
    expect(team.people[0].person.key).toBe("olivia");
  });
});
