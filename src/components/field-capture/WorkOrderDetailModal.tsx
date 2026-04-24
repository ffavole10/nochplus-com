import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  X,
  Pencil,
  Copy,
  UserCog,
  Ban,
  Trash2,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Plug,
  FileText,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Camera,
  CheckCircle2,
  Plus,
  ArrowRight,
  CircleDot,
} from "lucide-react";
import {
  ISSUE_CATEGORY_LABELS,
  POST_WORK_STATUS_LABELS,
  ROOT_CAUSE_LABELS,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrder,
  type WorkOrderActivity,
  type WorkOrderCharger,
  type WorkOrderPhoto,
  type WorkOrderStatus,
} from "@/types/fieldCapture";
import { fetchActivityTimeline, logWorkOrderActivity } from "@/lib/workOrderActivity";
import WorkOrderEditModal from "@/components/field-capture/WorkOrderEditModal";
import ReassignTechnicianModal from "@/components/field-capture/ReassignTechnicianModal";
import DeleteWorkOrderDialog from "@/components/field-capture/DeleteWorkOrderDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
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
import { cn } from "@/lib/utils";

interface Props {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  /** Caller indicates if the current user is a super admin (overrides delete safety) */
  isSuperAdmin?: boolean;
}

const STATUS_VARIANTS: Record<WorkOrderStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  submitted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending_review: "bg-purple-100 text-purple-700 border-purple-200",
  flagged: "bg-red-100 text-red-700 border-red-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-gray-100 text-gray-600 border-gray-200",
};

interface BriefingRow {
  id: string;
  briefing_type: string;
  briefing_started_at: string;
  briefing_completed_at: string;
  duration_seconds: number;
  ppe_confirmed: boolean;
  area_secured_confirmed: boolean;
  loto_performed: boolean;
  zero_energy_verified: boolean;
  sow_reviewed_confirmed: boolean;
}

