-- Feature 2 — per-user color customization.
--
-- Custom text/highlight/background colors (per light/dark theme) are stored
-- under profiles.preferences->'color_overrides'. We nest into the existing
-- preferences JSONB (which already holds theme + density) rather than adding a
-- separate user_theme_prefs table: it reuses the established preferences
-- read/write path and its RLS (a profile owner may UPDATE only their own row),
-- so no new policies are required. See DECISIONS.md.
--
-- Shape:
--   preferences.color_overrides = {
--     "light": { "text": "<h s% l%>", "highlight": "<h s% l%>", "background": "<h s% l%>" },
--     "dark":  { "text": "...", "highlight": "...", "background": "..." }
--   }
-- Each channel is an HSL triple (token format) or absent (=use default token).

-- preferences already exists as JSONB DEFAULT '{}'; ensure it for safety (idempotent).
alter table public.profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;

comment on column public.profiles.preferences is
  'User UI preferences: { theme, density, color_overrides: { light, dark } } where each color channel (text/highlight/background) is an HSL triple. See Feature 2.';
