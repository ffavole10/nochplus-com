import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/formatters";
import { useDeals, useCreateDeal } from "@/hooks/useDeals";
import { useGrowthUsers, useGrowthUserMap } from "@/hooks/useGrowthUsers";
import { DEAL_STAGES, DEAL_STAGE_COLORS, type DealStage } from "@/types/growth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  partnerId: string;
}

export function DealsTab({ partnerId }: Props) {
  const navigate = useNavigate();
  const { data: deals = [], isLoading } = useDeals(partnerId);
  const { data: users = [] } = useGrowthUsers();
  const userMap = useGrowthUserMap();
  const create = useCreateDeal();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    deal_name: "", description: "", stage: "Account Mapped" as DealStage,
    value: "", probability: 10, next_action: "", next_action_date: "",
    expected_close_date: "", owner_user_id: "",
  });

  const handleSubmit = () => {
    if (!form.deal_name.trim()) { toast.error("Deal name required"); return; }
    create.mutate({
      partner_id: partnerId,
      deal_name: form.deal_name.trim(),
      description: form.description || null,
      stage: form.stage,
      value: Number(form.value) || 0,
      probability: Number(form.probability) || 0,
      next_action: form.next_action || null,
      next_action_date: form.next_action_date || null,
      expected_close_date: form.expected_close_date || null,
      owner_user_id: form.owner_user_id || null,
    } as any, {
      onSuccess: () => {
        toast.success("Deal created");
        setOpen(false);
        setForm({ deal_name: "", description: "", stage: "Account Mapped", value: "", probability: 10, next_action: "", next_action_date: "", expected_close_date: "", owner_user_id: "" });
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <Card>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold">Deals</h3>
          <p className="text-xs text-muted-foreground">{deals.length} {deals.length === 1 ? "deal" : "deals"} on this account</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Add Deal</Button>
      </div>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : deals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No deals yet. Create your first opportunity.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 px-4 font-medium">Deal</th>
                  <th className="py-2 px-4 font-medium">Stage</th>
                  <th className="py-2 px-4 font-medium text-right">Value</th>
                  <th className="py-2 px-4 font-medium text-right">Prob.</th>
                  <th className="py-2 px-4 font-medium">Next Action</th>
                  <th className="py-2 px-4 font-medium">Owner</th>
                  <th className="py-2 px-4 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {deals.map(d => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/growth/deals/${d.id}`)}>
                    <td className="py-3 px-4 font-medium">{d.deal_name}</td>
                    <td className="py-3 px-4"><Badge variant="outline" className={`text-xs ${DEAL_STAGE_COLORS[d.stage]}`}>{d.stage}</Badge></td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(Number(d.value))}</td>
                    <td className="py-3 px-4 text-right">{d.probability}%</td>
                    <td className="py-3 px-4 text-xs">
                      <div>{d.next_action || "—"}</div>
                      {d.next_action_date && <div className="text-muted-foreground">{format(new Date(d.next_action_date), "MMM d")}</div>}
                    </td>
                    <td className="py-3 px-4 text-xs">{d.owner_user_id ? (userMap[d.owner_user_id]?.display_name ?? "—") : "—"}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{format(new Date(d.updated_at), "MMM d")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Deal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Deal Name *</Label><Input value={form.deal_name} onChange={e => setForm({ ...form, deal_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Stage</Label>
                <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Value ($)</Label><Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Probability (%)</Label><Input type="number" min={0} max={100} value={form.probability} onChange={e => setForm({ ...form, probability: e.target.value })} /></div>
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
              <div className="space-y-1.5"><Label className="text-xs">Next Action</Label><Input value={form.next_action} onChange={e => setForm({ ...form, next_action: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Next Action Date</Label><Input type="date" value={form.next_action_date} onChange={e => setForm({ ...form, next_action_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Expected Close</Label><Input type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}Create Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