export default function WorkOrderDetailModal({
  workOrder,
  open,
  onOpenChange,
  onChanged,
  isSuperAdmin = false,
}: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("details");
  const [chargers, setChargers] = useState<WorkOrderCharger[]>([]);
  const [photos, setPhotos] = useState<WorkOrderPhoto[]>([]);
  const [briefings, setBriefings] = useState<BriefingRow[]>([]);
  const [timeline, setTimeline] = useState<WorkOrderActivity[]>([]);
  const [createdByLabel, setCreatedByLabel] = useState<string>("");
  const [techLabel, setTechLabel] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const { confirm, dialogProps } = useConfirmDialog();

  const reload = async () => {
    if (!workOrder) return;
    const [c, ph, br, tl] = await Promise.all([
      supabase
        .from("work_order_chargers")
        .select("*")
        .eq("work_order_id", workOrder.id)
        .order("charger_position", { ascending: true }),
      supabase
        .from("work_order_photos")
        .select("*")
        .eq("work_order_id", workOrder.id)
        .order("uploaded_at", { ascending: true }),
      supabase
        .from("safety_briefings_log")
        .select(
          "id, briefing_type, briefing_started_at, briefing_completed_at, duration_seconds, ppe_confirmed, area_secured_confirmed, loto_performed, zero_energy_verified, sow_reviewed_confirmed",
        )
        .eq("work_order_id", workOrder.id)
        .order("briefing_completed_at", { ascending: true }),
      fetchActivityTimeline(workOrder),
    ]);
    setChargers(((c.data ?? []) as unknown) as WorkOrderCharger[]);
    setPhotos(((ph.data ?? []) as unknown) as WorkOrderPhoto[]);
    setBriefings(((br.data ?? []) as unknown) as BriefingRow[]);
    setTimeline(tl);

    // Resolve labels for created_by + assigned tech
    const ids = [workOrder.created_by, workOrder.assigned_technician_id].filter(
      Boolean,
    ) as string[];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", ids);
      const map = new Map<string, string>();
      for (const p of profs || []) {
        map.set((p as any).user_id, (p as any).display_name || (p as any).email || (p as any).user_id);
      }
      setCreatedByLabel(workOrder.created_by ? map.get(workOrder.created_by) ?? "Unknown" : "—");
      setTechLabel(map.get(workOrder.assigned_technician_id) ?? workOrder.assigned_technician_id);
    }
  };

  useEffect(() => {
    if (!open || !workOrder) return;
    setTab("details");
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workOrder?.id]);

  const photosByCharger = useMemo(() => {
    const m = new Map<string, WorkOrderPhoto[]>();
    for (const p of photos) {
      const key = p.charger_id ?? "_job";
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    return m;
  }, [photos]);

  if (!workOrder) return null;

  const inProgress = workOrder.status === "in_progress";
  const submittedLike =
    workOrder.status === "submitted" ||
    workOrder.status === "pending_review" ||
    workOrder.status === "flagged";
  const finalized =
    workOrder.status === "approved" || workOrder.status === "closed";
  const isArchived = !!workOrder.is_archived;

  const allocatedMin = computeAllocatedMinutes(workOrder, chargers);
  const actualMin = computeActualMinutes(workOrder);
  const supportMin = workOrder.support_time_minutes ?? 0;
  const accessMin = workOrder.access_time_minutes ?? 0;
  const variance = actualMin === null ? null : actualMin - allocatedMin;

  /* ---------- actions ---------- */

  const doDuplicate = () => {
    onOpenChange(false);
    navigate("/field-capture/admin/create-job", {
      state: { duplicateFrom: workOrder.id },
    });
  };

  const doCancel = async () => {
    setBusyAction(true);
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({ status: "cancelled" })
        .eq("id", workOrder.id);
      if (error) throw error;
      await logWorkOrderActivity({
        work_order_id: workOrder.id,
        action: "cancelled",
        details: { from_status: workOrder.status },
      });
      toast.success("Work order cancelled");
      onChanged();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to cancel");
    } finally {
      setBusyAction(false);
      setConfirmCancelOpen(false);
    }
  };

  const doArchiveToggle = async () => {
    setBusyAction(true);
    try {
      const goingTo = !isArchived;
      const { error } = await supabase
        .from("work_orders")
        .update({
          is_archived: goingTo,
          archived_at: goingTo ? new Date().toISOString() : null,
        })
        .eq("id", workOrder.id);
      if (error) throw error;
      await logWorkOrderActivity({
        work_order_id: workOrder.id,
        action: goingTo ? "archived" : "unarchived",
      });
      toast.success(goingTo ? "Archived" : "Unarchived");
      onChanged();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed");
    } finally {
      setBusyAction(false);
      setConfirmArchiveOpen(false);
    }
  };

  /* ---------- render ---------- */

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-5xl w-[95vw] h-[90vh] p-0 hide-default-close flex flex-col"
        >
          <DialogTitle className="sr-only">
            Work order {workOrder.work_order_number}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {workOrder.client_name} · {workOrder.site_name}
          </DialogDescription>

          {/* Header */}
          <div className="border-b px-5 py-4 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold">
                  {workOrder.work_order_number}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-xs", STATUS_VARIANTS[workOrder.status])}
                >
                  {WORK_ORDER_STATUS_LABELS[workOrder.status]}
                </Badge>
                {isArchived && (
                  <Badge variant="outline" className="text-xs bg-gray-100">
                    <Archive className="h-3 w-3 mr-1" /> Archived
                  </Badge>
                )}
              </div>
              <div className="mt-1 text-base font-semibold truncate">
                {workOrder.client_name} — {workOrder.site_name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Created by {createdByLabel || "—"} on{" "}
                {new Date(workOrder.created_at).toLocaleDateString()}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Action bar */}
          <div className="border-b px-5 py-3 flex flex-wrap items-center gap-2 shrink-0 bg-muted/20">
            {(workOrder.status === "scheduled" || inProgress) && !isArchived && (
              <Button onClick={() => setEditing(true)} size="sm">
                <Pencil className="h-4 w-4 mr-1.5" />
                Edit{inProgress ? " Details" : ""}
              </Button>
            )}
            {(submittedLike || finalized || isArchived) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-1.5" />
                Edit Internal Notes
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={doDuplicate}>
              <Copy className="h-4 w-4 mr-1.5" />
              Duplicate
            </Button>
            {(workOrder.status === "scheduled" || inProgress) && !isArchived && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReassigning(true)}
              >
                <UserCog className="h-4 w-4 mr-1.5" />
                Reassign
              </Button>
            )}
            {workOrder.status === "scheduled" && !isArchived && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmCancelOpen(true)}
              >
                <Ban className="h-4 w-4 mr-1.5" />
                Cancel Job
              </Button>
            )}
            {!isArchived && workOrder.status !== "scheduled" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmArchiveOpen(true)}
              >
                <Archive className="h-4 w-4 mr-1.5" />
                Archive
              </Button>
            )}
            {isArchived && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmArchiveOpen(true)}
              >
                <ArchiveRestore className="h-4 w-4 mr-1.5" />
                Unarchive
              </Button>
            )}
            <div className="ml-auto" />
            {workOrder.status === "scheduled" && !isArchived && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleting(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            )}
            {isSuperAdmin && workOrder.status !== "scheduled" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleting(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete (override)
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-5 mt-3 self-start">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="captured">Captured Data</TabsTrigger>
              <TabsTrigger value="time">Time</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-5 py-4">
              <TabsContent value="details" className="mt-0 space-y-5">
                <DetailSection title="Client" icon={User}>
                  <div className="text-sm">{workOrder.client_name}</div>
                </DetailSection>

                <DetailSection title="Site" icon={MapPin}>
                  <div className="text-sm font-medium">{workOrder.site_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {workOrder.site_address}
                  </div>
                </DetailSection>

                <DetailSection title="Point of Contact" icon={User}>
                  {workOrder.poc_name ? (
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{workOrder.poc_name}</div>
                      {workOrder.poc_phone && (
                        <a
                          href={`tel:${workOrder.poc_phone.replace(/[^\d+]/g, "")}`}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {workOrder.poc_phone}
                        </a>
                      )}
                      {workOrder.poc_email && (
                        <a
                          href={`mailto:${workOrder.poc_email}`}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {workOrder.poc_email}
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                </DetailSection>

                <DetailSection title="Schedule" icon={Calendar}>
                  <div className="text-sm">
                    Scheduled for{" "}
                    <span className="font-medium">{workOrder.scheduled_date}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Allocated time: {formatMinutes(allocatedMin)}
                  </div>
                </DetailSection>

                <DetailSection title="Technician Assignment" icon={UserCog}>
                  <div className="text-sm">{techLabel}</div>
                  {timeline.some((t) => t.action === "reassigned") && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">
                        Reassignment history
                      </div>
                      {timeline
                        .filter((t) => t.action === "reassigned")
                        .map((t) => (
                          <div key={t.id} className="text-xs text-muted-foreground">
                            {new Date(t.created_at).toLocaleString()} — from{" "}
                            <span className="font-medium">
                              {(t.details.from_label as string) || "—"}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium">
                              {(t.details.to_label as string) || "—"}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </DetailSection>

                <DetailSection title={`Chargers at Site (${chargers.length})`} icon={Plug}>
                  {chargers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No chargers on this work order.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {chargers.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 text-sm rounded-md border bg-muted/20 px-3 py-2"
                        >
                          <span className="font-mono text-xs text-muted-foreground">
                            #{c.charger_position}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="truncate">
                              {c.make_model || "Unknown model"}
                            </div>
                            {c.serial_number && (
                              <div className="text-xs text-muted-foreground truncate">
                                S/N: {c.serial_number}
                              </div>
                            )}
                          </div>
                          {c.added_on_site && (
                            <Badge variant="outline" className="text-[10px]">
                              On-site
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              c.status === "complete" &&
                                "bg-emerald-50 text-emerald-700 border-emerald-200",
                              c.status === "in_progress" &&
                                "bg-amber-50 text-amber-700 border-amber-200",
                            )}
                          >
                            {c.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </DetailSection>

                {workOrder.job_notes && (
                  <DetailSection title="Comments / Job Notes" icon={FileText}>
                    <div className="text-sm whitespace-pre-wrap">
                      {workOrder.job_notes}
                    </div>
                  </DetailSection>
                )}

                {workOrder.sow_document_url && (
                  <DetailSection title="SOW / Instructions" icon={FileText}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const { data, error } = await supabase.storage
                          .from("field-capture-docs")
                          .createSignedUrl(workOrder.sow_document_url!, 300);
                        if (error || !data?.signedUrl) {
                          toast.error("Could not open document");
                          return;
                        }
                        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      {workOrder.sow_document_name || "Open document"}
                    </Button>
                  </DetailSection>
                )}
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                {timeline.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    No activity recorded yet.
                  </div>
                ) : (
                  <div className="space-y-0">
                    {timeline.map((t, i) => (
                      <TimelineRow
                        key={t.id}
                        entry={t}
                        last={i === timeline.length - 1}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="captured" className="mt-0 space-y-5">
                {briefings.length === 0 && chargers.every((c) => c.status === "not_started") && photos.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    No captured data yet — work hasn't started.
                  </div>
                ) : (
                  <>
                    {briefings.length > 0 && (
                      <DetailSection title="Safety Briefing" icon={ShieldCheck}>
                        {briefings.map((b) => (
                          <div
                            key={b.id}
                            className="rounded-md border bg-muted/20 p-3 space-y-1 text-xs"
                          >
                            <div className="text-sm font-medium">
                              {b.briefing_type === "full_briefing"
                                ? "Full briefing"
                                : "Condensed briefing"}{" "}
                              · {Math.round(b.duration_seconds / 60)} min
                            </div>
                            <div className="text-muted-foreground">
                              Completed{" "}
                              {new Date(b.briefing_completed_at).toLocaleString()}
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {b.ppe_confirmed && <CheckChip label="PPE" />}
                              {b.area_secured_confirmed && <CheckChip label="Area secured" />}
                              {b.loto_performed && <CheckChip label="LOTO" />}
                              {b.zero_energy_verified && (
                                <CheckChip label="Zero energy verified" />
                              )}
                              {b.sow_reviewed_confirmed && <CheckChip label="SOW reviewed" />}
                            </div>
                          </div>
                        ))}
                      </DetailSection>
                    )}

                    {chargers.map((c) => {
                      if (c.status === "not_started") return null;
                      const cPhotos = photosByCharger.get(c.id) ?? [];
                      return (
                        <DetailSection
                          key={c.id}
                          title={`Charger #${c.charger_position}: ${c.make_model || "Unknown"}`}
                          icon={Plug}
                        >
                          <div className="text-xs space-y-2">
                            {c.issue_category && (
                              <KV
                                k="Issue category"
                                v={ISSUE_CATEGORY_LABELS[c.issue_category]}
                              />
                            )}
                            {c.root_cause && (
                              <KV k="Root cause" v={ROOT_CAUSE_LABELS[c.root_cause]} />
                            )}
                            {c.is_recurring_issue && (
                              <KV k="Recurring issue" v="Yes" />
                            )}
                            {c.issue_description && (
                              <KV k="Description" v={c.issue_description} />
                            )}
                            {c.work_performed && (
                              <KV k="Work performed" v={c.work_performed} />
                            )}
                            {c.parts_swap_performed && (
                              <KV
                                k="Parts swap"
                                v={`Old S/N ${c.old_serial_number ?? "—"} → New S/N ${c.new_serial_number ?? "—"}`}
                              />
                            )}
                            {c.resolution && <KV k="Resolution" v={c.resolution} />}
                            {c.charger_status_post_work && (
                              <KV
                                k="Status after work"
                                v={POST_WORK_STATUS_LABELS[c.charger_status_post_work]}
                              />
                            )}
                            {c.capture_started_at && c.capture_completed_at && (
                              <KV
                                k="Time on charger"
                                v={`${formatMinutes(
                                  Math.round(
                                    (new Date(c.capture_completed_at).getTime() -
                                      new Date(c.capture_started_at).getTime()) /
                                      60000,
                                  ),
                                )}`}
                              />
                            )}
                          </div>

                          {cPhotos.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                {cPhotos.length} photo(s)
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {cPhotos.map((p) => (
                                  <PhotoThumb key={p.id} photo={p} />
                                ))}
                              </div>
                            </div>
                          )}
                        </DetailSection>
                      );
                    })}

                    {(workOrder.support_time_minutes !== null ||
                      workOrder.access_time_minutes !== null ||
                      workOrder.job_notes) && (
                      <DetailSection title="Wrap Up" icon={CheckCircle2}>
                        <div className="text-xs space-y-1.5">
                          <KV
                            k="Support time"
                            v={formatMinutes(workOrder.support_time_minutes ?? 0)}
                          />
                          <KV
                            k="Access time"
                            v={formatMinutes(workOrder.access_time_minutes ?? 0)}
                          />
                          {workOrder.job_notes && (
                            <KV k="Notes" v={workOrder.job_notes} />
                          )}
                        </div>
                      </DetailSection>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="time" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Stat label="Allocated" value={formatMinutes(allocatedMin)} />
                  <Stat
                    label="Actual"
                    value={actualMin === null ? "—" : formatMinutes(actualMin)}
                  />
                  <Stat
                    label="Variance"
                    value={
                      variance === null
                        ? "—"
                        : `${variance >= 0 ? "+" : ""}${formatMinutes(Math.abs(variance))}`
                    }
                    tone={
                      variance === null
                        ? "neutral"
                        : variance > 30
                          ? "warn"
                          : variance < -30
                            ? "good"
                            : "neutral"
                    }
                  />
                </div>

                <div className="rounded-md border p-3 space-y-2 text-sm">
                  <div className="font-medium flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Breakdown
                  </div>
                  <KV k="Arrival" v={workOrder.arrival_timestamp ? new Date(workOrder.arrival_timestamp).toLocaleString() : "—"} />
                  <KV k="Departure" v={workOrder.departure_timestamp ? new Date(workOrder.departure_timestamp).toLocaleString() : "—"} />
                  <KV k="Support time" v={formatMinutes(supportMin)} />
                  <KV k="Access time" v={formatMinutes(accessMin)} />
                </div>

                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Billing rates not yet wired into work orders. Once configured,
                  this tab will show an estimated billing total. Phase 2.
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <WorkOrderEditModal
        workOrder={editing ? workOrder : null}
        open={editing}
        onOpenChange={(o) => setEditing(o)}
        onSaved={() => {
          logWorkOrderActivity({
            work_order_id: workOrder.id,
            action: "edited",
          });
          onChanged();
          reload();
        }}
      />

      {/* Reassign */}
      <ReassignTechnicianModal
        workOrder={reassigning ? workOrder : null}
        open={reassigning}
        onOpenChange={(o) => setReassigning(o)}
        onSaved={() => {
          onChanged();
          reload();
        }}
      />

      {/* Delete */}
      <DeleteWorkOrderDialog
        workOrder={deleting ? workOrder : null}
        open={deleting}
        onOpenChange={(o) => setDeleting(o)}
        onDone={() => {
          onChanged();
          onOpenChange(false);
        }}
        superAdminOverride={isSuperAdmin}
      />

      {/* Cancel confirm */}
      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this work order?</AlertDialogTitle>
            <AlertDialogDescription>
              The status will change to <strong>Cancelled</strong>. The technician
              will see it disappear from their active list. You can duplicate it
              later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyAction}>Keep job</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doCancel();
              }}
              disabled={busyAction}
            >
              Cancel job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive confirm */}
      <AlertDialog open={confirmArchiveOpen} onOpenChange={setConfirmArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArchived ? "Unarchive this work order?" : "Archive this work order?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived
                ? "It will reappear in default views."
                : "It will be hidden from default views, but all data is preserved and can be restored anytime."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doArchiveToggle();
              }}
              disabled={busyAction}
            >
              {isArchived ? "Unarchive" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ---------- helpers ---------- */

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-3.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-muted-foreground min-w-[120px]">{k}</span>
      <span className="flex-1 whitespace-pre-wrap">{v}</span>
    </div>
  );
}

function CheckChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px]">
      <CheckCircle2 className="h-3 w-3" />
      {label}
    </span>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "warn" && "border-amber-300 bg-amber-50",
        tone === "good" && "border-emerald-300 bg-emerald-50",
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function PhotoThumb({ photo }: { photo: WorkOrderPhoto }) {
  const [url, setUrl] = useState<string | null>(photo.photo_url || null);
  useEffect(() => {
    if (url) return;
    if (!photo.storage_path) return;
    supabase.storage
      .from("field-capture-photos")
      .createSignedUrl(photo.storage_path, 600)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
      });
  }, [photo, url]);

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="aspect-square rounded-md border bg-muted overflow-hidden hover:opacity-80"
    >
      {url ? (
        <img
          src={url}
          alt={photo.photo_type}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
          <Camera className="h-4 w-4" />
        </div>
      )}
    </a>
  );
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone?: string }> = {
  created: { label: "Work order created", icon: Plus, tone: "text-blue-600" },
  edited: { label: "Edited", icon: Pencil },
  reassigned: { label: "Reassigned", icon: UserCog },
  duplicated: { label: "Duplicated", icon: Copy },
  duplicated_from: { label: "Created as duplicate", icon: Copy },
  cancelled: { label: "Cancelled", icon: Ban, tone: "text-destructive" },
  archived: { label: "Archived", icon: Archive },
  unarchived: { label: "Unarchived", icon: ArchiveRestore },
  deleted: { label: "Deleted", icon: Trash2, tone: "text-destructive" },
  status_changed: { label: "Status changed", icon: ArrowRight },
  started: { label: "Technician started on site", icon: CircleDot, tone: "text-amber-600" },
  submitted: { label: "Submitted", icon: CheckCircle2, tone: "text-emerald-600" },
  charger_completed: { label: "Charger completed", icon: CheckCircle2, tone: "text-emerald-600" },
};

function TimelineRow({ entry, last }: { entry: WorkOrderActivity; last: boolean }) {
  const meta = ACTION_LABELS[entry.action] ?? {
    label: entry.action,
    icon: CircleDot,
    tone: undefined as string | undefined,
  };
  const Icon = meta.icon;
  const detailText = renderDetails(entry);
  return (
    <div className="flex gap-3 relative pb-4">
      {!last && (
        <div className="absolute left-[11px] top-7 bottom-0 w-px bg-border" />
      )}
      <div
        className={cn(
          "h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center shrink-0 mt-0.5",
          meta.tone,
        )}
      >
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <div className="text-sm font-medium">{meta.label}</div>
        {detailText && (
          <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
            {detailText}
          </div>
        )}
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {new Date(entry.created_at).toLocaleString()}
          {entry.actor_label && ` · ${entry.actor_label}`}
        </div>
      </div>
    </div>
  );
}

function renderDetails(entry: WorkOrderActivity): string | null {
  const d = entry.details || {};
  switch (entry.action) {
    case "reassigned":
      return `From ${d.from_label ?? "—"} → ${d.to_label ?? "—"}${d.reason ? `\nReason: ${d.reason}` : ""}`;
    case "duplicated":
      return d.new_work_order_number
        ? `Created ${d.new_work_order_number}`
        : null;
    case "duplicated_from":
      return d.source_work_order_number
        ? `Source: ${d.source_work_order_number}`
        : null;
    case "started":
      return d.gps_location ? `GPS: ${d.gps_location}` : null;
    case "cancelled":
      return d.from_status ? `From status: ${d.from_status}` : null;
    case "deleted":
      return d.work_order_number
        ? `${d.work_order_number} permanently removed`
        : null;
    default:
      return null;
  }
}

/* ---------- time math ---------- */

function computeAllocatedMinutes(
  _wo: WorkOrder,
  chargers: WorkOrderCharger[],
): number {
  // Phase 1: simple model — 30 min per charger + 30 min site overhead.
  const n = chargers.length || 1;
  return n * 30 + 30;
}

function computeActualMinutes(wo: WorkOrder): number | null {
  if (!wo.arrival_timestamp || !wo.departure_timestamp) return null;
  const diffMs =
    new Date(wo.departure_timestamp).getTime() -
    new Date(wo.arrival_timestamp).getTime();
  return Math.max(0, Math.round(diffMs / 60000));
}

function formatMinutes(min: number): string {
  if (!Number.isFinite(min)) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
