import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Plus, Zap, Clock, Navigation } from "lucide-react";
import type {
  WorkOrder,
  WorkOrderCharger,
  WorkOrderStatus,
} from "@/types/fieldCapture";
import { WORK_ORDER_STATUS_LABELS } from "@/types/fieldCapture";
import { cn } from "@/lib/utils";

const STATUS_PILL: Record<WorkOrderStatus, string> = {
  scheduled: "bg-fc-primary/10 text-fc-primary-dark",
  in_progress: "bg-fc-warning/15 text-fc-warning",
  submitted: "bg-fc-success/15 text-fc-success",
  pending_review: "bg-secondary/15 text-secondary",
  flagged: "bg-destructive/15 text-destructive",
  approved: "bg-fc-success/15 text-fc-success",
  closed: "bg-fc-border text-fc-muted",
};

export default function FieldCaptureJobDetail() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  usePageTitle("Job");
  const [job, setJob] = useState<WorkOrder | null>(null);
  const [chargers, setChargers] = useState<WorkOrderCharger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workOrderId) return;
    (async () => {
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
    })();
  }, [workOrderId]);

  if (loading) {
    return (
      <div className="px-4 py-12 text-center text-fc-muted">Loading job…</div>
    );
  }

  if (!job) {
    return (
      <div className="px-4 py-8">
        <Link
          to="/field-capture"
          className="inline-flex items-center gap-1 text-sm text-fc-muted mb-4 hover:text-fc-text"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="bg-fc-card rounded-2xl p-6 text-center border border-fc-border/60">
          <h1 className="text-lg font-semibold text-fc-text">Job not found</h1>
        </div>
      </div>
    );
  }

  const isInProgress = job.status === "in_progress";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    job.site_address
  )}`;

  return (
    <>
      {/* Compact top bar — replaces global header for detail view */}
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
          <span
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-semibold",
              STATUS_PILL[job.status]
            )}
          >
            {WORK_ORDER_STATUS_LABELS[job.status]}
          </span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
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
            className="flex items-start gap-2 mt-2 text-sm text-fc-primary hover:underline"
          >
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{job.site_address}</span>
          </a>
          <div className="flex items-center gap-2 mt-3 text-sm text-fc-muted">
            <Clock className="h-4 w-4" />
            {new Date(job.scheduled_date).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-xl border-fc-border"
            >
              <a href={mapsUrl} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4 mr-1.5" /> Directions
              </a>
            </Button>
            <Button className="h-11 rounded-xl bg-fc-primary hover:bg-fc-primary-dark text-white">
              {isInProgress ? "Continue Job" : "Start Job"}
            </Button>
          </div>
        </div>

        {/* Chargers */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[15px] font-semibold text-fc-text">
              Chargers at this site
            </h2>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-fc-border/70 text-fc-muted">
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

          {chargers.map((c) => (
            <div
              key={c.id}
              className="bg-fc-card rounded-2xl p-4 shadow-sm border border-fc-border/60 flex items-center gap-3"
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
              <Zap className="h-5 w-5 text-fc-primary shrink-0" />
            </div>
          ))}

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-dashed border-fc-border text-fc-primary hover:bg-fc-primary/5"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add charger found on site
          </Button>
        </section>
      </div>
    </>
  );
}
