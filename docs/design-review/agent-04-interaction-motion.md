# Agent 04 — Interaction & micro-motion

**Perspective:** Motion should be subtle and performance-safe; an ops tool must never feel gimmicky.

**Findings**
- ✅ Native HTML5 DnD (no heavy dep) for Kanban — light and fast.
- ✅ Graph respects `prefers-reduced-motion` (reduced cooldown ticks) and uses canvas (GPU-friendly).
- ✅ Transitions are short (`transition-all`/`duration-200`) and limited to hover/scale on cards/thumbnails.
- ⚠️ medium — native DnD lacks drop-position preview between cards; index-based drop works but the insertion point isn't previewed. Acceptable for MVP.
- ⚠️ low — consider `transition` on column drop highlight for smoothness.

**Direction:** Keep native DnD + subtle transitions. A drag preview/placeholder is a nice-to-have, not MVP.
