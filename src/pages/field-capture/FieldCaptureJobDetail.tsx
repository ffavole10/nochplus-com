import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  Plus,
  Zap,
  Clock,
  Navigation,
  Phone,
  Mail,
  User,
  FileText,
  StickyNote,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  WorkOrder,
  WorkOrderCharger,
  WorkOrderStatus,
  ChargerCaptureStatus,
  BriefingType,
  JobType,
} from "@/types/fieldCapture";
import {
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  ISSUE_CATEGORY_LABELS,
  ROOT_CAUSE_LABELS,
} from "@/types/fieldCapture";
import { cn } from "@/lib/utils";
import SafetyBriefingModal from "@/components/field-capture/SafetyBriefingModal";
import AddChargerOnSiteModal from "@/components/field-capture/AddChargerOnSiteModal";
import SowViewerDialog from "@/components/field-capture/SowViewerDialog";

const JOB_TYPE_PILL: Record<JobType, string> = {
  repair: "bg-fc-primary/15 text-fc-primary-dark border-fc-primary/30",
  troubleshooting: "bg-fc-warning/15 text-fc-warning border-fc-warning/30",
  installation: "bg-secondary/15 text-secondary border-secondary/30",
  maintenance: "bg-fc-success/15 text-fc-success border-fc-success/30",
  commissioning: "bg-accent/15 text-accent-foreground border-accent/30",
  decommissioning: "bg-destructive/15 text-destructive border-destructive/30",
};

const STATUS_PILL: Record<WorkOrderStatus, string> = {
  scheduled: "bg-fc-primary/10 text-fc-primary-dark",
  in_progress: "bg-fc-warning/15 text-fc-warning",
  submitted: "bg-fc-success/15 text-fc-success",
  pending_review: "bg-secondary/15 text-secondary",
  flagged: "bg-destructive/15 text-destructive",
  approved: "bg-fc-success/15 text-fc-success",
  closed: "bg-fc-border text-fc-muted",
  cancelled: "bg-destructive/15 text-destructive",
  archived: "bg-fc-border text-fc-muted",
};

const CHARGER_PILL: Record<ChargerCaptureStatus, string> = {
  not_started: "bg-fc-border/70 text-fc-muted",
  in_progress: "bg-fc-warning/15 text-fc-warning",
  complete: "bg-fc-success/15 text-fc-success",
};

const CHARGER_LABEL: Record<ChargerCaptureStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  complete: "Complete",
};

