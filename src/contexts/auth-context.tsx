import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import * as authApi from "@/api/auth.api";
import { onUnauthorized, tokenStore } from "@/api/client";
import type { Me } from "@/types/api";

/**
 * JWT session (replaces the Supabase auth client). The token is kept in
 * localStorage like the Supabase session was, and validated against
 * GET /api/auth/me on load.
 */
export interface Session {
  accessToken: string;
  user: Me;
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const restore = useCallback(async () => {
    const token = tokenStore.get();
    if (!token) {
      setSession(null);
      setLoading(false);
      return;
    }
    try {
      const user = await authApi.getMe();
      setSession({ accessToken: token, user });
    } catch {
      tokenStore.set(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  // Expired / revoked token anywhere in the app -> back to the sign-in gate.
  useEffect(
    () =>
      onUnauthorized(() => {
        tokenStore.set(null);
        setSession(null);
      }),
    [],
  );

  // Keep tabs in sync (Supabase did this through onAuthStateChange).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wum.access_token") void restore();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [restore]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await authApi.signIn({ email, password });
    tokenStore.set(res.accessToken);
    setSession({ accessToken: res.accessToken, user: res.user });
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    await authApi.signUp({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut();
    } catch {
      /* token already invalid — sign out locally anyway */
    }
    tokenStore.set(null);
    setSession(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = tokenStore.get();
    if (!token) return;
    const user = await authApi.getMe();
    setSession({ accessToken: token, user });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, loading, signIn, signUp, signOut, refreshUser }),
    [session, loading, signIn, signUp, signOut, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
