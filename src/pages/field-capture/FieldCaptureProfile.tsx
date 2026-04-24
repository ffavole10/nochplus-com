import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronRight, LogOut, Camera } from "lucide-react";

interface Stats {
  total: number;
  thisMonth: number;
  avgMinutes: number | null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default function FieldCaptureProfile() {
  usePageTitle("Profile");
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    thisMonth: 0,
    avgMinutes: null,
  });
  const [logoutOpen, setLogoutOpen] = useState(false);

  const fullName =
    (session?.user?.user_metadata?.display_name as string) ||
    session?.user?.email?.split("@")[0] ||
    "Technician";
  const initials = getInitials(fullName) || "T";

  const handleLogout = async () => {
    await signOut();
    navigate("/field", { replace: true });
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("work_orders")
        .select("scheduled_date,arrival_timestamp,departure_timestamp,status")
        .eq("assigned_technician_id", session.user.id)
        .in("status", ["submitted", "pending_review", "approved", "closed"]);
      const rows = data || [];

      const now = new Date();
      const thisMonthCount = rows.filter((r: any) => {
        if (!r.scheduled_date) return false;
        const d = new Date(r.scheduled_date);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      }).length;

      const durations = rows
        .map((r: any) => {
          if (!r.arrival_timestamp || !r.departure_timestamp) return null;
          const a = new Date(r.arrival_timestamp).getTime();
          const d = new Date(r.departure_timestamp).getTime();
          return d > a ? (d - a) / 60000 : null;
        })
        .filter((v): v is number => v !== null);
      const avg =
        durations.length > 0
          ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
          : null;

      setStats({ total: rows.length, thisMonth: thisMonthCount, avgMinutes: avg });
    })();
  }, [session?.user?.id]);

  const avgDisplay =
    stats.avgMinutes === null
      ? "—"
      : stats.avgMinutes >= 60
        ? `${(stats.avgMinutes / 60).toFixed(1)}h`
        : `${stats.avgMinutes}m`;

  return (
    <div className="px-4 py-5 space-y-4">
      {/* CARD 1: Personal Info */}
      <div className="bg-fc-card rounded-2xl p-6 shadow-sm border border-fc-border/60 flex flex-col items-center text-center">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-fc-primary/15 text-fc-primary-dark flex items-center justify-center text-2xl font-bold">
            {initials}
          </div>
          <button
            type="button"
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-fc-primary text-white flex items-center justify-center shadow-md"
            aria-label="Upload photo"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
        <h1 className="text-[22px] font-bold text-fc-text mt-3">{fullName}</h1>
        <span className="mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full bg-fc-primary/12 text-fc-primary-dark text-[11px] font-semibold uppercase tracking-wide">
          Technician
        </span>
        <div className="text-[14px] text-fc-muted mt-2 truncate max-w-full">
          {session?.user?.email}
        </div>
      </div>

      {/* CARD 2: Stats */}
      <div className="bg-fc-card rounded-2xl p-5 shadow-sm border border-fc-border/60">
        <h2 className="text-[17px] font-bold text-fc-text mb-3">Your Work</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-[24px] font-bold text-fc-primary leading-none">
              {stats.total}
            </div>
            <div className="text-[10px] text-fc-muted uppercase tracking-wide mt-1.5">
              Total Jobs
            </div>
          </div>
          <div className="text-center border-l border-r border-fc-border/60">
            <div className="text-[24px] font-bold text-fc-primary leading-none">
              {stats.thisMonth}
            </div>
            <div className="text-[10px] text-fc-muted uppercase tracking-wide mt-1.5">
              This Month
            </div>
          </div>
          <div className="text-center">
            <div className="text-[24px] font-bold text-fc-primary leading-none">
              {avgDisplay}
            </div>
            <div className="text-[10px] text-fc-muted uppercase tracking-wide mt-1.5">
              Avg Time
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: Preferences */}
      <div className="bg-fc-card rounded-2xl p-5 shadow-sm border border-fc-border/60">
        <h2 className="text-[17px] font-bold text-fc-text mb-3">Preferences</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium text-fc-text">
                Push notifications
              </div>
              <div className="text-[12px] text-fc-muted">
                Job assignments and updates
              </div>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium text-fc-text">
                Email notifications
              </div>
              <div className="text-[12px] text-fc-muted">
                Daily summaries and changes
              </div>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
        </div>
      </div>

      {/* CARD 4: Help & Support */}
      <div className="bg-fc-card rounded-2xl p-2 shadow-sm border border-fc-border/60">
        <div className="px-3 py-2">
          <h2 className="text-[17px] font-bold text-fc-text">Help & Support</h2>
        </div>
        {[
          "Contact Dispatcher",
          "View SOPs",
          "About NOCH+ Field",
        ].map((label) => (
          <button
            key={label}
            type="button"
            className="w-full flex items-center justify-between px-3 py-3 hover:bg-fc-bg active:bg-fc-bg rounded-xl transition-colors"
          >
            <span className="text-[14px] text-fc-text font-medium">{label}</span>
            <ChevronRight className="h-4 w-4 text-fc-muted" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="pt-6">
        <Button
          onClick={() => setLogoutOpen(true)}
          variant="outline"
          className="w-full h-12 rounded-xl text-base font-semibold border-destructive text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </Button>
      </div>

      <p className="text-center text-[11px] text-fc-muted pb-4">
        NOCH+ Field · v1.0
      </p>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of NOCH+ Field?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to view your jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
