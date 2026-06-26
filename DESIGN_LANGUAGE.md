# Premier Project Hub — Design Language

**"Crimson Engineering."** A single, distinctive visual identity for Premier
Brands of America's internal hub. Linear / Vercel / Raycast *discipline*
(hairline borders, near-neutral surfaces, restrained motion, one saturated
accent), anchored on **Premier's own crimson** — the red from the company logo
(`#c10230`). The look is unmistakably Premier's: a creative brand's color worn
with engineering precision.

This is the **contract** every screen follows. Use semantic tokens only — never
hardcoded colors. Dark and light must both look right; components never branch
on theme.

---

## 1. Palette

One saturated accent (Premier crimson, hue ≈ 347°). Derive hover/active/subtle
states by **lightness or alpha**, never a new hex. Everything else is a
near-neutral gray warmed a hair toward the crimson.

All values are HSL triples consumed as `hsl(var(--token))` and exposed through
Tailwind (`bg-primary`, `text-muted-foreground`, `border-border`, …).

### Accent — Premier crimson

| Token | Light | Dark | Hex (approx) | Use |
| --- | --- | --- | --- | --- |
| `--primary` | `347 84% 42%` | `349 90% 64%` | `#c51138` / `#f54767` | Primary buttons, active rail, links, focus ring source |
| `--primary-foreground` | `0 0% 100%` | `345 40% 9%` | white / near-black | Text/icon on a crimson fill |
| `--ring` | `347 84% 42%` | `349 90% 64%` | — | Focus ring (`hsl(var(--ring)/0.35)`) |

Contrast: light crimson + white text = **5.98:1** (AA); dark crimson + dark text
= **5.43:1** (AA). Never put white text on the *dark* crimson — use
`--primary-foreground`.

