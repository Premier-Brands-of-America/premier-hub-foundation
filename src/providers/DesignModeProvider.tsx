import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import { getPreset, type ColorChannel, type ColorTriple } from "@/lib/colorPresets";

/* v2 design system: a single revamped look, toggled only by theme + density.
 * The legacy `DesignMode` ("classic" | "modern") type is preserved as a
 * deprecated compatibility alias so existing consumers (e.g. ProfilePage,
 * sonner) keep compiling — there is now only one design ("modern"). */
export type Theme = "dark" | "light";
export type Density = "comfortable" | "compact";
/** @deprecated v2 has one design. Kept only for import compatibility. */
export type DesignMode = "classic" | "modern";

/** Per-user color overrides, per theme. Each channel is an HSL triple or absent (=use default token). */
export type ColorOverrides = {
  light: Partial<ColorTriple>;
  dark: Partial<ColorTriple>;
};

/** Maps a user color channel onto the CSS token(s) it overrides. */
const CHANNEL_VARS: Record<ColorChannel, string[]> = {
  text: ["--foreground"],
  highlight: ["--primary", "--ring"],
  background: ["--background"],
};

const EMPTY_OVERRIDES: ColorOverrides = { light: {}, dark: {} };

interface DesignModeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  density: Density;
  setDensity: (d: Density) => void;

  /** Per-user color overrides (text/highlight/background per theme). */
  colorOverrides: ColorOverrides;
  /** Set or clear (value=null) one channel for one theme. */
  setColor: (theme: Theme, channel: ColorChannel, value: string | null) => void;
  /** Apply a curated preset to both themes. */
  applyColorPreset: (presetId: string) => void;
  /** Clear all custom colors (revert to default tokens). */
  resetColors: () => void;

  /** @deprecated always "modern" in v2. */
  mode: DesignMode;
  /** @deprecated no-op in v2 (single design). */
  setMode: (m: DesignMode) => void;
  /** @deprecated alias for toggleTheme. */
  toggle: () => void;
}

const Ctx = createContext<DesignModeCtx | null>(null);
const STORAGE_KEY = "phv2:design-prefs";
const COLOR_KEY = "phv2:color-overrides";

function readCached(): { theme?: Theme; density?: Density } {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function readCachedColors(): ColorOverrides {
  try {
    const parsed = JSON.parse(localStorage.getItem(COLOR_KEY) || "{}");
    return { light: parsed.light ?? {}, dark: parsed.dark ?? {} };
  } catch {
    return { light: {}, dark: {} };
  }
}

/** Apply the active theme's overrides to <html>, removing any channel that is unset. */
function applyColorVars(theme: Theme, overrides: ColorOverrides) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const active = overrides[theme] ?? {};
  (Object.keys(CHANNEL_VARS) as ColorChannel[]).forEach((channel) => {
    const value = active[channel];
    CHANNEL_VARS[channel].forEach((cssVar) => {
      if (value) root.style.setProperty(cssVar, value);
      else root.style.removeProperty(cssVar);
    });
  });
}

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function DesignModeProvider({ children }: { children: React.ReactNode }) {
  const cached = typeof window !== "undefined" ? readCached() : {};
  const [theme, setThemeState] = useState<Theme>(
    cached.theme === "light" || cached.theme === "dark"
      ? cached.theme
      : prefersDark()
        ? "dark"
        : "light",
  );
  const [density, setDensityState] = useState<Density>(
    cached.density === "compact" ? "compact" : "comfortable",
  );
  const [colorOverrides, setColorOverrides] = useState<ColorOverrides>(
    typeof window !== "undefined" ? readCachedColors() : EMPTY_OVERRIDES,
  );

  // Reconcile with profiles.preferences once auth resolves.
  useEffect(() => {
    if (isPreviewEnvironment()) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("user_id", uid)
        .maybeSingle();
      const prefs = ((p?.preferences as unknown) ?? {}) as {
        theme?: Theme;
        density?: Density;
        color_overrides?: ColorOverrides;
      };
      if (cancelled) return;
      if (prefs.theme === "dark" || prefs.theme === "light") {
        setThemeState(prefs.theme);
      }
      if (prefs.density === "compact" || prefs.density === "comfortable") {
        setDensityState(prefs.density);
      }
      if (prefs.color_overrides) {
        setColorOverrides({
          light: prefs.color_overrides.light ?? {},
          dark: prefs.color_overrides.dark ?? {},
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply to <html> before paint (avoids theme flash) + cache + persist.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.design = "modern"; // single design; keeps legacy selectors resolving
    root.dataset.density = density;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, density }));
    } catch {
      /* ignore */
    }
  }, [theme, density]);

  // Apply per-user color overrides for the active theme (after the theme class
  // is set so .dark token defaults are the fallback) + cache.
  useLayoutEffect(() => {
    applyColorVars(theme, colorOverrides);
    try {
      localStorage.setItem(COLOR_KEY, JSON.stringify(colorOverrides));
    } catch {
      /* ignore */
    }
  }, [theme, colorOverrides]);

  // Persist to DB (non-blocking; merges into existing preferences).
  useEffect(() => {
    if (isPreviewEnvironment()) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("user_id", uid)
        .maybeSingle();
      const merged = {
        ...((p?.preferences as Record<string, unknown>) ?? {}),
        theme,
        density,
        color_overrides: colorOverrides,
      };
      await supabase.from("profiles").update({ preferences: merged }).eq("user_id", uid);
    })().catch(() => {
      /* non-fatal */
    });
  }, [theme, density, colorOverrides]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    [],
  );
  const setDensity = useCallback((d: Density) => setDensityState(d), []);

  const setColor = useCallback((t: Theme, channel: ColorChannel, value: string | null) => {
    setColorOverrides((prev) => {
      const next = { ...prev[t] };
      if (value) next[channel] = value;
      else delete next[channel];
      return { ...prev, [t]: next };
    });
  }, []);

  const applyColorPreset = useCallback((presetId: string) => {
    const preset = getPreset(presetId);
    if (!preset) return;
    setColorOverrides({ light: { ...preset.light }, dark: { ...preset.dark } });
  }, []);

  const resetColors = useCallback(() => setColorOverrides(EMPTY_OVERRIDES), []);

  // Deprecated compatibility shims.
  const setMode = useCallback((_m: DesignMode) => {}, []);

  return (
    <Ctx.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        density,
        setDensity,
        colorOverrides,
        setColor,
        applyColorPreset,
        resetColors,
        mode: "modern",
        setMode,
        toggle: toggleTheme,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useDesignMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDesignMode must be used inside DesignModeProvider");
  return ctx;
}
