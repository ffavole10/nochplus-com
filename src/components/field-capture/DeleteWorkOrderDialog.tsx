import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, ShieldAlert, Archive } from "lucide-react";
import type { WorkOrder } from "@/types/fieldCapture";
import { logWorkOrderActivity } from "@/lib/workOrderActivity";

interface Props {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  /** When true, allows hard-delete to proceed even if captured data exists. */
  superAdminOverride: boolean;
}

interface CapturedSummary {
  has_briefing: boolean;
  chargers_started: number;
  photos: number;
  tech_started: boolean;
}

export default function DeleteWorkOrderDialog({
  workOrder,
  open,
  onOpenChange,
  onDone,
  superAdminOverride,
}: Props) {
  const [summary, setSummary] = useState<CapturedSummary | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  useEffect(() => {
    if (!open || !workOrder) return;
    setConfirmText("");
    setOverrideConfirmed(false);
    (async () => {
      const [
        { count: briefingCount },
        { data: chargers },
        { count: photoCount },
      ] = await Promise.all([
        supabase
          .from("safety_briefings_log")
          .select("id", { count: "exact", head: true })
          .eq("work_order_id", workOrder.id),
        supabase
          .from("work_order_chargers")
          .select("status")
          .eq("work_order_id", workOrder.id),
        supabase
          .from("work_order_photos")
          .select("id", { count: "exact", head: true })
          .eq("work_order_id", workOrder.id),
      ]);
      const started = (chargers || []).filter(
        (c: any) => c.status && c.status !== "not_started",
      ).length;
      setSummary({
        has_briefing: (briefingCount ?? 0) > 0,
        chargers_started: started,
        photos: photoCount ?? 0,
        tech_started: !!workOrder.arrival_timestamp,
      });
    })();
  }, [open, workOrder]);

  if (!workOrder) return null;

  const hasCapturedData =
    !!summary &&
    (summary.has_briefing ||
      summary.chargers_started > 0 ||
      summary.photos > 0 ||
      summary.tech_started);

  const blocked = hasCapturedData && !superAdminOverride;
  const canHardDelete =
    summary &&
    (!hasCapturedData || (superAdminOverride && overrideConfirmed)) &&
    confirmText.trim().toLowerCase() === "delete";

  const archive = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq("id", workOrder.id);
      if (error) throw error;
      await logWorkOrderActivity({
        work_order_id: workOrder.id,
        action: "archived",
        details: { reason: "User chose archive instead of delete" },
      });
      toast.success("Work order archived");
      onDone();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to archive");
    } finally {
      setBusy(false);
    }
  };

  const cancelJob = async () => {
    setBusy(true);
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
      onDone();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to cancel");
    } finally {
      setBusy(false);
    }
  };

  const hardDelete = async () => {
    setBusy(true);
    try {
      // Log the deletion BEFORE deleting (FK cascades will remove the activity row,
      // but we also write a parallel record-less audit entry to the console as a
      // last resort). The cascade on the activity table is intentional: an audit
      // log per-WO ceases to exist when the WO is hard-deleted, so we surface
      // the action via toast + console as the final paper trail.
      await logWorkOrderActivity({
        work_order_id: workOrder.id,
        action: "deleted",
        details: {
          work_order_number: workOrder.work_order_number,
          client_name: workOrder.client_name,
          site_name: workOrder.site_name,
          had_captured_data: hasCapturedData,
        },
      });
      console.warn("[WorkOrder] Hard delete", {
        id: workOrder.id,
        number: workOrder.work_order_number,
        actor: (await supabase.auth.getUser()).data.user?.id,
        at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from("work_orders")
        .delete()
        .eq("id", workOrder.id);
      if (error) throw error;
      toast.success(`Deleted ${workOrder.work_order_number}`);
      onDone();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {blocked ? (
              <>
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                Cannot delete this work order
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete work order?
              </>
            )}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {workOrder.work_order_number} · {workOrder.client_name}
          </DialogDescription>
        </DialogHeader>

        {!summary && (
          <div className="text-sm text-muted-foreground py-4">
            Checking captured data…
          </div>
        )}

        {summary && hasCapturedData && (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold mb-2">
                This work order has captured data
                {!superAdminOverride && " and cannot be deleted."}
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                {summary.has_briefing && <li>Safety briefing logged</li>}
                {summary.chargers_started > 0 && (
                  <li>{summary.chargers_started} charger(s) with capture data</li>
                )}
                {summary.photos > 0 && <li>{summary.photos} photo(s) uploaded</li>}
                {summary.tech_started && <li>Technician started the job on site</li>}
              </ul>
            </div>

            {!superAdminOverride ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose one of the safer alternatives that preserves the audit trail:
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={archive}
                    disabled={busy}
                    className="justify-start"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive instead (hide from default views)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelJob}
                    disabled={busy}
                    className="justify-start"
                  >
                    Cancel this work order (status → Cancelled)
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                <div className="text-sm font-semibold text-destructive">
                  Super admin override
                </div>
                <p className="text-xs text-muted-foreground">
                  You can hard-delete this record and all its captured data.
                  This action is irreversible. Confirm twice to proceed.
                </p>
                <Button
                  variant={overrideConfirmed ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setOverrideConfirmed((v) => !v)}
                >
                  {overrideConfirmed
                    ? "✓ Override armed — destructive delete enabled"
                    : "I understand — arm destructive delete"}
                </Button>
              </div>
            )}
          </div>
        )}

        {summary && (!hasCapturedData || (superAdminOverride && overrideConfirmed)) && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {hasCapturedData
                ? "All captured data, photos, and chargers will be permanently destroyed."
                : "This empty work order will be permanently removed. This action cannot be undone."}
            </p>
            <div className="text-xs space-y-0.5 rounded-md border bg-muted/40 p-2">
              <div>
                <span className="text-muted-foreground">Site: </span>
                {workOrder.site_name}
              </div>
              <div>
                <span className="text-muted-foreground">Date: </span>
                {workOrder.scheduled_date}
              </div>
            </div>
            <div>
              <Label className="text-xs">Type "delete" to confirm</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="delete"
                autoFocus
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Close
          </Button>
          {summary && (!hasCapturedData || (superAdminOverride && overrideConfirmed)) && (
            <Button
              variant="destructive"
              onClick={hardDelete}
              disabled={!canHardDelete || busy}
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
