import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDeal, useUpdateDeal, useDeleteDeal, useUpdateDealStage } from "@/hooks/useDeals";
import { useCustomers } from "@/hooks/useCustomers";
import { useGrowthUsers } from "@/hooks/useGrowthUsers";
import { useActivities, useCreateActivity } from "@/hooks/useActivities";
import { useAccountOpsSnapshot } from "@/hooks/useAccountOpsSnapshot";
import { useAgentOutputs, useGenerateScribeBrief, useGeneratePlaceholderOutput } from "@/hooks/useAgentOutputs";
import {
  DEAL_STAGES, DEAL_STAGE_COLORS, LOSS_REASONS, LOSS_REASON_LABELS,
  validateStageTransition, relationshipContext, type DealStage, type AgentOutput,
  type ChargerRelationshipType,
} from "@/types/growth";
import { LinkChargersModal } from "@/components/business/LinkChargersModal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CustomerLogo } from "@/components/CustomerLogo";
import { CustomerTypeBadge } from "@/components/business/CustomerTypeBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Loader2, Trash2, Pencil, Zap, ExternalLink, Brain, FileText,
  TrendingUp, AlertTriangle, Copy, Info, ChevronRight, Clock, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const SIGNAL_BADGE: Record<string, string> = {
  none: "bg-muted text-muted-foreground border-muted",
  weak: "bg-amber-50 text-amber-700 border-amber-300",
  moderate: "bg-orange-50 text-orange-700 border-orange-300",
  strong: "bg-emerald-50 text-emerald-700 border-emerald-300",
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

  const partner = customers.find((c) => c.id === deal?.partner_id);
  usePageTitle(deal?.deal_name || "Deal");

  // Stage change confirm
  const [pendingStage, setPendingStage] = useState<DealStage | null>(null);
  const [pendingLoss, setPendingLoss] = useState<string>("");

  // Edit deal modal
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<any>({});

  // Activity quick-add
  const [noteText, setNoteText] = useState("");
  const [activityLimit, setActivityLimit] = useState(10);

  // Brief tab
  const [briefTab, setBriefTab] = useState<"scribe" | "closer" | "forecaster">("scribe");

  // Link chargers modal
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    if (deal) {
      setForm({
        deal_name: deal.deal_name,
        description: deal.description || "",
        value: deal.value,
        next_action: deal.next_action || "",
        next_action_date: deal.next_action_date || "",
        owner_user_id: deal.owner_user_id || "",
        owner: (deal as any).owner || "",
        predicted_close_date: (deal as any).predicted_close_date || "",
        predicted_arr: (deal as any).predicted_arr || "",
        notes: (deal as any).notes || "",
        competitor: (deal as any).competitor || "",
      });
    }
  }, [deal]);

  const latestScribe = useMemo<AgentOutput | undefined>(
    () => agentOutputs.find((o) => o.agent_name === "scribe" && o.output_type === "brief"),
    [agentOutputs],
  );
  const latestCloser = useMemo<AgentOutput | undefined>(
    () => agentOutputs.find((o) => o.agent_name === "closer"),
    [agentOutputs],
  );
  const latestForecast = useMemo<AgentOutput | undefined>(
    () => agentOutputs.find((o) => o.agent_name === "forecaster"),
    [agentOutputs],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!deal) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Deal not found.
        <div>
          <Button variant="link" onClick={() => navigate("/business/pipeline")}>← Back to Pipeline</Button>
        </div>
      </div>
    );
  }

  const ownerLabel =
    (deal as any).owner ||
    (deal.owner_user_id ? users.find((u) => u.user_id === deal.owner_user_id)?.display_name : null) ||
    "Unassigned";

  const handleStageSelect = (newStage: DealStage) => {
    if (newStage === deal.stage) return;
    const err = validateStageTransition(deal as any, newStage);
    if (err) { toast.error(err); return; }
    setPendingStage(newStage);
    setPendingLoss("");
  };

  const confirmStageChange = () => {
    if (!pendingStage) return;
    const extra: Record<string, any> = { last_activity_at: new Date().toISOString() };
    if (pendingStage === "Closed Lost") {
      if (!pendingLoss) { toast.error("Loss reason required."); return; }
      extra.loss_reason = pendingLoss;
    }
    updateStage.mutate(
      { id: deal.id, stage: pendingStage, partner_id: deal.partner_id, extra },
      {
        onSuccess: () => { toast.success(`Moved to "${pendingStage}"`); setPendingStage(null); },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const handleSaveEdit = () => {
    update.mutate(
      {
        id: deal.id,
        deal_name: form.deal_name,
        description: form.description || null,
        value: Number(form.value) || 0,
        next_action: form.next_action || null,
        next_action_date: form.next_action_date || null,
        predicted_close_date: form.predicted_close_date || null,
        expected_close_date: form.predicted_close_date || null,
        predicted_arr: Number(form.predicted_arr) || 0,
        owner: form.owner || null,
        owner_user_id: form.owner_user_id || null,
        notes: form.notes || null,
        competitor: form.competitor || null,
        last_activity_at: new Date().toISOString(),
      } as any,
      {
        onSuccess: () => { toast.success("Deal updated"); setEditOpen(false); },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const handleDelete = () => {
    if (!confirm(`Delete deal "${deal.deal_name}"? This cannot be undone.`)) return;
    remove.mutate({ id: deal.id }, {
      onSuccess: () => { toast.success("Deal deleted"); navigate("/business/pipeline"); },
    });
  };

  const handleAddNote = () => {
    if (!noteText.trim()) { toast.error("Note cannot be empty."); return; }
    createActivity.mutate(
      { partner_id: deal.partner_id, deal_id: deal.id, type: "Other", summary: noteText.trim() } as any,
      {
        onSuccess: () => {
          // Update last_activity_at on the deal
          update.mutate({ id: deal.id, last_activity_at: new Date().toISOString() } as any);
          toast.success("Note added");
          setNoteText("");
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const handleGenerateBrief = () => {
    generateBrief.mutate(deal.id, {
      onSuccess: ({ parseFailed }) => {
        if (parseFailed) {
          toast.warning("Brief generated but couldn't be parsed. Saved as raw text.");
        } else {
          toast.success("Scribe brief generated");
        }
      },
      onError: (e: any) =>
        toast.error("Scribe couldn't generate the brief. Check API key or try again.", {
          description: e?.message,
        }),
    });
  };

  const closerEnabled = deal.stage === "Proposal Out" || deal.stage === "In Negotiation" || deal.stage === "Closed Won";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ════════ Breadcrumb ════════ */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/business/pipeline" className="hover:text-primary">Pipeline</Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          to={partner ? `/business/accounts/${partner.id}` : "/business/accounts"}
          className="hover:text-primary truncate max-w-[200px]"
        >
          {partner?.company || "Unknown account"}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate font-medium text-foreground">{deal.deal_name}</span>
      </div>

      {/* ════════ A. Header ════════ */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/business/pipeline")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {partner && <CustomerLogo logoUrl={partner.logo_url} companyName={partner.company} size="lg" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold truncate">{partner?.company || "Unknown"}</h1>
                <CustomerTypeBadge
                  type={(partner as any)?.customer_type}
                  typeOther={(partner as any)?.customer_type_other}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{deal.deal_name}</p>
              <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
                <Meta label="Value" value={`$${Number(deal.value || 0).toLocaleString()}`} accent="text-primary" />
                <Meta
                  label="Predicted Close"
                  value={(deal as any).predicted_close_date
                    ? format(new Date((deal as any).predicted_close_date), "MMM d, yyyy")
                    : "—"}
                />
                <Meta label="Owner" value={ownerLabel} />
                <Meta label="Days in stage" value={`${differenceInDays(new Date(), new Date((deal as any).last_activity_at || deal.updated_at))}d`} />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={deal.stage} onValueChange={(v) => handleStageSelect(v as DealStage)}>
                <SelectTrigger className={cn("w-44", DEAL_STAGE_COLORS[deal.stage])}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />Edit Deal
              </Button>
              <Button variant="outline" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ════════ B. Live Ops Snapshot ════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />Live Ops Snapshot
              </CardTitle>
              {ops && ops.charger_count > 0 && partner && (
                <p className="text-xs text-muted-foreground mt-1">
                  {relationshipContext(
                    partner.company,
                    ops.relationship_types as ChargerRelationshipType[] | undefined,
                    ops.charger_count,
                    ops.sites_count,
                  ) || `Showing ${ops.charger_count} chargers across ${ops.sites_count} sites`}
                </p>
              )}
            </div>
            {partner && (
              <Link
                to={`/operations/tickets?customer=${encodeURIComponent(partner.company)}`}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                View customer in Operations <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {ops && ops.charger_count > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <OpsTile label="Chargers" value={String(ops.charger_count)} sub={`across ${ops.sites_count} sites`} />
              <OpsTile
                label="Incidents (30d)"
                value={String(ops.incidents_30d)}
                accent={incidentClass(ops.incidents_30d, ops.charger_count)}
              />
              <OpsTile label="Truck rolls (30d)" value={String(ops.truck_rolls_30d)} />
              <OpsTile
                label={
                  <span className="inline-flex items-center gap-1">
                    Uptime (estimated)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px] text-xs z-[2000]">
                          Estimated from service ticket data. Will update with OCPP telemetry.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                }
                value={`${Number(ops.uptime_pct ?? 100).toFixed(1)}%`}
              />
              <OpsTile
                label="Est. NOCH+ savings"
                value={`~$${Number(ops.estimated_monthly_savings || 0).toLocaleString()}/mo`}
                accent="text-emerald-700"
              />
              <OpsTile label="Sites" value={String(ops.sites_count)} />
            </div>
          ) : (
            <div className="py-2 space-y-2">
              <p className="text-sm text-muted-foreground italic">
                No ops data yet — this customer isn't linked to any chargers in the NOCH+ system.
              </p>
              {partner && (
                <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Link chargers to this customer
                </Button>
              )}
            </div>
          )}
          {ops && ops.charger_count > 0 && partner && (
            <div className="mt-3 pt-3 border-t">
              <Button size="sm" variant="ghost" onClick={() => setLinkOpen(true)} className="gap-1.5 text-xs h-7">
                <Plus className="h-3 w-3" /> Link more chargers
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {partner && (
        <LinkChargersModal
          open={linkOpen}
          onOpenChange={setLinkOpen}
          customerId={partner.id}
          customerName={partner.company}
        />
      )}

      {/* ════════ C. Agent Intelligence ════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />Agent Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={briefTab} onValueChange={(v) => setBriefTab(v as any)}>
            <TabsList>
              <TabsTrigger value="scribe" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Account Brief</TabsTrigger>
              <TabsTrigger value="closer" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Proposal Draft</TabsTrigger>
              <TabsTrigger value="forecaster" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Forecast</TabsTrigger>
            </TabsList>

            {/* Scribe */}
            <TabsContent value="scribe" className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Button onClick={handleGenerateBrief} disabled={generateBrief.isPending} className="gap-1.5">
                  {generateBrief.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Scribe thinking...</>
                  ) : latestScribe ? (
                    <><FileText className="h-3.5 w-3.5" />Regenerate Brief</>
                  ) : (
                    <><FileText className="h-3.5 w-3.5" />Generate Brief</>
                  )}
                </Button>
                {latestScribe && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Generated {formatDistanceToNow(new Date(latestScribe.generated_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              {latestScribe ? <ScribeBriefView output={latestScribe} /> : (
                <p className="text-sm text-muted-foreground italic py-6 text-center border border-dashed rounded">
                  No brief yet. Click "Generate Brief" to have Scribe analyze this account.
                </p>
              )}
            </TabsContent>

            {/* Closer */}
            <TabsContent value="closer" className="mt-4">
              {!closerEnabled ? (
                <p className="text-sm text-muted-foreground italic py-6 text-center border border-dashed rounded">
                  Available when deal reaches Proposal Out stage.
                </p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Button
                      onClick={() => generatePlaceholder.mutate(
                        { dealId: deal.id, agent: "closer" },
                        { onSuccess: () => toast.success("Closer scaffolded — placeholder row inserted") },
                      )}
                      disabled={generatePlaceholder.isPending}
                      className="gap-1.5"
                    >
                      {generatePlaceholder.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Generate Proposal Draft
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1.5">Coming soon — currently scaffolded only.</p>
                  </div>
                  {latestCloser && (
                    <div className="text-xs p-3 rounded bg-muted/30 border">
                      <div className="text-muted-foreground mb-1">
                        Last placeholder: {format(new Date(latestCloser.generated_at), "MMM d, yyyy h:mm a")}
                      </div>
                      <p className="italic">{(latestCloser.content as any)?.markdown || "—"}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Forecaster */}
            <TabsContent value="forecaster" className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <ForecastTile label="Deal Health" value={(deal as any).deal_health || "—"} />
                <ForecastTile
                  label="Close Probability"
                  value={(deal as any).model_close_probability != null
                    ? `${(deal as any).model_close_probability}%`
                    : "—"}
                />
                <ForecastTile label="Primary Risk" value={(deal as any).competitor || "—"} />
                <ForecastTile label="Recommended" value={deal.next_action || "—"} />
              </div>
              <Button
                onClick={() => generatePlaceholder.mutate(
                  { dealId: deal.id, agent: "forecaster" },
                  { onSuccess: () => toast.success("Forecast scaffolded — placeholder row inserted") },
                )}
                disabled={generatePlaceholder.isPending}
                className="gap-1.5"
              >
                {generatePlaceholder.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Refresh Forecast
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">Coming soon — currently scaffolded only.</p>
              {latestForecast && (
                <div className="text-xs p-3 rounded bg-muted/30 border mt-3">
                  <div className="text-muted-foreground mb-1">
                    Last placeholder: {format(new Date(latestForecast.generated_at), "MMM d, yyyy h:mm a")}
                  </div>
                  <p className="italic">{(latestForecast.content as any)?.markdown || "—"}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ════════ D. Activity Timeline ════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a note about this deal..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote(); }}
              className="flex-1"
            />
            <Button onClick={handleAddNote} disabled={createActivity.isPending} className="gap-1.5">
              {createActivity.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Note
            </Button>
          </div>

          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 italic">No activity logged yet.</p>
          ) : (
            <>
              <div className="space-y-3">
                {activities.slice(0, activityLimit).map((a) => (
                  <div key={a.id} className="flex gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-0.5">
                      <Brain className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{a.type}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(a.activity_date), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap">{a.summary}</p>
                      {a.outcome && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Outcome:</span> {a.outcome}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {activities.length > activityLimit && (
                <button
                  onClick={() => setActivityLimit((n) => n + 10)}
                  className="text-xs text-primary hover:underline"
                >
                  Load more ({activities.length - activityLimit} remaining)
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ════════ E. Deal Meta ════════ */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <Meta label="Predicted Close" value={(deal as any).predicted_close_date ? format(new Date((deal as any).predicted_close_date), "MMM d, yyyy") : "—"} />
          <Meta label="Predicted ARR" value={`$${Number((deal as any).predicted_arr || 0).toLocaleString()}`} />
          <Meta label="Created" value={format(new Date(deal.created_at), "MMM d, yyyy")} />
          <Meta label="Last updated" value={format(new Date(deal.updated_at), "MMM d, yyyy h:mm a")} />
          {deal.stage === "Closed Lost" && (deal as any).loss_reason && (
            <Meta label="Loss Reason" value={LOSS_REASON_LABELS[(deal as any).loss_reason as keyof typeof LOSS_REASON_LABELS]} accent="text-rose-600" />
          )}
          {(deal as any).competitor && (
            <Meta label="Competitor" value={(deal as any).competitor} />
          )}
        </CardContent>
      </Card>

      {/* ════════ Stage change confirm dialog ════════ */}
      <Dialog open={!!pendingStage} onOpenChange={(o) => !o && setPendingStage(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Move deal to "{pendingStage}"?</DialogTitle></DialogHeader>
          {pendingStage === "Closed Lost" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Loss Reason *</Label>
              <Select value={pendingLoss} onValueChange={setPendingLoss}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {LOSS_REASONS.map((r) => <SelectItem key={r} value={r}>{LOSS_REASON_LABELS[r]}</SelectItem>)}
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

      {/* ════════ Edit Deal dialog ════════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Deal</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Deal Name</Label>
              <Input value={form.deal_name || ""} onChange={(e) => setForm({ ...form, deal_name: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Value ($)</Label>
              <Input type="number" value={form.value || ""} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Predicted ARR ($)</Label>
              <Input type="number" value={form.predicted_arr || ""} onChange={(e) => setForm({ ...form, predicted_arr: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Predicted Close Date</Label>
              <Input type="date" value={form.predicted_close_date || ""} onChange={(e) => setForm({ ...form, predicted_close_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Owner</Label>
              <Input value={form.owner || ""} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="e.g. Alex Rivera" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Next Action</Label>
              <Input value={form.next_action || ""} onChange={(e) => setForm({ ...form, next_action: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Competitor</Label>
              <Input value={form.competitor || ""} onChange={(e) => setForm({ ...form, competitor: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={3} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ════════════ Helpers ════════════ */

function Meta({ label, value, accent = "" }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className={cn("text-sm font-medium mt-0.5", accent)}>{value}</p>
    </div>
  );
}

function OpsTile({ label, value, sub, accent = "" }: { label: React.ReactNode; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-lg border p-3 bg-muted/20">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className={cn("text-lg font-bold mt-1 tabular-nums", accent)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ForecastTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-semibold mt-1 capitalize truncate" title={value}>{value}</p>
    </div>
  );
}

function incidentClass(incidents: number, chargers: number): string {
  if (chargers <= 0) return "";
  const ratio = incidents / chargers;
  if (ratio < 0.3) return "text-emerald-600";
  if (ratio <= 0.7) return "text-amber-600";
  return "text-rose-600";
}

/* ════════════ Scribe Brief renderer ════════════ */

function ScribeBriefView({ output }: { output: AgentOutput }) {
  const c = output.content as any;
  // Fallback: parse-failed brief saved as raw text
  if (c?.parse_failed && c?.raw_text) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" /> Brief couldn't be parsed as structured JSON. Showing raw text.
        </div>
        <pre className="prose prose-sm max-w-none whitespace-pre-wrap p-4 rounded bg-muted/20 border text-xs">
          {c.raw_text}
        </pre>
      </div>
    );
  }
  // Backward-compat: legacy briefs stored markdown
  if (c?.markdown && !c?.headline) {
    return (
      <div className="prose prose-sm max-w-none whitespace-pre-wrap p-4 rounded bg-muted/20 border">
        {c.markdown}
      </div>
    );
  }

  const signal = (c?.buying_signal_flag || "none") as keyof typeof SIGNAL_BADGE;

  const copyAsText = () => {
    const lines: string[] = [];
    lines.push(c.headline || "");
    if (signal !== "none") lines.push(`Buying signal: ${signal}${c.buying_signal_reason ? " — " + c.buying_signal_reason : ""}`);
    if (c.ops_reality) lines.push("\nOps Reality:\n" + c.ops_reality);
    if (c.where_we_stand) lines.push("\nWhere We Stand:\n" + c.where_we_stand);
    if (c.open_questions?.length) lines.push("\nOpen Questions:\n" + c.open_questions.map((q: string) => `• ${q}`).join("\n"));
    if (c.risks?.length) lines.push("\nRisks:\n" + c.risks.map((r: string) => `• ${r}`).join("\n"));
    if (c.recommended_next_action) lines.push("\nRecommended Next Action:\n" + c.recommended_next_action);
    if (c.talking_points?.length) lines.push("\nTalking Points:\n" + c.talking_points.map((t: string) => `• ${t}`).join("\n"));
    navigator.clipboard.writeText(lines.join("\n")).then(() => toast.success("Copied to clipboard"));
  };

  return (
    <div className="space-y-4 border rounded-lg p-5 bg-gradient-to-br from-muted/10 to-transparent">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-bold text-base leading-snug">{c.headline}</p>
          {signal !== "none" && c.buying_signal_flag && (
            <Badge variant="outline" className={cn("mt-2 capitalize", SIGNAL_BADGE[signal])}>
              Buying signal: {signal}{c.buying_signal_reason ? ` — ${c.buying_signal_reason}` : ""}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={copyAsText} className="gap-1.5 shrink-0">
          <Copy className="h-3 w-3" />Copy as text
        </Button>
      </div>

      {c.ops_reality && (
        <Section title="Ops Reality"><p className="text-sm">{c.ops_reality}</p></Section>
      )}
      {c.where_we_stand && (
        <Section title="Where We Stand"><p className="text-sm">{c.where_we_stand}</p></Section>
      )}
      {c.open_questions?.length > 0 && (
        <Section title="Open Questions">
          <ul className="text-sm space-y-1 list-disc pl-5">
            {c.open_questions.map((q: string, i: number) => <li key={i}>{q}</li>)}
          </ul>
        </Section>
      )}
      {c.risks?.length > 0 && (
        <Section title="Risks" icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}>
          <ul className="text-sm space-y-1 list-disc pl-5 marker:text-rose-600">
            {c.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
          </ul>
        </Section>
      )}
      {c.recommended_next_action && (
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
          <p className="text-[10px] uppercase tracking-wide text-primary font-bold mb-1">
            Recommended Next Action
          </p>
          <p className="text-sm font-medium">{c.recommended_next_action}</p>
        </div>
      )}
      {c.talking_points?.length > 0 && (
        <Section title="Talking Points">
          <ul className="text-sm space-y-1 list-disc pl-5">
            {c.talking_points.map((t: string, i: number) => <li key={i}>{t}</li>)}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-1.5 inline-flex items-center gap-1">
        {icon}{title}
      </p>
      {children}
    </div>
  );
}
