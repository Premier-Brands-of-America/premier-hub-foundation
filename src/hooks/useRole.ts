import { useAuth } from "@/hooks/useAuth";

export type Role = "admin" | "designer" | "requester";

export function useRole(): Role | null {
  const { role } = useAuth();
  return (role as Role | undefined) ?? null;
}
