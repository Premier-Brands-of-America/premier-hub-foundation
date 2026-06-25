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

/* v2 design system: a single revamped look, toggled only by theme + density.
 * The legacy `DesignMode` ("classic" | "modern") type is preserved as a
 * deprecated compatibility alias so existing consumers (e.g. ProfilePage,
 * sonner) keep compiling — there is now only one design ("modern"). */
export type Theme = "dark" | "light";
export type Density = "comfortable" | "compact";
/** @deprecated v2 has one design. Kept only for import compatibility. */
export type DesignMode = "classic" | "modern";

interface DesignModeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  density: Density;
  setDensity: (d: Density) => void;

  /** @deprecated always "modern" in v2. */
  mode: DesignMode;
  /** @deprecated no-op in v2 (single design). */
  setMode: (m: DesignMode) => void;
  /** @deprecated alias for toggleTheme. */
  toggle: () => void;
}

const Ctx = createContext<DesignModeCtx | null>(null);
const STORAGE_KEY = "phv2:design-prefs";

function readCached(): { theme?: Theme; density?: Density } {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
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
      };
      if (cancelled) return;
      if (prefs.theme === "dark" || prefs.theme === "light") {
        setThemeState(prefs.theme);
      }
      if (prefs.density === "compact" || prefs.density === "comfortable") {
        setDensityState(prefs.density);
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
      };
      await supabase.from("profiles").update({ preferences: merged }).eq("user_id", uid);
    })().catch(() => {
      /* non-fatal */
    });
  }, [theme, density]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    [],
  );
  const setDensity = useCallback((d: Density) => setDensityState(d), []);

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
