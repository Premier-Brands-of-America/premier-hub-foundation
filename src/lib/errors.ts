/**
 * Robust error-message extraction. Supabase/PostgREST throw plain objects
 * (PostgrestError), NOT Error instances, so `e instanceof Error` misses the real
 * message. This reads the common shapes so the UI can surface the true cause.
 */
export function getErrorMessage(e: unknown, fallback = "Something went wrong"): string {
  if (typeof e === "string") return e || fallback;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const msg =
      (o.message as string) ||
      (o.error_description as string) ||
      (o.hint as string) ||
      (o.details as string);
    if (msg) return msg;
    try {
      const json = JSON.stringify(e);
      if (json && json !== "{}") return json;
    } catch {
      /* circular — fall through */
    }
  }
  return fallback;
}
