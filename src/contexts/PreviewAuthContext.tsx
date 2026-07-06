import React, { useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AuthContext, type Profile } from "@/contexts/AuthContext";
import { getPreviewViewer, setPreviewViewer } from "@/lib/previewViewer";

export interface MockUserOption {
  label: string;
  description: string;
  profile: Profile;
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

function buildMockAuth(p: Profile): { user: User; session: Session } {
  const user = {
    id: p.user_id,
    email: p.email,
    user_metadata: { full_name: p.full_name },
    app_metadata: { provider: "preview" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as unknown as User;

  const session = {
    access_token: "preview-token",
    refresh_token: "preview-refresh",
    expires_in: 999999,
    token_type: "bearer",
    user,
  } as unknown as Session;

  return { user, session };
}

/** Restore the persisted mock viewer so a page reload doesn't log you out. */
function restoreProfile(): Profile | null {
  const viewer = getPreviewViewer();
  if (!viewer) return null;
  return MOCK_USERS.find((m) => m.profile.user_id === viewer.userId)?.profile ?? null;
}

export function PreviewAuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(restoreProfile);
  const [mockUser, setMockUser] = useState<User | null>(() =>
    profile ? buildMockAuth(profile).user : null,
  );
  const [mockSession, setMockSession] = useState<Session | null>(() =>
    profile ? buildMockAuth(profile).session : null,
  );

  const signInAsMock = useCallback((p: Profile) => {
    const { user, session } = buildMockAuth(p);
    setMockUser(user);
    setMockSession(session);
    setProfile(p);
    // Mirror the viewer so the service layer can scope the ACL demo path.
    setPreviewViewer({
      userId: p.user_id,
      email: p.email ?? "",
      isAdmin: !!p.is_admin,
      departmentId: (p as { department_id?: string | null }).department_id ?? null,
      managerEmail: p.manager_email ?? null,
    });
  }, []);

  const signOut = useCallback(async () => {
    setMockUser(null);
    setMockSession(null);
    setProfile(null);
    setPreviewViewer(null);
  }, []);

  const signInWithMicrosoft = useCallback(async () => {
    console.warn("[Preview] Microsoft sign-in is disabled in preview mode.");
  }, []);

  return (
    <AuthContext.Provider
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
    </AuthContext.Provider>
  );
}
