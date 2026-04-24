import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ChevronRight, MapPin } from "lucide-react";
import type { WorkOrder } from "@/types/fieldCapture";

const COMPLETED_STATUSES = ["submitted", "pending_review", "approved", "closed"];

export default function FieldCaptureHistory() {
  usePageTitle("History");
  const { session } = useAuth();
  const [jobs, setJobs] = useState<WorkOrder[] | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*")
        .eq("assigned_technician_id", session.user.id)
        .in("status", COMPLETED_STATUSES)
        .order("scheduled_date", { ascending: false });
      if (error) {
        console.error("[FieldCapture] history load failed", error);
        setJobs([]);
        return;
      }
      setJobs((data || []) as WorkOrder[]);
    })();
  }, [session?.user?.id]);

  return (
    <div className="px-4 py-5 space-y-4">
      <h1 className="text-2xl font-bold text-fc-text">History</h1>
      <p className="text-sm text-fc-muted -mt-2">
        All jobs you've completed. Tap to review captured details.
      </p>

      {jobs === null && (
        <div className="text-center py-12 text-fc-muted">Loading…</div>
      )}

      {jobs && jobs.length === 0 && (
        <div className="bg-fc-card rounded-2xl p-8 text-center shadow-sm border border-fc-border/60">
          <h2 className="text-base font-semibold text-fc-text">
            No completed jobs yet
          </h2>
          <p className="text-sm text-fc-muted mt-1">
            Submitted jobs will show up here for reference.
          </p>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className="space-y-2.5">
          {jobs.map((j) => (
            <Link
              key={j.id}
              to={`/field-capture/job/${j.id}`}
              className="block active:scale-[0.99] transition-transform"
            >
              <div className="bg-fc-card rounded-2xl p-4 shadow-sm border border-fc-border/60 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-fc-muted">
                      {j.work_order_number}
                    </span>
                    <span className="text-[11px] text-fc-muted">·</span>
                    <span className="text-[11px] text-fc-muted">
                      {new Date(j.scheduled_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="font-semibold text-fc-text truncate">
                    {j.client_name}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-fc-muted truncate mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{j.site_name}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-fc-muted shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
