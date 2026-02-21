import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Search, Crosshair, Diamond, UserPlus, DollarSign, XCircle } from "lucide-react";
import { useEstimates, EstimateRecord } from "@/hooks/useEstimates";
import { format } from "date-fns";
import { downloadEstimatePDF, downloadMultipleEstimatePDFs } from "@/lib/estimatePdf";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-muted" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  rejected: { label: "Rejected", className: "bg-critical/10 text-critical border-critical/20" },
};

const SOURCE_ICONS: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  campaign: { label: "Campaign", icon: Crosshair, className: "bg-primary/10 text-primary border-primary/20" },
  noch_plus: { label: "Noch+", icon: Diamond, className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  manual: { label: "Manual", icon: UserPlus, className: "bg-muted text-muted-foreground border-border" },
};

/* ── Estimate Detail Modal ─────────────────────── */
function EstimateDetailModal({ estimate, open, onOpenChange, partnerName }: { estimate: EstimateRecord | null; open: boolean; onOpenChange: (o: boolean) => void; partnerName: string }) {
  if (!estimate) return null;
  const isReadOnly = estimate.status === "approved";
  const lineItems = (estimate.line_items || []) as any[];
  const config = STATUS_CONFIG[estimate.status] || STATUS_CONFIG.draft;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[85vw] max-h-[85vh] overflow-y-auto p-0" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              {isReadOnly ? "View Estimate" : "Review Estimate"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { downloadEstimatePDF(estimate, partnerName); toast.success("PDF downloaded"); }}>
                <Download className="h-3.5 w-3.5" />Download PDF
              </Button>
              <Badge variant="outline" className={config.className}>{config.label}</Badge>
            </div>
          </div>
          <DialogDescription>{isReadOnly ? "This estimate has been approved." : "Review estimate details."}</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 rounded-lg p-4 border border-border/50">
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ticket</p><p className="text-sm font-semibold text-foreground">#{estimate.ticket_id || "—"}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Site</p><p className="text-sm font-semibold text-foreground">{estimate.site_name || "—"}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer Email</p><p className="text-sm font-semibold text-foreground">{estimate.customer_email || "—"}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Account Manager</p><p className="text-sm font-semibold text-foreground">{estimate.account_manager || "—"}</p></div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Line Items</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider"><th className="py-2 px-3 text-left">Description</th><th className="py-2 px-3 text-right">Qty</th><th className="py-2 px-3 text-left">Unit</th><th className="py-2 px-3 text-right">Rate</th><th className="py-2 px-3 text-right">Amount</th></tr></thead>
                <tbody>
                  {lineItems.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/50 last:border-0">
                      <td className="py-2 px-3">{item.description}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{item.qty}</td>
                      <td className="py-2 px-3">{item.unit}</td>
                      <td className="py-2 px-3 text-right tabular-nums">${Number(item.rate).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-semibold tabular-nums">${Number(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-2 bg-muted/30 rounded-lg p-4 border border-border/50">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium tabular-nums">${Number(estimate.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({(Number(estimate.tax_rate) * 100).toFixed(0)}%)</span><span className="tabular-nums">${Number(estimate.tax).toFixed(2)}</span></div>
              <div className="border-t border-border pt-2 flex justify-between text-base font-bold"><span>Total</span><span className="text-primary tabular-nums">${Number(estimate.total).toFixed(2)}</span></div>
            </div>
          </div>

          {estimate.notes && (
            <div><h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3><p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">{estimate.notes}</p></div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ─────────────────────────────────── */
const Estimates = () => {
  // Load estimates from all campaigns (pass null to get all)
  const { data: estimates = [], isLoading } = useEstimates(null);
  const [selectedEstimate, setSelectedEstimate] = useState<EstimateRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const partnerName = "Partner";

  // Filter estimates
  const filteredEstimates = useMemo(() => {
    let result = [...estimates];
    if (statusFilter !== "all") result = result.filter(e => e.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        (e.ticket_id || "").toLowerCase().includes(q) ||
        (e.site_name || "").toLowerCase().includes(q) ||
        (e.customer_email || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [estimates, statusFilter, search]);

  const stats = useMemo(() => {
    const drafts = estimates.filter(e => e.status === "draft").length;
    const sent = estimates.filter(e => e.status === "sent").length;
    const approved = estimates.filter(e => e.status === "approved").length;
    const rejected = estimates.filter(e => e.status === "rejected").length;
    const totalValue = estimates.reduce((sum, e) => sum + Number(e.total), 0);
    return { total: estimates.length, drafts, sent, approved, rejected, totalValue };
  }, [estimates]);

  const allSelected = filteredEstimates.length > 0 && selectedIds.size === filteredEstimates.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredEstimates.length;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(filteredEstimates.map(e => e.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDownloadSelected = () => {
    const selected = filteredEstimates.filter(e => selectedIds.has(e.id));
    if (selected.length === 0) { toast.error("No estimates selected"); return; }
    downloadMultipleEstimatePDFs(selected, partnerName);
    toast.success(`Downloading ${selected.length} estimate${selected.length > 1 ? "s" : ""}`);
  };

  const handleDownloadAll = () => {
    if (filteredEstimates.length === 0) return;
    downloadMultipleEstimatePDFs(filteredEstimates, partnerName);
    toast.success(`Downloading all ${filteredEstimates.length} estimate${filteredEstimates.length > 1 ? "s" : ""}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-primary"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total Value</p><p className="text-2xl font-bold text-foreground">${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></CardContent></Card>
        <Card className="border-l-4 border-l-muted-foreground/30"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Drafts</p><p className="text-2xl font-bold text-muted-foreground">{stats.drafts}</p></CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Sent</p><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sent}</p></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p></CardContent></Card>
        <Card className="border-l-4 border-l-critical"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-critical">{stats.rejected}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search ticket, site, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={sourceFilter} onValueChange={setSourceFilter}>
          <TabsList>
            <TabsTrigger value="all">All Sources</TabsTrigger>
            <TabsTrigger value="campaign">Campaign</TabsTrigger>
            <TabsTrigger value="noch_plus">Noch+</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Action Bar */}
      {filteredEstimates.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadSelected}><Download className="h-3.5 w-3.5" />Download Selected ({selectedIds.size})</Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadAll}><Download className="h-3.5 w-3.5" />Download All</Button>
          </div>
        </div>
      )}

      {/* Estimates Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : filteredEstimates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-medium text-muted-foreground">No Estimates</h3>
              <p className="text-sm text-muted-foreground/70 max-w-sm text-center">Estimates will appear here as they are created from tickets.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" className={someSelected ? "data-[state=unchecked]:bg-primary/20" : ""} />
                  </TableHead>
                  <TableHead>Station / Site</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Customer Email</TableHead>
                  <TableHead>Account Manager</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEstimates.map((est) => {
                  const config = STATUS_CONFIG[est.status] || STATUS_CONFIG.draft;
                  const isChecked = selectedIds.has(est.id);
                  return (
                    <TableRow key={est.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEstimate(est)}>
                      <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={isChecked} onCheckedChange={() => toggleOne(est.id)} /></TableCell>
                      <TableCell><div className="font-medium">{est.site_name || est.station_id || "—"}</div></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{est.ticket_id || "—"}</TableCell>
                      <TableCell className="text-sm">{est.customer_email || "—"}</TableCell>
                      <TableCell className="text-sm">{est.account_manager || "—"}</TableCell>
                      <TableCell className="text-right font-semibold">${Number(est.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell><Badge variant="outline" className={config.className}>{config.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(est.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EstimateDetailModal estimate={selectedEstimate} open={!!selectedEstimate} onOpenChange={(o) => { if (!o) setSelectedEstimate(null); }} partnerName={partnerName} />
    </div>
  );
};

export default Estimates;
