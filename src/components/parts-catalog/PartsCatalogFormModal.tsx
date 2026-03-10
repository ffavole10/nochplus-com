import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PartsCatalogItem } from "@/hooks/usePartsCatalog";

const CATEGORIES = ["Labor", "Hardware", "Cable", "Module", "Electrical", "Travel", "Other"];
const UNITS = ["each", "hr", "ft", "lot", "set", "flat", "hours"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: PartsCatalogItem | null;
  onSave: (data: Partial<PartsCatalogItem>) => void;
  isPending?: boolean;
}

export function PartsCatalogFormModal({ open, onOpenChange, item, onSave, isPending }: Props) {
  const [description, setDescription] = useState(item?.description || "");
  const [partNumber, setPartNumber] = useState(item?.part_number || "");
  const [category, setCategory] = useState(item?.category || "");
  const [unitPrice, setUnitPrice] = useState(item?.unit_price ?? 0);
  const [unit, setUnit] = useState(item?.unit || "each");
  const [manufacturer, setManufacturer] = useState(item?.manufacturer || "");
  const [notes, setNotes] = useState(item?.notes || "");

  // Reset form when item changes
  useState(() => {
    setDescription(item?.description || "");
    setPartNumber(item?.part_number || "");
    setCategory(item?.category || "");
    setUnitPrice(item?.unit_price ?? 0);
    setUnit(item?.unit || "each");
    setManufacturer(item?.manufacturer || "");
    setNotes(item?.notes || "");
  });

  const handleSubmit = () => {
    if (!description.trim()) return;
    onSave({
      ...(item ? { id: item.id } : {}),
      description: description.trim(),
      part_number: partNumber.trim() || null,
      category: category || null,
      unit_price: unitPrice,
      unit: unit || "each",
      manufacturer: manufacturer.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Part" : "Add Part"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Description *</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Labor — EVSE certified field technician" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Part Number</Label>
              <Input value={partNumber} onChange={e => setPartNumber(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Unit Price *</Label>
              <Input type="number" step="0.01" min={0} value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Manufacturer</Label>
              <Input value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !description.trim()}>
            {item ? "Save Changes" : "Add Part"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
