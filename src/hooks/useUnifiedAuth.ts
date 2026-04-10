import { useContext, createContext } from "react";
import type { AuthContextType } from "@/contexts/AuthContext";

/**
 * Unified auth context that works for both production and preview modes.
 * Both AuthProvider and PreviewAuthProvider write to this same context shape.
 */

// Re-export the context so providers can set it
export const UnifiedAuthContext = createContext<AuthContextType | undefined>(undefined);

export function useUnifiedAuth(): AuthContextType {
  const context = useContext(UnifiedAuthContext);
  if (!context) throw new Error("useUnifiedAuth must be used within an auth provider");
  return context;
}
