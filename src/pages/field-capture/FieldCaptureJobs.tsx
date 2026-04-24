import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFieldCaptureRole } from "@/hooks/useFieldCaptureRole";
import { usePageTitle } from "@/hooks/usePageTitle";
import { MapPin, Zap, ChevronRight, AlertTriangle, Calendar } from "lucide-react";
import maxFullBody from "@/assets/max-fullbody.png";
import type { WorkOrder, WorkOrderStatus } from "@/types/fieldCapture";
import { WORK_ORDER_STATUS_LABELS } from "@/types/fieldCapture";
import { cn } from "@/lib/utils";

interface JobWithCount extends WorkOrder {
  charger_count: number;
}

const STATUS_PILL: Record<WorkOrderStatus, string> = {
  scheduled: "bg-fc-primary/10 text-fc-primary-dark",
  in_progress: "bg-fc-warning/15 text-fc-warning",
  submitted: "bg-fc-success/15 text-fc-success",
  pending_review: "bg-secondary/15 text-secondary",
  flagged: "bg-destructive/15 text-destructive",
  approved: "bg-fc-success/15 text-fc-success",
  closed: "bg-fc-border text-fc-muted",
};

function formatLongDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function JobCard({ job }: { job: JobWithCount }) {
  return (
    <Link
      to={`/field-capture/job/${job.id}`}
      className="block active:scale-[0.99] transition-transform"
    >
      <div className="bg-fc-card rounded-2xl p-4 shadow-sm border border-fc-border/60">
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
        <h3 className="text-[17px] font-bold leading-tight text-fc-text">
          {job.client_name}
        </h3>
        <div className="flex items-start gap-1.5 mt-1.5 text-sm">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-fc-muted" />
          <div className="min-w-0">
            <div className="font-medium text-fc-text truncate">
              {job.site_name}
            </div>
            <div className="text-xs text-fc-muted truncate">
              {job.site_address}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5 text-sm">
            <Zap className="h-4 w-4 text-fc-primary" />
            <span className="font-medium text-fc-text">
              {job.charger_count}{" "}
              {job.charger_count === 1 ? "charger" : "chargers"}
            </span>
          </div>
          <ChevronRight className="h-5 w-5 text-fc-muted" />
        </div>
      </div>
    </Link>
  );
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent?: "default" | "warning";
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        {accent === "warning" && (
          <AlertTriangle className="h-4 w-4 text-fc-warning" />
        )}
        <h2
          className={cn(
            "text-[15px] font-semibold",
            accent === "warning" ? "text-fc-warning" : "text-fc-text"
          )}
        >
          {title}
        </h2>
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-fc-border/70 text-fc-muted">
          {count}
        </span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
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
    "Tech";

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

  const todayJobs = (jobs || []).filter((j) => j.scheduled_date === today);
  const flaggedJobs = (jobs || []).filter((j) => j.status === "flagged");
  const upcomingJobs = (jobs || []).filter(
    (j) => j.scheduled_date > today && j.status !== "flagged"
  );

  return (
    <div className="px-4 py-5 space-y-6">
      <div>
        <p className="text-fc-muted text-sm">{formatLongDate(new Date())}</p>
        {jobs !== null && (
          <h1 className="text-2xl font-bold text-fc-text mt-1 leading-tight">
            {todayJobs.length === 0
              ? "No jobs scheduled for today"
              : `You have ${todayJobs.length} ${todayJobs.length === 1 ? "job" : "jobs"} today`}
          </h1>
        )}
      </div>

      {jobs === null && (
        <div className="text-center py-12 text-fc-muted">
          Loading your jobs…
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <div className="bg-fc-card rounded-2xl p-8 text-center shadow-sm border border-fc-border/60">
          <img
            src={maxFullBody}
            alt="Max"
            className="w-40 h-40 mx-auto object-contain mb-4"
          />
          <h2 className="text-lg font-semibold mb-1 text-fc-text">
            All clear, {firstName}!
          </h2>
          <p className="text-sm text-fc-muted">
            Enjoy your day. Check back tomorrow for new jobs.
          </p>
        </div>
      )}

      {jobs && todayJobs.length > 0 && (
        <Section title="Today" count={todayJobs.length}>
          {todayJobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </Section>
      )}

      {jobs && flaggedJobs.length > 0 && (
        <Section
          title="Flagged — Needs attention"
          count={flaggedJobs.length}
          accent="warning"
        >
          {flaggedJobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </Section>
      )}

      {jobs && upcomingJobs.length > 0 && (
        <Section title="Upcoming" count={upcomingJobs.length}>
          {upcomingJobs.map((j) => (
            <div key={j.id} className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-fc-muted px-1">
                <Calendar className="h-3 w-3" />
                {new Date(j.scheduled_date).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <JobCard job={j} />
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