function telHref(phone: string | null | undefined) {
  if (!phone) return "#";
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits.startsWith("+") ? digits : `+1${digits}`}`;
}

export default function FieldCaptureJobDetail() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  usePageTitle("Job");

  const [job, setJob] = useState<WorkOrder | null>(null);
  const [chargers, setChargers] = useState<WorkOrderCharger[]>([]);
  const [loading, setLoading] = useState(true);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefingType, setBriefingType] = useState<BriefingType>("full_briefing");
  const [addOpen, setAddOpen] = useState(false);
  const [sowOpen, setSowOpen] = useState(false);

  const fullName =
    (session?.user?.user_metadata?.display_name as string) ||
    session?.user?.email?.split("@")[0] ||
    "Tech";
  const firstName = fullName.split(" ")[0];

  async function refresh() {
    if (!workOrderId) return;
    const [{ data: woData }, { data: chData }] = await Promise.all([
      supabase.from("work_orders").select("*").eq("id", workOrderId).maybeSingle(),
      supabase
        .from("work_order_chargers")
        .select("*")
        .eq("work_order_id", workOrderId)
        .order("charger_position", { ascending: true }),
    ]);
    setJob((woData as WorkOrder) || null);
    setChargers((chData || []) as WorkOrderCharger[]);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  const allComplete =
    chargers.length > 0 && chargers.every((c) => c.status === "complete");

  if (loading) {
    return (
      <div className="px-4 py-12 text-center text-fc-muted">Loading job…</div>
    );
  }

  if (!job) {
    return (
      <div className="px-4 py-8">
        <button
          onClick={() => navigate("/field-capture")}
          className="inline-flex items-center gap-1 text-sm text-fc-muted mb-4 hover:text-fc-text"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="bg-fc-card rounded-2xl p-6 text-center border border-fc-border/60">
          <h1 className="text-lg font-semibold text-fc-text">Job not found</h1>
        </div>
      </div>
    );
  }

  const isInProgress = job.status === "in_progress";
  const isSubmitted = ["submitted", "pending_review", "approved", "closed"].includes(
    job.status,
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    job.site_address,
  )}`;

  async function handleStartJob() {
    if (!session?.user?.id || !workOrderId) return;
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from("safety_briefings_log")
      .select("id", { count: "exact", head: true })
      .eq("technician_id", session.user.id)
      .eq("briefing_type", "full_briefing")
      .gte("briefing_completed_at", `${today}T00:00:00`)
      .lte("briefing_completed_at", `${today}T23:59:59`);
    setBriefingType((count ?? 0) > 0 ? "condensed_briefing" : "full_briefing");
    setBriefingOpen(true);
  }

  function openCharger(c: WorkOrderCharger) {
    if (job?.status === "scheduled") {
      toast.error("Start the job before opening a charger");
      return;
    }
    if (c.status === "complete") {
      toast.info("Charger already captured");
      return;
    }
    navigate(`/field-capture/job/${workOrderId}/charger/${c.id}`);
  }

  return (
    <>
      {/* Compact top bar */}
      <div
        className="sticky top-0 z-30 bg-fc-header/95 backdrop-blur border-b border-fc-border"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="px-3 py-3 flex items-center gap-2">
          <button
            onClick={() => navigate("/field-capture")}
            className="h-9 w-9 rounded-full hover:bg-fc-border/50 flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-fc-text" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono text-fc-muted">
              {job.work_order_number}
            </div>
            <div className="font-semibold text-fc-text truncate text-sm">
              {job.client_name}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold",
                STATUS_PILL[job.status],
              )}
            >
              {WORK_ORDER_STATUS_LABELS[job.status]}
            </span>
            {job.job_type && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                  JOB_TYPE_PILL[job.job_type],
                )}
              >
                {JOB_TYPE_LABELS[job.job_type]}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Submitted hero */}
        {isSubmitted && (
          <div className="bg-fc-success/10 rounded-2xl p-5 border border-fc-success/30 flex items-start gap-3">
            <CheckCircle2 className="h-7 w-7 text-fc-success shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-fc-text">Job submitted</h2>
              <p className="text-sm text-fc-muted">
                {chargers.length} charger{chargers.length === 1 ? "" : "s"} captured.
                The team will review your submission.
              </p>
            </div>
          </div>
        )}

        {/* Site card */}
        <div className="bg-fc-card rounded-2xl p-5 shadow-sm border border-fc-border/60">
          <h1 className="text-xl font-bold text-fc-text">{job.client_name}</h1>
          <div className="text-sm font-medium text-fc-text mt-2">
            {job.site_name}
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-2 mt-2 text-sm text-fc-primary hover:underline active:opacity-70"
          >
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{job.site_address}</span>
          </a>
          <Button
            asChild
            variant="outline"
            className="w-full h-11 rounded-xl border-fc-primary/40 text-fc-primary hover:bg-fc-primary/5 mt-3"
          >
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              <Navigation className="h-4 w-4 mr-1.5" /> Get Directions
            </a>
          </Button>
        </div>

        {/* Point of Contact card */}
        {(job.poc_name || job.poc_phone || job.poc_email) && (
          <div className="bg-fc-card rounded-2xl p-5 shadow-sm border border-fc-border/60">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-fc-muted mb-2">
              Point of Contact
            </div>
            {job.poc_name && (
              <div className="flex items-center gap-2 text-fc-text">
                <User className="h-4 w-4 text-fc-muted" />
                <span className="font-semibold">{job.poc_name}</span>
              </div>
            )}
            {job.poc_phone && (
              <a
                href={telHref(job.poc_phone)}
                className="flex items-center gap-2 text-sm text-fc-primary hover:underline mt-2 active:opacity-70"
              >
                <Phone className="h-4 w-4" />
                {job.poc_phone}
              </a>
            )}
            {job.poc_email && (
              <a
                href={`mailto:${job.poc_email}`}
                className="flex items-center gap-2 text-sm text-fc-primary hover:underline mt-1.5 active:opacity-70"
              >
                <Mail className="h-4 w-4" />
                {job.poc_email}
              </a>
            )}
            {job.poc_phone && (
              <Button
                asChild
                variant="outline"
                className="w-full h-11 rounded-xl border-fc-primary/40 text-fc-primary hover:bg-fc-primary/5 mt-3"
              >
                <a href={telHref(job.poc_phone)}>
                  <Phone className="h-4 w-4 mr-1.5" />
                  Call {job.poc_name || "POC"}
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Schedule + Start/Continue/Complete */}
        <div className="bg-fc-card rounded-2xl p-5 shadow-sm border border-fc-border/60">
          <div className="flex items-center gap-2 text-sm text-fc-muted">
            <Clock className="h-4 w-4" />
            {new Date(job.scheduled_date).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>

          {!isInProgress && !isSubmitted && (
            <Button
              className="w-full h-12 rounded-xl bg-fc-primary hover:bg-fc-primary-dark text-white font-semibold mt-3"
              onClick={handleStartJob}
            >
              Start Job
            </Button>
          )}

          {isInProgress && (
            <>
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-fc-warning/10 text-fc-warning text-sm">
                <Clock className="h-4 w-4" />
                Job started at{" "}
                {job.arrival_timestamp
                  ? new Date(job.arrival_timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </div>
              <Button
                className={cn(
                  "w-full h-12 rounded-xl font-semibold mt-3",
                  allComplete
                    ? "bg-fc-primary hover:bg-fc-primary-dark text-white"
                    : "bg-fc-border text-fc-muted cursor-not-allowed",
                )}
                disabled={!allComplete}
                onClick={() =>
                  allComplete && navigate(`/field-capture/job/${workOrderId}/wrap-up`)
                }
              >
                Complete Job
              </Button>
              {allComplete && (
                <p className="text-xs text-fc-muted mt-2 text-center">
                  All chargers captured. Wrap up when ready.
                </p>
              )}
            </>
          )}

          {isSubmitted && job.departure_timestamp && (
            <div className="mt-3 text-xs text-fc-muted">
              Submitted {new Date(job.departure_timestamp).toLocaleString()}
            </div>
          )}
        </div>

        {/* Comments / Notes */}
        {job.job_notes && (
          <div className="bg-fc-card rounded-2xl p-5 shadow-sm border border-fc-border/60">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-fc-muted mb-2">
              <StickyNote className="h-3.5 w-3.5" />
              Notes from Dispatcher
            </div>
            <p className="text-sm text-fc-text whitespace-pre-wrap leading-relaxed">
              {job.job_notes}
            </p>
          </div>
        )}

        {/* SOW / Instructions doc */}
        {job.sow_document_url && (
          <div className="bg-fc-card rounded-2xl p-5 shadow-sm border border-fc-border/60">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-fc-muted mb-2">
              Scope of Work / Instructions
            </div>
            <button
              onClick={() => setSowOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-fc-border bg-fc-bg hover:bg-fc-primary/5 active:opacity-70 transition"
            >
              <FileText className="h-5 w-5 text-fc-primary shrink-0" />
              <span className="text-sm font-medium text-fc-text truncate flex-1 text-left">
                {job.sow_document_name || "View document"}
              </span>
              <span className="text-[11px] font-semibold text-fc-primary shrink-0">
                View
              </span>
            </button>
          </div>
        )}

        {/* Chargers */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[15px] font-semibold text-fc-text">
              Chargers at this site
            </h2>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-fc-border/70 text-fc-muted">
              {chargers.filter((c) => c.status === "complete").length}/
              {chargers.length}
            </span>
          </div>

          {chargers.length === 0 && (
            <div className="bg-fc-card rounded-2xl p-6 text-center border border-fc-border/60">
              <p className="text-sm text-fc-muted">
                No chargers on this work order yet.
              </p>
            </div>
          )}

          {chargers.map((c) => {
            const showReported =
              job.job_type === "repair" &&
              (c.reported_issue_category ||
                c.reported_root_cause ||
                c.reported_description);
            return (
              <div
                key={c.id}
                className="bg-fc-card rounded-2xl shadow-sm border border-fc-border/60 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => openCharger(c)}
                  className="w-full p-4 flex items-center gap-3 text-left active:opacity-70 transition"
                >
                  <div className="h-10 w-10 rounded-xl bg-fc-primary/10 text-fc-primary flex items-center justify-center font-bold">
                    {c.charger_position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-fc-text truncate">
                      {c.make_model || "Unknown model"}
                    </div>
                    <div className="text-xs text-fc-muted truncate">
                      {c.serial_number || "No serial"}
                      {c.added_on_site && " · Added on site"}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-semibold inline-flex items-center gap-1",
                      CHARGER_PILL[c.status],
                    )}
                  >
                    {c.status === "in_progress" && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    {c.status === "complete" && (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {CHARGER_LABEL[c.status]}
                  </span>
                </button>

                {showReported && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="rounded-xl bg-fc-primary/5 border border-fc-primary/20 p-3 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-fc-primary-dark">
                        Partner-reported diagnosis
                      </div>
                      {c.reported_issue_category && (
                        <div className="text-xs text-fc-text">
                          <span className="font-semibold">Issue: </span>
                          {ISSUE_CATEGORY_LABELS[c.reported_issue_category]}
                        </div>
                      )}
                      {c.reported_root_cause && (
                        <div className="text-xs text-fc-text">
                          <span className="font-semibold">Root cause: </span>
                          {ROOT_CAUSE_LABELS[c.reported_root_cause]}
                        </div>
                      )}
                      {c.reported_description && (
                        <div className="text-xs text-fc-text whitespace-pre-wrap leading-relaxed">
                          <span className="font-semibold">Notes: </span>
                          {c.reported_description}
                        </div>
                      )}
                      {c.reported_recurring && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-fc-warning bg-fc-warning/10 px-2 py-0.5 rounded-md mt-1">
                          ⚠ Recurring issue
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!isSubmitted && (
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-dashed border-fc-border text-fc-primary hover:bg-fc-primary/5"
              onClick={() => {
                if (job.status === "scheduled") {
                  toast.error("Start the job before adding chargers");
                  return;
                }
                setAddOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add charger found on site
            </Button>
          )}
        </section>
      </div>

      <SafetyBriefingModal
        open={briefingOpen}
        briefingType={briefingType}
        firstName={firstName}
        workOrderId={workOrderId!}
        technicianId={session?.user?.id || ""}
        onComplete={async () => {
          setBriefingOpen(false);
          await refresh();
        }}
      />

      <AddChargerOnSiteModal
        open={addOpen}
        onOpenChange={setAddOpen}
        workOrderId={workOrderId!}
        nextPosition={chargers.length + 1}
        onCreated={(id) => {
          navigate(`/field-capture/job/${workOrderId}/charger/${id}`);
        }}
      />
    </>
  );
}
