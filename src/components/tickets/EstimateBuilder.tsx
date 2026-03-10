import { useState, useMemo, useCallback, useContext } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Save,
  Send,
  ExternalLink,
  FileText,
  MapPin,
  AlertTriangle,
  CheckCircle,
  ClipboardCopy,
  GripVertical,
} from "lucide-react";
import { AssessmentCharger } from "@/types/assessment";
import { EnrichedSWIMatch } from "@/hooks/useSWIMatching";
import { DispatchModal } from "./DispatchModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { syncAllLineItemsToCatalog } from "@/utils/partsCatalogSync";
import { PartsCatalogAutocomplete } from "@/components/estimates/PartsCatalogAutocomplete";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EstimateLineItem {
  id: string;
  description: string;
  qty: number;
  unit: "hours" | "each" | "flat";
  rate: number;
  amount: number;
  category: "labor" | "parts" | "travel" | "other";
}

export interface Estimate {
  ticketId: string;
  lineItems: EstimateLineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  notes: string;
  customerEmail: string;
  status: "draft" | "sent" | "approved";
  swiDocument: { id: string; title: string } | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _nextId = 1;
const uid = () => `li_${Date.now()}_${_nextId++}`;

const LABOR_RATE = 125;
const TAX_RATE = 0.08;

const CATEGORY_LABELS: Record<EstimateLineItem["category"], string> = {
  labor: "Labor",
  parts: "Parts",
  travel: "Travel",
  other: "Other",
};

function parseEstimatedHours(est: string): number {
  const m = est.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 2;
}

function buildDefaultItems(
  ticket: AssessmentCharger,
  swiMatch: EnrichedSWIMatch
): EstimateLineItem[] {
  const swi = swiMatch.swiDocument;
  const title = swi?.title || swiMatch.matched_swi_id || "General Service";
  const hours = swi ? parseEstimatedHours(swi.estimatedTime) : 2;
  const parts = swiMatch.required_parts ?? swi?.requiredParts ?? [];

  const items: EstimateLineItem[] = [
    {
      id: uid(),
      description: "Labor — EVSE certified field technician",
      qty: hours,
      unit: "hours",
      rate: LABOR_RATE,
      amount: hours * LABOR_RATE,
      category: "labor",
    },
    {
      id: uid(),
      description: "Travel Time",
      qty: 1,
      unit: "hours",
      rate: LABOR_RATE,
      amount: LABOR_RATE,
      category: "travel",
    },
  ];

  parts.forEach((p) => {
    if (p && p.toLowerCase() !== "none" && !p.toLowerCase().startsWith("none")) {
      items.push({
        id: uid(),
        description: p,
        qty: 1,
        unit: "each",
        rate: 0,
        amount: 0,
        category: "parts",
      });
    }
  });

  return items;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function LineItemRow({
  item,
  onChange,
  onDelete,
  readOnly,
}: {
  item: EstimateLineItem;
  onChange: (updated: EstimateLineItem) => void;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const update = (patch: Partial<EstimateLineItem>) => {
    const next = { ...item, ...patch };
    next.amount = parseFloat((next.qty * next.rate).toFixed(2));
    onChange(next);
  };

  return (
    <tr className="group border-b border-border/50 last:border-0">
      <td className="py-2 pr-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab" />
      </td>
      <td className="py-2 pr-2">
        <Badge variant="outline" className="text-[10px] font-normal whitespace-nowrap">
          {CATEGORY_LABELS[item.category]}
        </Badge>
      </td>
      <td className="py-2 pr-2 w-full">
        {readOnly ? (
          <Input value={item.description} className="h-8 text-sm" disabled />
        ) : (
          <PartsCatalogAutocomplete
            value={item.description}
            onChange={(val) => update({ description: val })}
            onSelect={(catalogItem) => update({
              description: catalogItem.description,
              rate: catalogItem.unit_price,
              ...(catalogItem.unit ? { unit: catalogItem.unit as any } : {}),
            })}
          />
        )}
      </td>
      <td className="py-2 pr-2">
        <Input
          type="number"
          min={0}
          step={0.5}
          value={item.qty}
          onChange={(e) => update({ qty: parseFloat(e.target.value) || 0 })}
          className="h-8 w-16 text-sm text-right"
          disabled={readOnly}
        />
      </td>
      <td className="py-2 pr-2">
        <Select
          value={item.unit}
          onValueChange={(v) => update({ unit: v as EstimateLineItem["unit"] })}
          disabled={readOnly}
        >
          <SelectTrigger className="h-8 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="hours">hours</SelectItem>
            <SelectItem value="each">each</SelectItem>
            <SelectItem value="flat">flat</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="py-2 pr-2">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
          <Input
            type="number"
            min={0}
            step={1}
            value={item.rate}
            onChange={(e) => update({ rate: parseFloat(e.target.value) || 0 })}
            className="h-8 w-24 text-sm text-right pl-5"
            disabled={readOnly}
          />
        </div>
      </td>
      <td className="py-2 pr-2 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
        ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </td>
      {!readOnly && (
        <td className="py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </td>
      )}
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface EstimateBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: AssessmentCharger;
  swiMatch: EnrichedSWIMatch;
  onDispatched: () => void;
  onStatusChange?: (status: "none" | "draft" | "sent" | "approved") => void;
  onAccountManagerChange?: (name: string) => void;
  initialStatus?: "draft" | "sent" | "approved";
}

export function EstimateBuilder({
  open,
  onOpenChange,
  ticket,
  swiMatch,
  onDispatched,
  onStatusChange,
  onAccountManagerChange,
  initialStatus,
}: EstimateBuilderProps) {
  const { selectedCampaignId } = useCampaignContext();
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>(() =>
    buildDefaultItems(ticket, swiMatch)
  );
  const [notes, setNotes] = useState(
    swiMatch.warnings?.join("\n") ||
      swiMatch.swiDocument?.description ||
      ""
  );
  const [customerEmail, setCustomerEmail] = useState("");
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [newAdditionalEmail, setNewAdditionalEmail] = useState("");
  const [accountManager, setAccountManager] = useState("");
  const [taxRate, setTaxRate] = useState(TAX_RATE);
  const [status, setStatus] = useState<Estimate["status"]>(initialStatus || "draft");
  const [savedEstimateId, setSavedEstimateId] = useState<string | null>(null);
  const isReadOnly = status === "approved";
  const [newCategory, setNewCategory] = useState<EstimateLineItem["category"]>("labor");
  const [showDispatch, setShowDispatch] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const ACCOUNT_MANAGERS = [
    { name: "Joe Rose", email: "jrose@nochpower.com" },
    { name: "Caitlin Romano", email: "cromano@nochpower.com" },
    { name: "Fernando Favole", email: "ffavole@nochpower.com" },
  ];

  /* Derived totals */
  const subtotal = useMemo(
    () => parseFloat(lineItems.reduce((s, i) => s + i.amount, 0).toFixed(2)),
    [lineItems]
  );
  const tax = useMemo(
    () => parseFloat((subtotal * taxRate).toFixed(2)),
    [subtotal, taxRate]
  );
  const total = useMemo(
    () => parseFloat((subtotal + tax).toFixed(2)),
    [subtotal, tax]
  );

  /* Actions */
  const updateItem = useCallback(
    (id: string, updated: EstimateLineItem) =>
      setLineItems((prev) => prev.map((i) => (i.id === id ? updated : i))),
    []
  );

  const deleteItem = useCallback(
    (id: string) => setLineItems((prev) => prev.filter((i) => i.id !== id)),
    []
  );

  const addItem = () => {
    const defaults: Record<EstimateLineItem["category"], Partial<EstimateLineItem>> = {
      labor: { description: "Labor — EVSE certified field technician", qty: 1, unit: "hours", rate: LABOR_RATE },
      parts: { description: "", qty: 1, unit: "each", rate: 0 },
      travel: { description: "Travel Time", qty: 1, unit: "hours", rate: LABOR_RATE },
      other: { description: "", qty: 1, unit: "flat", rate: 0 },
    };
    const d = defaults[newCategory];
    setLineItems((prev) => [
      ...prev,
      {
        id: uid(),
        description: d.description || "",
        qty: d.qty || 1,
        unit: d.unit || "each",
        rate: d.rate || 0,
        amount: (d.qty || 1) * (d.rate || 0),
        category: newCategory,
      },
    ]);
  };

  const buildEstimate = (): Estimate => ({
    ticketId: ticket.ticketId || ticket.id,
    lineItems,
    subtotal,
    taxRate,
    tax,
    total,
    notes,
    customerEmail,
    status,
    swiDocument: swiMatch.swiDocument
      ? { id: swiMatch.swiDocument.id, title: swiMatch.swiDocument.title }
      : null,
    createdAt: new Date().toISOString(),
  });


  const handleSaveDraft = async () => {
    try {
      const payload = {
        campaign_id: selectedCampaignId,
        charger_record_id: null,
        ticket_id: ticket.ticketId || null,
        station_id: ticket.id || null,
        site_name: ticket.accountName || null,
        customer_email: customerEmail.trim() || null,
        account_manager: accountManager || null,
        line_items: lineItems.map(li => ({
          description: li.description,
          qty: li.qty,
          unit: li.unit,
          rate: li.rate,
          amount: li.amount,
          category: li.category,
        })),
        subtotal,
        tax_rate: taxRate,
        tax,
        total,
        notes: notes || null,
        status: "draft" as const,
      };

      if (savedEstimateId) {
        const { error } = await supabase
          .from("estimates")
          .update(payload)
          .eq("id", savedEstimateId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("estimates")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setSavedEstimateId(data.id);
      }

      setStatus("draft");
      onStatusChange?.("draft");
      toast.success("Estimate saved as draft");

      // Sync line items to parts catalog
      const estId = savedEstimateId || data?.id;
      if (estId) syncAllLineItemsToCatalog(estId);
    } catch (err: any) {
      console.error("Save draft error:", err);
      toast.error(`Failed to save draft: ${err.message || "Unknown error"}`);
    }
  };

  const handleSendEstimate = async () => {
    if (!customerEmail.trim()) {
      toast.error("Please enter a customer email address");
      return;
    }
    setIsSending(true);
    try {
      const location = [ticket.address, ticket.city, ticket.state, ticket.zip]
        .filter(Boolean)
        .join(", ");

      const ccEmails = [
        ...(accountManager ? [accountManager] : []),
        ...additionalEmails.filter((e) => e.includes("@")),
      ];

      // Save estimate to DB first to get an ID for the approval link
      const { data: savedEstimate, error: saveErr } = await supabase
        .from("estimates")
        .insert({
          campaign_id: selectedCampaignId,
          charger_record_id: null,
          ticket_id: ticket.ticketId || null,
          station_id: ticket.id || null,
          site_name: ticket.accountName || null,
          customer_email: customerEmail.trim(),
          account_manager: accountManager || null,
          line_items: lineItems.map(li => ({
            description: li.description,
            qty: li.qty,
            unit: li.unit,
            rate: li.rate,
            amount: li.amount,
            category: li.category,
          })),
          subtotal,
          tax_rate: taxRate,
          tax,
          total,
          notes: notes || null,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (saveErr) throw saveErr;

      const { data, error } = await supabase.functions.invoke("send-estimate", {
        body: {
          to: customerEmail.trim(),
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          estimateId: savedEstimate.id,
          ticketId: ticket.ticketId || ticket.id,
          accountName: ticket.accountName || "—",
          chargerName: ticket.assetName,
          chargerType: ticket.assetRecordType,
          location: location || "—",
          swiTitle: swiMatch.swiDocument?.title || swiMatch.matched_swi_id || "General Service",
          lineItems: lineItems.map(li => ({
            description: li.description,
            qty: li.qty,
            unit: li.unit,
            rate: li.rate,
            amount: li.amount,
            category: li.category,
          })),
          subtotal,
          tax,
          total,
          notes,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStatus("sent");
      onStatusChange?.("sent");
      toast.success(`Estimate sent to ${customerEmail}`);

      // Sync line items to parts catalog
      if (savedEstimate?.id) syncAllLineItemsToCatalog(savedEstimate.id);
    } catch (err: any) {
      console.error("Send estimate error:", err);
      toast.error(`Failed to send estimate: ${err.message || "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSkipDispatch = () => {
    if (!confirm("Are you sure? No estimate will be sent to the customer.")) return;
    setShowDispatch(true);
  };

  /* SWI info */
  const swiTitle =
    swiMatch.swiDocument?.title || swiMatch.matched_swi_id || "General Service";
  const location = [ticket.address, ticket.city, ticket.state, ticket.zip]
    .filter(Boolean)
    .join(", ");

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (showDispatch) {
    return (
      <DispatchModal
        open={open}
        onOpenChange={onOpenChange}
        ticket={ticket}
        swiMatch={swiMatch}
        onDispatched={onDispatched}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              {isReadOnly ? "View Estimate" : status === "sent" ? "Review Estimate" : "Create Estimate"}
            </DialogTitle>
            <div className="bg-[#1e293b] rounded-md px-4 py-2">
              <img src="/images/noch-power-logo-white-2.png" alt="Noch" className="h-6 object-contain" />
            </div>
          </div>
          <DialogDescription>
            {isReadOnly ? "This estimate has been approved and cannot be modified." : "Build a service estimate for this ticket, then send or dispatch."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* ── A. Header Info ────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 rounded-lg p-4 border border-border/50">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ticket</p>
              <p className="text-sm font-semibold text-foreground">
                #{ticket.ticketId || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Account</p>
              <p className="text-sm font-semibold text-foreground">
                {ticket.accountName || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Charger</p>
              <p className="text-sm font-semibold text-foreground">
                {ticket.assetName}{" "}
                <Badge variant="outline" className="ml-1 text-[10px]">
                  {ticket.assetRecordType}
                </Badge>
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location
              </p>
              <p className="text-sm font-semibold text-foreground truncate">{location || "—"}</p>
            </div>
            <div className="col-span-2 md:col-span-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                SWI Document
              </p>
              <p className="text-sm font-semibold text-primary">{swiTitle}</p>
            </div>
          </div>

          {/* ── B. Line Items ─────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Line Items</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="py-2 px-2 w-6" />
                      <th className="py-2 pr-2 text-left">Type</th>
                      <th className="py-2 pr-2 text-left">Description</th>
                      <th className="py-2 pr-2 text-right">Qty</th>
                      <th className="py-2 pr-2 text-left">Unit</th>
                      <th className="py-2 pr-2 text-right">Rate</th>
                      <th className="py-2 pr-2 text-right">Amount</th>
                      <th className="py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <LineItemRow
                        key={item.id}
                        item={item}
                        onChange={(u) => updateItem(item.id, u)}
                        onDelete={() => deleteItem(item.id)}
                        readOnly={isReadOnly}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Line Item */}
              {!isReadOnly && (
                <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/20">
                  <Select
                    value={newCategory}
                    onValueChange={(v) =>
                      setNewCategory(v as EstimateLineItem["category"])
                    }
                  >
                    <SelectTrigger className="h-8 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="parts">Parts</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={addItem} className="h-8 gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Add Line Item
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── C. Totals ─────────────────────────────────── */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 bg-muted/30 rounded-lg p-4 border border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">
                  ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm items-center gap-2">
                <span className="text-muted-foreground">Tax</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="h-7 w-16 text-xs text-right"
                  />
                  <span className="text-xs text-muted-foreground">
                    (${tax.toLocaleString("en-US", { minimumFractionDigits: 2 })})
                  </span>
                </div>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary tabular-nums">
                  ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* ── D. Notes ──────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes, safety warnings, special instructions…"
              className="min-h-[80px] text-sm"
              disabled={isReadOnly}
            />
          </div>

          {/* ── E. Account Manager ────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Account Manager</h3>
            <Select value={accountManager} disabled={isReadOnly} onValueChange={(val) => {
              setAccountManager(val);
              const am = ACCOUNT_MANAGERS.find(a => a.email === val);
              if (am) onAccountManagerChange?.(am.name);
            }}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Select Account Manager" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {ACCOUNT_MANAGERS.map((am) => (
                  <SelectItem key={am.email} value={am.email}>
                    {am.name} ({am.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">A copy of the estimate will be sent to the selected manager.</p>
          </div>

          {/* ── F. Customer Email ─────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Customer Email</h3>
            <div className="flex items-center gap-3">
              <Input
                type="email"
                placeholder="customer@company.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="max-w-sm"
                disabled={isReadOnly}
              />
              {customerEmail && !customerEmail.includes("@") && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Invalid email
                </span>
              )}
            </div>
          </div>

          {/* ── G. Additional Recipients ──────────────────── */}
          {!isReadOnly && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Additional Recipients</h3>
              <div className="flex items-center gap-2 mb-2">
                <Input
                  type="email"
                  placeholder="other@company.com"
                  value={newAdditionalEmail}
                  onChange={(e) => setNewAdditionalEmail(e.target.value)}
                  className="max-w-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newAdditionalEmail.includes("@")) {
                      e.preventDefault();
                      setAdditionalEmails((prev) => [...prev, newAdditionalEmail.trim()]);
                      setNewAdditionalEmail("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!newAdditionalEmail.includes("@")}
                  onClick={() => {
                    setAdditionalEmails((prev) => [...prev, newAdditionalEmail.trim()]);
                    setNewAdditionalEmail("");
                  }}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {additionalEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {additionalEmails.map((email, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 text-xs">
                      {email}
                      <button
                        onClick={() => setAdditionalEmails((prev) => prev.filter((_, i) => i !== idx))}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom Actions ──────────────────────────────── */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isReadOnly && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1 border border-green-200 dark:border-green-800">
                <CheckCircle className="h-3 w-3" /> Approved
              </Badge>
            )}
            {!isReadOnly && status === "sent" && (
              <Badge className="bg-optimal text-optimal-foreground gap-1">
                <CheckCircle className="h-3 w-3" /> Estimate Sent
              </Badge>
            )}
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Save Draft
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendEstimate}
                disabled={isSending}
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                {isSending ? (
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {isSending ? "Sending..." : status === "sent" ? "Resend Estimate" : "Send Estimate"}
              </Button>
              {status === "sent" ? (
                <Button
                  size="sm"
                  onClick={() => setShowDispatch(true)}
                  className="gap-1.5"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Dispatch to Jobber
                  <ExternalLink className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipDispatch}
                  className="gap-1.5 text-muted-foreground"
                >
                  Skip & Dispatch to Jobber
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
