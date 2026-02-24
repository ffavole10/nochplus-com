import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Part } from "@/hooks/useParts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: Part | null;
  mode: "add" | "use";
  onConfirm: (data: { quantity: number; reason: string; notes?: string; ticketId?: string }) => void;
  isPending?: boolean;
}

const ADD_REASONS = ["Purchase Order Received", "Inventory Correction", "Transfer from Other Location", "Return from Field", "Other"];
const USE_REASONS = ["Service Ticket", "Warranty Replacement", "Inventory Adjustment", "Lost/Damaged", "Other"];

export function StockAdjustModal({ open, onOpenChange, part, mode, onConfirm, isPending }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState(mode === "add" ? ADD_REASONS[0] : USE_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [ticketId, setTicketId] = useState("");

  if (!part) return null;

  const reasons = mode === "add" ? ADD_REASONS : USE_REASONS;
  const maxUse = mode === "use" ? part.qty_in_stock : 9999;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Stock" : "Use Stock"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">{part.part_name} ({part.part_number})</p>
            <p className="text-muted-foreground">Current Stock: {part.qty_in_stock} units</p>
          </div>

          <div className="space-y-1">
            <Label>Quantity *</Label>
            <Input
              type="number"
              min={1}
              max={maxUse}
              value={quantity}
              onChange={e => setQuantity(Math.min(Number(e.target.value), maxUse))}
            />
            {mode === "use" && (
              <p className="text-xs text-muted-foreground">
                After: {part.qty_in_stock} → {Math.max(0, part.qty_in_stock - quantity)} units
              </p>
            )}
            {mode === "add" && (
              <p className="text-xs text-muted-foreground">
                After: {part.qty_in_stock} → {part.qty_in_stock + quantity} units
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reason *</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reasons.map(r => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem value={r} id={`reason-${r}`} />
                  <Label htmlFor={`reason-${r}`} className="text-sm cursor-pointer">{r}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {mode === "use" && reason === "Service Ticket" && (
            <div className="space-y-1">
              <Label>Ticket ID</Label>
              <Input value={ticketId} onChange={e => setTicketId(e.target.value)} placeholder="T-12345" />
            </div>
          )}

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => onConfirm({ quantity, reason, notes, ticketId: ticketId || undefined })}
            disabled={isPending || quantity < 1}
          >
            {mode === "add" ? "Add to Inventory" : "Use Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
