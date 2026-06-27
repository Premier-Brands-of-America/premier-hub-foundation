# Agent 02 — Layout & information architecture

**Perspective:** Planner is the new center of gravity; it must be dense, scannable, and consistent with the existing shell.

**Findings**
- ✅ `/planner` reuses `PageHeader` + AppLayout shell; Board/Insights toggle lives in the header actions — consistent with other pages.
- ✅ Kanban columns are fixed-width (w-72) with horizontal scroll — the correct Planner pattern; "Add bucket" affordance is discoverable.
- ✅ Sidebar gains a single "Planner" entry next to "My Tasks" — minimal nav growth.
- ⚠️ medium — board height uses `calc(100vh-8rem)`; on very short viewports the column scroll area (`calc(100vh-18rem)`) can feel cramped. Consider a min-height.
- ⚠️ low — no grouping control beyond buckets (brief mentions grouping); acceptable for MVP since buckets are the grouping.

**Direction:** Keep the single-page board + insights toggle. Defer additional "group by assignee/priority" swimlane modes to nice-to-have.
