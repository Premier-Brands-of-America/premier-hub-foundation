/**
 * Environment detection utilities.
 * Used to enable preview/dev auth mode safely.
 */

/** Returns true when running inside the Lovable preview iframe or localhost */
export function isPreviewEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.includes("lovable.app") && host.includes("id-preview--")
  );
}
