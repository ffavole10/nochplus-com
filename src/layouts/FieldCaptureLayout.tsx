import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Home, Clock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const TABS = [
  { to: "/field-capture", label: "Jobs", icon: Home, end: true },
  { to: "/field-capture/history", label: "History", icon: Clock, end: false },
  { to: "/field-capture/profile", label: "Profile", icon: User, end: false },
];

export default function FieldCaptureLayout() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const fullName =
    (session?.user?.user_metadata?.display_name as string) ||
    session?.user?.email?.split("@")[0] ||
    "Technician";
  const firstName = fullName.split(" ")[0];
  const initials = getInitials(fullName) || "T";

  // Hide header on detail/sub-screens so they can manage their own back nav
  const isDetail = /\/field-capture\/job\//.test(location.pathname);
  // Hide bottom tabs during focus flows (charger capture, wrap-up) — tech is in focus mode
  const hideTabs =
    /\/field-capture\/job\/[^/]+\/(charger|wrap-up)/.test(location.pathname);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      try {
        const { count } = await supabase
          .from("notifications" as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .eq("read", false);
        setUnread(count ?? 0);
      } catch {
        setUnread(0);
      }
    })();
  }, [session?.user?.id]);

  return (
    <div className="min-h-screen flex flex-col bg-fc-bg text-fc-text">
      {!isDetail && (
        <header
          className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-fc-border"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="max-w-[480px] mx-auto flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate("/field-capture/profile")}
              className="h-10 w-10 rounded-full bg-fc-primary/15 text-fc-primary-dark flex items-center justify-center font-semibold text-sm shrink-0"
              aria-label="Profile"
            >
              {initials}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[18px] font-bold leading-tight truncate text-fc-text">
                Hi, {firstName}
              </div>
              <div className="text-[13px] text-fc-muted leading-tight mt-0.5">
                {formatDate(new Date())}
              </div>
            </div>
            <button
              className="relative h-11 w-11 rounded-full hover:bg-fc-border/40 flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-fc-text" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      <main
        className={cn(
          "flex-1 w-full max-w-[480px] mx-auto",
          isDetail ? "pt-0" : "pt-[calc(72px+env(safe-area-inset-top))]",
          "pb-[calc(80px+env(safe-area-inset-bottom))]"
        )}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-fc-border shadow-[0_-1px_3px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-[480px] mx-auto grid grid-cols-3 h-[64px]">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                  isActive
                    ? "text-fc-primary"
                    : "text-fc-muted hover:text-fc-text"
                )
              }
            >
              <tab.icon className="h-[22px] w-[22px]" strokeWidth={2.2} />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
