import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Clipboard, Clock, User } from "lucide-react";
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

const TABS = [
  { to: "/field-capture", label: "Jobs", icon: Clipboard, end: true },
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
          className="fixed top-0 left-0 right-0 z-40 bg-fc-header border-b border-fc-border"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center gap-3 px-5 py-3">
            <button
              onClick={() => navigate("/field-capture/profile")}
              className="h-10 w-10 rounded-full bg-fc-primary text-white flex items-center justify-center font-semibold text-sm shrink-0 shadow-sm"
              aria-label="Profile"
            >
              {initials}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[17px] font-bold leading-tight truncate">
                Hi, {firstName}
              </div>
              <div className="text-xs text-fc-muted leading-tight">
                NOCH+ Field
              </div>
            </div>
            <button
              className="relative h-10 w-10 rounded-full hover:bg-fc-border/50 flex items-center justify-center"
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
          isDetail ? "pt-0" : "pt-[72px]",
          "pb-[calc(80px+env(safe-area-inset-bottom))]"
        )}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-fc-border shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
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
                  "flex flex-col items-center justify-center gap-1 transition-colors",
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
