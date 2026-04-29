import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDeal, useUpdateDeal, useDeleteDeal, useUpdateDealStage } from "@/hooks/useDeals";
import { useCustomers } from "@/hooks/useCustomers";
import { useGrowthUsers } from "@/hooks/useGrowthUsers";
import { useActivities, useCreateActivity } from "@/hooks/useActivities";
import { useAccountOpsSnapshot } from "@/hooks/useAccountOpsSnapshot";
import { useAgentOutputs, useGenerateScribeBrief, useGeneratePlaceholderOutput } from "@/hooks/useAgentOutputs";
import { DEAL_STAGES, DEAL_STAGE_COLORS, ACTIVITY_TYPES, LOSS_REASONS, LOSS_REASON_LABELS, validateStageTransition, type DealStage, type ActivityType } from "@/types/growth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CustomerLogo } from "@/components/CustomerLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Save, Trash2, Plus, Phone, Mail, Calendar, Users as UsersIcon, MessageSquare, Brain, FileText, TrendingUp, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

const TYPE_ICONS: Record<ActivityType, any> = {
  Call: Phone, Email: Mail, Meeting: Calendar, LinkedIn: UsersIcon, InPerson: UsersIcon, Other: MessageSquare,
};

export default function GrowthDealDetail() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(dealId);
  const { data: customers = [] } = useCustomers();
  const { data: users = [] } = useGrowthUsers();
  const { data: activities = [] } = useActivities({ dealId });
  const update = useUpdateDeal();
  const remove = useDeleteDeal();
  const createActivity = useCreateActivity();
  const updateStage = useUpdateDealStage();
  const { data: ops } = useAccountOpsSnapshot(deal?.partner_id);
  const { data: agentOutputs = [] } = useAgentOutputs(dealId);
  const generateBrief = useGenerateScribeBrief();
  const generatePlaceholder = useGeneratePlaceholderOutput();

  const partner = customers.find(c => c.id === deal?.partner_id);
  usePageTitle(deal?.deal_name || "Deal");

  const [form, setForm] = useState<any>({});
  const [activityOpen, setActivityOpen] = useState(false);
  const [actForm, setActForm] = useState<any>({ type: "Call", summary: "", outcome: "", next_step: "", next_step_date: "" });

  // Stage change confirm
  const [pendingStage, setPendingStage] = useState<DealStage | null>(null);
  const [pendingLoss, setPendingLoss] = useState<string>("");

  useEffect(() => {
    if (deal) {
      setForm({
        deal_name: deal.deal_name,
        description: deal.description || "",
        stage: deal.stage,
        value: deal.value,
        probability: deal.probability,
        next_action: deal.next_action || "",
        next_action_date: deal.next_action_date || "",
        expected_close_date: deal.expected_close_date || "",
        owner_user_id: deal.owner_user_id || "",
        owner: (deal as any).owner || "",
        predicted_close_date: (deal as any).predicted_close_date || "",
        predicted_arr: (deal as any).predicted_arr || "",
        notes: (deal as any).notes || "",
      });
    }
  }, [deal]);

  const handleStageSelect = (newStage: DealStage) => {
    if (!deal) return;
    if (newStage === deal.stage) return;
    const err = validateStageTransition({ ...deal, ...form } as any, newStage);
    if (err) { toast.error(err); return; }
    setPendingStage(newStage);
    setPendingLoss("");
  };

  const confirmStageChange = () => {
    if (!deal || !pendingStage) return;
    const extra: Record<string, any> = { last_activity_at: new Date().toISOString() };
    if (pendingStage === "Closed Lost") {
      if (!pendingLoss) { toast.error("Loss reason required."); return; }
      extra.loss_reason = pendingLoss;
    }
    updateStage.mutate({
      id: deal.id,
      stage: pendingStage,
      partner_id: deal.partner_id,
      extra,
    }, {
      onSuccess: () => {
        toast.success(`Moved to "${pendingStage}"`);
        setForm((f: any) => ({ ...f, stage: pendingStage }));
        setPendingStage(null);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleSave = () => {
    if (!deal) return;
    update.mutate({
      id: deal.id,
      deal_name: form.deal_name,
      description: form.description || null,
      value: Number(form.value) || 0,
      probability: Number(form.probability) || 0,
      next_action: form.next_action || null,
      next_action_date: form.next_action_date || null,
      expected_close_date: form.expected_close_date || null,
      predicted_close_date: form.predicted_close_date || null,
      predicted_arr: Number(form.predicted_arr) || 0,
      owner: form.owner || null,
      owner_user_id: form.owner_user_id || null,
      notes: form.notes || null,
      last_activity_at: new Date().toISOString(),
    } as any, {
      onSuccess: () => toast.success("Deal updated"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleDelete = () => {
    if (!deal) return;
    if (!confirm(`Delete deal "${deal.deal_name}"? This cannot be undone.`)) return;
    remove.mutate({ id: deal.id }, {
      onSuccess: () => {
        toast.success("Deal deleted");
        navigate("/growth/pipeline");
      },
    });
  };

  const handleLogActivity = () => {
    if (!deal) return;
    if (!actForm.summary.trim()) { toast.error("Summary required"); return; }
    createActivity.mutate({
      partner_id: deal.partner_id,
      deal_id: deal.id,
      type: actForm.type,
      summary: actForm.summary,
      outcome: actForm.outcome || null,
      next_step: actForm.next_step || null,
      next_step_date: actForm.next_step_date || null,
    } as any, {
      onSuccess: () => {
        toast.success("Activity logged");
        setActivityOpen(false);
        setActForm({ type: "Call", summary: "", outcome: "", next_step: "", next_step_date: "" });
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!deal) return <div className="p-6 text-center text-muted-foreground">Deal not found.<div><Button variant="link" onClick={() => navigate("/growth/pipeline")}>← Back to Pipeline</Button></div></div>;

  const daysInStage = differenceInDays(new Date(), new Date(deal.updated_at));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/growth/pipeline")}><ArrowLeft className="h-5 w-5" /></Button>
        {partner && <CustomerLogo logoUrl={partner.logo_url} companyName={partner.company} size="lg" />}
        <div className="flex-1 min-w-0">
          <button onClick={() => partner && navigate(`/partners/${partner.id}`)} className="text-xs text-muted-foreground hover:text-primary hover:underline">
            {partner?.company || "Unknown account"}
          </button>
          <h1 className="text-2xl font-bold">{deal.deal_name}</h1>
        </div>
        <Badge variant="outline" className={DEAL_STAGE_COLORS[deal.stage]}>{deal.stage}</Badge>
        <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Edit Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Deal Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5"><Label className="text-xs">Deal Name</Label><Input value={form.deal_name || ""} onChange={e => setForm({ ...form, deal_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea rows={3} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Stage</Label>
                  <Select value={form.stage} onValueChange={v => handleStageSelect(v as DealStage)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
                <div className="space-y-1.5"><Label className="text-xs">Owner (text)</Label><Input value={form.owner || ""} onChange={e => setForm({ ...form, owner: e.target.value })} placeholder="e.g. Alex Rivera" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Value ($)</Label><Input type="number" value={form.value || ""} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Predicted ARR ($)</Label><Input type="number" value={form.predicted_arr || ""} onChange={e => setForm({ ...form, predicted_arr: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Predicted Close</Label><Input type="date" value={form.predicted_close_date || ""} onChange={e => setForm({ ...form, predicted_close_date: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Expected Close</Label><Input type="date" value={form.expected_close_date || ""} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Next Action</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5"><Label className="text-xs">Action</Label><Input value={form.next_action || ""} onChange={e => setForm({ ...form, next_action: e.target.value })} placeholder="e.g. Send proposal to champion" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" value={form.next_action_date || ""} onChange={e => setForm({ ...form, next_action_date: e.target.value })} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Activity Feed</CardTitle>
              <Button size="sm" onClick={() => setActivityOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" />Log Activity</Button>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No activity logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map(a => {
                    const Icon = TYPE_ICONS[a.type];
                    return (
                      <div key={a.id} className="flex gap-3 pb-3 border-b border-border/50 last:border-0">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{a.type}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(a.activity_date), "MMM d, yyyy h:mm a")}</span>
                          </div>
                          <p className="text-sm mt-0.5">{a.summary}</p>
                          {a.outcome && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Outcome:</span> {a.outcome}</p>}
                          {a.next_step && <p className="text-xs text-primary mt-1"><span className="font-medium">Next:</span> {a.next_step}{a.next_step_date && ` (${format(new Date(a.next_step_date), "MMM d")})`}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Live Ops Snapshot */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Zap className="h-4 w-4 text-primary" />Live Ops Snapshot</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-xs">
              {ops ? (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Chargers</span><span className="font-semibold">{ops.charger_count}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Sites</span><span className="font-semibold">{ops.sites_count}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Incidents (30d)</span><span className="font-semibold">{ops.incidents_30d}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Uptime</span><span className="font-semibold">{Number(ops.uptime_pct).toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Truck rolls (30d)</span><span className="font-semibold">{ops.truck_rolls_30d}</span></div>
                  <div className="pt-2 border-t flex justify-between"><span className="text-muted-foreground">Est. monthly savings</span><span className="font-bold text-primary">${Number(ops.estimated_monthly_savings).toLocaleString()}</span></div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-2">No ops data yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Agent Outputs */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Brain className="h-4 w-4 text-primary" />Agent Outputs</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <div className="flex flex-col gap-1.5">
                <Button size="sm" variant="outline" className="justify-start gap-1.5" onClick={() => generateBrief.mutate(deal.id, { onSuccess: () => toast.success("Brief generated"), onError: (e: any) => toast.error(e.message) })} disabled={generateBrief.isPending}>
                  {generateBrief.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                  Generate Brief (Scribe)
                </Button>
                {(deal.stage === "Proposal Out" || deal.stage === "In Negotiation" || deal.stage === "Closed Won") && (
                  <Button size="sm" variant="outline" className="justify-start gap-1.5" onClick={() => generatePlaceholder.mutate({ dealId: deal.id, agent: "closer" }, { onSuccess: () => toast.success("Closer queued (placeholder)") })} disabled={generatePlaceholder.isPending}>
                    <FileText className="h-3 w-3" />Generate Proposal Draft (Closer)
                  </Button>
                )}
                <Button size="sm" variant="outline" className="justify-start gap-1.5" onClick={() => generatePlaceholder.mutate({ dealId: deal.id, agent: "forecaster" }, { onSuccess: () => toast.success("Forecast queued (placeholder)") })} disabled={generatePlaceholder.isPending}>
                  <TrendingUp className="h-3 w-3" />Refresh Forecast
                </Button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pt-2 border-t">
                {agentOutputs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No agent outputs yet.</p>
                ) : agentOutputs.map(o => (
                  <div key={o.id} className="text-xs p-2 rounded bg-muted/30 border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-[10px] uppercase">{o.agent_name}</Badge>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(o.generated_at), "MMM d, h:mm a")}</span>
                    </div>
                    <p className="whitespace-pre-wrap line-clamp-[12]">{(o.content as any)?.markdown || JSON.stringify(o.content)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="text-xs text-muted-foreground">Days in current stage</div>
              <div className="text-2xl font-bold">{daysInStage}</div>
              <div className="text-xs text-muted-foreground pt-2">Created</div>
              <div className="text-sm font-medium">{format(new Date(deal.created_at), "MMM d, yyyy")}</div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={update.isPending} className="w-full gap-1.5">
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Stage change confirm */}
      <Dialog open={!!pendingStage} onOpenChange={(o) => !o && setPendingStage(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Move deal to "{pendingStage}"?</DialogTitle></DialogHeader>
          {pendingStage === "Closed Lost" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Loss Reason *</Label>
              <Select value={pendingLoss} onValueChange={setPendingLoss}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {LOSS_REASONS.map(r => <SelectItem key={r} value={r}>{LOSS_REASON_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStage(null)}>Cancel</Button>
            <Button onClick={confirmStageChange} disabled={updateStage.isPending}>
              {updateStage.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Activity Modal */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={actForm.type} onValueChange={v => setActForm({ ...actForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Summary *</Label><Textarea rows={2} value={actForm.summary} onChange={e => setActForm({ ...actForm, summary: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Outcome</Label><Textarea rows={2} placeholder="What did you secure from this interaction?" value={actForm.outcome} onChange={e => setActForm({ ...actForm, outcome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Next Step</Label><Input value={actForm.next_step} onChange={e => setActForm({ ...actForm, next_step: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Next Step Date</Label><Input type="date" value={actForm.next_step_date} onChange={e => setActForm({ ...actForm, next_step_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityOpen(false)}>Cancel</Button>
            <Button onClick={handleLogActivity} disabled={createActivity.isPending}>
              {createActivity.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}Log Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
