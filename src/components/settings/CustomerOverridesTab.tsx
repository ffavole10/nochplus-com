import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, Trash2, Plus, Search, Info, X } from "lucide-react";
import {
  useCustomerOverrides, useCreateCustomerOverride, useUpdateCustomerOverride, useDeleteCustomerOverride,
  useRateCards, useRateCardItems, type CustomerOverride, type RateCardItem,
} from "@/hooks/useQuotingSettings";
import { useCustomers } from "@/hooks/useCustomers";

export function CustomerOverridesTab() {
  const { data: overrides = [], isLoading } = useCustomerOverrides();
  const { data: cards = [] } = useRateCards();
  const { data: allItems = [] } = useRateCardItems();
  const { data: dbCustomers = [] } = useCustomers();
  const createOverride = useCreateCustomerOverride();
  const updateOverride = useUpdateCustomerOverride();
  const deleteOverride = useDeleteCustomerOverride();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_name: "", rate_card_id: "", override_items: [] as any[], notes: "" });

  const filtered = overrides.filter(o =>
    o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    o.notes.toLowerCase().includes(search.toLowerCase())
  );

  const getCardName = (id: string) => cards.find(c => c.id === id)?.name || "Unknown";

  const openCreate = () => {
    setEditId(null);
    setForm({ customer_name: "", rate_card_id: cards[0]?.id || "", override_items: [], notes: "" });
    setModalOpen(true);
  };

  const openEdit = (o: CustomerOverride) => {
    setEditId(o.id);
    setForm({ customer_name: o.customer_name, rate_card_id: o.rate_card_id, override_items: o.override_items || [], notes: o.notes });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.customer_name.trim() || !form.rate_card_id) return;
    if (editId) {
      updateOverride.mutate({ id: editId, ...form }, { onSuccess: () => setModalOpen(false) });
    } else {
      createOverride.mutate(form, { onSuccess: () => setModalOpen(false) });
    }
  };

  const addOverrideItem = () => {
    setForm(f => ({ ...f, override_items: [...f.override_items, { label: "", override_rate: 0, notes: "" }] }));
  };

  const updateOverrideItem = (idx: number, field: string, value: any) => {
    setForm(f => ({
      ...f,
      override_items: f.override_items.map((item: any, i: number) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  const removeOverrideItem = (idx: number) => {
    setForm(f => ({ ...f, override_items: f.override_items.filter((_: any, i: number) => i !== idx) }));
  };

  if (isLoading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Customer Overrides</h2>
          <p className="text-sm text-muted-foreground">Per-customer rate card assignments and specific rate adjustments.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-[220px] h-9" placeholder="Search overrides..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-4 w-4" /> New Override</Button>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Linked Rate Card</TableHead>
              <TableHead>Overrides</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(o => (
              <TableRow key={o.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{o.customer_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{o.customer_name}</span>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{getCardName(o.rate_card_id)}</Badge></TableCell>
                <TableCell className="text-sm text-foreground">{(o.override_items || []).length}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{o.notes || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(o)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Override</AlertDialogTitle><AlertDialogDescription>Delete override for "{o.customer_name}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteOverride.mutate(o.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Customer overrides inherit from their linked Rate Card and only modify specific line items. Unmodified rates fall back to the card defaults.
        </p>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Override" : "New Override"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Customer Name *</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="e.g. GreenCharge Networks" /></div>
            <div className="space-y-2">
              <Label>Rate Card *</Label>
              <Select value={form.rate_card_id} onValueChange={v => setForm(f => ({ ...f, rate_card_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select rate card" /></SelectTrigger>
                <SelectContent>{cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Override Items</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addOverrideItem}><Plus className="h-3 w-3" /> Add Override</Button>
              </div>
              {form.override_items.map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_1fr_28px] gap-2 items-center">
                  <Input className="h-8 text-sm" placeholder="Label" value={item.label} onChange={e => updateOverrideItem(idx, "label", e.target.value)} />
                  <Input className="h-8 text-sm" type="number" placeholder="Rate" value={item.override_rate} onChange={e => updateOverrideItem(idx, "override_rate", parseFloat(e.target.value) || 0)} />
                  <Input className="h-8 text-sm" placeholder="Notes" value={item.notes} onChange={e => updateOverrideItem(idx, "notes", e.target.value)} />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeOverrideItem(idx)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Summary of customizations..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createOverride.isPending || updateOverride.isPending}>{editId ? "Save Changes" : "Create Override"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
