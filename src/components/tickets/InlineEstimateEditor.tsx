import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, Save, Send, GripVertical, AlertTriangle, CheckCircle, Loader2, RefreshCw, UserCheck, FileText,
} from "lucide-react";
import { ServiceTicket } from "@/types/serviceTicket";
import { SWI_CATALOG } from "@/data/swiCatalog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import { lookupRateSheetPricing, buildRateSheetLineItems, type RateSheetPricingResult } from "@/services/rateSheetPricingService";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EstimateLineItem {
  id: string;
  description: string;
  qty: number;
  unit: "hours" | "each" | "flat";
  rate: number;
  amount: number;
  category: "labor" | "parts" | "travel" | "other";
}

interface InlineEstimateEditorProps {
  ticket: ServiceTicket;
  campaignId?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _nextId = 1;
const uid = () => `li_${Date.now()}_${_nextId++}`;

const LABOR_RATE = 125;
const TAX_RATE = 0;

const CATEGORY_LABELS: Record<EstimateLineItem["category"], string> = {
  labor: "Labor",
  parts: "Parts",
  travel: "Travel",
  other: "Other",
};

const ACCOUNT_MANAGERS = [
  { name: "Joe Rose", email: "jrose@nochpower.com" },
  { name: "Caitlin Romano", email: "cromano@nochpower.com" },
  { name: "Fernando Favole", email: "ffavole@nochpower.com" },
];

function parseEstimatedHours(est: string): number {
  const m = est.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 2;
}

function buildDefaultItems(ticket: ServiceTicket): EstimateLineItem[] {
  const swiMatch = ticket.swiMatchData;
  const swiDoc = swiMatch?.matched_swi_id
    ? SWI_CATALOG.find(s => s.id === swiMatch.matched_swi_id)
    : undefined;

  const title = swiDoc?.title || swiMatch?.matched_swi_id || "General Service";
  const hours = swiDoc ? parseEstimatedHours(swiDoc.estimatedTime) : 2;
  const parts = swiMatch?.required_parts ?? swiDoc?.requiredParts ?? [];

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
/*  Line Item Row                                                      */
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
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
      </td>
      <td className="py-2 pr-2">
        <Badge variant="outline" className="text-[10px] font-normal whitespace-nowrap">
          {CATEGORY_LABELS[item.category]}
        </Badge>
      </td>
      <td className="py-2 pr-2 w-full">
        <Input
          value={item.description}
          onChange={(e) => update({ description: e.target.value })}
          className="h-8 text-sm"
          disabled={readOnly}
        />
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
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function InlineEstimateEditor({ ticket, campaignId }: InlineEstimateEditorProps) {
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>(() =>
    buildDefaultItems(ticket)
  );
  const [rateSheetPricing, setRateSheetPricing] = useState<RateSheetPricingResult | null>(null);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(ticket.customer.email || "");
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [newAdditionalEmail, setNewAdditionalEmail] = useState("");
  const [accountManager, setAccountManager] = useState("");
  const [notes, setNotes] = useState(
    ticket.swiMatchData?.warnings?.join("\n") || ""
  );
  const [taxRate, setTaxRate] = useState(TAX_RATE);
  const [status, setStatus] = useState<"draft" | "sent" | "approved">("draft");
  const [savedEstimateId, setSavedEstimateId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<EstimateLineItem["category"]>("labor");
  const [isSending, setIsSending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [approvalData, setApprovalData] = useState<{
    method: "email" | "manual";
    approvedBy?: string;
    approvedAt?: string;
    notes?: string;
  } | null>(null);
  const [manualApproveOpen, setManualApproveOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  const updateTicket = useServiceTicketsStore((s) => s.updateTicket);

  // Check customer pricing type and load rate sheet pricing if applicable
  useEffect(() => {
    if (pricingLoaded) return;
    const customerCompany = ticket.customer.company || ticket.customer.name;
    if (!customerCompany) { setPricingLoaded(true); return; }

    const swiMatch = ticket.swiMatchData;
    const swiDoc = swiMatch?.matched_swi_id
      ? SWI_CATALOG.find(s => s.id === swiMatch.matched_swi_id)
      : undefined;
    const swiTitle = swiDoc?.title || swiMatch?.matched_swi_id || null;
    // Use ticket description as additional context for scope matching
    const ticketDescription = ticket.issue?.description || null;

    // Also try to find SWI from database if not found in hardcoded catalog
    const findSWIFromDB = async () => {
      if (swiDoc) return { parts: swiMatch?.required_parts ?? swiDoc?.requiredParts ?? [], hours: swiDoc ? parseEstimatedHours(swiDoc.estimatedTime) : 2 };
      if (!swiMatch?.matched_swi_id) return { parts: [], hours: 2 };
      // Try DB catalog
      const { data: dbEntries } = await supabase
        .from("swi_catalog_entries")
        .select("*")
        .or(`title.ilike.%${swiMatch.matched_swi_id}%,id.eq.${swiMatch.matched_swi_id.length === 36 ? swiMatch.matched_swi_id : '00000000-0000-0000-0000-000000000000'}`);
      const dbEntry = dbEntries?.[0];
      if (dbEntry) {
        const dbParts = (dbEntry.required_parts as string[]) || [];
        const dbHours = dbEntry.estimated_time ? parseEstimatedHours(dbEntry.estimated_time as string) : 2;
        return { parts: dbParts.length > 0 ? dbParts : (swiMatch.required_parts || []), hours: dbHours };
      }
      return { parts: swiMatch?.required_parts || [], hours: 2 };
    };

    Promise.all([
      lookupRateSheetPricing(
        customerCompany,
        ticket.priority || "Medium",
        swiTitle,
        swiMatch?.matched_swi_id || null,
        undefined,
        ticketDescription
      ),
      findSWIFromDB()
    ]).then(([result, swiInfo]) => {
      setPricingLoaded(true);

      // Update default items with DB SWI data even for rate_card customers
      if (!result) {
        if (swiInfo.parts.length > 0 || swiInfo.hours !== 2) {
          const title = swiDoc?.title || swiMatch?.matched_swi_id || "General Service";
          const items: EstimateLineItem[] = [
            { id: uid(), description: "Labor — EVSE certified field technician", qty: swiInfo.hours, unit: "hours", rate: LABOR_RATE, amount: swiInfo.hours * LABOR_RATE, category: "labor" },
            { id: uid(), description: "Travel Time", qty: 1, unit: "hours", rate: LABOR_RATE, amount: LABOR_RATE, category: "travel" },
          ];
          swiInfo.parts.forEach((p) => {
            if (p && p.toLowerCase() !== "none" && !p.toLowerCase().startsWith("none")) {
              items.push({ id: uid(), description: p, qty: 1, unit: "each", rate: 0, amount: 0, category: "parts" });
            }
          });
          setLineItems(items);
        }
        return;
      }

      setRateSheetPricing(result);
      const parts = swiInfo.parts.length > 0 ? swiInfo.parts : (swiMatch?.required_parts ?? swiDoc?.requiredParts ?? []);
      const rateSheetItems = buildRateSheetLineItems(
        result,
        swiTitle || "General Service",
        parts
      );
      setLineItems(
        rateSheetItems.map((item) => ({
          ...item,
          id: uid(),
        }))
      );
      toast.info(`Pricing loaded from ${result.rateSheetName}`, { duration: 4000 });
    }).catch((err) => {
      console.warn("Rate sheet pricing lookup failed:", err);
      setPricingLoaded(true);
    });
  }, [ticket, pricingLoaded]);

  const isReadOnly = status === "approved" || status === "sent";

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

  const handleSaveDraft = async () => {
    try {
      const payload = {
        campaign_id: campaignId || null,
        ticket_id: ticket.ticketId || null,
        station_id: null,
        site_name: ticket.customer.company || null,
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
      toast.success("Estimate saved as draft");
    } catch (err: any) {
      console.error("Save draft error:", err);
      toast.error(`Failed to save: ${err.message || "Unknown error"}`);
    }
  };

  const handleSendEstimate = async () => {
    if (!customerEmail.trim()) {
      toast.error("Please enter a customer email address");
      return;
    }
    setIsSending(true);
    try {
      const ccEmails = [
        ...(accountManager ? [accountManager] : []),
        ...additionalEmails.filter((e) => e.includes("@")),
      ];

      const swiDoc = ticket.swiMatchData?.matched_swi_id
        ? SWI_CATALOG.find(s => s.id === ticket.swiMatchData!.matched_swi_id)
        : undefined;

      // Save estimate to DB first
      const { data: savedEstimate, error: saveErr } = await supabase
        .from("estimates")
        .insert({
          campaign_id: campaignId || null,
          ticket_id: ticket.ticketId || null,
          station_id: null,
          site_name: ticket.customer.company || null,
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

      const location = ticket.charger.location || "";

      const { data, error } = await supabase.functions.invoke("send-estimate", {
        body: {
          to: customerEmail.trim(),
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          estimateId: savedEstimate.id,
          ticketId: ticket.ticketId,
          accountName: ticket.customer.company || "—",
          chargerName: ticket.charger.serialNumber || ticket.charger.brand || "Unknown",
          chargerType: ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2",
          location: location || "—",
          swiTitle: swiDoc?.title || ticket.swiMatchData?.matched_swi_id || "General Service",
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
      setSentAt(new Date().toISOString());
      setSavedEstimateId(savedEstimate.id);

      // Advance ticket workflow: steps 3-4 complete, step 5 in progress
      const now2 = new Date().toISOString();
      updateTicket(ticket.id, {
        currentStep: 5,
        estimateId: savedEstimate.id,
        estimateAmount: total,
        workflowSteps: ticket.workflowSteps.map(s => ({
          ...s,
          status: s.number <= 4 ? "complete" as const : s.number === 5 ? "in_progress" as const : s.status,
          completedAt: s.number <= 4 && !s.completedAt ? now2 : s.completedAt,
        })),
      });

      toast.success("Estimate sent — awaiting customer approval");
    } catch (err: any) {
      console.error("Send estimate error:", err);
      toast.error(`Failed to send: ${err.message || "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  // No assessment yet — can't create estimate
  if (!ticket.assessmentData) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-xs">Assessment must be completed before creating an estimate.</p>
      </div>
    );
  }

  const handleResendEmail = async () => {
    if (!savedEstimateId || !customerEmail) return;
    setIsResending(true);
    try {
      const swiDoc = ticket.swiMatchData?.matched_swi_id
        ? SWI_CATALOG.find(s => s.id === ticket.swiMatchData!.matched_swi_id)
        : undefined;
      const ccEmails = [
        ...(accountManager ? [accountManager] : []),
        ...additionalEmails.filter((e) => e.includes("@")),
      ];
      const { error } = await supabase.functions.invoke("send-estimate", {
        body: {
          to: customerEmail.trim(),
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          estimateId: savedEstimateId,
          ticketId: ticket.ticketId,
          accountName: ticket.customer.company || "—",
          chargerName: ticket.charger.serialNumber,
          chargerType: ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2",
          location: ticket.charger.location || "—",
          swiTitle: swiDoc?.title || ticket.swiMatchData?.matched_swi_id || "General Service",
          lineItems: lineItems.map(li => ({ description: li.description, qty: li.qty, unit: li.unit, rate: li.rate, amount: li.amount, category: li.category })),
          subtotal, tax, total, notes,
        },
      });
      if (error) throw error;
      const now = new Date().toISOString();
      setSentAt(now);
      await supabase.from("estimates").update({ sent_at: now }).eq("id", savedEstimateId);
      toast.success(`Email resent to ${customerEmail}`);
    } catch (err: any) {
      toast.error(`Failed to resend: ${err.message}`);
    } finally {
      setIsResending(false);
    }
  };

  const handleManualApprove = async () => {
    if (!savedEstimateId) return;
    try {
      const now = new Date().toISOString();
      await supabase.from("estimates").update({ status: "approved", updated_at: now }).eq("id", savedEstimateId);

      const approver = accountManager
        ? ACCOUNT_MANAGERS.find(am => am.email === accountManager)?.name || accountManager
        : "Account Manager";

      setApprovalData({ method: "manual", approvedBy: approver, approvedAt: now, notes: approvalNotes || undefined });
      setStatus("approved");
      setManualApproveOpen(false);
      setApprovalNotes("");

      // Advance ticket workflow to step 6
      updateTicket(ticket.id, {
        currentStep: 6,
        workflowSteps: ticket.workflowSteps.map(s => ({
          ...s,
          status: s.number <= 5 ? "complete" as const : s.number === 6 ? "in_progress" as const : s.status,
          completedAt: s.number <= 5 && !s.completedAt ? now : s.completedAt,
        })),
      });

      await supabase.from("notifications").insert({
        title: "Estimate Manually Approved",
        message: `Estimate for ticket #${ticket.ticketId} manually approved by ${approver}`,
        type: "estimate_approved",
        reference_id: savedEstimateId,
      });

      toast.success("Estimate manually approved — workflow advanced to Schedule Service");
    } catch (err: any) {
      toast.error(`Approval failed: ${err.message}`);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  // No assessment yet
  if (!ticket.assessmentData) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-xs">Assessment must be completed before creating an estimate.</p>
      </div>
    );
  }

  // Approved state
  if (status === "approved") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-optimal">
          <CheckCircle className="h-5 w-5" />
          <span>Estimate Approved</span>
        </div>
        <div className="bg-optimal/5 border border-optimal/20 rounded-lg p-4 space-y-3">
          {approvalData?.method === "manual" ? (
            <>
              <p className="text-sm text-foreground">✓ Manually approved by <span className="font-semibold">{approvalData.approvedBy}</span></p>
              {approvalData.approvedAt && (
                <p className="text-xs text-muted-foreground">Approved: {format(new Date(approvalData.approvedAt), "MMM d, yyyy 'at' h:mm a")}</p>
              )}
              {approvalData.notes && (
                <p className="text-xs text-muted-foreground">Notes: "{approvalData.notes}"</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-foreground">✓ Approved by customer via email link</p>
              {approvalData?.approvedAt && (
                <p className="text-xs text-muted-foreground">Approved: {format(new Date(approvalData.approvedAt), "MMM d, yyyy 'at' h:mm a")}</p>
              )}
            </>
          )}
          <div className="border-t border-border pt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-primary tabular-nums">${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-xs text-muted-foreground">{lineItems.length} line items</p>
        </div>
        <p className="text-xs text-optimal font-medium">→ Next step: Schedule Service</p>
      </div>
    );
  }

  // Sent — waiting for approval
  if (status === "sent") {
    return (
      <div className="space-y-4">
        {/* Step 4 complete */}
        <div className="flex items-center gap-2 text-sm font-medium text-optimal">
          <CheckCircle className="h-4 w-4" />
          <span>4. Sent to Customer</span>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50 space-y-3">
          <p className="text-xs text-optimal flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Sent to: {customerEmail}
          </p>
          <p className="text-xs text-muted-foreground">
            Sent: {sentAt ? format(new Date(sentAt), "MMM d, yyyy 'at' h:mm a") : "Just now"}
          </p>
          <div className="border-t border-border pt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-primary tabular-nums">${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-xs text-muted-foreground">{lineItems.length} line items</p>
        </div>

        {/* Waiting badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Badge className="bg-medium/15 text-medium border-medium/30 animate-estimate-pulse">
            Waiting on Approval
          </Badge>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleResendEmail}
            disabled={isResending}
          >
            {isResending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {isResending ? "Resending..." : "Resend Email"}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setManualApproveOpen(true)}
          >
            <UserCheck className="h-3.5 w-3.5" /> Approve Manually
          </Button>
        </div>

        {/* Manual Approval Dialog */}
        <AlertDialog open={manualApproveOpen} onOpenChange={setManualApproveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve this estimate manually?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the estimate as approved and advance the workflow to Schedule Service.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Approval notes (e.g., "Customer approved via phone call")
              </label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Customer approved via phone call…"
                className="min-h-[80px] text-sm"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleManualApprove}>Confirm Manual Approval</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Rate Sheet indicator */}
      {rateSheetPricing && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">
            Pricing from: {rateSheetPricing.rateSheetName}
          </span>
          {rateSheetPricing.matchedScope && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary ml-auto">
              {rateSheetPricing.matchedScope.scopeCode} — {rateSheetPricing.matchedScope.slaTier} SLA
            </Badge>
          )}
          {rateSheetPricing.volumeDiscount && (
            <Badge variant="secondary" className="text-[10px]">
              {rateSheetPricing.volumeDiscount.discountPercent}% vol. discount
            </Badge>
          )}
        </div>
      )}

      {/* Header info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-muted/30 rounded-lg p-3 border border-border/50 text-sm">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ticket</p>
          <p className="font-semibold text-foreground">#{ticket.ticketId}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer</p>
          <p className="font-semibold text-foreground">{ticket.customer.company || ticket.customer.name}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Charger</p>
          <p className="font-semibold text-foreground">
            {ticket.charger.serialNumber}{" "}
            <Badge variant="outline" className="ml-1 text-[10px]">
              {ticket.charger.type === "DC_L3" ? "DC L3" : "AC L2"}
            </Badge>
          </p>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Line Items</h3>
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
          {!isReadOnly && (
            <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/20">
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as EstimateLineItem["category"])}>
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
                <Plus className="h-3.5 w-3.5" /> Add Line Item
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2 bg-muted/30 rounded-lg p-3 border border-border/50">
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
                type="number" min={0} max={1} step={0.01}
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

      {/* Account Manager */}
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Account Manager</h3>
        <Select value={accountManager} onValueChange={setAccountManager}>
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
      </div>

      {/* Customer Email */}
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Customer Email</h3>
        <div className="flex items-center gap-3">
          <Input
            type="email"
            placeholder="customer@company.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="max-w-sm"
          />
          {customerEmail && !customerEmail.includes("@") && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Invalid email
            </span>
          )}
        </div>
      </div>

      {/* Additional Recipients */}
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Additional Recipients</h3>
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

      {/* Comments / Notes */}
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Comments</h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes, safety warnings, special instructions…"
          className="min-h-[80px] text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-1.5">
          <Save className="h-3.5 w-3.5" /> Save Draft
        </Button>
        <Button
          size="sm"
          onClick={handleSendEstimate}
          disabled={isSending}
          className="gap-1.5"
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {isSending ? "Sending..." : "Send for Approval"}
        </Button>
      </div>
    </div>
  );
}
