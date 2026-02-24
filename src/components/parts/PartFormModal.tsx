import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PART_CATEGORIES, CHARGER_TYPES, MANUFACTURERS, type Part } from "@/hooks/useParts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part?: Part | null;
  onSave: (data: any) => void;
  isPending?: boolean;
}

const defaultForm = {
  part_number: "",
  part_name: "",
  description: "",
  category: "Electrical Components",
  charger_type: "AC | Level 2",
  manufacturer: "BTC",
  qty_in_stock: 0,
  reorder_point: 5,
  reorder_quantity: 10,
  location_bin: "",
  unit_cost: 0,
  supplier: "",
  supplier_part_number: "",
  lead_time_days: 7,
  compatible_swis: [] as string[],
  compatible_models: [] as string[],
  weight_lbs: 0,
  dimensions: "",
  notes: "",
  tags: [] as string[],
  active: true,
};

export function PartFormModal({ open, onOpenChange, part, onSave, isPending }: Props) {
  const [form, setForm] = useState(defaultForm);
  const [swiInput, setSwiInput] = useState("");
  const [modelInput, setModelInput] = useState("");

  useEffect(() => {
    if (part) {
      setForm({
        part_number: part.part_number,
        part_name: part.part_name,
        description: part.description || "",
        category: part.category,
        charger_type: part.charger_type,
        manufacturer: part.manufacturer,
        qty_in_stock: part.qty_in_stock,
        reorder_point: part.reorder_point,
        reorder_quantity: part.reorder_quantity,
        location_bin: part.location_bin || "",
        unit_cost: part.unit_cost,
        supplier: part.supplier || "",
        supplier_part_number: part.supplier_part_number || "",
        lead_time_days: part.lead_time_days || 7,
        compatible_swis: part.compatible_swis || [],
        compatible_models: part.compatible_models || [],
        weight_lbs: part.weight_lbs || 0,
        dimensions: part.dimensions || "",
        notes: part.notes || "",
        tags: part.tags || [],
        active: part.active,
      });
    } else {
      setForm(defaultForm);
    }
  }, [part, open]);

  const handleSubmit = () => {
    if (!form.part_number || !form.part_name) return;
    onSave(part ? { id: part.id, ...form } : form);
  };

  const addSwi = () => {
    if (swiInput.trim() && !form.compatible_swis.includes(swiInput.trim())) {
      setForm({ ...form, compatible_swis: [...form.compatible_swis, swiInput.trim()] });
      setSwiInput("");
    }
  };

  const addModel = () => {
    if (modelInput.trim() && !form.compatible_models.includes(modelInput.trim())) {
      setForm({ ...form, compatible_models: [...form.compatible_models, modelInput.trim()] });
      setModelInput("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{part ? "Edit Part" : "Add New Part"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6 py-2">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Part Number *</Label>
                  <Input value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value })} placeholder="BTC-PB-001" />
                </div>
                <div className="space-y-1">
                  <Label>Part Name *</Label>
                  <Input value={form.part_name} onChange={e => setForm({ ...form, part_name: e.target.value })} placeholder="Power Board Assembly" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PART_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Charger Type *</Label>
                  <Select value={form.charger_type} onValueChange={v => setForm({ ...form, charger_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CHARGER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Manufacturer *</Label>
                  <Select value={form.manufacturer} onValueChange={v => setForm({ ...form, manufacturer: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MANUFACTURERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Inventory</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label>Qty in Stock *</Label>
                  <Input type="number" value={form.qty_in_stock} onChange={e => setForm({ ...form, qty_in_stock: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Reorder Point *</Label>
                  <Input type="number" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Reorder Qty</Label>
                  <Input type="number" value={form.reorder_quantity} onChange={e => setForm({ ...form, reorder_quantity: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Location/Bin</Label>
                  <Input value={form.location_bin} onChange={e => setForm({ ...form, location_bin: e.target.value })} placeholder="Warehouse A" />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pricing</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label>Unit Cost *</Label>
                  <Input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Supplier</Label>
                  <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Supplier Part #</Label>
                  <Input value={form.supplier_part_number} onChange={e => setForm({ ...form, supplier_part_number: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Lead Time (days)</Label>
                  <Input type="number" value={form.lead_time_days} onChange={e => setForm({ ...form, lead_time_days: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Technical */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Technical</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Weight (lbs)</Label>
                  <Input type="number" step="0.1" value={form.weight_lbs} onChange={e => setForm({ ...form, weight_lbs: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Dimensions</Label>
                  <Input value={form.dimensions} onChange={e => setForm({ ...form, dimensions: e.target.value })} placeholder="12 × 8 × 3 inches" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Compatible SWIs</Label>
                <div className="flex gap-2">
                  <Input value={swiInput} onChange={e => setSwiInput(e.target.value)} placeholder="SWI-LVL2-091" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSwi())} />
                  <Button type="button" variant="outline" size="sm" onClick={addSwi}>Add</Button>
                </div>
                {form.compatible_swis.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.compatible_swis.map(s => (
                      <span key={s} className="text-xs bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                        {s}
                        <button onClick={() => setForm({ ...form, compatible_swis: form.compatible_swis.filter(x => x !== s) })} className="hover:text-destructive">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Compatible Models</Label>
                <div className="flex gap-2">
                  <Input value={modelInput} onChange={e => setModelInput(e.target.value)} placeholder="BTC Power L2-50" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addModel())} />
                  <Button type="button" variant="outline" size="sm" onClick={addModel}>Add</Button>
                </div>
                {form.compatible_models.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.compatible_models.map(m => (
                      <span key={m} className="text-xs bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                        {m}
                        <button onClick={() => setForm({ ...form, compatible_models: form.compatible_models.filter(x => x !== m) })} className="hover:text-destructive">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Additional */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Additional</h3>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                <Label>Active (available for estimates)</Label>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.part_number || !form.part_name}>
            {part ? "Save Changes" : "Add Part"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
