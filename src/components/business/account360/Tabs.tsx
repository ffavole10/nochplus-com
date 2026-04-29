import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Brain,
  Truck,
  Gauge,
  Sparkles,
  Plug,
  HardDrive,
  Mail,
  Phone,
  Plus,
  Upload,
  FileText,
  ImageIcon,
  Download,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { TabHeader, TabEmpty, TabFooterLink, StatBox } from "./shared";
import { ServiceTicket } from "@/types/serviceTicket";
import { useContacts } from "@/hooks/useContacts";
import { useDeals } from "@/hooks/useDeals";
import WorkOrderDetailModal from "@/components/field-capture/WorkOrderDetailModal";

/* ============================================================
   TICKETS TAB
============================================================ */
export function TicketsTab({
  account,
  tickets,
}: {
  account: { id: string; company: string };
  tickets: ServiceTicket[];
}) {
  const navigate = useNavigate();
  const [stage, setStage] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return tickets
      .filter((t) => (stage === "all" ? true : t.status === stage))
      .filter((t) => (priority === "all" ? true : t.priority === priority))
      .filter((t) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          t.ticketId?.toLowerCase().includes(s) ||
          (t.customer?.address || "").toLowerCase().includes(s) ||
          t.issue?.description?.toLowerCase().includes(s)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tickets, stage, priority, search]);

  return (
    <div>
      <TabHeader
        title="Tickets"
        count={tickets.length}
        subhead={`All service tickets for ${account.company}`}
      />
      {tickets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="assessed">Assessed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All priorities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search tickets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 h-8 text-xs"
          />
        </div>
      )}
      {filtered.length === 0 ? (
        <TabEmpty label="No tickets yet for this account." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/operations/tickets?ticket=${t.ticketId}`)}
                  >
                    <TableCell className="font-mono text-xs">{t.ticketId}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.priority}</Badge></TableCell>
                    <TableCell className="text-xs">{t.customer?.address || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">{t.source || "—"}</TableCell>
                    <TableCell className="text-xs">Step {t.currentStep || 1} of 10</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <TabFooterLink
        to={`/operations/tickets?account=${encodeURIComponent(account.company)}`}
        label="View all tickets in Tickets"
      />
    </div>
  );
}

/* ============================================================
   WORK ORDERS TAB
============================================================ */
interface WorkOrderRow {
  id: string;
  work_order_number: string | null;
  site_name: string;
  scheduled_date: string;
  status: string;
  assigned_technician_id: string;
  technician_name?: string;
  support_time_minutes?: number;
  access_time_minutes?: number;
  partner_id?: string;
}

export function WorkOrdersTab({ account }: { account: { id: string; company: string } }) {
  const [rows, setRows] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Primary: by partner_id. Soft fallback: by site_name match.
      const { data: byPartner } = await supabase
        .from("work_orders")
        .select("id, work_order_number, site_name, scheduled_date, status, assigned_technician_id, support_time_minutes, access_time_minutes, partner_id, client_name")
        .eq("partner_id", account.id)
        .eq("is_archived", false)
        .order("scheduled_date", { ascending: false });
      let combined: any[] = (byPartner as any) || [];
      // Soft match by client_name == company (fills gaps for legacy WOs without partner_id)
      const { data: bySite } = await supabase
        .from("work_orders")
        .select("id, work_order_number, site_name, scheduled_date, status, assigned_technician_id, support_time_minutes, access_time_minutes, partner_id, client_name")
        .eq("client_name", account.company)
        .eq("is_archived", false)
        .order("scheduled_date", { ascending: false });
      const seen = new Set(combined.map((r) => r.id));
      ((bySite as any) || []).forEach((r: any) => {
        if (!seen.has(r.id)) combined.push(r);
      });

      // Resolve technician names
      const techIds = Array.from(new Set(combined.map((r) => r.assigned_technician_id).filter(Boolean)));
      let nameMap = new Map<string, string>();
      if (techIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", techIds);
        nameMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name || p.email]));
      }
      combined.forEach((r) => (r.technician_name = nameMap.get(r.assigned_technician_id) || "—"));
      if (!cancelled) {
        setRows(combined);
        setLoading(false);
      }
    })().catch(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [account.id, account.company]);

  const techs = useMemo(
    () => Array.from(new Set(rows.map((r) => r.technician_name).filter(Boolean))),
    [rows],
  );

  const filtered = rows
    .filter((r) => (statusFilter === "all" ? true : r.status === statusFilter))
    .filter((r) => (techFilter === "all" ? true : r.technician_name === techFilter));

  return (
    <div>
      <TabHeader
        title="Work Orders"
        count={rows.length}
        subhead={`Field dispatch units for ${account.company}`}
      />
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="All technicians" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All technicians</SelectItem>
              {techs.map((t) => <SelectItem key={t!} value={t!}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {loading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <TabEmpty label="No work orders yet. Generated when an estimate is approved." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO#</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const allocated = r.support_time_minutes || 0;
                  const actual = r.access_time_minutes || 0;
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => { setSelected(r); setModalOpen(true); }}
                    >
                      <TableCell className="font-mono text-xs">{r.work_order_number || "—"}</TableCell>
                      <TableCell className="text-xs">{r.site_name}</TableCell>
                      <TableCell className="text-xs">{r.technician_name}</TableCell>
                      <TableCell className="text-xs">{format(new Date(r.scheduled_date), "MMM d, yyyy")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.status}</Badge></TableCell>
                      <TableCell className="text-right text-xs">{(allocated / 60).toFixed(1)}h</TableCell>
                      <TableCell className="text-right text-xs">{actual ? `${(actual / 60).toFixed(1)}h` : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <TabFooterLink to="/field-capture/admin/work-orders" label="View all work orders" />
      {selected && (
        <WorkOrderDetailModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          workOrder={selected as any}
          onChanged={() => { /* refetch handled on next mount */ }}
        />
      )}
    </div>
  );
}

/* ============================================================
   CHARGERS TAB
============================================================ */
export function ChargersTab({ account }: { account: { id: string; company: string } }) {
  const [chargers, setChargers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Soft match by site_name = company name (no FK to account from charger_records)
      const { data } = await supabase
        .from("charger_records")
        .select("id, station_id, station_name, model, site_name, address, city, state, status, summary, service_date")
        .eq("site_name", account.company)
        .order("service_date", { ascending: false })
        .limit(200);
      if (!cancelled) {
        setChargers((data as any) || []);
        setLoading(false);
      }
    })().catch(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [account.company]);

  const sites = useMemo(
    () => Array.from(new Set(chargers.map((c) => c.site_name).filter(Boolean))),
    [chargers],
  );

  const filtered = chargers
    .filter((c) => (siteFilter === "all" ? true : c.site_name === siteFilter))
    .filter((c) => (statusFilter === "all" ? true : (c.status || "").toLowerCase() === statusFilter));

  const statusColor = (s?: string) => {
    const v = (s || "").toLowerCase();
    if (v.includes("critical")) return "bg-destructive";
    if (v.includes("offline")) return "bg-muted-foreground";
    if (v.includes("warning")) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div>
      <TabHeader
        title="Chargers"
        count={chargers.length}
        subhead={`All chargers under management for ${account.company}`}
      />
      {chargers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All sites" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sites</SelectItem>
              {sites.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {loading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <TabEmpty label="No chargers under management yet for this account. Enroll chargers via Membership to begin monitoring." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:border-primary/40 cursor-pointer">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs font-bold">{c.station_id}</p>
                  <span className={`h-2 w-2 rounded-full ${statusColor(c.status)}`} />
                </div>
                <p className="text-sm font-semibold">{c.station_name || c.site_name || "—"}</p>
                <p className="text-[11px] text-muted-foreground">{[c.address, c.city, c.state].filter(Boolean).join(", ")}</p>
                <div className="text-[11px] text-muted-foreground">
                  {c.model || "Unknown model"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Last seen: {c.service_date ? format(new Date(c.service_date), "MMM d, yyyy") : "—"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <TabFooterLink to="/command-center/mission-control" label="View all chargers in Mission Control" />
    </div>
  );
}

/* ============================================================
   ESTIMATES TAB
============================================================ */
export function EstimatesTab({ account }: { account: { id: string; company: string } }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("estimates")
        .select("*")
        .eq("company_id", account.id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setRows((data as any) || []);
        setLoading(false);
      }
    })().catch(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [account.id]);

  const filtered = rows.filter((r) =>
    statusFilter === "all" ? true : (r.status || "").toLowerCase() === statusFilter
  );

  const totals = useMemo(() => {
    const sent = rows.filter((r) => r.sent_at).length;
    const approved = rows.filter((r) => (r.status || "").toLowerCase() === "approved");
    const approvedTotal = approved.reduce((s, r) => s + Number(r.total || 0), 0);
    const rate = sent ? Math.round((approved.length / sent) * 100) : 0;
    return { sent, approvedTotal, rate, count: rows.length };
  }, [rows]);

  return (
    <div>
      <TabHeader
        title="Estimates"
        count={rows.length}
        subhead={`All estimates sent to ${account.company}`}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatBox label="Total Sent" value={String(totals.sent)} />
        <StatBox label="Total Approved" value={`$${totals.approvedTotal.toLocaleString()}`} />
        <StatBox label="Approval Rate" value={`${totals.rate}%`} />
        <StatBox label="Total Estimates" value={String(totals.count)} />
      </div>
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {loading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <TabEmpty label="No estimates yet for this account." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate #</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/operations/estimates?id=${r.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{r.estimate_number || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.ticket_id || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">{r.sent_at ? format(new Date(r.sent_at), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="text-right text-xs">${Number(r.total || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <TabFooterLink to="/operations/estimates" label="View all estimates" />
    </div>
  );
}

/* ============================================================
   INVOICES TAB
============================================================ */
export function InvoicesTab({
  account,
  tickets,
}: {
  account: { id: string; company: string };
  tickets: ServiceTicket[];
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ticketTextIds = tickets.map((t) => t.ticketId).filter(Boolean);
      if (ticketTextIds.length === 0) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("ticket_invoices")
        .select("*")
        .in("ticket_text_id", ticketTextIds)
        .order("invoice_date", { ascending: false });
      if (!cancelled) {
        setRows((data as any) || []);
        setLoading(false);
      }
    })().catch(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [tickets, account.id]);

  const filtered = rows
    .filter((r) => (statusFilter === "all" ? true : r.status === statusFilter))
    .filter((r) => (sourceFilter === "all" ? true : r.source === sourceFilter));

  const totals = useMemo(() => {
    const outstanding = rows
      .filter((r) => r.status !== "paid")
      .reduce((s, r) => s + Number(r.total_amount || 0), 0);
    return { outstanding, count: rows.length };
  }, [rows]);

  return (
    <div>
      <TabHeader
        title="Invoices"
        count={rows.length}
        subhead={`All invoices for ${account.company}`}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <StatBox label="Total Outstanding" value={`$${totals.outstanding.toLocaleString()}`} />
        <StatBox label="Total Invoices" value={String(totals.count)} />
        <StatBox label="Paid Last 90 Days" value="—" sub="Coming soon" />
      </div>
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="attached">Attached</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="neural_os">Neural OS</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {loading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <TabEmpty label="No invoices yet for this account." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.invoice_number}</TableCell>
                    <TableCell className="font-mono text-xs">{r.ticket_text_id}</TableCell>
                    <TableCell>
                      {r.source === "neural_os" ? (
                        <Badge variant="outline" className="text-[10px] font-normal lowercase bg-teal-500/5 text-teal-600 border-teal-500/20 gap-1">
                          <Brain className="h-2.5 w-2.5" />
                          neural os · resolution layer
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">{r.source_label || "Uploaded"}</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">{r.invoice_date ? format(new Date(r.invoice_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="text-right text-xs">${Number(r.total_amount || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <TabFooterLink to="/operations/tickets" label="View all invoices via Tickets" />
    </div>
  );
}

/* ============================================================
   MEMBERSHIP TAB
============================================================ */
export function MembershipTab({ account }: { account: { id: string; company: string } }) {
  const navigate = useNavigate();
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("noch_plus_members")
        .select("*")
        .ilike("company_name", account.company)
        .maybeSingle();
      if (!cancelled) {
        setMember((data as any) || null);
        setLoading(false);
      }
    })().catch(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [account.company]);

  if (loading) {
    return (
      <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
    );
  }

  if (!member) {
    return (
      <div>
        <TabHeader title="Membership" />
        <Card>
          <CardContent className="p-8 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Not yet a NOCH+ member</h3>
              <p className="text-sm text-muted-foreground">
                Enroll {account.company} to unlock continuous monitoring, predictive diagnostics, and the Member ROI suite.
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Continuous reliability monitoring</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> AI-driven fault prevention</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Reduced truck rolls and faster MTTR</li>
            </ul>
            <Button onClick={() => navigate(`/business/membership?enroll=${account.id}`)}>
              Enroll in NOCH+
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TabHeader
        title="Membership"
        subhead={`${account.company} is on the ${member.tier} plan`}
        right={<Badge variant="default">Active member</Badge>}
      />
      <Card>
        <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-[11px] uppercase text-muted-foreground">Tier</p><p className="font-bold capitalize">{member.tier}</p></div>
          <div><p className="text-[11px] uppercase text-muted-foreground">Enrolled</p><p className="font-bold">{format(new Date(member.created_at), "MMM d, yyyy")}</p></div>
          <div><p className="text-[11px] uppercase text-muted-foreground">Monthly</p><p className="font-bold">${Number(member.monthly_amount || 0).toLocaleString()}</p></div>
          <div><p className="text-[11px] uppercase text-muted-foreground">Status</p><p className="font-bold capitalize">{member.status}</p></div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h3 className="text-sm font-bold">Member ROI Delivered</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <RoiPill icon={Truck} label="Truck Rolls Avoided" value="Building baseline" sub="Tracking remote resolutions" layer="resolution layer" />
          <RoiPill icon={Gauge} label="Avg MTTR Improvement" value="Building baseline" sub="Awaiting resolved-ticket sample" layer="reasoning layer" />
          <RoiPill icon={Sparkles} label="Tickets Auto-Triaged" value="Building baseline" sub="Issues diagnosed without dispatch" layer="reasoning layer" />
          <RoiPill icon={Plug} label="Chargers Under NOCH+ Mgmt" value="0 enrolled" sub="0 AC L2 · 0 DC Fast" />
        </div>
      </section>

      <div className="flex gap-2">
        <Button variant="outline" size="sm">Edit plan</Button>
        <Button variant="outline" size="sm">Upgrade tier</Button>
        <Button variant="outline" size="sm">Cancel membership</Button>
      </div>
    </div>
  );
}

function RoiPill({ icon: Icon, label, value, sub, layer }: { icon: any; label: string; value: string; sub: string; layer?: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold">{label}</span>
        </div>
        <div className="text-lg font-bold text-muted-foreground">{value}</div>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
        {layer && (
          <Badge variant="outline" className="text-[10px] font-normal lowercase bg-teal-500/5 text-teal-600 border-teal-500/20 gap-1">
            <Brain className="h-2.5 w-2.5" />
            neural os · {layer}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   PIPELINE TAB
============================================================ */
export function PipelineTab({ account }: { account: { id: string; company: string } }) {
  const navigate = useNavigate();
  const { data: deals = [] } = useDeals(account.id);

  const open = deals.filter((d: any) => !["Won", "Lost"].includes(d.stage));
  const totalOpen = open.reduce((s: number, d: any) => s + Number(d.value || 0), 0);
  const avg = open.length ? totalOpen / open.length : 0;

  return (
    <div>
      <TabHeader
        title="Pipeline"
        count={open.length}
        subhead={`Open deals and pipeline activity for ${account.company}`}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <StatBox label="Total Open Pipeline" value={`$${totalOpen.toLocaleString()}`} />
        <StatBox label="Avg Deal Size" value={`$${Math.round(avg).toLocaleString()}`} />
        <StatBox label="Open Deals" value={String(open.length)} />
      </div>
      {deals.length === 0 ? (
        <TabEmpty label="No active pipeline for this account. Create a deal in Pipeline →" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {deals.map((d: any) => (
            <Card key={d.id} className="cursor-pointer hover:border-primary/40" onClick={() => navigate(`/growth/deals/${d.id}`)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm truncate">{d.deal_name}</p>
                  <Badge variant="outline" className="text-[10px]">{d.stage}</Badge>
                </div>
                <p className="text-xl font-bold">${Number(d.value || 0).toLocaleString()}</p>
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  {d.owner && <p>Owner: {d.owner}</p>}
                  {d.expected_close_date && <p>Close: {format(new Date(d.expected_close_date), "MMM d, yyyy")}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <TabFooterLink to="/growth/pipeline" label="View all deals in Pipeline" />
    </div>
  );
}

/* ============================================================
   CONTACTS TAB
============================================================ */
export function ContactsTab({
  account,
  focusedContactId,
}: {
  account: { id: string; company: string };
  focusedContactId?: string | null;
}) {
  const { data: contacts = [] } = useContacts(account.id);
  const deleteContact = useDeleteContact();
  const { confirm, dialogProps } = useConfirmDialog();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  // Scroll the focused contact into view + apply a temporary highlight pulse.
  useEffect(() => {
    if (!focusedContactId || contacts.length === 0) return;
    const el = document.getElementById(`contact-card-${focusedContactId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(focusedContactId);
    const t = setTimeout(() => setHighlightId(null), 2200);
    return () => clearTimeout(t);
  }, [focusedContactId, contacts.length]);

  const initials = (n: string) =>
    n.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const handleDelete = async (c: any) => {
    if (c.is_primary && contacts.length > 1) {
      toast.error("Mark another contact as primary before deleting this one.");
      return;
    }
    const ok = await confirm({
      title: "Remove contact?",
      description: `Remove ${c.name} from ${account.company}?`,
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    deleteContact.mutate({ id: c.id, customer_id: account.id, name: c.name });
  };

  const onAdd = () => { setEditing(null); setFormOpen(true); };
  const onEdit = (c: any) => { setEditing(c); setFormOpen(true); };

  return (
    <div>
      <TabHeader
        title="Contacts"
        count={contacts.length}
        subhead={`People at ${account.company}`}
        right={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" /> Add contact
          </Button>
        }
      />
      {contacts.length === 0 ? (
        <TabEmpty
          label="No contacts yet for this account."
          cta={<Button size="sm" onClick={onAdd} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add the first contact</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {contacts.map((c: any) => {
            const isHighlighted = highlightId === c.id;
            return (
              <Card
                key={c.id}
                id={`contact-card-${c.id}`}
                className={`hover:border-primary/40 transition-all duration-300 ${
                  isHighlighted ? "ring-2 ring-primary border-primary animate-pulse" : ""
                }`}
              >
                <CardContent className="p-4 flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs flex-shrink-0">
                    {initials(c.name || "?")}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      {c.is_primary && <Badge variant="default" className="text-[9px]">primary</Badge>}
                      {c.contact_type && c.contact_type !== "other" && !c.is_primary && (
                        <Badge variant="outline" className="text-[9px] capitalize">{String(c.contact_type).replace(/_/g, " ")}</Badge>
                      )}
                    </div>
                    {c.title && <p className="text-[11px] text-muted-foreground">{c.title}</p>}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
                        <Mail className="h-3 w-3" /> {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline block">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)} aria-label="Edit contact">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(c)} aria-label="Remove contact">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <ContactFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        customerId={account.id}
        contact={editing}
        forcePrimary={contacts.length === 0 && !editing}
      />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

/* ============================================================
   FILES TAB
============================================================ */
export function FilesTab({
  account,
  tickets,
}: {
  account: { id: string; company: string };
  tickets: ServiceTicket[];
}) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ticketTextIds = tickets.map((t) => t.ticketId).filter(Boolean);

      // Pull invoices
      const invRes = ticketTextIds.length
        ? await supabase
            .from("ticket_invoices")
            .select("id, invoice_number, pdf_path, source, created_at, ticket_text_id, total_amount")
            .in("ticket_text_id", ticketTextIds)
            .not("pdf_path", "is", null)
        : { data: [] as any[] };

      // Pull work order SOWs
      const woRes = await supabase
        .from("work_orders")
        .select("id, work_order_number, sow_document_url, sow_document_name, created_at, partner_id, client_name")
        .or(`partner_id.eq.${account.id},client_name.eq.${account.company}`)
        .not("sow_document_url", "is", null);

      const all: any[] = [];
      ((invRes.data as any) || []).forEach((r: any) => {
        all.push({
          id: `inv-${r.id}`,
          name: `Invoice ${r.invoice_number}.pdf`,
          source: "Invoice",
          sourceLabel: `Invoice ${r.invoice_number}`,
          sourceLink: `/operations/tickets?ticket=${r.ticket_text_id}`,
          type: "PDF",
          created_at: r.created_at,
        });
      });
      ((woRes.data as any) || []).forEach((r: any) => {
        all.push({
          id: `wo-${r.id}`,
          name: r.sow_document_name || `${r.work_order_number} SOW`,
          source: "Work Order",
          sourceLabel: r.work_order_number,
          sourceLink: `/field-capture/admin/work-orders`,
          url: r.sow_document_url,
          type: (r.sow_document_name || "").toLowerCase().endsWith(".pdf") ? "PDF" : "Doc",
          created_at: r.created_at,
        });
      });

      if (!cancelled) {
        all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setFiles(all);
        setLoading(false);
      }
    })().catch(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [account.id, account.company, tickets]);

  const filtered = files
    .filter((f) => (sourceFilter === "all" ? true : f.source === sourceFilter))
    .filter((f) => (search ? f.name.toLowerCase().includes(search.toLowerCase()) : true));

  const fileIcon = (t: string) => (t === "PDF" ? FileText : t === "Image" ? ImageIcon : FileText);

  return (
    <div>
      <TabHeader
        title="Files"
        count={files.length}
        subhead={`All files for ${account.company} across tickets, work orders, invoices, and contracts`}
        right={<Button size="sm" variant="outline" className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Upload file</Button>}
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="Ticket">Tickets</SelectItem>
              <SelectItem value="Work Order">Work Orders</SelectItem>
              <SelectItem value="Invoice">Invoices</SelectItem>
              <SelectItem value="Contract">Contracts</SelectItem>
              <SelectItem value="Manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 h-8 text-xs" />
        </div>
      )}
      {loading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <TabEmpty label="No files yet for this account." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((f) => {
            const Icon = fileIcon(f.type);
            return (
              <Card key={f.id} className="hover:border-primary/40">
                <CardContent className="p-4 flex gap-3 items-start">
                  <Icon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold text-sm truncate">{f.name}</p>
                    <Badge variant="outline" className="text-[10px]">{f.sourceLabel}</Badge>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(f.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild={!!f.url} onClick={(e) => e.stopPropagation()}>
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5" /></a>
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
