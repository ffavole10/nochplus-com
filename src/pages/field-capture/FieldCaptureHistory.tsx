import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ChevronRight, MapPin } from "lucide-react";
import type { WorkOrder, WorkOrderStatus } from "@/types/fieldCapture";
import { cn } from "@/lib/utils";

const COMPLETED_STATUSES = [
  "submitted",
  "pending_review",
  "approved",
  "closed",
] as const;

const STATUS_PILL: Partial<Record<WorkOrderStatus, string>> = {
  approved: "bg-fc-success/15 text-fc-success",
  closed: "bg-fc-border text-fc-muted",
  submitted: "bg-secondary/15 text-secondary",
  pending_review: "bg-fc-warning/15 text-fc-warning",
};

const STATUS_LABEL: Partial<Record<WorkOrderStatus, string>> = {
  approved: "Approved",
  closed: "Closed",
  submitted: "Submitted",
  pending_review: "In Review",
};

export default function FieldCaptureHistory() {
  usePageTitle("History");
  const { session } = useAuth();
  const [jobs, setJobs] = useState<(WorkOrder & { charger_count: number })[] | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, work_order_chargers(id)")
        .eq("assigned_technician_id", session.user.id)
        .in("status", COMPLETED_STATUSES)
        .order("scheduled_date", { ascending: false });
      if (error) {
        console.error("[FieldCapture] history load failed", error);
        setJobs([]);
        return;
      }
      const mapped = (data || []).map((row: any) => ({
        ...(row as WorkOrder),
        charger_count: Array.isArray(row.work_order_chargers)
          ? row.work_order_chargers.length
          : 0,
      }));
      setJobs(mapped);
    })();
  }, [session?.user?.id]);

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <h1 className="text-[26px] font-bold text-fc-text leading-tight">
          Your Work History
        </h1>
        <p className="text-[15px] text-fc-muted mt-1">
          {jobs === null
            ? "Loading…"
            : `${jobs.length} completed ${jobs.length === 1 ? "job" : "jobs"}`}
        </p>
      </div>

      {jobs && jobs.length === 0 && (
        <div className="bg-fc-card rounded-2xl p-8 text-center shadow-sm border border-fc-border/60">
          <h2 className="text-base font-semibold text-fc-text">
            No completed jobs yet
          </h2>
          <p className="text-sm text-fc-muted mt-1">
            Your work history will appear here.
          </p>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((j) => (
            <Link
              key={j.id}
              to={`/field-capture/job/${j.id}`}
              className="block active:scale-[0.99] transition-transform"
            >
              <div className="bg-fc-card rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-fc-border/60">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-semibold",
                      STATUS_PILL[j.status]
                    )}
                  >
                    {STATUS_LABEL[j.status] ?? j.status}
                  </span>
                  <span className="text-[11px] text-fc-muted">
                    {new Date(j.scheduled_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="font-bold text-[17px] text-fc-text truncate">
                  {j.client_name}
                </div>
                <div className="text-[14px] text-fc-text/80 truncate mt-0.5">
                  {j.site_name}
                </div>
                <div className="flex items-center justify-between mt-2 text-[13px] text-fc-muted">
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{j.site_address}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-fc-muted/70 shrink-0" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
