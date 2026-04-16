import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "noch_session_id";

function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

let currentPagePath: string | null = null;
let pageEnteredAt: number | null = null;

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function trackEvent(params: {
  event_type: "login" | "logout" | "page_view" | "action";
  page_path?: string;
  page_title?: string;
  action_name?: string;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    const userId = await getUserId();
    if (!userId) return;

    await supabase.from("user_activity_logs").insert([{
      user_id: userId,
      session_id: getSessionId(),
      event_type: params.event_type,
      page_path: params.page_path ?? null,
      page_title: params.page_title ?? null,
      action_name: params.action_name ?? null,
      duration_seconds: params.duration_seconds ?? null,
      metadata: (params.metadata ?? {}) as any,
    }]);
  } catch {
    // Silent fail — analytics should never block the user
  }
}

export function trackPageView(path: string, title: string) {
  // Log duration for previous page
  if (currentPagePath && pageEnteredAt) {
    const duration = Math.round((Date.now() - pageEnteredAt) / 1000);
    if (duration > 0) {
      trackEvent({
        event_type: "page_view",
        page_path: currentPagePath,
        duration_seconds: duration,
        action_name: "page_exit",
      });
    }
  }

  currentPagePath = path;
  pageEnteredAt = Date.now();

  trackEvent({
    event_type: "page_view",
    page_path: path,
    page_title: title,
  });
}

export function trackAction(actionName: string, metadata?: Record<string, unknown>) {
  trackEvent({
    event_type: "action",
    action_name: actionName,
    page_path: currentPagePath ?? undefined,
    metadata,
  });
}

export function trackLogin() {
  trackEvent({ event_type: "login" });
}

export function trackLogout() {
  // Flush page duration
  if (currentPagePath && pageEnteredAt) {
    const duration = Math.round((Date.now() - pageEnteredAt) / 1000);
    trackEvent({
      event_type: "page_view",
      page_path: currentPagePath,
      duration_seconds: duration,
      action_name: "page_exit",
    });
  }
  trackEvent({ event_type: "logout" });
}

// Flush on tab close
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (currentPagePath && pageEnteredAt) {
      const duration = Math.round((Date.now() - pageEnteredAt) / 1000);
      const userId = null; // Can't await here, best-effort via sendBeacon
      // Best-effort: use navigator.sendBeacon if available
      try {
        const payload = {
          user_id: "", // Will be filled by RLS
          session_id: getSessionId(),
          event_type: "page_view",
          page_path: currentPagePath,
          duration_seconds: duration,
          action_name: "page_exit",
        };
        // Silent — no guaranteed delivery on unload
      } catch {
        // noop
      }
    }
  });
}
