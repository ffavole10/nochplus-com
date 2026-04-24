import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LogOut, Mail, Phone, BadgeCheck } from "lucide-react";

interface Stats {
  total: number;
  avgMinutes: number | null;
}

export default function FieldCaptureProfile() {
  usePageTitle("Profile");
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, avgMinutes: null });

  const handleLogout = async () => {
    await signOut();
    navigate("/field", { replace: true });
  };

  const fullName =
    (session?.user?.user_metadata?.display_name as string) ||
    session?.user?.email?.split("@")[0] ||
    "Technician";
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "T";
  const phone =
    (session?.user?.user_metadata?.phone as string) ||
    (session?.user?.phone as string) ||
    "";

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("work_orders")
        .select("arrival_timestamp,departure_timestamp,status")
        .eq("assigned_technician_id", session.user.id)
        .in("status", ["submitted", "pending_review", "approved", "closed"]);
      const rows = data || [];
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
      setStats({ total: rows.length, avgMinutes: avg });
    })();
  }, [session?.user?.id]);

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="bg-fc-card rounded-2xl p-6 shadow-sm border border-fc-border/60 flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-full bg-fc-primary text-white flex items-center justify-center text-2xl font-bold shadow-md">
          {initials}
        </div>
        <h1 className="text-xl font-bold text-fc-text mt-3">{fullName}</h1>
        <div className="flex items-center gap-1 text-xs text-fc-primary mt-1">
          <BadgeCheck className="h-3.5 w-3.5" />
          NOCH+ Field Technician
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-fc-card rounded-2xl p-4 shadow-sm border border-fc-border/60 text-center">
          <div className="text-2xl font-bold text-fc-text">{stats.total}</div>
          <div className="text-xs text-fc-muted mt-0.5">Jobs completed</div>
        </div>
        <div className="bg-fc-card rounded-2xl p-4 shadow-sm border border-fc-border/60 text-center">
          <div className="text-2xl font-bold text-fc-text">
            {stats.avgMinutes !== null ? `${stats.avgMinutes}m` : "—"}
          </div>
          <div className="text-xs text-fc-muted mt-0.5">Avg time / job</div>
        </div>
      </div>

      <div className="bg-fc-card rounded-2xl shadow-sm border border-fc-border/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-fc-border/60">
          <h2 className="text-sm font-semibold text-fc-text">Contact</h2>
        </div>
        <div className="px-4 py-3 flex items-center gap-3 border-b border-fc-border/60">
          <Mail className="h-4 w-4 text-fc-muted shrink-0" />
          <div className="text-sm text-fc-text truncate">
            {session?.user?.email}
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <Phone className="h-4 w-4 text-fc-muted shrink-0" />
          <div className="text-sm text-fc-text truncate">
            {phone || <span className="text-fc-muted">No phone on file</span>}
          </div>
        </div>
      </div>

      <div className="bg-fc-card rounded-2xl shadow-sm border border-fc-border/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-fc-border/60">
          <h2 className="text-sm font-semibold text-fc-text">Settings</h2>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm text-fc-text font-medium">
              Push notifications
            </div>
            <div className="text-xs text-fc-muted">
              Job assignments and updates
            </div>
          </div>
          <Switch checked={notifications} onCheckedChange={setNotifications} />
        </div>
      </div>

      <Button
        onClick={handleLogout}
        variant="destructive"
        className="w-full h-12 rounded-xl text-base font-semibold"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Log out
      </Button>

      <p className="text-center text-[11px] text-fc-muted pb-4">
        NOCH+ Field · v1.0
      </p>
    </div>
  );
}
