# HANDOFF BRIEF — Premier Project Hub: Modern UI Design Mode

## 1) One-line task summary

Add an opt-in "Modern" design mode (parallel to the existing "Classic" theme) across the Premier Project Hub React app, with per-user persistence and progressive polish of dashboard/sidebar/page components.

## 2) Purpose and scope

**Why:** Refresh the visual identity of the pilot app with a contemporary "Linear/Vercel"-style aesthetic without disrupting existing users on the Classic theme.

**In scope:**

- Dual-theme system gated by `data-design="modern" | "classic"` on `<html>`
- User preference persistence: DB (`profiles.preferences` JSONB) + `localStorage` fallback
- Tailwind `modern:` variant + semantic CSS tokens in `src/index.css`
- Polish of: sidebar, app header, dashboard widgets/bento grid, buttons, badges, sonner toasts
- Replacing sandbox-blocked `window.prompt`/`window.confirm` in the Pages feature with shadcn dialogs

**Out of scope:**

- Backend/business logic changes
- Classic theme visual changes (must remain untouched)
- New feature work beyond theming + the prompt-dialog bugfix

## 3) Goal and success criteria

- Toggle Modern ↔ Classic from profile menu or `⌘⇧D`; choice persists across reloads and devices (per user)
- Classic mode pixel-unchanged
- Modern mode renders consistently in light + dark, with persistent dark sidebar in both
- All theme values flow through semantic tokens (no hardcoded `text-white`, `bg-[#...]`)
- Create-page flow works inside Lovable's sandboxed iframe (no `window.prompt`)

## 4) Current state and artifacts

**Stack:** React 18 + Vite 5 + TS strict + Tailwind v3 + shadcn + Supabase (Lovable Cloud) + TanStack Query.

**Key files:**

- `src/providers/DesignModeProvider.tsx` — Context, localStorage cache (`phv2:design-prefs`), reconciles with `profiles.preferences` on auth, writes back on change. Exposes `mode`, `density`, `toggle`.
- `src/index.css` — All tokens (HSL), Modern overrides under `[data-design="modern"]`, sidebar tokens (light + dark), accent rail gradients for `data-accent` cards.
- `tailwind.config.ts` — Custom `modern:` variant (`addVariant("modern", '&:is([data-design="modern"] *)')`).
- `src/components/AppLayout.tsx` — Header with Bell, AI Assistant, profile dropdown with design-mode toggle + `⌘⇧D` shortcut.
- `src/components/AppSidebar.tsx` — Modern padding/scale tweaks; uses sidebar-* tokens.
- `src/components/DashboardWidget.tsx` — `accent` prop: `default | accent | warning | info | success | danger`; classic uses left border, modern uses `::before` rail + gradient tint.
- `src/pages/Index.tsx` — Bento grid (`auto-rows-[minmax(140px,auto)]`); widget accents: Active Tasks=info, Assigned Projects=accent, Overdue Items=danger.
- `src/components/ui/{button,badge,sonner}.tsx` — Modern variants added (`tinted`, `ghost-soft` on Button).
- `src/components/ui/empty-state.tsx` — New reusable component.
- `src/components/pages/PromptDialog.tsx` — Replaces `window.prompt`; Enter submits, 200-char cap.
- `src/components/pages/PageTree.tsx`, `src/pages/Pages.tsx` — Use `PromptDialog` + `AlertDialog`; no more `window.prompt`/`confirm`.
- Migration `supabase/migrations/20260522202930_*.sql` — Adds `profiles.preferences jsonb` (and types regenerated in `src/integrations/supabase/types.ts`).

**Persistence storage key:** `phv2:design-prefs` → `{ designMode, density }`.

**Preview/Published URLs:**

- Preview: https://id-preview--bdc3e354-b947-4a43-8df4-d673c49c9132.lovable.app
- Published: https://premier-hub-foundation.lovable.app

## 5) Decisions made (authoritative)

