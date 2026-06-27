# Agent 01 — Tokens & visual system

**Perspective:** A single, well-layered token system is the foundation of a serious ops UI; consistency and contrast beat novelty.

**Findings**
- ✅ Reuses the v2 three-layer token system (primitive → semantic → component) in `src/index.css`; new components consume `hsl(var(--…))` rather than hardcoding. Good.
- ✅ Graph edges were de-hardcoded into token-derived `getEdgeColor()` (`graphColors.ts`). Removes the last `rgba(120,120,120)` drift noted in the v2 audit.
- ⚠️ medium — `PlannerCharts.tsx` and `KanbanCard.tsx` use a few literal HSL values for status/priority hues (e.g. `hsl(142 70% 42%)`, `bg-sky-500`). Acceptable but should graduate to `--status-*`/`--priority-*` tokens for one source of truth.
- ⚠️ low — `DueDateBadge` amber uses Tailwind `amber-500/600`; the system has `--status-warning`. Prefer the token for dark-mode parity.

**Direction:** Keep the v2 tokens as the spine; migrate the handful of literal chart/badge hues to existing `--status-*`/`--priority-*` tokens in a follow-up. No new palette.
