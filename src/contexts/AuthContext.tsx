import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
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

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncAndFetchProfile = async (userId: string, userMeta?: Record<string, any>, email?: string) => {
    // Sync Entra-backed fields on every login
    if (userMeta || email) {
      const updates: {
        email?: string;
        full_name?: string;
        avatar_url?: string;
        updated_at: string;
      } = { updated_at: new Date().toISOString() };
      if (email) updates.email = email;
      if (userMeta?.full_name || userMeta?.name) updates.full_name = userMeta.full_name || userMeta.name;
      if (userMeta?.avatar_url) updates.avatar_url = userMeta.avatar_url;

      await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const meta = session.user.user_metadata;
          setTimeout(() => syncAndFetchProfile(session.user.id, meta, session.user.email ?? undefined), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        syncAndFetchProfile(session.user.id, session.user.user_metadata, session.user.email ?? undefined);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "openid profile email",
        redirectTo: window.location.origin,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signInWithMicrosoft, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
