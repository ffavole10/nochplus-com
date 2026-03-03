import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Search, Info } from "lucide-react";
import { useQuoteRules, useCreateQuoteRule, useUpdateQuoteRule, useDeleteQuoteRule, type QuoteRule } from "@/hooks/useQuotingSettings";

const CONDITION_TYPES = [
  { value: "charger_type", label: "Charger Type" },
  { value: "charger_model", label: "Charger Model" },
  { value: "travel_distance", label: "Travel Distance" },
  { value: "customer_tier", label: "Customer Tier" },
  { value: "warranty_status", label: "Warranty Status" },
  { value: "charger_count", label: "Charger Count at Location" },
  { value: "time_of_service", label: "Time of Service" },
];

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "contains", label: "Contains" },
];

const ACTION_TYPES = [
  { value: "add_flat_fee", label: "Add flat fee" },
  { value: "apply_discount_percent", label: "Apply discount %" },
  { value: "set_rate_to", label: "Set rate to" },
  { value: "cap_markup_at", label: "Cap markup at" },
  { value: "multiply_by", label: "Multiply by" },
];

const RULE_CATEGORIES = ["Charger-Based", "Travel", "Subscription", "Warranty", "Volume"];

const CATEGORY_COLORS: Record<string, string> = {
  "Charger-Based": "bg-chart-1/15 text-chart-1 border-chart-1/20",
  "Travel": "bg-chart-2/15 text-chart-2 border-chart-2/20",
  "Subscription": "bg-chart-3/15 text-chart-3 border-chart-3/20",
  "Warranty": "bg-chart-4/15 text-chart-4 border-chart-4/20",
  "Volume": "bg-chart-5/15 text-chart-5 border-chart-5/20",
};

function formatCondition(rule: QuoteRule): string {
  const typeLabel = CONDITION_TYPES.find(t => t.value === rule.condition_type)?.label || rule.condition_type;
  const opLabel = OPERATORS.find(o => o.value === rule.condition_operator)?.label || rule.condition_operator;
  return `${typeLabel} ${opLabel} ${rule.condition_value}`;
}

function formatAction(rule: QuoteRule): string {
  const labels: Record<string, (v: string) => string> = {
    add_flat_fee: v => `Add $${v} fee`,
    apply_discount_percent: v => `Apply ${v}% discount`,
    set_rate_to: v => `Set rate to $${v}`,
    cap_markup_at: v => `Cap markup at ${v}%`,
    multiply_by: v => `Multiply by ${v}×`,
  };
  return labels[rule.action_type]?.(rule.action_value) || `${rule.action_type}: ${rule.action_value}`;
}

const emptyRule = {
  name: "", description: "", condition_type: "charger_type", condition_operator: "equals",
  condition_value: "", action_type: "add_flat_fee", action_value: "", category: "Charger-Based",
  priority: 1, is_active: true,
};

export function QuoteRulesTab() {
  const { data: rules = [], isLoading } = useQuoteRules();
  const createRule = useCreateQuoteRule();
  const updateRule = useUpdateQuoteRule();
  const deleteRule = useDeleteQuoteRule();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRule);

  const filtered = rules.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = rules.filter(r => r.is_active).length;
  const categoriesCount = new Set(rules.map(r => r.category)).size;

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyRule, priority: rules.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (rule: QuoteRule) => {
    setEditId(rule.id);
    setForm({
      name: rule.name, description: rule.description, condition_type: rule.condition_type,
      condition_operator: rule.condition_operator, condition_value: rule.condition_value,
      action_type: rule.action_type, action_value: rule.action_value, category: rule.category,
      priority: rule.priority, is_active: rule.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editId) {
      updateRule.mutate({ id: editId, ...form }, { onSuccess: () => setModalOpen(false) });
    } else {
      createRule.mutate(form, { onSuccess: () => setModalOpen(false) });
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Quote Rules</h2>
          <p className="text-sm text-muted-foreground">Conditional automation rules that fire during quote generation.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-[220px] h-9" placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-4 w-4" /> New Rule</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        {[
          { label: "Total Rules", value: rules.length },
          { label: "Active", value: activeCount },
          { label: "Inactive", value: rules.length - activeCount },
          { label: "Categories", value: categoriesCount },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="text-sm font-semibold text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Rule Name</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(rule => (
              <TableRow key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                <TableCell className="font-medium text-muted-foreground">{rule.priority}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium text-foreground">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{formatCondition(rule)}</TableCell>
                <TableCell className="text-sm">{formatAction(rule)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[rule.category] || ""}`}>{rule.category}</Badge>
                </TableCell>
                <TableCell>
                  <Switch checked={rule.is_active} onCheckedChange={v => updateRule.mutate({ id: rule.id, is_active: v })} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Rule</AlertDialogTitle><AlertDialogDescription>Delete "{rule.name}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteRule.mutate(rule.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Priority Order:</span> Rules are evaluated top-to-bottom. Higher priority rules execute first and can be overridden by the operator during quote review.
        </p>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Rule" : "New Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Rule Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Condition Type</Label>
                <Select value={form.condition_type} onValueChange={v => setForm(f => ({ ...f, condition_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONDITION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operator</Label>
                <Select value={form.condition_operator} onValueChange={v => setForm(f => ({ ...f, condition_operator: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Value</Label><Input value={form.condition_value} onChange={e => setForm(f => ({ ...f, condition_value: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Action Value</Label><Input value={form.action_value} onChange={e => setForm(f => ({ ...f, action_value: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RULE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Priority</Label><Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 1 }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v === true }))} />
              <Label htmlFor="active" className="text-sm">Rule is active immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createRule.isPending || updateRule.isPending}>{editId ? "Save Changes" : "Create Rule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
