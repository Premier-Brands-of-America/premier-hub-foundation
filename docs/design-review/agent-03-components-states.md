# Agent 03 — Component states & consistency

**Perspective:** Every interactive element needs hover/focus/active/loading/empty/error; consistency across cards/badges/dialogs is what reads as "enterprise".

**Findings**
- ✅ `AttachmentGallery` has an empty hint, focus ring on thumbnails, and a lightbox dialog with a title. `CommentsThread` has an empty state and a disabled-send state.
- ✅ Kanban card has hover elevation + border highlight; column shows a drop-target highlight on dragover.
- ✅ Graph now has dedicated empty + loading (shimmer) states (was missing in v2).
- ⚠️ medium — Kanban drag has no "dragging" ghost/opacity on the source card; add `opacity-50` while dragging for clearer affordance.
- ⚠️ low — `CardDetailDialog` title input has no explicit error state for empty titles (it just keeps last value).

**Direction:** Add a dragging visual state to cards. Otherwise states are solid; keep using shadcn primitives for consistency.
