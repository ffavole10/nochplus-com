import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFieldCaptureRole } from "@/hooks/useFieldCaptureRole";
import { usePageTitle } from "@/hooks/usePageTitle";
import { MapPin, Zap, ChevronRight, Flag, Clock as ClockIcon } from "lucide-react";
import maxFullBody from "@/assets/max-fullbody.png";
import type { WorkOrder, WorkOrderStatus } from "@/types/fieldCapture";
import { WORK_ORDER_STATUS_LABELS } from "@/types/fieldCapture";
import { cn } from "@/lib/utils";

interface JobWithCount extends WorkOrder {
  charger_count: number;
}

const STATUS_PILL: Record<WorkOrderStatus, string> = {
  scheduled: "bg-fc-primary/12 text-fc-primary-dark",
  in_progress: "bg-fc-warning/15 text-fc-warning",
  submitted: "bg-fc-success/15 text-fc-success",
  pending_review: "bg-secondary/15 text-secondary",
  flagged: "bg-fc-warning/15 text-fc-warning",
  approved: "bg-fc-success/15 text-fc-success",
  closed: "bg-fc-border text-fc-muted",
};

// Local-date YYYY-MM-DD (avoids UTC shift that hides "today" jobs in west-of-UTC tz).
function localISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayISO() {
  return localISO(new Date());
}

function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localISO(d);
}

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function JobCard({ job, flagged = false }: { job: JobWithCount; flagged?: boolean }) {
  return (
    <Link
      to={`/field-capture/job/${job.id}`}
      className="block active:scale-[0.99] transition-transform"
    >
      <div
        className={cn(
          "bg-fc-card rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-fc-border/60",
          flagged && "border-l-[4px] border-l-fc-warning"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-semibold",
              STATUS_PILL[job.status]
            )}
          >
            {WORK_ORDER_STATUS_LABELS[job.status]}
          </span>
          <span className="text-[11px] font-mono text-fc-muted">
            {job.work_order_number}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {flagged && <Flag className="h-4 w-4 text-fc-warning shrink-0" />}
          <h3 className="text-[17px] font-bold leading-tight text-fc-text truncate">
            {job.client_name}
          </h3>
        </div>

        <div className="text-[15px] font-medium text-fc-text/80 mt-0.5 truncate">
          {job.site_name}
        </div>
        <a
          href={mapsUrl(job.site_address)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-start gap-1 mt-1 text-[13px] text-fc-primary hover:underline active:opacity-70"
        >
          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="truncate">{job.site_address}</span>
        </a>

        <div className="flex items-center justify-between mt-3 text-[13px] text-fc-muted">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {formatShortDate(job.scheduled_date)}
            </span>
            <span className="text-fc-border">•</span>
            <span className="inline-flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-fc-primary" />
              {job.charger_count}{" "}
              {job.charger_count === 1 ? "charger" : "chargers"}
            </span>
          </div>
          <ChevronRight className="h-5 w-5 text-fc-muted/70" />
        </div>
      </div>
    </Link>
  );
}

export default function FieldCaptureJobs() {
  usePageTitle("Jobs");
  const { session } = useAuth();
  const { isFieldAdmin } = useFieldCaptureRole();
  const [jobs, setJobs] = useState<JobWithCount[] | null>(null);
  const today = todayISO();
  const sevenDaysOut = inDays(7);

  const firstName =
    (session?.user?.user_metadata?.display_name as string)?.split(" ")[0] ||
    session?.user?.email?.split("@")[0] ||
    "there";

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      let q = supabase
        .from("work_orders")
        .select("*, work_order_chargers(id)")
        .lte("scheduled_date", sevenDaysOut)
        .order("scheduled_date", { ascending: true });
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
  }, [session?.user?.id, isFieldAdmin, sevenDaysOut]);

  const flaggedJobs = (jobs || []).filter((j) => j.status === "flagged");
  const todayJobs = (jobs || []).filter(
    (j) => j.scheduled_date === today && j.status !== "flagged"
  );
  const upcomingJobs = (jobs || []).filter(
    (j) => j.scheduled_date > today && j.status !== "flagged"
  );

  const hasAnyJobs =
    jobs !== null &&
    (todayJobs.length > 0 || flaggedJobs.length > 0 || upcomingJobs.length > 0);

  return (
    <div className="px-4 py-5 space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-fc-text leading-tight">
          Today
        </h1>
        {jobs !== null && (
          <p className="text-[15px] text-fc-muted mt-1">
            {todayJobs.length === 0
              ? flaggedJobs.length > 0
                ? "Items need your attention"
                : "No jobs scheduled"
              : `${todayJobs.length} ${todayJobs.length === 1 ? "job" : "jobs"} scheduled`}
          </p>
        )}
      </div>

      {jobs === null && (
        <div className="text-center py-12 text-fc-muted">Loading your jobs…</div>
      )}

      {/* Flagged section first */}
      {jobs && flaggedJobs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[18px] font-bold text-fc-warning flex items-center gap-2 px-0.5">
            <Flag className="h-4 w-4" />
            Needs Your Attention
          </h2>
          <div className="space-y-3">
            {flaggedJobs.map((j) => (
              <JobCard key={j.id} job={j} flagged />
            ))}
          </div>
        </section>
      )}

      {/* Today's jobs */}
      {jobs && todayJobs.length > 0 && (
        <section className="space-y-3">
          {flaggedJobs.length > 0 && (
            <h2 className="text-[18px] font-bold text-fc-text px-0.5">
              Scheduled Today
            </h2>
          )}
          <div className="space-y-3">
            {todayJobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {jobs && upcomingJobs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[18px] font-bold text-fc-text px-0.5">Upcoming</h2>
          <div className="space-y-3">
            {upcomingJobs.map((j) => (
              <div key={j.id} className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-fc-muted px-1">
                  {new Date(j.scheduled_date).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <JobCard job={j} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {jobs && !hasAnyJobs && (
        <div className="flex flex-col items-center text-center pt-10 pb-6">
          <img
            src={maxFullBody}
            alt="Max"
            className="w-[200px] h-[200px] object-contain fc-float"
          />
          <h2 className="text-[22px] font-bold text-fc-text mt-4">
            All clear today, {firstName}!
          </h2>
          <p className="text-[15px] text-fc-muted mt-1">
            Enjoy your day. Check back tomorrow.
          </p>
        </div>
      )}
    </div>
  );
}
