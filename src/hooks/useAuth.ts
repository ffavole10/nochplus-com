import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Set up the listener FIRST so we don't miss events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Only clear session on explicit sign-out, never on token refresh
        if (event === "SIGNED_OUT") {
          setSession(null);
          setLoading(false);
          return;
        }
        // For all other events (SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION, etc.)
        // update session if we got one
        if (newSession) {
          setSession(newSession);
        }
        setLoading(false);
      }
    );

    // 2. Then restore session from storage
    supabase.auth.getSession().then(({ data: { session: restored } }) => {
      if (restored) {
        setSession(restored);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Clear any remember-me preference
    try { localStorage.removeItem("nochplus-remember-me"); } catch {}
  }, []);

  return { session, loading, signOut };
};
