import React, { createContext, useContext, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";

/**
 * Profile shape matching the real AuthContext profile.
 * Keep in sync with AuthContext.tsx Profile interface.
 */
export interface MockProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  title: string | null;
  department: string | null;
  manager_email: string | null;
  is_admin: boolean;
  can_view_diagnostics: boolean;
  is_active: boolean;
}

export interface MockUserOption {
  label: string;
  description: string;
  profile: MockProfile;
}

/** Predefined mock users for preview testing */
export const MOCK_USERS: MockUserOption[] = [
  {
    label: "Standard Employee",
    description: "Regular user with no special permissions",
    profile: {
      id: "mock-001",
      user_id: "mock-uid-001",
      email: "jane.doe@premier-brands.com",
      full_name: "Jane Doe",
      avatar_url: null,
      title: "Project Coordinator",
      department: "Marketing",
      manager_email: "manager@premier-brands.com",
      is_admin: false,
      can_view_diagnostics: false,
      is_active: true,
    },
  },
  {
    label: "Admin User",
    description: "Full admin access with admin tools visible",
    profile: {
      id: "mock-002",
      user_id: "mock-uid-002",
      email: "admin@premier-brands.com",
      full_name: "Alex Admin",
      avatar_url: null,
      title: "IT Director",
      department: "Information Technology",
      manager_email: "cto@premier-brands.com",
      is_admin: true,
      can_view_diagnostics: true,
      is_active: true,
    },
  },
  {
    label: "Diagnostics User",
    description: "Can view diagnostics but is not an admin",
    profile: {
      id: "mock-003",
      user_id: "mock-uid-003",
      email: "diag.user@premier-brands.com",
      full_name: "Dana Diagnostics",
      avatar_url: null,
      title: "QA Analyst",
      department: "Quality Assurance",
      manager_email: "qa-lead@premier-brands.com",
      is_admin: false,
      can_view_diagnostics: true,
      is_active: true,
    },
  },
];

interface PreviewAuthContextType {
  session: Session | null;
  user: User | null;
  profile: MockProfile | null;
  loading: boolean;
  isPreview: true;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
  signInAsMock: (profile: MockProfile) => void;
}

const PreviewAuthContext = createContext<PreviewAuthContextType | undefined>(undefined);

export function PreviewAuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<MockProfile | null>(null);
  const [mockUser, setMockUser] = useState<User | null>(null);
  const [mockSession, setMockSession] = useState<Session | null>(null);

  const signInAsMock = useCallback((p: MockProfile) => {
    // Build minimal User and Session objects that satisfy the app's needs
    const fakeUser = {
      id: p.user_id,
      email: p.email,
      user_metadata: { full_name: p.full_name },
      app_metadata: { provider: "preview" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as unknown as User;

    const fakeSession = {
      access_token: "preview-token",
      refresh_token: "preview-refresh",
      expires_in: 999999,
      token_type: "bearer",
      user: fakeUser,
    } as unknown as Session;

    setMockUser(fakeUser);
    setMockSession(fakeSession);
    setProfile(p);
  }, []);

  const signOut = useCallback(async () => {
    setMockUser(null);
    setMockSession(null);
    setProfile(null);
  }, []);

  const signInWithMicrosoft = useCallback(async () => {
    // No-op in preview — we use mock login instead
    console.warn("[Preview] Microsoft sign-in is disabled in preview mode.");
  }, []);

  return (
    <PreviewAuthContext.Provider
      value={{
        session: mockSession,
        user: mockUser,
        profile,
        loading: false,
        isPreview: true,
        signInWithMicrosoft,
        signOut,
        signInAsMock,
      }}
    >
      {children}
    </PreviewAuthContext.Provider>
  );
}

export function usePreviewAuth() {
  const context = useContext(PreviewAuthContext);
  if (!context) throw new Error("usePreviewAuth must be used within PreviewAuthProvider");
  return context;
}
