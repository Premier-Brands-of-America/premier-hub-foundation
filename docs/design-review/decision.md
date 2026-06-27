# Design Council — Decision (auto-selected direction)

Synthesized from the 7 lens reports (`agent-01…07`). Tie-breakers applied:
**clarity, density, and accessibility win over spectacle; serious enterprise
restraint; subtle, performance-safe motion only.** No human approval gate — the
direction below is selected and was applied in Phase 4.

## Summary
The revamp lands the right aesthetic for an internal ops tool: it reuses the v2
token system, keeps motion subtle, and makes the Graph genuinely
enterprise-grade. The chosen direction is **"refined v2 enterprise" — not a
restyle, a consolidation**: keep the existing palette/typography, push everything
through semantic tokens, and invest remaining polish in legibility (charts,
keyboard a11y) rather than new visual language.

## Per-area direction (lead vs supporting)
- **Tokens (lead):** v2 three-layer system stays canonical. Migrate the few
  literal chart/badge hues to `--status-*` / `--priority-*`. No new palette.
- **Layout/IA (lead):** single `/planner` page with Board/Insights toggle; one
  sidebar entry. Defer extra swimlane grouping.
- **Components/states (supporting):** add a "dragging" visual state to Kanban
  cards; everything else uses shadcn primitives consistently.
- **Interaction/motion (supporting):** keep native DnD + short transitions; a
  drag placeholder is nice-to-have.
- **Accessibility (lead concern):** color+label and alt-text shipped now;
  keyboard-DnD and mention keyboard-nav are tracked follow-ups.
- **Graph/data-viz (lead, owner priority):** delivered to the "super-professional"
  bar; add chart legends/value labels next.

## Roadmap
**MVP (done this run)**
- Token-based Graph edges + node polish + legend/empty/loading/stats.
- Planner board + Planner-style cards + shared capability components.
- Live insight charts; color-coded, label-paired due urgency.
- Routing UI with multi-owner selector + CC preview.

**Nice-to-have (logged)**
- Migrate literal hues to status/priority tokens.
- Keyboard-operable Kanban DnD + arrow-nav mention picker.
- Drag placeholder/insertion preview.
- Inline chart legends / value labels.

## Rejected alternatives
- **Flashy/3D or heavy-motion aesthetic** — rejected: wrong register for an
  internal ops tool; hurts density and performance.
- **Net-new design language / palette swap** — rejected: v2 tokens are sound;
  a reskin would add risk and inconsistency for no user value.
- **Adding a DnD library (dnd-kit/pangea)** — rejected: native HTML5 DnD meets
  the need with zero new dependencies (simplicity-first).
- **Bespoke chart library** — rejected: `recharts` is already a dependency and
  sufficient.

## Note
The automated multi-agent council workflow ran (7 parallel lenses) but its
strict structured-output stage exceeded the schema retry cap; this decision was
authored from the same code inspection to keep the run moving (see PROGRESS.md /
BLOCKERS.md). The lens reports above capture the substantive findings.
