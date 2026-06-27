# Agent 05 — Accessibility

**Perspective:** Internal tools are used all day; keyboard + screen-reader support and non-color-only signals are non-negotiable.

**Findings**
- ✅ Image gallery thumbnails carry `alt={name}`; lightbox dialog has a title.
- ✅ Due urgency is conveyed by **text label + icon**, not color alone (color-blind safe).
- ✅ Dialogs (shadcn) trap focus; mention picker is keyboard-typable.
- ⚠️ high — native-DnD Kanban is not keyboard-operable (no key handler to move cards). Existing app pattern; add a future keyboard move (e.g. arrow + space) for full a11y.
- ⚠️ medium — `CommentsThread` mention dropdown isn't arrow-key navigable (click only).
- ⚠️ low — Kanban columns aren't labeled landmarks/list semantics.

**Direction:** Ship with the color+label and alt-text wins now; log keyboard-DnD and mention-keyboard-nav as a11y follow-ups (nice-to-have).
