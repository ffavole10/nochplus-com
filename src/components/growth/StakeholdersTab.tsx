import { useState } from "react";
import { useStakeholders, useCreateStakeholder, useUpdateStakeholder, useDeleteStakeholder } from "@/hooks/useStakeholders";
import { useGrowthUsers, useGrowthUserMap } from "@/hooks/useGrowthUsers";
import { STAKEHOLDER_ROLES, RELATIONSHIP_STATUSES, type Stakeholder } from "@/types/growth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { format } from "date-fns";

interface Props {
  partnerId: string;
}

const REL_COLORS: Record<string, string> = {
  Cold: "bg-slate-500/15 text-slate-700",
  Warm: "bg-amber-500/15 text-amber-700",
  Hot: "bg-orange-500/15 text-orange-700",
  Champion: "bg-emerald-500/15 text-emerald-700",
};

export function StakeholdersTab({ partnerId }: Props) {
  const { data: stakeholders = [], isLoading } = useStakeholders(partnerId);
  const { data: users = [] } = useGrowthUsers();
  const userMap = useGrowthUserMap();
  const create = useCreateStakeholder();
  const update = useUpdateStakeholder();
  const remove = useDeleteStakeholder();
  const { confirm: confirmDialog, dialogProps: confirmDialogProps } = useConfirmDialog();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [form, setForm] = useState<any>({
    name: "", title: "", email: "", phone: "",
    role: "Unknown", relationship_status: "Cold",
    owner_user_id: "", notes: "", last_touch_date: "",
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", title: "", email: "", phone: "", role: "Unknown", relationship_status: "Cold", owner_user_id: "", notes: "", last_touch_date: "" });
    setOpen(true);
  };

  const openEdit = (s: Stakeholder) => {
    setEditing(s);
    setForm({
      name: s.name, title: s.title || "", email: s.email || "", phone: s.phone || "",
      role: s.role, relationship_status: s.relationship_status,
      owner_user_id: s.owner_user_id || "", notes: s.notes || "",
      last_touch_date: s.last_touch_date || "",
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload: any = {
      partner_id: partnerId,
      name: form.name.trim(),
      title: form.title || null,
      email: form.email || null,
      phone: form.phone || null,
      role: form.role,
      relationship_status: form.relationship_status,
      owner_user_id: form.owner_user_id || null,
      notes: form.notes || null,
      last_touch_date: form.last_touch_date || null,
    };
    if (editing) {
      update.mutate({ id: editing.id, ...payload }, {
        onSuccess: () => { toast.success("Stakeholder updated"); setOpen(false); },
        onError: (e: any) => toast.error(e.message),
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Stakeholder added"); setOpen(false); },
        onError: (e: any) => toast.error(e.message),
      });
    }
  };

  const handleDelete = async (s: Stakeholder) => {
    const ok = await confirmDialog({
      title: "Delete stakeholder?",
      description: `Delete ${s.name}? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    remove.mutate({ id: s.id, partner_id: partnerId }, {
      onSuccess: () => toast.success("Stakeholder deleted", { description: `${s.name} has been removed.` }),
      onError: (e: any) => toast.error("Failed to delete stakeholder", { description: e?.message }),
    });
  };

  return (
    <Card>
      <ConfirmDialog {...confirmDialogProps} />
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold">Stakeholders</h3>
          <p className="text-xs text-muted-foreground">{stakeholders.length} {stakeholders.length === 1 ? "person" : "people"} mapped</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Add Stakeholder</Button>
      </div>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : stakeholders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No stakeholders yet. Map the people you know at this account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 px-4 font-medium">Name</th>
                  <th className="py-2 px-4 font-medium">Title</th>
                  <th className="py-2 px-4 font-medium">Role</th>
                  <th className="py-2 px-4 font-medium">Relationship</th>
                  <th className="py-2 px-4 font-medium">Contact</th>
                  <th className="py-2 px-4 font-medium">Owner</th>
                  <th className="py-2 px-4 font-medium">Last Touch</th>
                  <th className="py-2 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stakeholders.map(s => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{s.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{s.title || "—"}</td>
                    <td className="py-3 px-4"><Badge variant="outline" className="text-xs">{s.role}</Badge></td>
                    <td className="py-3 px-4"><Badge className={`text-xs ${REL_COLORS[s.relationship_status] || ""}`}>{s.relationship_status}</Badge></td>
                    <td className="py-3 px-4 text-xs">
                      <div>{s.email || "—"}</div>
                      <div className="text-muted-foreground">{s.phone || "—"}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">{s.owner_user_id ? (userMap[s.owner_user_id]?.display_name ?? "—") : "—"}</td>
                    <td className="py-3 px-4 text-xs">{s.last_touch_date ? format(new Date(s.last_touch_date), "MMM d, yyyy") : "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Stakeholder" : "Add Stakeholder"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAKEHOLDER_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Relationship Status</Label>
                <Select value={form.relationship_status} onValueChange={v => setForm({ ...form, relationship_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RELATIONSHIP_STATUSES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Owner</Label>
                <Select value={form.owner_user_id || "__none__"} onValueChange={v => setForm({ ...form, owner_user_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {users.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Last Touch Date</Label><Input type="date" value={form.last_touch_date} onChange={e => setForm({ ...form, last_touch_date: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
              {(create.isPending || update.isPending) && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
