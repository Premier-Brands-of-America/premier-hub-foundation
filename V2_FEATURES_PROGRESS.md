# V2 Final Feature Batch — Progress

Unattended build on `feat/premier-hub-revamp`. Migrations written, NOT pushed.
Preview demo path keeps everything clickable. tsc + build kept green per feature.

---

## Foundation — pure resolvers + tests (2026-06-27 2:09pm EDT)
Added DB-agnostic logic the features build on, fully unit-tested (45 tests):
- `src/lib/contrast.ts` — WCAG AA ratio + nearest-passing-shade (Feature 2 guardrail).
- `src/lib/acl.ts` — row-level visibility resolver (Feature 5).
- `src/lib/orgChart.ts` — flat people → reports-to tree, cycle-safe (Feature 1).
- `src/lib/pageShare.ts` — per-person page access view/edit (Feature 6).

## Feature 4 — M365-only auth (verified) (2026-06-27 2:15pm EDT)
Documentation/verification only. Confirmed Entra OAuth is the only real sign-in
(`signInWithOAuth({provider:'azure'})`); no password/OTP/signup/magic-link anywhere
in `src/`. `PreviewLogin` strictly gated by `isPreviewEnvironment()`. Documented the
full auth model in DECISIONS.md; infra lock follow-up logged in BLOCKERS.md.

## Feature 2 — per-user color customization (2026-06-27 2:19pm EDT)
Text / highlight / background colors for BOTH light and dark themes, with curated
presets and a live WCAG AA contrast guardrail.
- `src/lib/colorPresets.ts` (+ test) — 6 presets (Premier, Ocean, Forest, Sunset,
  Grape, Monochrome); every preset's body text passes AA in both themes (asserted).
- `src/providers/DesignModeProvider.tsx` — loads/applies/persists `color_overrides`
  per theme. Channels map to tokens: text→`--foreground`, highlight→`--primary`+`--ring`,
  background→`--background`, applied as inline CSS vars over the token system (does not
  break tokens; unset channels fall back to defaults). Persists to
  `profiles.preferences.color_overrides` (real) / localStorage (preview/instant).
- `src/components/AppearanceColors.tsx` — Settings → Appearance panel: per-theme
  editor toggle, preset chips, native color pickers (hex↔HSL), live per-channel
  contrast badges, and an AA guardrail banner with "Use nearest passing shade" — an
  illegible body combo is never saved silently. Mounted in `ProfilePage` Appearance card.
- Migration `20260627140000_user_theme_prefs.sql` — documents/ensures the
  `preferences.color_overrides` shape (nested in existing JSONB; reuses profile RLS).
- **Preview:** fully working — pick colors / presets on /profile, see them apply live;
  contrast guardrail demonstrable by choosing a low-contrast text color.