Derived states (compute, don't invent):
- Hover: `hsl(var(--primary) / 0.92)` or shift L by −4% (light) / +4% (dark).
- Subtle tint surface: `hsl(var(--primary) / 0.08–0.12)` (e.g. empty-state icons, selected accents).
- Border tint: `hsl(var(--primary) / 0.30)`.

### Neutrals & surfaces

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--background` | `30 20% 98%` | `340 12% 6%` | App background (dark ≈ `#0E0C0E`, not pure black) |
| `--foreground` | `340 12% 11%` | `20 12% 93%` | Primary text |
| `--card` | `0 0% 100%` | `340 10% 9%` | Card / elevated surface |
| `--popover` | `0 0% 100%` | `340 10% 10%` | Menus, command palette, dropdowns |
| `--muted` | `24 14% 95%` | `340 8% 13%` | Input fills, quiet fills |
| `--muted-foreground` | `340 6% 42%` | `20 8% 60%` | Secondary / caption text |
| `--secondary` | `24 14% 94%` | `340 8% 14%` | Secondary buttons / chips |
| `--accent` *(shadcn)* | `24 14% 93%` | `340 8% 15%` | **Hover surface**, not the brand color |
| `--border` | `24 14% 90%` | `340 8% 16%` | Hairline borders (~8% contrast) |
| `--input` | `24 14% 87%` | `340 8% 18%` | Input border |

### Sidebar (a near-black crimson-tinted rail in BOTH themes — the brand anchor)

| Token | Value (theme-independent) | Role |
| --- | --- | --- |
| `--sidebar-background` | `340 16% 9%` | Rail surface |
| `--sidebar-foreground` | `20 10% 80%` | Nav label |
| `--sidebar-primary` | `349 90% 66%` | **Active nav glow** (crimson) |
| `--sidebar-accent` | `340 12% 15%` | Hover surface |
| `--sidebar-muted` | `20 6% 55%` | Group labels, meta |
| `--sidebar-border` | `340 12% 17%` | Hairline |

### Status, priority, entity (categorical)

Crimson owns *brand/info*; the rest stay distinct hues so the graph & badges
read cleanly. Light / dark pairs already defined in `index.css`.

| Token | Hue | Meaning |
| --- | --- | --- |
| `--status-info`, `--entity-project` | 347° crimson | Info, projects (brand-primary entity) |
| `--status-done` / `--success` | 150° green | Success / done |
| `--status-warning` / `--warning` | 38° amber | Warning / in-progress |
| `--status-blocked` / `--destructive` | 0° red | Blocked / destructive |
| `--entity-task` | 199° blue | Tasks |
| `--entity-request` | 262° violet | Art requests |
| `--entity-person` | 160° teal-green | People |
| `--entity-department` | 28° orange | Departments |
| `--priority-low/medium/high/urgent` | 200 / 38 / 25 / 0° | Priority ramp |

> Use `destructive` for danger/delete; use `primary` (crimson) only for the
> *primary positive* action. Don't let crimson and destructive sit adjacent as
> equal-weight buttons.

---

## 2. Typography

Two faces, deliberate roles. Imported in `index.css`.

| Role | Family | Token / utility | Used for |
| --- | --- | --- | --- |
| **Display** | **Space Grotesk** | `--font-display`, `font-display`, `.stat-numeral` | `h1`–`h3`, page titles, big numbers / KPIs |
| Body / UI | **Inter** | `--font-sans`, `font-sans` (default) | Everything else: body, labels, `h4`, controls |
| Mono | system mono | `--font-mono`, `font-mono` | Code, IDs, kbd, raw values |

- `h1`–`h3` are **Space Grotesk** automatically (set in base layer): tracking
  `-0.025em`, weight 600, line-height 1.2, tabular figures on.
- `h4` stays Inter — it's a UI/section label, not display.
- **Big numbers** (stat cards, counts, metrics) → `className="stat-numeral"`
  (Space Grotesk, weight 600, tabular-nums, tight tracking). This is part of the
  signature — KPIs should look engineered.

### Scale (px)

`12 / 13 / 14 (base) / 16 / 20 / 24 / 32 / 40`. Body line-height 1.5, headings
1.2. UI labels are **medium (500)**, not bold everywhere. Use `text-xs` (12px)
for captions/meta, `text-sm` (14px) as the base UI size.

---

## 3. Spacing, radii, elevation

**Spacing** — 4px base: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. Tight, consistent
gutters. Page padding `p-3 sm:p-4 md:p-6`. Card padding `p-4` (compact) / `p-6`
(comfortable). Section gap `space-y-6`.

**Control height** — 32–36px default; comfortable rows 40px, compact rows
respect `--row-py` (density toggle). Header is `h-14`.

**Radii** — `--radius-sm 6` / `--radius-md 8` / `--radius-lg 12` / `--radius-xl 16`.
Cards `rounded-lg`, inputs/buttons `rounded-md`, badges/avatars full (`rounded-full`).

**Elevation** — lean on **border + subtle surface**, not heavy shadow.
- Cards: hairline border + the multi-stop soft shadow already in the component
  layer (don't add your own `shadow-*`).
- Reserve a *larger* soft shadow for popovers, dialogs, and the command palette
  only — these are styled centrally; don't override.
- Dark mode leans on surface lightness over shadow.

---

## 4. Motion

Fast and restrained. Tokens (Tailwind `duration-*` / `ease-*`):

- Hovers / popovers: **120–180ms** (`duration-fast`, `ease-standard`).
- Larger transitions: **200–260ms** (`duration-base` / `duration-slow`).
- Easing default `cubic-bezier(0.2,0,0,1)` (`ease-standard`); springy
  affordances use `ease-spring`.
- Always respect `prefers-reduced-motion` (handled globally — don't fight it).

Use the existing keyframes where they fit: `check-pop` (task complete),
`optimistic-flash` (optimistic write), `shake-x` (invalid), `shimmer` (skeleton).

---

## 5. The signature — the crimson edge-rail

The single element the product is remembered by: a **2px crimson left-edge**
that marks "this is the active / selected / primary thing."

- **Active nav item** (sidebar): crimson rail + crimson glow tint
  (`inset 2px 0 0 var(--sidebar-primary)`). Already wired — don't reimplement.
- **Selected table row**: crimson inset rail (`tr[data-state="selected"]`). Wired.
- **Section / page headers & feature cards**: add `className="edge-rail"` — a
  helper that paints the 2px crimson edge with correct padding. Use it sparingly,
  for the *one* primary section on a screen, not every block.
- **KPI / stat numbers**: `className="stat-numeral"` (display face, tabular).

Spend boldness here. Everywhere else stays quiet: hairline borders, neutral
surfaces, crimson only as punctuation.

---

## 6. Component conventions

**Page header (shell).** Don't build your own top bar. Set the contextual title
and a primary action via the `<PageHeader>` component:

```tsx
import { PageHeader } from "@/components/PageHeader";
// inside the screen:
<PageHeader title="My Tasks" subtitle="12 open" actions={<Button>New task</Button>} />
```

The shell renders the title (Space Grotesk), breadcrumb, and right-aligns
`actions` next to ⌘K search / AI Assistant / notifications / account. Omit it and
the header falls back to the route label — but every primary screen should set a
title and (where it has one) a primary action.

**Cards.** `Card` from shadcn. Hairline + the central soft shadow (automatic).
Header: `h4`/`h3` title + optional `text-xs text-muted-foreground` meta. Body
`p-4`/`p-6`. For an accent-tinted KPI card use `data-accent="info|success|warning|danger|accent"`
(left gradient wash, already styled). Don't add custom shadows.

**Tables.** Use the styled `<table>` conventions: uppercase `text-[11px]
tracking-wide` muted headers, hairline rows, hover wash, crimson rail on selected
rows. Right-align numeric columns and set them `tabular-nums`. Default tables to
**Compact** density.

**Buttons.** `primary` (crimson fill) = the one main positive action per view.
`secondary`/`outline`/`ghost` for the rest. `destructive` for delete. Icon
buttons `h-9 w-9`, ghost, `text-muted-foreground hover:text-foreground`. Size
`sm` in toolbars/headers.

**Badges.** `rounded-full`, transparent border, `px-2.5`. Color by semantic
token (status/priority/entity), e.g. `bg-[hsl(var(--status-done)/0.14)]
text-[hsl(var(--status-done))]`. Keep them quiet — tint fill, not solid.

**Inputs.** Soft `bg-muted/40` fill, transparent border, crimson focus ring
(automatic via the component layer). Don't restyle focus states.

**Empty states.** Use `.empty-state` + `.empty-state-icon` (crimson-tinted icon
circle). Copy is an invitation to act: a one-line what + a primary action button.
"No tasks yet. Create your first task." — not "Nothing here."

**Headings & numerals.** Page/section titles in `h1`–`h3` (display, automatic).
Any prominent number → `stat-numeral`.

---

## 7. Hard rules (every screen agent)

1. **Tokens only** — no hex/rgb in components. If you need crimson, it's
   `primary` / `ring` / `--primary` alpha. No new accent hues.
2. **Dark + light parity** — never branch on theme in components; the semantic
   layer handles it.
3. **Preserve functionality** — change presentation/composition only. Same
   routes, data hooks, queries, props, handlers, RLS.
4. **Accessibility floor** — visible keyboard focus (don't remove the ring),
   ARIA labels on icon-only controls, `prefers-reduced-motion` respected,
   mobile-first responsive (no horizontal body scroll; wide content scrolls in
   its own container).
5. **No `window.prompt` / `window.confirm`** — use dialogs.
6. **No new dependencies.** React 18 + Vite 5 + TS strict + Tailwind v3 + shadcn.
7. **Restraint** — crimson is punctuation. One bold thing (the edge-rail / the
   primary action) per screen; everything else quiet.

Keep `npx tsc --noEmit` and `npm run build` green.
