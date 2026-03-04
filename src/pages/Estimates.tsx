import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Search, Crosshair, Diamond, UserPlus, DollarSign, XCircle, Plus, Trash2, Pencil, Save } from "lucide-react";
import { useEstimates, useUpdateEstimate, EstimateRecord } from "@/hooks/useEstimates";
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

interface LineItem {
  description: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

/* ── Estimate Detail Modal ─────────────────────── */
function EstimateDetailModal({ estimate, open, onOpenChange, partnerName, onUpdated }: { estimate: EstimateRecord | null; open: boolean; onOpenChange: (o: boolean) => void; partnerName: string; onUpdated?: (est: EstimateRecord) => void }) {
  const updateEstimate = useUpdateEstimate();
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [siteName, setSiteName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [accountManager, setAccountManager] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [terms, setTerms] = useState("Net 30");
  const [poNumber, setPoNumber] = useState("");

  // Track whether we've initialized from the estimate prop
  const initializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (estimate && estimate.id !== initializedRef.current) {
      initializedRef.current = estimate.id;
      setItems((estimate.line_items || []).map((i: any) => ({
        description: i.description || "",
        qty: Number(i.qty) || 0,
        unit: i.unit || "flat",
        rate: Number(i.rate) || 0,
        amount: Number(i.amount) || 0,
      })));
      setTaxRate(Number(estimate.tax_rate) || 0);
      setNotes(estimate.notes || "");
      setSiteName(estimate.site_name || "");
      setCustomerEmail(estimate.customer_email || "");
      setAccountManager(estimate.account_manager || "");
      setCustomerName(estimate.customer_name || "");
      setCustomerAddress(estimate.customer_address || "");
      setTerms(estimate.terms || "Net 30");
      setPoNumber(estimate.po_number || "");
      setEditing(false);
    }
  }, [estimate]);

  // Autosave: debounce changes when editing
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRenderRef = useRef(true);

  const doSave = useCallback(() => {
    if (!estimate || estimate.status === "approved") return;
    const currentSubtotal = items.reduce((s, i) => s + i.amount, 0);
    const currentTax = currentSubtotal * taxRate;
    const currentTotal = currentSubtotal + currentTax;
    updateEstimate.mutate({
      id: estimate.id,
      line_items: items as any,
      subtotal: currentSubtotal,
      tax_rate: taxRate,
      tax: currentTax,
      total: currentTotal,
      notes: notes || null,
      site_name: siteName || null,
      customer_email: customerEmail || null,
      account_manager: accountManager || null,
      customer_name: customerName || null,
      customer_address: customerAddress || null,
      terms: terms || "Net 30",
      po_number: poNumber || null,
    }, {
      onSuccess: (data) => {
        onUpdated?.(data);
      },
    });
  }, [estimate, items, taxRate, notes, siteName, customerEmail, accountManager, customerName, customerAddress, terms, poNumber, updateEstimate, onUpdated]);

