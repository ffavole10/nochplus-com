import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronRight, Pencil, Copy, Trash2, Plus, Search, Star, X } from "lucide-react";
import {
  useRateCards, useRateCardItems, useCreateRateCard, useUpdateRateCard, useDeleteRateCard, useUpsertRateCardItems,
  type RateCard, type RateCardItem,
} from "@/hooks/useQuotingSettings";

function formatRate(rate: number, unit: string) {
  if (rate === 0 && (unit === "flat" || unit === "/hr" || unit === "/mile")) return "Waived";
  if (unit === "%") return `${rate}%`;
  if (unit === "× multiplier") return `${rate}×`;
  if (unit === "/mile") return `$${rate}${unit}`;
  if (unit === "flat") return `$${rate.toLocaleString()}`;
  return `$${rate.toLocaleString()}${unit}`;
}

const CATEGORIES = ["Labor Rates", "Travel", "Service Fees"];

export function RateCardsTab() {
  const { data: cards = [], isLoading } = useRateCards();
  const { data: allItems = [] } = useRateCardItems();
  const createCard = useCreateRateCard();
  const updateCard = useUpdateRateCard();
  const deleteCard = useDeleteRateCard();
  const upsertItems = useUpsertRateCardItems();

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editCardId, setEditCardId] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCopyFrom, setNewCopyFrom] = useState("scratch");
  const [newDefault, setNewDefault] = useState(false);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editItems, setEditItems] = useState<Omit<RateCardItem, "id">[]>([]);

  const filtered = cards.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCard.mutate({
      name: newName, description: newDesc, is_default: newDefault,
      copyFromId: newCopyFrom !== "scratch" ? newCopyFrom : undefined,
    }, {
      onSuccess: () => { setCreateOpen(false); setNewName(""); setNewDesc(""); setNewCopyFrom("scratch"); setNewDefault(false); },
    });
  };

  const openEdit = (card: RateCard) => {
    setEditCardId(card.id);
    setEditName(card.name);
    setEditDesc(card.description);
    const items = allItems.filter(i => i.rate_card_id === card.id);
    setEditItems(items.map(({ id, ...rest }) => rest));
  };

  const handleSaveEdit = () => {
    if (!editCardId) return;
    updateCard.mutate({ id: editCardId, name: editName, description: editDesc });
    upsertItems.mutate({ rateCardId: editCardId, items: editItems }, {
      onSuccess: () => setEditCardId(null),
    });
  };

  const addEditItem = (category: string) => {
    const maxSort = editItems.filter(i => i.category === category).reduce((m, i) => Math.max(m, i.sort_order), 0);
    setEditItems([...editItems, { rate_card_id: editCardId!, category, label: "", rate: 0, unit: "flat", sort_order: maxSort + 1 }]);
  };

  const updateEditItem = (idx: number, field: string, value: any) => {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeEditItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const getLinkedCustomerCount = (cardId: string) => 0; // Placeholder

  if (isLoading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rate Cards</h2>
          <p className="text-sm text-muted-foreground">Named pricing templates that define standard rates for labor, travel, and service fees.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-[220px] h-9" placeholder="Search rate cards..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Rate Card
          </Button>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-2">
        {filtered.map(card => {
          const items = allItems.filter(i => i.rate_card_id === card.id);
          const isExpanded = expanded[card.id];
          return (
            <Card key={card.id} className="border-border/60">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(card.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{card.name}</span>
                    {card.is_default && <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">Default</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(card.updated_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(card)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    createCard.mutate({ name: card.name + " (Copy)", description: card.description, is_default: false, copyFromId: card.id });
                  }}><Copy className="h-3.5 w-3.5" /></Button>
                  {!card.is_default && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Rate Card</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{card.name}" and all its items. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteCard.mutate(card.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
              {isExpanded && (
                <CardContent className="pt-0 pb-4">
                  <div className="grid grid-cols-3 gap-4">
                    {CATEGORIES.map(cat => {
                      const catItems = items.filter(i => i.category === cat).sort((a, b) => a.sort_order - b.sort_order);
                      return (
                        <div key={cat} className="rounded-lg border border-border/60 p-3">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h4>
                          <div className="space-y-1.5">
                            {catItems.map(item => (
                              <div key={item.id} className="flex items-center justify-between text-sm">
                                <span className="text-foreground">{item.label}</span>
                                <span className="font-medium text-foreground">{formatRate(item.rate, item.unit)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Rate Card</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Card Name *</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Premium Service Rates" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="When this card applies..." /></div>
            <div className="space-y-2">
              <Label>Base Template</Label>
              <Select value={newCopyFrom} onValueChange={setNewCopyFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scratch">Start from scratch</SelectItem>
                  {cards.map(c => <SelectItem key={c.id} value={c.id}>Copy from: {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="default" checked={newDefault} onCheckedChange={v => setNewDefault(v === true)} />
              <Label htmlFor="default" className="text-sm">Set as default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createCard.isPending}>Create Rate Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editCardId} onOpenChange={open => { if (!open) setEditCardId(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Rate Card</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Card Name</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Description</Label><Input value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
            </div>
            {CATEGORIES.map(cat => {
              const catItems = editItems.map((item, idx) => ({ ...item, _idx: idx })).filter(i => i.category === cat).sort((a, b) => a.sort_order - b.sort_order);
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">{cat}</h4>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addEditItem(cat)}><Plus className="h-3 w-3" /> Add Item</Button>
                  </div>
                  <div className="space-y-2">
                    {catItems.map(item => (
                      <div key={item._idx} className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-center">
                        <Input className="h-8 text-sm" value={item.label} onChange={e => updateEditItem(item._idx, "label", e.target.value)} placeholder="Label" />
                        <Input className="h-8 text-sm" type="number" value={item.rate} onChange={e => updateEditItem(item._idx, "rate", parseFloat(e.target.value) || 0)} />
                        <Select value={item.unit} onValueChange={v => updateEditItem(item._idx, "unit", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["/hr", "/mile", "flat", "× multiplier", "%"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeEditItem(item._idx)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCardId(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateCard.isPending || upsertItems.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