- **Decision:** Dual-mode via `data-design` attribute + Tailwind `modern:` variant. **Reason:** Zero risk to Classic; gating is purely additive.
- **Decision:** Persist preferences to both `profiles.preferences` JSONB and localStorage. **Reason:** User chose "Database + localStorage" — instant first paint + cross-device sync.
- **Decision:** Persistent dark sidebar in both light and dark Modern modes. **Reason:** Linear/Vercel pattern; better brand anchor.
- **Decision:** Accent rails via `::before` in Modern, left-border in Classic. **Reason:** Keeps Classic visually stable while enabling a richer Modern look.
- **Decision:** Replace `window.prompt`/`confirm` with shadcn dialogs project-wide for Pages. **Reason:** Lovable preview iframe is sandboxed — native prompts are blocked and fail silently. Do not revisit.
- **Decision:** All color values are semantic HSL tokens in `index.css`. **Reason:** Project memory rule — no hardcoded colors in components.

## 6) Constraints and preferences

**Hard:**

- Entra ID via Supabase Auth only; no local passwords (Preview Mode mocks login on localhost)
- RLS enforced; all new public-schema tables need explicit GRANTs + WITH CHECK on policies that touch privilege flags
- No backend code in client repo
- Stack locked: React/Vite/Tailwind v3/TS — no framework swaps
- Form caps: Titles ≤200, Descriptions ≤2000
- AI Assistant remains read-only

**Soft:**

- TanStack Query for server state
- Brand config centralized in `src/config/brand.ts` (Red PMS 200, Yellow PMS 109)
- Accessibility: skip-to-main, keyboard focus rings, ARIA labels — pilot-ready, do not regress
- Pagination 25 items/page on infinite scroll

## 7) Important context and history

- Project is a pilot internal tool ("Premier Project Hub").
- User pre-approved scope as "Full spec" with "Database + localStorage" persistence.
- Multiple polish iterations have been applied to Modern mode (color tuning, sidebar tokens, accent rails, dashboard bento spacing).
- The "Create new page is not working" bug was rooted in iframe-sandboxed `window.prompt` returning null; fixed via `PromptDialog`.

## 8) Open questions and unresolved issues

- No explicit user feedback yet on the most recent Modern polish pass (gradients/rails/dark sidebar) — awaiting visual review.
- Density toggle (`comfortable | compact`) is plumbed in the provider but not yet surfaced in UI or consumed by components.
- Notifications Bell button in header is non-functional (placeholder).
- Modern variants have not been audited on every page (Timeline, Graph, Reports, Audit, Portal flows) — only Dashboard, Sidebar, Header, Pages confirmed.

## 9) What to avoid

- Do not restore `window.prompt` / `window.confirm` anywhere — sandbox-blocked.
- Do not add hardcoded color classes (`text-white`, `bg-[#hex]`, `bg-black`) — breaks theming and project memory rules.
- Do not touch Classic styling; all new visuals must live behind `modern:` or `[data-design="modern"]` selectors.
- Do not store roles on `profiles` — use `user_roles` table + `has_role()` security-definer (already in place).
- Do not re-add a "Dashboard" route alias beyond the existing `/dashboard → /` redirect.

## 10) Immediate next steps

1. Visual QA pass of Modern mode across all routes (Tasks, Projects, Timeline, Graph, Portal, Admin, Profile) — capture any tokens still leaking Classic styling or unstyled surfaces.
2. Surface the density toggle in the profile dropdown (provider already supports it) and wire spacing tokens to consume it.
3. Wire the header Bell icon to the existing notifications feature (or hide until implemented).
4. Sweep remaining `window.prompt`/`confirm` usages elsewhere in the codebase (`rg "window\.(prompt|confirm)" src/`) and convert to dialogs.

## 11) References

- Provider: `src/providers/DesignModeProvider.tsx`
- Tokens: `src/index.css`, `tailwind.config.ts`
- Layout: `src/components/AppLayout.tsx`, `src/components/AppSidebar.tsx`
- Dashboard: `src/pages/Index.tsx`, `src/components/DashboardWidget.tsx`
- Pages bugfix: `src/components/pages/PromptDialog.tsx`, `src/components/pages/PageTree.tsx`, `src/pages/Pages.tsx`
- Migration: `supabase/migrations/20260522202930_7d7aee6c-de15-4604-817a-e20b65af0d5c.sql`
- LocalStorage key: `phv2:design-prefs`
- Keyboard shortcut: `⌘⇧D` (toggle design mode), `⌘K` (command palette)
- Preview: https://id-preview--bdc3e354-b947-4a43-8df4-d673c49c9132.lovable.app
- Published: https://premier-hub-foundation.lovable.app
