import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Pencil, Copy, Trash2, FileSpreadsheet, ArrowLeft, Upload, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  useCustomerRateSheetsList,
  useCustomerRateSheet,
  useRateSheetScopeCounts,
  useCreateCustomerRateSheet,
  useUpdateCustomerRateSheet,
  useDeleteCustomerRateSheet,
  useUpsertScopes,
  useUpsertTravelFees,
  useUpsertVolumeDiscounts,
  type CustomerRateSheet,
  type RateSheetScope,
  type RateSheetTravelFee,
  type RateSheetVolumeDiscount,
} from "@/hooks/useCustomerRateSheets";
import { parseRateSheetExcel, type ParsedRateSheet } from "@/lib/rateSheetExcelParser";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-primary/15 text-primary border-primary/20",
  draft: "bg-muted text-muted-foreground border-border",
  expired: "bg-destructive/15 text-destructive border-destructive/20",
};

function formatPrice(val: number | null): string {
  if (val === null || val === undefined) return "N/A";
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatFeeRate(rate: number, unit: string): string {
  if (unit === "cost_plus_pct") return `Cost + ${rate}%`;
  if (unit === "%") return `${rate}%`;
  return `$${rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}${unit}`;
}

// ─── Main Tab ───
export function CustomerRateSheetsTab() {
  const { data: sheets = [], isLoading } = useCustomerRateSheetsList();
  const { data: scopeCounts = {} } = useRateSheetScopeCounts();
  const createSheet = useCreateCustomerRateSheet();
  const deleteSheet = useDeleteCustomerRateSheet();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Create form
  const [newCustomer, setNewCustomer] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");

  const filtered = sheets.filter(
    (s) =>
      s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!newCustomer.trim() || !newName.trim()) return;
    createSheet.mutate(
      {
        customer_name: newCustomer,
        name: newName,
        description: newDesc,
        effective_date: newDate || null,
        expiration_date: null,
        status: "draft",
      },
      {
        onSuccess: (data) => {
          setCreateOpen(false);
          setNewCustomer("");
          setNewName("");
          setNewDesc("");
          setNewDate("");
          setDetailId(data.id);
        },
      }
    );
  };

  if (detailId) {
    return <RateSheetDetail sheetId={detailId} onBack={() => setDetailId(null)} />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Customer Rate Sheets</h2>
          <p className="text-sm text-muted-foreground">
            Scope-based pricing contracts with SLA tier pricing for enterprise customers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-[220px] h-9" placeholder="Search rate sheets..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" /> Import Excel
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Rate Sheet
          </Button>
        </div>
      </div>

      {/* Cards List */}
      {filtered.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No customer rate sheets yet. Create one or import from Excel.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((sheet) => (
            <Card key={sheet.id} className="border-border/60 hover:border-border transition-colors">
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm text-foreground">{sheet.customer_name}</span>
                    <Badge className={`text-xs ${STATUS_COLORS[sheet.status] || STATUS_COLORS.draft}`}>{sheet.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{sheet.name}</p>
                </div>
                <div className="text-xs text-muted-foreground text-right shrink-0">
                  <div>{scopeCounts[sheet.id] || 0} scopes</div>
                  {sheet.effective_date && <div>Eff. {new Date(sheet.effective_date).toLocaleDateString()}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailId(sheet.id)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Rate Sheet</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{sheet.name}" and all its scopes, travel fees, and volume discounts.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSheet.mutate(sheet.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Customer Rate Sheet</DialogTitle>
            <DialogDescription>Create a new scope-based pricing contract for a customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} placeholder="e.g. EV Connect" />
            </div>
            <div className="space-y-2">
              <Label>Rate Sheet Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. EV Connect Rate Sheet 2026" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Notes about this rate sheet..." />
            </div>
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createSheet.isPending || !newCustomer.trim() || !newName.trim()}>
              Create Rate Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <ImportExcelModal open={importOpen} onOpenChange={setImportOpen} onCreated={(id) => setDetailId(id)} />
    </div>
  );
}

// ─── Import Excel Modal ───
function ImportExcelModal({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void }) {
  const createSheet = useCreateCustomerRateSheet();
  const upsertScopes = useUpsertScopes();
  const upsertFees = useUpsertTravelFees();
  const upsertDiscounts = useUpsertVolumeDiscounts();

  const fileRef = useRef<HTMLInputElement>(null);
  const [customer, setCustomer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRateSheet | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    try {
      const buf = await f.arrayBuffer();
      const parsed = parseRateSheetExcel(buf);
      setPreview(parsed);
    } catch (err: any) {
      toast.error("Failed to parse Excel file: " + err.message);
    }
  };

  const handleImport = async () => {
    if (!customer.trim() || !preview) return;
    setImporting(true);
    try {
      const sheet = await createSheet.mutateAsync({
        customer_name: customer,
        name: `${customer} Rate Sheet`,
        description: `Imported from ${file?.name || "Excel"}`,
        effective_date: null,
        expiration_date: null,
        status: "draft",
      });

      const sheetId = sheet.id;

      await Promise.all([
        preview.scopes.length > 0
          ? upsertScopes.mutateAsync({
              rateSheetId: sheetId,
              scopes: preview.scopes.map((s) => ({ ...s, rate_sheet_id: sheetId })),
            })
          : Promise.resolve(),
        preview.travelFees.length > 0
          ? upsertFees.mutateAsync({
              rateSheetId: sheetId,
              fees: preview.travelFees.map((f) => ({ ...f, rate_sheet_id: sheetId })),
            })
          : Promise.resolve(),
        preview.volumeDiscounts.length > 0
          ? upsertDiscounts.mutateAsync({
              rateSheetId: sheetId,
              discounts: preview.volumeDiscounts.map((d) => ({ ...d, rate_sheet_id: sheetId })),
            })
          : Promise.resolve(),
      ]);

      toast.success("Rate sheet imported successfully");
      onOpenChange(false);
      setCustomer("");
      setFile(null);
      setPreview(null);
      onCreated(sheetId);
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setCustomer("");
    setFile(null);
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Import Rate Sheet from Excel
          </DialogTitle>
          <DialogDescription>Upload an .xlsx file to auto-detect scopes, travel fees, and volume discounts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Customer Name *</Label>
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. EV Connect" />
          </div>
          <div className="space-y-2">
            <Label>Excel File (.xlsx) *</Label>
            <div className="flex items-center gap-2">
              <Input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="flex-1" />
            </div>
          </div>
          {preview && (
            <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
              <h4 className="text-sm font-medium text-foreground">Preview</h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{preview.scopes.length}</div>
                  <div className="text-muted-foreground">Scopes</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{preview.travelFees.length}</div>
                  <div className="text-muted-foreground">Travel Fees</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{preview.volumeDiscounts.length}</div>
                  <div className="text-muted-foreground">Discounts</div>
                </div>
              </div>
              {preview.warnings.length > 0 && (
                <div className="space-y-1">
                  {preview.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
          <Button onClick={handleImport} disabled={importing || !customer.trim() || !preview}>
            {importing ? "Importing..." : "Import & Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail View ───
function RateSheetDetail({ sheetId, onBack }: { sheetId: string; onBack: () => void }) {
  const { data, isLoading } = useCustomerRateSheet(sheetId);
  const updateSheet = useUpdateCustomerRateSheet();
  const upsertScopes = useUpsertScopes();
  const upsertFees = useUpsertTravelFees();
  const upsertDiscounts = useUpsertVolumeDiscounts();

  const [editingScope, setEditingScope] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const { sheet, scopes, travelFees, volumeDiscounts } = data;
  const exhibitA = scopes.filter((s) => s.exhibit === "A").sort((a, b) => a.sort_order - b.sort_order);
  const exhibitB = scopes.filter((s) => s.exhibit === "B").sort((a, b) => a.sort_order - b.sort_order);
  const serviceDiscounts = volumeDiscounts.filter((d) => d.discount_type === "service").sort((a, b) => a.min_stations - b.min_stations);
  const installDiscounts = volumeDiscounts.filter((d) => d.discount_type === "installation").sort((a, b) => a.min_stations - b.min_stations);

  const handleInlineEdit = (scopeId: string, field: string, value: string) => {
    const numVal = value === "" || value.toLowerCase() === "n/a" ? null : parseFloat(value);
    const updated = scopes.map((s) => (s.id === scopeId ? { ...s, [field]: numVal } : s));
    upsertScopes.mutate({
      rateSheetId: sheetId,
      scopes: updated.map(({ id, ...rest }) => rest),
    });
    setEditingScope(null);
  };

  const addScope = (exhibit: string) => {
    const exhibitScopes = scopes.filter((s) => s.exhibit === exhibit);
    const maxSort = exhibitScopes.reduce((m, s) => Math.max(m, s.sort_order), 0);
    const updated = [
      ...scopes.map(({ id, ...rest }) => rest),
      {
        rate_sheet_id: sheetId,
        scope_code: "",
        scope_name: "New Scope",
        exhibit,
        hours_to_complete: null,
        price_24hr: null,
        price_48hr: null,
        price_72hr: null,
        price_96hr: null,
        price_192hr: null,
        travel_note: "",
        requires_ev_rental: false,
        sort_order: maxSort + 1,
      },
    ];
    upsertScopes.mutate({ rateSheetId: sheetId, scopes: updated });
  };

  const addTravelFee = () => {
    const maxSort = travelFees.reduce((m, f) => Math.max(m, f.sort_order), 0);
    const updated = [
      ...travelFees.map(({ id, ...rest }) => rest),
      {
        rate_sheet_id: sheetId,
        fee_type: "misc",
        label: "New Fee",
        rate: 0,
        unit: "flat",
        threshold: null,
        notes: "",
        sort_order: maxSort + 1,
      },
    ];
    upsertFees.mutate({ rateSheetId: sheetId, fees: updated });
  };

  const addVolumeDiscount = (type: string) => {
    const typeDiscounts = volumeDiscounts.filter((d) => d.discount_type === type);
    const maxMin = typeDiscounts.reduce((m, d) => Math.max(m, d.max_stations || d.min_stations), 0);
    const updated = [
      ...volumeDiscounts.map(({ id, ...rest }) => rest),
      {
        rate_sheet_id: sheetId,
        discount_type: type,
        min_stations: maxMin + 1,
        max_stations: null,
        discount_percent: 0,
      },
    ];
    upsertDiscounts.mutate({ rateSheetId: sheetId, discounts: updated });
  };

  const priceCellClass = (val: number | null) =>
    val === null ? "text-muted-foreground/50 bg-muted/30" : "text-foreground";

  const renderScopeTable = (exhibitScopes: RateSheetScope[], exhibitLabel: string, exhibit: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{exhibitLabel}</h3>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addScope(exhibit)}>
          <Plus className="h-3 w-3" /> Add Scope
        </Button>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px] text-xs">Code</TableHead>
              <TableHead className="text-xs">Scope Name</TableHead>
              <TableHead className="w-[60px] text-xs text-center">Hrs</TableHead>
              <TableHead className="w-[90px] text-xs text-right">24hr</TableHead>
              <TableHead className="w-[90px] text-xs text-right">48hr</TableHead>
              <TableHead className="w-[90px] text-xs text-right">72hr</TableHead>
              <TableHead className="w-[90px] text-xs text-right">96hr</TableHead>
              <TableHead className="w-[90px] text-xs text-right">192hr</TableHead>
              <TableHead className="text-xs">Travel Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exhibitScopes.map((scope, idx) => (
              <TableRow key={scope.id || idx}>
                <TableCell className="text-xs font-mono font-medium">{scope.scope_code}</TableCell>
                <TableCell className="text-xs">{scope.scope_name}</TableCell>
                <TableCell className="text-xs text-center">{scope.hours_to_complete ?? "—"}</TableCell>
                {(["price_24hr", "price_48hr", "price_72hr", "price_96hr", "price_192hr"] as const).map((col) => {
                  const isEditing = editingScope?.row === idx && editingScope?.col === col;
                  return (
                    <TableCell
                      key={col}
                      className={`text-xs text-right cursor-pointer hover:bg-accent/50 transition-colors ${priceCellClass(scope[col])}`}
                      onClick={() => {
                        setEditingScope({ row: idx, col });
                        setEditValue(scope[col] !== null ? String(scope[col]) : "");
                      }}
                    >
                      {isEditing ? (
                        <Input
                          autoFocus
                          className="h-6 text-xs text-right w-[80px] ml-auto"
                          value={editValue}
                          placeholder="N/A"
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleInlineEdit(scope.id, col, editValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleInlineEdit(scope.id, col, editValue);
                            if (e.key === "Escape") setEditingScope(null);
                          }}
                        />
                      ) : (
                        formatPrice(scope[col])
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-xs text-muted-foreground">{scope.travel_note || "—"}</TableCell>
              </TableRow>
            ))}
            {exhibitScopes.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">
                  No scopes yet. Click "Add Scope" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">{sheet.name}</h2>
          <p className="text-xs text-muted-foreground">
            {sheet.customer_name} · <Badge className={`text-xs ${STATUS_COLORS[sheet.status]}`}>{sheet.status}</Badge>
          </p>
        </div>
        <Select
          value={sheet.status}
          onValueChange={(val) => updateSheet.mutate({ id: sheetId, status: val })}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Section 1: Overview */}
      <Card className="border-border/60">
        <CardContent className="pt-4 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer</Label>
              <Input className="h-8 text-sm bg-muted/30" value={sheet.customer_name} disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rate Sheet Name</Label>
              <Input
                className="h-8 text-sm"
                defaultValue={sheet.name}
                onBlur={(e) => {
                  if (e.target.value !== sheet.name) updateSheet.mutate({ id: sheetId, name: e.target.value });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Effective Date</Label>
              <Input
                type="date"
                className="h-8 text-sm"
                defaultValue={sheet.effective_date || ""}
                onBlur={(e) => updateSheet.mutate({ id: sheetId, effective_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expiration Date</Label>
              <Input
                type="date"
                className="h-8 text-sm"
                defaultValue={sheet.expiration_date || ""}
                onBlur={(e) => updateSheet.mutate({ id: sheetId, expiration_date: e.target.value || null })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Scope Pricing Matrix */}
      <Card className="border-border/60">
        <CardContent className="pt-4 pb-4 space-y-6">
          <h3 className="text-sm font-semibold text-foreground">Scope Pricing Matrix</h3>
          {renderScopeTable(exhibitA, "Exhibit A: Service Calls", "A")}
          {renderScopeTable(exhibitB, "Exhibit B: Installation Services", "B")}
        </CardContent>
      </Card>

      {/* Section 3: Travel Fees */}
      <Card className="border-border/60">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Travel Fees</h3>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addTravelFee}>
              <Plus className="h-3 w-3" /> Add Fee
            </Button>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Fee Type</TableHead>
                  <TableHead className="text-xs">Label</TableHead>
                  <TableHead className="text-xs text-right">Rate</TableHead>
                  <TableHead className="text-xs">Unit</TableHead>
                  <TableHead className="text-xs text-right">Threshold</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {travelFees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="text-xs font-medium">{fee.fee_type}</TableCell>
                    <TableCell className="text-xs">{fee.label}</TableCell>
                    <TableCell className="text-xs text-right">{formatFeeRate(fee.rate, fee.unit)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fee.unit}</TableCell>
                    <TableCell className="text-xs text-right">{fee.threshold !== null ? fee.threshold : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fee.notes || "—"}</TableCell>
                  </TableRow>
                ))}
                {travelFees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No travel fees.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Volume Discounts */}
      <Card className="border-border/60">
        <CardContent className="pt-4 pb-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Volume Discounts</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Service */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service Discounts</h4>
                <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2" onClick={() => addVolumeDiscount("service")}>
                  <Plus className="h-3 w-3" /> Add Tier
                </Button>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Station Range</TableHead>
                      <TableHead className="text-xs text-right">Discount %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceDiscounts.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs">
                          {d.max_stations ? `${d.min_stations}–${d.max_stations}` : `${d.min_stations}+`}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {d.discount_percent > 0 ? `${d.discount_percent}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {serviceDiscounts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-4">No tiers.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            {/* Installation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Installation Discounts</h4>
                <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2" onClick={() => addVolumeDiscount("installation")}>
                  <Plus className="h-3 w-3" /> Add Tier
                </Button>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Station Range</TableHead>
                      <TableHead className="text-xs text-right">Discount %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installDiscounts.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs">
                          {d.max_stations ? `${d.min_stations}–${d.max_stations}` : `${d.min_stations}+`}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {d.discount_percent > 0 ? `${d.discount_percent}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {installDiscounts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-4">No tiers.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
