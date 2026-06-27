/**
 * Environment detection utilities.
 * Used to enable preview/dev auth mode safely.
 */

/**
 * Returns true in any non-production "preview" context where the real OAuth
 * flow must NOT run (it would redirect away to the deployed Supabase Site URL,
 * e.g. the Lovable deployment). Covers the Vite dev server (local review over
 * Tailscale included), localhost, and the Lovable preview iframe.
 *
 * The production build (Lovable) has import.meta.env.DEV === false and is served
 * from the lovable.app domain, so it correctly returns false there.
 */
export function isPreviewEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  // Served by the Vite dev server => always preview (review build).
  if (import.meta.env.DEV) return true;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.includes("lovableproject.com") ||
    host.endsWith(".ts.net") ||   // Tailscale MagicDNS (remote local review)
    host.startsWith("100.")        // Tailscale CGNAT IP range (100.64.0.0/10)
  );
}
