# Design Audit — Premier Project Hub v2 (`feat/v2`)

**Dimension:** Design (tokens, dark/light parity, responsive, DESIGN_LANGUAGE coherence, empty/loading/error states)
**Scope:** `src/**`, `index.html`, `src/index.css` vs `DESIGN_LANGUAGE.md`
**Verification:** `npx tsc --noEmit` → exit 0 (green).

## Summary

The design system is in strong shape. The three-layer token architecture in `src/index.css` is faithful to the "Crimson Engineering" contract; components consume semantic tokens (no literal hex) almost everywhere, and theme parity is genuinely token-driven — only **2** `dark:` utilities exist in non-shadcn components and both are the legitimate `dark:prose-invert` (Tailwind Typography). Shared `EmptyState`, `ErrorBoundary`, dashboard `CardLoading/CardEmpty/CardError`, skeleton shimmer, and the `edge-rail`/`stat-numeral` signature are all well-used and on-spec. Responsive master-detail layouts (`TasksPage`, `ProjectListPage`) collapse correctly on mobile.

Real issues are few. The most important is a **stale pre-paint theme guard in `index.html`** that no longer matches the v2 provider — it causes a flash of light theme + unstyled (`data-design="classic"`) content on every cold load for dark-mode users. Two timeline components hardcode `text-white` over category-color fills that are light in dark mode (contrast failure). One CSS rule paints the selected-table-row signature rail in the neutral `--accent` gray instead of the crimson the contract specifies.

---

## Findings

### HIGH — Stale `index.html` theme guard causes theme flash (FOUC) and unstyled first paint
**Location:** `index.html:10-19`

The inline pre-paint script reads a shape the v2 provider no longer writes and omits the theme class entirely:

```js
var p = JSON.parse(localStorage.getItem('phv2:design-prefs') || '{}');
document.documentElement.dataset.design = (p.designMode === 'modern') ? 'modern' : 'classic';
document.documentElement.dataset.density = (p.density === 'compact') ? 'compact' : 'comfortable';
```

Two concrete regressions:
1. `DesignModeProvider` persists `{ theme, density }` (`src/providers/DesignModeProvider.tsx:106`), so `p.designMode` is **always undefined** → `data-design` is set to `"classic"` on first paint. The entire component layer in `index.css` is scoped under `[data-design="modern"]` (cards, inputs, sidebar rail, tables, tabs, tooltips, edge-rail, empty-state icon tint…). Until React mounts and `useLayoutEffect` flips it to `"modern"` (`DesignModeProvider.tsx:101`), the first paint is under-styled.
2. The guard never sets the `dark` class or `color-scheme`. The provider derives theme from the cache `theme` field and `prefersDark()` (`DesignModeProvider.tsx:57-63`), but the inline guard does none of this — so a dark-theme user sees a **flash of light theme** on every cold load. The pre-paint guard exists precisely to prevent this and currently doesn't.

**Recommendation:** Rewrite the guard to mirror the provider: read `theme`/`density` from `phv2:design-prefs`, fall back to `matchMedia('(prefers-color-scheme: dark)')`, set `document.documentElement.classList.toggle('dark', isDark)`, `style.colorScheme`, `dataset.design = 'modern'` (unconditional in v2), and `dataset.density`. Drop the `designMode`/`classic` branch entirely.

---

### MEDIUM — `text-white` hardcoded over category fills fails contrast in dark mode
**Location:** `src/components/timeline/EventBar.tsx:30`; `src/components/timeline/CalendarView.tsx:98`

Both render event labels with a fixed `text-white` class over a token-driven `backgroundColor: hsl(var(<token>))` where the token comes from `getEventColorVar()` (`src/components/timeline/eventColors.ts`) — i.e. `--entity-*`, `--status-*`, or `--priority-*`. `text-white` is not a semantic token and does not flip with theme. Several of those tokens are deliberately **light** in dark mode:

- `--status-todo: 20 10% 62%` (`index.css:183`) — todo/open/backlog events
- `--entity-page: 20 10% 68%` (`index.css:179`)
- `--priority-low: 200 35% 60%` (`index.css:192`)

White text on a 60–68%-lightness fill fails WCAG AA. This violates Hard Rule #1 (tokens only) and #2 (dark/light parity) for the timeline/calendar event bars.

**Recommendation:** Drive the label color from the same token rather than a fixed white — e.g. compute a foreground per fill, or use a token pair. Simplest token-only fix: render the bar as a tint fill + token-colored text (the badge pattern used elsewhere, `bg-[hsl(var(--token)/0.14)] text-[hsl(var(--token))]`), or introduce an `--on-entity` style foreground. At minimum, the todo/low/page cases need a dark foreground in dark mode.

---

### MEDIUM — Selected-table-row signature rail uses neutral `--accent`, not crimson
**Location:** `src/index.css:452-455`

