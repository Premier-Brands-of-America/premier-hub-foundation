import { useAuth as useAuthContext } from "@/contexts/AuthContext";

/**
 * Convenience hook exposing the auth/profile shape required by
 * the Art Request Portal spec. Wraps the underlying AuthContext.
 */
export function useAuth() {
  const ctx = useAuthContext();
  const role =
    (ctx.profile?.role as "admin" | "designer" | "requester" | undefined) ??
    (ctx.profile?.is_admin ? "admin" : undefined);

  return {
    session: ctx.session,
    user: ctx.user,
    profile: ctx.profile,
    role,
    departmentId: ctx.profile?.department_id ?? null,
    loading: ctx.loading,
    signOut: ctx.signOut,
    signInWithMicrosoft: ctx.signInWithMicrosoft,
  };
}