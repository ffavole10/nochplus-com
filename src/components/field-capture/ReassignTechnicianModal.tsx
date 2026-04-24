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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { WorkOrder } from "@/types/fieldCapture";
import { logWorkOrderActivity } from "@/lib/workOrderActivity";

interface Props {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface TechOption {
  user_id: string;
  label: string;
}

export default function ReassignTechnicianModal({
  workOrder,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [techs, setTechs] = useState<TechOption[]>([]);
  const [newTechId, setNewTechId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "technician");
      const ids = (roleRows || []).map((r) => r.user_id).filter(Boolean);
      if (ids.length === 0) {
        setTechs([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", ids);
      const opts: TechOption[] = (profs || []).map((p: any) => ({
        user_id: p.user_id,
        label: p.display_name || p.email || p.user_id,
      }));
      for (const id of ids) {
        if (!opts.find((o) => o.user_id === id)) {
          opts.push({ user_id: id, label: id });
        }
      }
      setTechs(opts);
      if (workOrder) {
        const cur = opts.find((o) => o.user_id === workOrder.assigned_technician_id);
        setCurrentLabel(cur?.label ?? workOrder.assigned_technician_id);
      }
    })();
  }, [open, workOrder]);

  useEffect(() => {
    setNewTechId("");
    setReason("");
    setNotify(true);
  }, [workOrder?.id]);

  if (!workOrder) return null;

  const inProgress = workOrder.status === "in_progress";

  const handleSubmit = async () => {
    if (!newTechId) {
      toast.error("Select a new technician");
      return;
    }
    if (newTechId === workOrder.assigned_technician_id) {
      toast.error("That's already the assigned technician");
      return;
    }
    setSaving(true);
    try {
      const newLabel =
        techs.find((t) => t.user_id === newTechId)?.label ?? newTechId;
      const { error } = await supabase
        .from("work_orders")
        .update({ assigned_technician_id: newTechId })
        .eq("id", workOrder.id);
      if (error) throw error;
      await logWorkOrderActivity({
        work_order_id: workOrder.id,
        action: "reassigned",
        details: {
          from_id: workOrder.assigned_technician_id,
          from_label: currentLabel,
          to_id: newTechId,
          to_label: newLabel,
          reason: reason || null,
          notify,
        },
      });
      toast.success(`Reassigned to ${newLabel}`);
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to reassign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Technician</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {workOrder.work_order_number}
          </DialogDescription>
        </DialogHeader>

        {inProgress && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">This job is in progress.</div>
              Reassigning will notify both technicians, preserve all captured
              data, and keep the previous tech's work associated with them.
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">
              Current Technician
            </Label>
            <div className="text-sm font-medium mt-1">{currentLabel}</div>
          </div>

          <div>
            <Label>New Technician</Label>
            <Select value={newTechId} onValueChange={setNewTechId}>
              <SelectTrigger>
                <SelectValue placeholder="Select technician…" />
              </SelectTrigger>
              <SelectContent>
                {techs
                  .filter((t) => t.user_id !== workOrder.assigned_technician_id)
                  .map((t) => (
                    <SelectItem key={t.user_id} value={t.user_id}>
                      {t.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Schedule conflict, expertise match, location swap…"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={notify}
              onCheckedChange={(v) => setNotify(!!v)}
            />
            Notify technicians of the change
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Reassigning…" : "Reassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