```css
[data-design="modern"] table tbody tr[data-state="selected"] {
  background: hsl(var(--accent) / 0.06);
  box-shadow: inset 2px 0 0 0 hsl(var(--accent));
}
```

`DESIGN_LANGUAGE.md` §5 lists the selected table row as a carrier of the signature crimson edge-rail ("Selected table row: crimson inset rail (`tr[data-state="selected"]`). Wired."). But `--accent` is explicitly the **neutral hover surface**, not the brand color (`index.css:79` light / `:156` dark; DESIGN_LANGUAGE §1 "`--accent` *(shadcn)* … **Hover surface**, not the brand color"). So real `<table>` selected rows get a near-invisible gray rail. This is also **inconsistent** with the list-item cards, which correctly use crimson: `ProjectListItem.tsx:31` and `TaskListItem.tsx:28` both use `shadow-[inset_2px_0_0_0_hsl(var(--primary))]`.

**Recommendation:** Change both `--accent` references in this rule to `--primary` (rail) / `hsl(var(--primary) / 0.06)` (wash) so the table selection matches the documented signature and the card list items.

---

### LOW — Graph canvas uses literal colors that don't track theme
**Location:** `src/components/graph/GraphCanvas.tsx:160, 182`

- `linkColor` returns `"rgba(120,120,120,0.55)"` / `"rgba(120,120,120,0.10)"` (line 160) — a fixed gray that reads identically in both themes. Node fills/labels/status borders correctly resolve from tokens via `graphColors.ts` (`getNodeColor`/`getForegroundColor`/`getStatusColor`), so the link color is the one off-system value.
- The selected-node ring uses `strokeStyle = "#fff"` (line 182) — fine on dark, but a white selection ring on a saturated node in light mode has weak contrast.

Canvas can't read CSS vars directly, but the file already solves this elsewhere (`getForegroundColor()` reads `--foreground` via `getComputedStyle`). Low severity: canvas-only, non-text, and links are decorative.

**Recommendation:** Resolve link/ring colors from tokens the same way labels are — e.g. a `--border`/`--muted-foreground`-derived link color and a `--primary` or `--ring` selection ring — so the graph tracks theme.

---

### LOW — Inline empty states bypass the shared `.empty-state` pattern
**Location:** `src/components/attachments/AttachmentList.tsx:146`; `src/components/relations/RelationsSection.tsx:126`; `src/components/pages/PageTree.tsx:146`; `src/components/forms/DepartmentPicker.tsx:55`

Most screens use the shared `EmptyState` component (`src/components/ui/empty-state.tsx`, on-spec with the crimson icon circle + invitation-to-act). These four render bare muted `<p>` text (e.g. `"No attachments yet."`, `"No pages yet."`) with no icon and, in some cases, no action. They are inline list-section empties rather than full-screen, so this is a coherence nit, not a correctness bug — but it's an inconsistency with DESIGN_LANGUAGE §6 ("Empty states … a one-line what + a primary action button").

**Recommendation:** For the ones that anchor a section (PageTree, attachments), use the shared `EmptyState`; the very compact inline ones (combobox "No departments available") are acceptable as-is. Use judgment per density.

---

## Verified-and-sound (not findings)

- **Tokens only:** every `bg-[hsl(var(--…))]` / `style={{ backgroundColor: 'hsl(var(--…))' }}` usage across pages and components consumes semantic tokens — no literal hex in app components (the `bg-black/80` hits are pre-existing shadcn overlay primitives in `src/components/ui/{dialog,sheet,drawer,alert-dialog}.tsx`, untouched and expected).
- **Dark/light parity:** only 2 `dark:` utilities in non-shadcn components, both `dark:prose-invert` (the correct Tailwind Typography exception). No component branches on theme.
- **Reduced motion:** the global `@media (prefers-reduced-motion: reduce)` block (`index.css:592-606`) neutralizes `animation-duration` on `*`, so `animate-spin` is covered globally even where the per-element `motion-reduce:animate-none` utility is omitted (12 of 16 omit it — harmless inconsistency, not a bug).
- **Responsive:** no body-breaking fixed widths; `w-[420px]`/`w-[320px]` are on edge sheets/popovers. Master-detail (`TasksPage.tsx:123`, `ProjectListPage`) collapses to full-width detail on mobile via `hidden md:flex`.
- **Theme provider:** `DesignModeProvider` reads cache synchronously, applies in `useLayoutEffect` before paint, respects `prefers-color-scheme`, persists to `profiles.preferences`. Sound — the only gap is the `index.html` guard (HIGH above) that's supposed to back it pre-hydration.
- **Loading/error coherence:** `TaskListSkeleton`/dashboard `CardLoading` use the token shimmer; `ErrorBoundary` and `CardError` are fully token-based and on-spec.
- `npx tsc --noEmit` is green.
