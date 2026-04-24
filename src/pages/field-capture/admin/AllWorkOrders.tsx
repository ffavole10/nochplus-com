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
import { Plus } from "lucide-react";

interface Row extends WorkOrder {
  total_chargers: number;
  complete_chargers: number;
  technician_label: string;
}

const STATUSES: WorkOrderStatus[] = [
  "scheduled",
  "in_progress",
  "submitted",
  "pending_review",
  "flagged",
  "approved",
  "closed",
];

const STATUS_VARIANTS: Record<WorkOrderStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  submitted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending_review: "bg-purple-100 text-purple-700 border-purple-200",
  flagged: "bg-red-100 text-red-700 border-red-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AllWorkOrders() {
  usePageTitle("Field Capture · Work Orders");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

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
        return {
          ...(w as WorkOrder),
          total_chargers: chargers.length,
          complete_chargers: chargers.filter((c: any) => c.status === "complete")
            .length,
          technician_label:
            labelByUser[w.assigned_technician_id] ?? w.assigned_technician_id,
        };
      });
      setRows(mapped);
    })();
  }, []);

  const technicians = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows || []) {
      map.set(r.assigned_technician_id, r.technician_label);
    }
    return Array.from(map.entries());
  }, [rows]);

  const filtered = useMemo(() => {
    return (rows || []).filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (techFilter !== "all" && r.assigned_technician_id !== techFilter)
        return false;
      if (from && r.scheduled_date < from) return false;
      if (to && r.scheduled_date > to) return false;
      return true;
    });
  }, [rows, statusFilter, techFilter, from, to]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
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
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>WO #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Point of Contact</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Chargers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === null && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {rows && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                  No work orders match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
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
                <TableCell className="text-sm">
                  {r.complete_chargers}/{r.total_chargers}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
