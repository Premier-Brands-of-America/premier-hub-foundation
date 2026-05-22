import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";

export type DesignMode = "classic" | "modern";
export type Density = "comfortable" | "compact";

interface DesignModeCtx {
  mode: DesignMode;
  setMode: (m: DesignMode) => void;
  density: Density;
  setDensity: (d: Density) => void;
  toggle: () => void;
}

const Ctx = createContext<DesignModeCtx | null>(null);
const STORAGE_KEY = "phv2:design-prefs";

function readCached(): { designMode?: DesignMode; density?: Density } {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function DesignModeProvider({ children }: { children: React.ReactNode }) {
  const cached = typeof window !== "undefined" ? readCached() : {};
  const [mode, setModeState] = useState<DesignMode>(
    cached.designMode === "modern" ? "modern" : "classic"
  );
  const [density, setDensityState] = useState<Density>(
    cached.density === "compact" ? "compact" : "comfortable"
  );

  // Reconcile with profile.preferences after auth resolves.
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
        designMode?: DesignMode;
        density?: Density;
      };
      if (cancelled) return;
      if (prefs.designMode === "modern" || prefs.designMode === "classic") {
        setModeState(prefs.designMode);
      }
      if (prefs.density === "compact" || prefs.density === "comfortable") {
        setDensityState(prefs.density);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply to <html> + cache + persist.
  useEffect(() => {
    document.documentElement.dataset.design = mode;
    document.documentElement.dataset.density = density;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ designMode: mode, density }));
    } catch {
      /* ignore */
    }
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
        designMode: mode,
        density,
      };
      await supabase.from("profiles").update({ preferences: merged }).eq("user_id", uid);
    })().catch(() => {
      /* non-fatal */
    });
  }, [mode, density]);

  const setMode = useCallback((m: DesignMode) => setModeState(m), []);
  const setDensity = useCallback((d: Density) => setDensityState(d), []);
  const toggle = useCallback(
    () => setModeState((m) => (m === "modern" ? "classic" : "modern")),
    []
  );

  return (
    <Ctx.Provider value={{ mode, setMode, density, setDensity, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDesignMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDesignMode must be used inside DesignModeProvider");
  return ctx;
}