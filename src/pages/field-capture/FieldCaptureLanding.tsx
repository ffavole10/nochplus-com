import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { useFieldCaptureRole } from "@/hooks/useFieldCaptureRole";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { MapPin, Zap } from "lucide-react";
import maxFullBody from "@/assets/max-fullbody.png";
import nochLogo from "@/assets/noch-logo-white.png";
import type { WorkOrder, WorkOrderStatus } from "@/types/fieldCapture";
import { WORK_ORDER_STATUS_LABELS } from "@/types/fieldCapture";

const STATUS_VARIANTS: Record<WorkOrderStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  submitted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending_review: "bg-purple-100 text-purple-700 border-purple-200",
  flagged: "bg-red-100 text-red-700 border-red-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed: "bg-gray-100 text-gray-700 border-gray-200",
};

interface JobWithCount extends WorkOrder {
  charger_count: number;
}

export default function FieldCaptureLanding() {
  usePageTitle("Today's Jobs");
  const { session } = useAuth();
  const { isTechnician, isFieldAdmin } = useFieldCaptureRole();
  const [jobs, setJobs] = useState<JobWithCount[] | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const firstName =
    (session?.user?.user_metadata?.display_name as string)?.split(" ")[0] ||
    (session?.user?.email?.split("@")[0] ?? "Tech");

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      let q = supabase
        .from("work_orders")
        .select("*, work_order_chargers(id)")
        .eq("scheduled_date", today)
        .order("scheduled_date", { ascending: true });
      // Technicians-only naturally limited by RLS; admins see all today.
      if (!isFieldAdmin) {
        q = q.eq("assigned_technician_id", session.user.id);
      }
      const { data, error } = await q;
      if (error) {
        console.error("[FieldCapture] load jobs failed", error);
        setJobs([]);
        return;
      }
      const mapped: JobWithCount[] = (data || []).map((row: any) => ({
        ...(row as WorkOrder),
        charger_count: Array.isArray(row.work_order_chargers)
          ? row.work_order_chargers.length
          : 0,
      }));
      setJobs(mapped);
    })();
  }, [session?.user?.id, today, isFieldAdmin]);

  const niceDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile-first header */}
      <header className="bg-primary text-primary-foreground px-5 pt-6 pb-8 rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between mb-5">
          <img src={nochLogo} alt="NOCH+" className="h-8 brightness-0 invert" />
          <span className="text-xs uppercase tracking-wider opacity-80">
            Field Capture
          </span>
        </div>
        <h1 className="text-3xl font-bold">Hi, {firstName}</h1>
        <p className="text-sm opacity-90 mt-1">{niceDate}</p>
        {jobs !== null && (
          <p className="text-base mt-3 font-medium">
            You have {jobs.length} {jobs.length === 1 ? "job" : "jobs"} today
          </p>
        )}
      </header>

      <main className="px-4 py-5 max-w-2xl mx-auto space-y-3">
        {jobs === null && (
          <div className="text-center py-12 text-muted-foreground">
            Loading today's jobs…
          </div>
        )}

        {jobs && jobs.length === 0 && (
          <Card className="p-8 text-center">
            <img
              src={maxFullBody}
              alt="Max"
              className="w-40 h-40 mx-auto object-contain mb-4"
            />
            <h2 className="text-lg font-semibold mb-1">All clear today</h2>
            <p className="text-sm text-muted-foreground">
              No jobs scheduled for today. Enjoy your day, {firstName}!
            </p>
          </Card>
        )}

        {jobs && jobs.length > 0 && (
          <div className="space-y-3">
            {jobs.map((j) => (
              <Link
                key={j.id}
                to={`/field-capture/job/${j.id}`}
                className="block active:scale-[0.99] transition-transform"
              >
                <Card className="p-4 hover:shadow-md transition-shadow border-border">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Badge
                      variant="outline"
                      className={STATUS_VARIANTS[j.status]}
                    >
                      {WORK_ORDER_STATUS_LABELS[j.status]}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {j.work_order_number}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold leading-tight">
                    {j.client_name}
                  </h3>
                  <div className="flex items-start gap-1.5 mt-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">
                        {j.site_name}
                      </div>
                      <div className="text-xs">{j.site_address}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-sm">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {j.charger_count}{" "}
                      {j.charger_count === 1 ? "charger" : "chargers"} to
                      service
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {isTechnician && !isFieldAdmin && (
          <p className="text-center text-xs text-muted-foreground pt-6">
            Field Capture · NOCH+
          </p>
        )}
      </main>
    </div>
  );
}
