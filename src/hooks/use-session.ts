import { useAuth } from "@/contexts/auth-context";

/** Same return shape as the original Supabase-based hook. */
export function useSession() {
  const { session, loading } = useAuth();
  return { session, loading, user: session?.user ?? null };
}