  // Trigger autosave when any field changes while editing
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (!editing || !estimate || estimate.status === "approved") return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      doSave();
    }, 1500);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [items, taxRate, notes, siteName, customerEmail, accountManager, customerName, customerAddress, terms, poNumber, editing]);

  if (!estimate) return null;
  const isReadOnly = estimate.status === "approved";
  const config = STATUS_CONFIG[estimate.status] || STATUS_CONFIG.draft;

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "qty" || field === "rate") {
        updated.amount = Number(updated.qty) * Number(updated.rate);
      }
      return updated;
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: "", qty: 1, unit: "flat", rate: 0, amount: 0 }]);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    updateEstimate.mutate({
      id: estimate.id,
      line_items: items as any,
      subtotal,
      tax_rate: taxRate,
      tax,
      total,
      notes: notes || null,
      site_name: siteName || null,
      customer_email: customerEmail || null,
      account_manager: accountManager || null,
      customer_name: customerName || null,
      customer_address: customerAddress || null,
      terms: terms || "Net 30",
      po_number: poNumber || null,
    }, {
      onSuccess: (data) => {
        toast.success("Estimate saved");
        setEditing(false);
        onUpdated?.(data);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[85vw] max-h-[85vh] overflow-y-auto p-0" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              {isReadOnly ? "View Estimate" : editing ? "Edit Estimate" : "Review Estimate"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isReadOnly && !editing && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />Edit
                </Button>
              )}
              {editing && (
                <>
                  <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={updateEstimate.isPending}>
                    <Save className="h-3.5 w-3.5" />{updateEstimate.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    // Reset to original
                    setItems((estimate.line_items || []).map((i: any) => ({
                      description: i.description || "", qty: Number(i.qty) || 0, unit: i.unit || "flat", rate: Number(i.rate) || 0, amount: Number(i.amount) || 0,
                    })));
                    setTaxRate(Number(estimate.tax_rate) || 0.08);
                    setNotes(estimate.notes || "");
                    setSiteName(estimate.site_name || "");
                    setCustomerEmail(estimate.customer_email || "");
                    setAccountManager(estimate.account_manager || "");
                    setCustomerName(estimate.customer_name || "");
                    setCustomerAddress(estimate.customer_address || "");
                    setTerms(estimate.terms || "Net 30");
                    setPoNumber(estimate.po_number || "");
                    setEditing(false);
                  }}>Cancel</Button>
                </>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={async () => { await downloadEstimatePDF(estimate, partnerName); toast.success("PDF downloaded"); }}>
                <Download className="h-3.5 w-3.5" />Download PDF
              </Button>
              <Badge variant="outline" className={config.className}>{config.label}</Badge>
            </div>
          </div>
          <DialogDescription>{isReadOnly ? "This estimate has been approved." : editing ? "Make changes to the estimate below." : "Review estimate details. Click Edit to make changes."}</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Header fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 rounded-lg p-4 border border-border/50">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimate No.</p>
              <p className="text-sm font-semibold text-foreground">{estimate.estimate_number || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ticket</p>
              <p className="text-sm font-semibold text-foreground">#{estimate.ticket_id || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Customer Name</p>
              {editing ? <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-8 text-sm" /> : <p className="text-sm font-semibold text-foreground">{customerName || "—"}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Site</p>
              {editing ? <Input value={siteName} onChange={e => setSiteName(e.target.value)} className="h-8 text-sm" /> : <p className="text-sm font-semibold text-foreground">{siteName || "—"}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Customer Email</p>
              {editing ? <Input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="h-8 text-sm" /> : <p className="text-sm font-semibold text-foreground">{customerEmail || "—"}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Account Manager</p>
              {editing ? <Input value={accountManager} onChange={e => setAccountManager(e.target.value)} className="h-8 text-sm" /> : <p className="text-sm font-semibold text-foreground">{accountManager || "—"}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Terms</p>
              {editing ? <Input value={terms} onChange={e => setTerms(e.target.value)} className="h-8 text-sm" placeholder="Net 30" /> : <p className="text-sm font-semibold text-foreground">{terms}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">PO Number</p>
              {editing ? <Input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="h-8 text-sm" placeholder="Optional" /> : <p className="text-sm font-semibold text-foreground">{poNumber || "—"}</p>}
            </div>
          </div>
          {/* Line Items */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Line Items</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="py-2 px-3 text-left">Description</th>
                    <th className="py-2 px-3 text-right w-20">Qty</th>
                    <th className="py-2 px-3 text-left w-20">Unit</th>
                    <th className="py-2 px-3 text-right w-24">Rate</th>
                    <th className="py-2 px-3 text-right w-24">Amount</th>
                    {editing && <th className="py-2 px-3 w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-border/50 last:border-0">
                      {editing ? (
                        <>
                          <td className="py-1.5 px-2"><Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} className="h-8 text-sm" /></td>
                          <td className="py-1.5 px-2"><Input type="number" value={item.qty} onChange={e => updateItem(idx, "qty", Number(e.target.value))} className="h-8 text-sm text-right w-16" /></td>
                          <td className="py-1.5 px-2"><Input value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} className="h-8 text-sm w-16" /></td>
                          <td className="py-1.5 px-2"><Input type="number" step="0.01" value={item.rate} onChange={e => updateItem(idx, "rate", Number(e.target.value))} className="h-8 text-sm text-right w-20" /></td>
                          <td className="py-2 px-3 text-right font-semibold tabular-nums">${item.amount.toFixed(2)}</td>
                          <td className="py-1.5 px-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3">{item.description}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{item.qty}</td>
                          <td className="py-2 px-3">{item.unit}</td>
                          <td className="py-2 px-3 text-right tabular-nums">${Number(item.rate).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-semibold tabular-nums">${Number(item.amount).toFixed(2)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {editing && (
              <Button variant="ghost" size="sm" className="mt-2 text-xs gap-1 text-primary" onClick={addItem}>
                <Plus className="h-3 w-3" /> Add Line Item
              </Button>
            )}
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 bg-muted/30 rounded-lg p-4 border border-border/50">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium tabular-nums">${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">
                  Tax
                  {editing ? (
                    <span className="inline-flex items-center ml-1">
                      (<Input type="number" step="1" min="0" max="100" value={Math.round(taxRate * 100)} onChange={e => setTaxRate(Number(e.target.value) / 100)} className="h-5 w-12 text-xs inline px-1 py-0" />%)
                    </span>
                  ) : (
                    ` (${Math.round(taxRate * 100)}%)`
                  )}
                </span>
                <span className="tabular-nums">${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-base font-bold"><span>Total</span><span className="text-primary tabular-nums">${total.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
            {editing ? (
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." className="text-sm" rows={3} />
            ) : (
              notes ? <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">{notes}</p> : <p className="text-sm text-muted-foreground/50 italic">No notes</p>
            )}
          </div>
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

  const handleDownloadSelected = async () => {
    const selected = filteredEstimates.filter(e => selectedIds.has(e.id));
    if (selected.length === 0) { toast.error("No estimates selected"); return; }
    await downloadMultipleEstimatePDFs(selected, partnerName);
    toast.success(`Downloading ${selected.length} estimate${selected.length > 1 ? "s" : ""}`);
  };

  const handleDownloadAll = async () => {
    if (filteredEstimates.length === 0) return;
    await downloadMultipleEstimatePDFs(filteredEstimates, partnerName);
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
                  <TableHead>Estimate #</TableHead>
                  <TableHead>Station / Site</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Account Manager</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEstimates.map((est) => {
                  const config = STATUS_CONFIG[est.status] || STATUS_CONFIG.draft;
                  const isChecked = selectedIds.has(est.id);
                  return (
                    <TableRow key={est.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEstimate(est)}>
                      <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={isChecked} onCheckedChange={() => toggleOne(est.id)} /></TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{est.estimate_number || "—"}</TableCell>
                      <TableCell><div className="font-medium">{est.site_name || est.station_id || "—"}</div></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{est.ticket_id || "—"}</TableCell>
                      <TableCell className="text-sm">{est.customer_name || est.customer_email || "—"}</TableCell>
                      <TableCell className="text-sm">{est.account_manager || "—"}</TableCell>
                      <TableCell className="text-right font-semibold">${Number(est.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell><Badge variant="outline" className={config.className}>{config.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(est.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => { await downloadEstimatePDF(est); toast.success("PDF downloaded"); }}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EstimateDetailModal estimate={selectedEstimate} open={!!selectedEstimate} onOpenChange={(o) => { if (!o) setSelectedEstimate(null); }} partnerName={partnerName} onUpdated={(updated) => setSelectedEstimate(updated)} />
    </div>
  );
};

export default Estimates;
