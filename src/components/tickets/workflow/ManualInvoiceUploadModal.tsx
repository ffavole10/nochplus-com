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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload as UploadIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ServiceTicket } from "@/types/serviceTicket";

interface ManualInvoiceUploadModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ticket: ServiceTicket;
  file: File;
  onAttached: () => void;
}

export function ManualInvoiceUploadModal({
  open,
  onOpenChange,
  ticket,
  file,
  onAttached,
}: ManualInvoiceUploadModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [source, setSource] = useState<"QuickBooks" | "Stripe" | "Other">("QuickBooks");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const canSubmit =
    invoiceNumber.trim().length > 0 &&
    totalAmount.trim().length > 0 &&
    invoiceDate.length > 0 &&
    !saving;

  const handleAttach = async () => {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Upload PDF
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${ticket.ticketId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("ticket-invoices")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      const payload = {
        ticket_db_id: ticket.id,
        ticket_text_id: ticket.ticketId,
        invoice_number: invoiceNumber.trim(),
        total_amount: parseFloat(totalAmount) || 0,
        invoice_date: invoiceDate,
        source: "uploaded",
        source_label: source,
        status: "attached",
        notes: notes || null,
        pdf_path: path,
        created_by: userId,
      };
      const { error } = await supabase.from("ticket_invoices" as any).insert(payload);
      if (error) throw error;
      toast.success("Invoice attached");
      onAttached();
    } catch (e: any) {
      toast.error(e?.message || "Failed to attach invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadIcon className="h-4 w-4" />
            Attach Invoice · {ticket.ticketId}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {/* PDF preview */}
          <div className="border border-border rounded-md overflow-hidden bg-muted/30 min-h-[420px]">
            <object
              data={previewUrl}
              type="application/pdf"
              className="w-full h-[420px]"
              aria-label="Invoice PDF preview"
            >
              <div className="p-4 text-xs text-muted-foreground text-center">
                <p className="font-medium text-foreground mb-1">{file.name}</p>
                <p>Preview unavailable. The file will still be attached.</p>
              </div>
            </object>
          </div>

          {/* Metadata form */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="m-inv-num" className="text-xs">
                Invoice Number <span className="text-critical">*</span>
              </Label>
              <Input
                id="m-inv-num"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g., INV-2026-0042"
              />
            </div>
            <div>
              <Label htmlFor="m-total" className="text-xs">
                Total Amount (USD) <span className="text-critical">*</span>
              </Label>
              <Input
                id="m-total"
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="m-date" className="text-xs">
                Invoice Date <span className="text-critical">*</span>
              </Label>
              <Input
                id="m-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QuickBooks">QuickBooks</SelectItem>
                  <SelectItem value="Stripe">Stripe</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="m-notes" className="text-xs">Notes</Label>
              <Textarea
                id="m-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAttach} disabled={!canSubmit}>
            {saving ? "Attaching…" : "Attach Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
