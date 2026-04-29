import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Plus, Trash2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ServiceTicket } from "@/types/serviceTicket";
import type { RelatedWorkOrder } from "@/hooks/useEntityRelations";

interface NeuralOsInvoiceModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ticket: ServiceTicket;
  workOrder?: RelatedWorkOrder;
  onAttached: () => void;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

const DEFAULT_LABOR_RATE = 145;
const DEFAULT_TRAVEL_RATE = 95;
const DEFAULT_TAX_RATE = 0.0875;

function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `NOCH-INV-${year}-${rnd.toString().padStart(4, "0")}`;
}

export function NeuralOsInvoiceModal({
  open,
  onOpenChange,
  ticket,
  workOrder,
  onAttached,
}: NeuralOsInvoiceModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber());
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Pre-populate seed line items from ticket + work order
  const seededItems = useMemo<LineItem[]>(() => {
    const items: LineItem[] = [];
    // Labor
    const hours = (workOrder as any)?.actual_hours ?? 4;
    items.push({
      description: `Labor — ${ticket.issue?.description || "On-site service"}`,
      quantity: hours,
      unit_price: DEFAULT_LABOR_RATE,
    });
    // Travel
    items.push({
      description: "Travel time",
      quantity: 1,
      unit_price: DEFAULT_TRAVEL_RATE,
    });
    // Parts placeholder
    items.push({
      description: "Parts (per work order)",
      quantity: 1,
      unit_price: 0,
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrder?.id, ticket.id]);

  const [lineItems, setLineItems] = useState<LineItem[]>(seededItems);

  useEffect(() => {
    setLineItems(seededItems);
  }, [seededItems]);

  const subtotal = lineItems.reduce(
    (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
    0,
  );
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, ...patch } : li)));
  };
  const removeItem = (idx: number) => setLineItems((prev) => prev.filter((_, i) => i !== idx));
  const addItem = () =>
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);

  const customer = ticket.customer;
  const billToText = customer
    ? [customer.name, customer.company].filter(Boolean).join(" — ")
    : "—";

  const persist = async (status: "draft" | "attached") => {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const payload = {
        ticket_db_id: ticket.id,
        ticket_text_id: ticket.ticketId,
        invoice_number: invoiceNumber,
        total_amount: total,
        invoice_date: invoiceDate,
        source: "neural_os",
        source_label: "Neural OS",
        status,
        line_items: lineItems as any,
        notes: notes || null,
        bill_to: { display: billToText } as any,
        tax_rate: taxRate,
        subtotal,
        tax_amount: taxAmount,
        confidence_score: "—",
        created_by: userRes.user?.id ?? null,
      };
      const { error } = await supabase.from("ticket_invoices" as any).insert(payload);
      if (error) throw error;
      toast.success(status === "draft" ? "Draft saved" : "Invoice attached");
      onAttached();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-600" />
            Neural OS Invoice Draft · {ticket.ticketId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="inv-num" className="text-xs">Invoice Number</Label>
              <Input
                id="inv-num"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="inv-date" className="text-xs">Date</Label>
              <Input
                id="inv-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Bill to:</span>{" "}
              <span className="font-medium text-foreground">{billToText}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ticket:</span>{" "}
              <span className="font-mono text-foreground">{ticket.ticketId}</span>
              {ticket.issue?.description && (
                <span className="text-muted-foreground"> · {ticket.issue.description}</span>
              )}
            </div>
          </div>

          {/* Line items table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Line Items
              </Label>
              <Button size="sm" variant="outline" className="gap-1.5 h-7" onClick={addItem}>
                <Plus className="h-3 w-3" />
                Add line item
              </Button>
            </div>
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2 font-medium">Description</th>
                    <th className="text-right p-2 font-medium w-20">Qty</th>
                    <th className="text-right p-2 font-medium w-28">Unit Price</th>
                    <th className="text-right p-2 font-medium w-28">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, idx) => {
                    const lineTotal = (Number(li.quantity) || 0) * (Number(li.unit_price) || 0);
                    return (
                      <tr key={idx} className="border-t border-border">
                        <td className="p-1.5">
                          <Input
                            value={li.description}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            step="0.25"
                            value={li.quantity}
                            onChange={(e) =>
                              updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })
                            }
                            className="h-7 text-xs text-right"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={li.unit_price}
                            onChange={(e) =>
                              updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })
                            }
                            className="h-7 text-xs text-right"
                          />
                        </td>
                        <td className="p-1.5 text-right font-medium tabular-nums">
                          ${lineTotal.toFixed(2)}
                        </td>
                        <td className="p-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => removeItem(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>
                  Tax (
                  <Input
                    type="number"
                    step="0.001"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="inline-block w-16 h-6 mx-1 text-xs text-right"
                  />
                  )
                </span>
                <span className="tabular-nums">${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
                <span>Total</span>
                <span className="tabular-nums">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="inv-notes" className="text-xs">Notes</Label>
            <Textarea
              id="inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for the customer or internal team"
              className="text-sm"
            />
          </div>

          {/* Attribution */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
            <Badge
              variant="outline"
              className="text-[10px] font-normal lowercase bg-teal-500/5 text-teal-600 border-teal-500/20 gap-1"
            >
              <Brain className="h-2.5 w-2.5" />
              drafted by neural os
            </Badge>
            <span>· Confidence: —</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => persist("draft")} disabled={saving}>
            Save as Draft
          </Button>
          <Button onClick={() => persist("attached")} disabled={saving} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Confirm & Attach
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
