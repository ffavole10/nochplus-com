import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { trackPageView, trackLogin } from "@/lib/activityTracker";

/**
 * Hook to auto-track page views and login events.
 * Place once in the app layout (MainPlatformLayout).
 */
export function useActivityTracking() {
  const location = useLocation();
  const { session } = useAuth();
  const prevPath = useRef<string | null>(null);
  const loginTracked = useRef(false);

  // Track login once per session
  useEffect(() => {
    if (session?.user && !loginTracked.current) {
      loginTracked.current = true;
      trackLogin();
    }
    if (!session) {
      loginTracked.current = false;
    }
  }, [session]);

  // Track page views on route change
  useEffect(() => {
    if (!session?.user) return;
    const path = location.pathname;
    if (path !== prevPath.current) {
      prevPath.current = path;
      const title = document.title;
      trackPageView(path, title);
    }
  }, [location.pathname, session]);
}
