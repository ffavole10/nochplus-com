import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  WORK_ORDER_STATUS_LABELS,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/types/fieldCapture";
import { Plus, Archive } from "lucide-react";
import WorkOrderQuickActionsMenu, {
  type QuickAction,
} from "@/components/field-capture/WorkOrderQuickActionsMenu";
import WorkOrderDetailModal from "@/components/field-capture/WorkOrderDetailModal";
import WorkOrderEditModal from "@/components/field-capture/WorkOrderEditModal";
import ReassignTechnicianModal from "@/components/field-capture/ReassignTechnicianModal";
import DeleteWorkOrderDialog from "@/components/field-capture/DeleteWorkOrderDialog";
import { useFieldCaptureRole } from "@/hooks/useFieldCaptureRole";
import { useNavigate } from "react-router-dom";
import { logWorkOrderActivity } from "@/lib/workOrderActivity";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Row extends WorkOrder {
  total_chargers: number;
  complete_chargers: number;
  technician_label: string;
  allocated_minutes: number;
  actual_minutes: number | null;
}

const STATUSES: WorkOrderStatus[] = [
  "scheduled",
  "in_progress",
  "submitted",
  "pending_review",
  "flagged",
  "approved",
  "closed",
  "cancelled",
];

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

function formatMinutes(min: number | null): string {
  if (min === null || !Number.isFinite(min)) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function computeAllocated(numChargers: number) {
  return (numChargers || 1) * 30 + 30;
}

function computeActual(wo: WorkOrder): number | null {
  if (!wo.arrival_timestamp || !wo.departure_timestamp) return null;
  return Math.max(
    0,
    Math.round(
      (new Date(wo.departure_timestamp).getTime() -
        new Date(wo.arrival_timestamp).getTime()) /
        60000,
    ),
  );
}

export default function AllWorkOrders() {
  usePageTitle("Field Capture · Work Orders");
  const navigate = useNavigate();
  const { roles } = useFieldCaptureRole();
  const isSuperAdmin = roles.includes("super_admin");

  const [rows, setRows] = useState<Row[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Active modals
  const [detailFor, setDetailFor] = useState<WorkOrder | null>(null);
  const [editFor, setEditFor] = useState<WorkOrder | null>(null);
  const [reassignFor, setReassignFor] = useState<WorkOrder | null>(null);
  const [deleteFor, setDeleteFor] = useState<WorkOrder | null>(null);

  const triggerReload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    (async () => {
      const { data: wos, error } = await supabase
        .from("work_orders")
        .select("*, work_order_chargers(id, status)")
        .order("scheduled_date", { ascending: false });
      if (error) {
        console.error("[AllWorkOrders] load failed", error);
        setRows([]);
        return;
      }
      const techIds = Array.from(
        new Set((wos || []).map((w: any) => w.assigned_technician_id)),
      );
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", techIds);
      const labelByUser: Record<string, string> = {};
      for (const p of profs || []) {
        labelByUser[(p as any).user_id] =
          (p as any).display_name || (p as any).email || (p as any).user_id;
      }
      const mapped: Row[] = (wos || []).map((w: any) => {
        const chargers = w.work_order_chargers || [];
        const wo = w as WorkOrder;
        return {
          ...wo,
          total_chargers: chargers.length,
          complete_chargers: chargers.filter((c: any) => c.status === "complete").length,
          technician_label: labelByUser[w.assigned_technician_id] ?? w.assigned_technician_id,
          allocated_minutes: computeAllocated(chargers.length),
          actual_minutes: computeActual(wo),
        };
      });
      setRows(mapped);
    })();
  }, [reloadKey]);

  const technicians = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows || []) {
      map.set(r.assigned_technician_id, r.technician_label);
    }
    return Array.from(map.entries());
  }, [rows]);

  const filtered = useMemo(() => {
    return (rows || []).filter((r) => {
      if (!showArchived && r.is_archived) return false;
      if (showArchived && !r.is_archived) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (techFilter !== "all" && r.assigned_technician_id !== techFilter) return false;
      if (from && r.scheduled_date < from) return false;
      if (to && r.scheduled_date > to) return false;
      return true;
    });
  }, [rows, statusFilter, techFilter, from, to, showArchived]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleQuickAction = (row: Row, action: QuickAction) => {
    switch (action) {
      case "open":
      case "view_submission":
        setDetailFor(row);
        break;
      case "edit":
        setEditFor(row);
        break;
      case "reassign":
        setReassignFor(row);
        break;
      case "delete":
        setDeleteFor(row);
        break;
      case "duplicate":
        navigate("/field-capture/admin/create-job", {
          state: { duplicateFrom: row.id },
        });
        break;
      case "cancel": {
        (async () => {
          const { error } = await supabase
            .from("work_orders")
            .update({ status: "cancelled" })
            .eq("id", row.id);
          if (error) {
            toast.error(error.message);
            return;
          }
          await logWorkOrderActivity({
            work_order_id: row.id,
            action: "cancelled",
            details: { from_status: row.status },
          });
          toast.success("Work order cancelled");
          triggerReload();
        })();
        break;
      }
      case "archive": {
        (async () => {
          const goingTo = !row.is_archived;
          const { error } = await supabase
            .from("work_orders")
            .update({
              is_archived: goingTo,
              archived_at: goingTo ? new Date().toISOString() : null,
            })
            .eq("id", row.id);
          if (error) {
            toast.error(error.message);
            return;
          }
          await logWorkOrderActivity({
            work_order_id: row.id,
            action: goingTo ? "archived" : "unarchived",
          });
          toast.success(goingTo ? "Archived" : "Unarchived");
          triggerReload();
        })();
        break;
      }
      case "export_pdf":
        toast.info("PDF export — coming in a future update");
        break;
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Field Capture · Work Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All work orders across all technicians.
          </p>
        </div>
        <Button asChild>
          <Link to="/field-capture/admin/create-job">
            <Plus className="h-4 w-4 mr-1" /> Create Test Job
          </Link>
        </Button>
      </div>

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {WORK_ORDER_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Technician</label>
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All technicians</SelectItem>
                {technicians.map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={showArchived}
              onCheckedChange={(v) => {
                setShowArchived(!!v);
                setSelected(new Set());
              }}
            />
            <Archive className="h-3.5 w-3.5 text-muted-foreground" />
            Show archived
          </label>
        </div>
      </Card>

      {/* Bulk action bar (Phase 2 stub) */}
      {someSelected && (
        <Card className="p-3 mb-3 flex items-center gap-3 bg-primary/5 border-primary/30">
          <div className="text-sm font-medium">
            {selected.size} work order{selected.size === 1 ? "" : "s"} selected
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Coming in Phase 2"
            >
              Reassign
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Coming in Phase 2"
            >
              Archive
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Coming in Phase 2"
            >
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>WO #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Point of Contact</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Chargers</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === null && (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground py-6">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {rows && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground py-6">
                  {showArchived
                    ? "No archived work orders."
                    : "No work orders match the current filters."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => {
              const variance =
                r.actual_minutes === null ? null : r.actual_minutes - r.allocated_minutes;
              return (
                <TableRow
                  key={r.id}
                  onClick={() => setDetailFor(r)}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    selected.has(r.id) && "bg-primary/5",
                  )}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggleOne(r.id)}
                      aria-label={`Select ${r.work_order_number}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.work_order_number}
                  </TableCell>
                  <TableCell className="font-medium">{r.client_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">{r.site_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.site_address}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.poc_name ? (
                      <>
                        <div className="font-medium">{r.poc_name}</div>
                        {r.poc_phone && (
                          <a
                            href={`tel:${r.poc_phone.replace(/[^\d+]/g, "")}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-primary hover:underline"
                          >
                            {r.poc_phone}
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{r.technician_label}</TableCell>
                  <TableCell className="text-sm">{r.scheduled_date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_VARIANTS[r.status]}>
                      {WORK_ORDER_STATUS_LABELS[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-center">
                    {r.complete_chargers}/{r.total_chargers}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums text-muted-foreground">
                    {formatMinutes(r.allocated_minutes)}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">
                    {formatMinutes(r.actual_minutes)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-sm text-right tabular-nums",
                      variance !== null && variance > 30 && "text-amber-700 font-medium",
                      variance !== null && variance < -30 && "text-emerald-700 font-medium",
                    )}
                  >
                    {variance === null
                      ? "—"
                      : `${variance >= 0 ? "+" : "−"}${formatMinutes(Math.abs(variance))}`}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <WorkOrderQuickActionsMenu
                      status={r.status}
                      isArchived={!!r.is_archived}
                      onAction={(a) => handleQuickAction(r, a)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Modals */}
      <WorkOrderDetailModal
        workOrder={detailFor}
        open={!!detailFor}
        onOpenChange={(o) => !o && setDetailFor(null)}
        onChanged={triggerReload}
        isSuperAdmin={isSuperAdmin}
      />

      <WorkOrderEditModal
        workOrder={editFor}
        open={!!editFor}
        onOpenChange={(o) => !o && setEditFor(null)}
        onSaved={() => {
          if (editFor) {
            logWorkOrderActivity({
              work_order_id: editFor.id,
              action: "edited",
            });
          }
          triggerReload();
        }}
      />

      <ReassignTechnicianModal
        workOrder={reassignFor}
        open={!!reassignFor}
        onOpenChange={(o) => !o && setReassignFor(null)}
        onSaved={triggerReload}
      />

      <DeleteWorkOrderDialog
        workOrder={deleteFor}
        open={!!deleteFor}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        onDone={triggerReload}
        superAdminOverride={isSuperAdmin}
      />
    </div>
  );
}
