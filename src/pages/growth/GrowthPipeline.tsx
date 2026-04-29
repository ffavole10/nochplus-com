import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useDeals, useUpdateDealStage, useCreateDeal } from "@/hooks/useDeals";
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { useGrowthUsers, useGrowthUserMap } from "@/hooks/useGrowthUsers";
import { useAccountOpsSnapshots } from "@/hooks/useAccountOpsSnapshot";
import { useLatestScribeBriefs } from "@/hooks/useAgentOutputs";
import { DealOpsBadge } from "@/components/business/DealOpsBadge";
import { DealEconomicsFields, emptyEconomics, economicsToPayload, type DealEconomicsForm } from "@/components/business/DealEconomicsFields";
import { DEAL_STAGES, DEAL_STAGE_COLORS, LOSS_REASONS, LOSS_REASON_LABELS, validateStageTransition, type DealStage, type Deal } from "@/types/growth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CustomerLogo } from "@/components/CustomerLogo";
import { CustomerTypeBadge, CUSTOMER_TYPE_OPTIONS, type CustomerType } from "@/components/business/CustomerTypeBadge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { LayoutGrid, List, Search, TrendingUp, Loader2, Plus, Zap, AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function daysInStage(deal: Deal): number {
  const ref = deal.last_activity_at || deal.updated_at;
  return Math.max(0, differenceInDays(new Date(), new Date(ref)));
}

function ageColor(days: number) {
  if (days < 14) return "text-emerald-600 border-emerald-300 bg-emerald-50";
  if (days <= 30) return "text-amber-600 border-amber-300 bg-amber-50";
  return "text-rose-600 border-rose-300 bg-rose-50";
}

export default function GrowthPipeline() {
  usePageTitle("Pipeline");
  const navigate = useNavigate();
  const { data: deals = [], isLoading } = useDeals();
  const { data: customers = [] } = useCustomers();
  const { data: users = [] } = useGrowthUsers();
  const userMap = useGrowthUserMap();
  const { data: opsMap = {} } = useAccountOpsSnapshots();
  const { data: briefMap = {} } = useLatestScribeBriefs();
  const updateStage = useUpdateDealStage();
  const createDeal = useCreateDeal();
  const createCustomer = useCreateCustomer();

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");

  // Stage move dialog
  const [pendingMove, setPendingMove] = useState<{ deal: Deal; newStage: DealStage } | null>(null);
  const [moveNote, setMoveNote] = useState("");
  const [pendingLossReason, setPendingLossReason] = useState<string>("");

  // Add Deal dialog
  const [addOpen, setAddOpen] = useState(false);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    new_company: "",
    new_contact: "",
    new_email: "",
    new_customer_type: "" as CustomerType | "",
    new_customer_type_other: "",
    new_website: "",
    deal_name: "",
    stage: "Account Mapped" as DealStage,
    value: "",
    predicted_close_date: "",
    predicted_arr: "",
    owner: "",
    next_action: "",
    notes: "",
  });

  const customerMap = useMemo(() => {
    const m: Record<string, typeof customers[number]> = {};
    customers.forEach(c => { m[c.id] = c; });
    return m;
  }, [customers]);

  const filtered = useMemo(() => {
    return deals.filter(d => {
      if (accountFilter !== "all" && d.partner_id !== accountFilter) return false;
      if (ownerFilter !== "all" && d.owner_user_id !== ownerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const partner = customerMap[d.partner_id];
        if (!d.deal_name.toLowerCase().includes(q) && !(partner?.company.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [deals, accountFilter, ownerFilter, search, customerMap]);

  const dealsByStage = useMemo(() => {
    const map: Record<DealStage, Deal[]> = Object.fromEntries(DEAL_STAGES.map(s => [s, [] as Deal[]])) as any;
    filtered.forEach(d => { map[d.stage]?.push(d); });
    return map;
  }, [filtered]);

  const stageTotals = useMemo(() => {
    const map: Record<DealStage, { count: number; value: number }> = Object.fromEntries(
      DEAL_STAGES.map(s => [s, { count: 0, value: 0 }])
    ) as any;
    filtered.forEach(d => {
      map[d.stage].count++;
      map[d.stage].value += Number(d.value || 0);
    });
    return map;
  }, [filtered]);

  // ============ Insights ============
  const insights = useMemo(() => {
    const open = deals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
    const totalPipelineValue = open.reduce((s, d) => s + Number(d.value || 0), 0);
    const atRisk = open.filter(d => daysInStage(d) > 30 || d.deal_health === "at_risk" || d.deal_health === "critical" || d.deal_health === "stalled").length;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const closedThisMonth = deals.filter(d => {
      const close = d.actual_close_date || d.updated_at;
      return (d.stage === "Closed Won" || d.stage === "Closed Lost") && new Date(close) >= monthStart;
    });
    const wonThisMonth = closedThisMonth.filter(d => d.stage === "Closed Won").length;
    const lostThisMonth = closedThisMonth.filter(d => d.stage === "Closed Lost").length;
    const ninetyAgo = new Date(); ninetyAgo.setDate(ninetyAgo.getDate() - 90);
    const recentlyClosed = deals.filter(d => (d.stage === "Closed Won" || d.stage === "Closed Lost") && new Date(d.actual_close_date || d.updated_at) >= ninetyAgo);
    const won90 = recentlyClosed.filter(d => d.stage === "Closed Won").length;
    const winRate = recentlyClosed.length === 0 ? 0 : Math.round((won90 / recentlyClosed.length) * 100);

    // Avg days in stage across all open deals
    const avgDaysInStage = open.length === 0 ? 0 : Math.round(open.reduce((s, d) => s + daysInStage(d), 0) / open.length);

    return { totalPipelineValue, atRisk, wonThisMonth, lostThisMonth, winRate, avgDaysInStage };
  }, [deals]);

  const maxStageValue = Math.max(1, ...DEAL_STAGES.map(s => stageTotals[s].value));

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const deal = deals.find(d => d.id === draggableId);
    if (!deal) return;
    const newStage = destination.droppableId as DealStage;
    const err = validateStageTransition(deal, newStage);
    if (err) {
      toast.error(err);
      return;
    }
    setPendingMove({ deal, newStage });
    setMoveNote("");
    setPendingLossReason("");
  };

  const confirmMove = () => {
    if (!pendingMove) return;
    const extra: Record<string, any> = { last_activity_at: new Date().toISOString() };
    if (pendingMove.newStage === "Closed Lost") {
      if (!pendingLossReason) { toast.error("Loss reason required."); return; }
      extra.loss_reason = pendingLossReason;
    }
    updateStage.mutate({
      id: pendingMove.deal.id,
      stage: pendingMove.newStage,
      note: moveNote,
      partner_id: pendingMove.deal.partner_id,
      extra,
    }, {
      onSuccess: () => {
        toast.success(`Deal moved to "${pendingMove.newStage}"`);
        setPendingMove(null);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const resetForm = () => {
    setForm({
      customer_id: "", new_company: "", new_contact: "", new_email: "", new_customer_type: "", new_customer_type_other: "", new_website: "",
      deal_name: "", stage: "Account Mapped", value: "", predicted_close_date: "", predicted_arr: "", owner: "", next_action: "", notes: "",
    });
    setCustomerMode("existing");
  };

  const handleAddDeal = async () => {
    if (!form.deal_name.trim()) { toast.error("Deal name required"); return; }
    let customerId = form.customer_id;
    try {
      if (customerMode === "new") {
        if (!form.new_company.trim() || !form.new_contact.trim() || !form.new_email.trim()) {
          toast.error("New customer requires company, contact, and email."); return;
        }
        if (form.new_customer_type === "other" && !form.new_customer_type_other.trim()) {
          toast.error("Specify the customer type."); return;
        }
        const created = await createCustomer.mutateAsync({
          company: form.new_company.trim(),
          contact_name: form.new_contact.trim(),
          email: form.new_email.trim(),
          customer_type: form.new_customer_type || null,
          customer_type_other: form.new_customer_type === "other" ? form.new_customer_type_other.trim() : null,
          website_url: form.new_website.trim() || "",
        } as any);
        customerId = created.id;
      }
      if (!customerId) { toast.error("Select or create a customer."); return; }
      await createDeal.mutateAsync({
        partner_id: customerId,
        deal_name: form.deal_name.trim(),
        stage: form.stage,
        value: Number(form.value) || 0,
        predicted_close_date: form.predicted_close_date || null,
        expected_close_date: form.predicted_close_date || null,
        predicted_arr: Number(form.predicted_arr) || 0,
        owner: form.owner.trim() || null,
        next_action: form.next_action.trim() || null,
        notes: form.notes.trim() || null,
        last_activity_at: new Date().toISOString(),
      } as any);
      toast.success("Deal created");
      setAddOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Failed to create deal");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Pipeline</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { resetForm(); setAddOpen(true); }} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />Add Deal
          </Button>
          <Tabs value={view} onValueChange={v => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="kanban" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Kanban</TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5"><List className="h-3.5 w-3.5" />List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ============ Pipeline Insights ============ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <InsightTile label="Pipeline Value" value={`$${insights.totalPipelineValue.toLocaleString()}`} accent="text-primary" />
        <InsightTile label="Avg Days in Stage" value={`${insights.avgDaysInStage}d`} />
        <InsightTile label="At Risk" value={String(insights.atRisk)} accent={insights.atRisk > 0 ? "text-rose-600" : ""} icon={insights.atRisk > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : undefined} />
        <InsightTile label="Won (this month)" value={String(insights.wonThisMonth)} accent="text-emerald-600" />
        <InsightTile label="Lost (this month)" value={String(insights.lostThisMonth)} accent="text-rose-600" />
        <InsightTile label="Win Rate (90d)" value={`${insights.winRate}%`} accent="text-primary" />
      </div>

      {/* Stage value bar chart */}
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Pipeline by Stage</p>
        <div className="space-y-2">
          {DEAL_STAGES.map(stage => {
            const t = stageTotals[stage];
            const pct = (t.value / maxStageValue) * 100;
            return (
              <div key={stage} className="flex items-center gap-3 text-xs">
                <div className="w-40 truncate font-medium">{stage}</div>
                <div className="flex-1 h-5 bg-muted rounded relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-primary/70" style={{ width: `${pct}%` }} />
                </div>
                <div className="w-32 text-right tabular-nums text-muted-foreground">
                  {t.count} · ${t.value.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search deals or accounts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Account" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Owner" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {users.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.display_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : view === "kanban" ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {DEAL_STAGES.map(stage => (
              <div key={stage} className="flex-shrink-0 w-72">
                <div className="mb-2 px-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">{stage}</h3>
                    <Badge variant="secondary" className="text-[10px]">{stageTotals[stage].count}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">${stageTotals[stage].value.toLocaleString()}</p>
                </div>
                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[60vh] p-2 rounded-lg space-y-2 transition-colors ${
                        snapshot.isDraggingOver ? "bg-primary/5 border border-primary/30" : "bg-muted/30"
                      }`}
                    >
                      {dealsByStage[stage].map((deal, index) => {
                        const partner = customerMap[deal.partner_id];
                        const ops = opsMap[deal.partner_id];
                        const days = daysInStage(deal);
                        return (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(prov, snap) => (
                              <Card
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={`p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all group ${
                                  snap.isDragging ? "shadow-lg rotate-1" : ""
                                }`}
                                onClick={() => navigate(`/business/pipeline/${deal.id}`)}
                              >
                                <div className="flex items-start gap-2 mb-2">
                                  {partner && <CustomerLogo logoUrl={partner.logo_url} companyName={partner.company} size="sm" />}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-muted-foreground truncate flex items-center gap-1.5">
                                      <span className="truncate">{partner?.company || "Unknown"}</span>
                                      <CustomerTypeBadge type={(partner as any)?.customer_type} typeOther={(partner as any)?.customer_type_other} />
                                    </p>
                                    <p className="text-sm font-semibold truncate">{deal.deal_name}</p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-bold text-primary">${Number(deal.value).toLocaleString()}</span>
                                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", ageColor(days))}>{days}d in stage</span>
                                </div>
                                {deal.next_action && (
                                  <p className="text-xs text-foreground line-clamp-2 mb-2">{deal.next_action}</p>
                                )}
                                {/* Live Ops badge with hover preview */}
                                <DealOpsBadge
                                  ops={ops}
                                  customerName={partner?.company || "Unknown"}
                                  lastBriefAt={briefMap[deal.id]?.generated_at}
                                  buyingSignal={briefMap[deal.id]?.buying_signal_flag}
                                />
                                {(deal.owner || (deal.owner_user_id && userMap[deal.owner_user_id])) && (
                                  <div className="mt-1.5 pt-1.5 border-t border-border/50">
                                    <span className="text-[10px] text-muted-foreground">
                                      {deal.owner || userMap[deal.owner_user_id!]?.display_name}
                                    </span>
                                  </div>
                                )}
                              </Card>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {dealsByStage[stage].length === 0 && (
                        <div className="text-center py-8 text-xs text-muted-foreground">No deals</div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 px-4 font-medium">Account</th>
                  <th className="py-2 px-4 font-medium">Deal</th>
                  <th className="py-2 px-4 font-medium">Stage</th>
                  <th className="py-2 px-4 font-medium text-right">Value</th>
                  <th className="py-2 px-4 font-medium text-right">Days</th>
                  <th className="py-2 px-4 font-medium">Next Action</th>
                  <th className="py-2 px-4 font-medium">Owner</th>
                  <th className="py-2 px-4 font-medium">Ops</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const partner = customerMap[d.partner_id];
                  const ops = opsMap[d.partner_id];
                  const days = daysInStage(d);
                  return (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/business/pipeline/${d.id}`)}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {partner && <CustomerLogo logoUrl={partner.logo_url} companyName={partner.company} size="sm" />}
                          <span className="font-medium">{partner?.company || "—"}</span>
                          <CustomerTypeBadge type={(partner as any)?.customer_type} typeOther={(partner as any)?.customer_type_other} />
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">{d.deal_name}</td>
                      <td className="py-3 px-4"><Badge variant="outline" className={`text-xs ${DEAL_STAGE_COLORS[d.stage]}`}>{d.stage}</Badge></td>
                      <td className="py-3 px-4 text-right font-medium">${Number(d.value).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", ageColor(days))}>{days}d</span>
                      </td>
                      <td className="py-3 px-4 text-xs">{d.next_action || "—"}</td>
                      <td className="py-3 px-4 text-xs">{d.owner || (d.owner_user_id ? userMap[d.owner_user_id]?.display_name ?? "—" : "—")}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {ops ? `${ops.charger_count}ch · ${ops.incidents_30d}/30d` : "—"}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No deals match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ============ Stage move dialog ============ */}
      <Dialog open={!!pendingMove} onOpenChange={(o) => !o && setPendingMove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move deal to "{pendingMove?.newStage}"?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {pendingMove?.newStage === "Closed Lost" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Loss Reason *</Label>
                <Select value={pendingLossReason} onValueChange={setPendingLossReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {LOSS_REASONS.map(r => <SelectItem key={r} value={r}>{LOSS_REASON_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">What moved this deal? (Logged to activity feed)</Label>
              <Textarea rows={3} value={moveNote} onChange={e => setMoveNote(e.target.value)} placeholder="e.g. Champion confirmed budget approval" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingMove(null)}>Cancel</Button>
            <Button onClick={confirmMove} disabled={updateStage.isPending}>
              {updateStage.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}Confirm Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Add Deal dialog ============ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Deal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer *</Label>
              <Tabs value={customerMode} onValueChange={(v) => setCustomerMode(v as any)}>
                <TabsList className="h-8">
                  <TabsTrigger value="existing" className="text-xs">Existing</TabsTrigger>
                  <TabsTrigger value="new" className="text-xs">Create new</TabsTrigger>
                </TabsList>
              </Tabs>
              {customerMode === "existing" ? (
                <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      <span className="flex items-center gap-2 truncate">
                        {form.customer_id ? (
                          <>
                            <span className="truncate">{customerMap[form.customer_id]?.company ?? "Select customer"}</span>
                            <CustomerTypeBadge
                              type={(customerMap[form.customer_id] as any)?.customer_type}
                              typeOther={(customerMap[form.customer_id] as any)?.customer_type_other}
                            />
                          </>
                        ) : "Select customer"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[2100]" align="start">
                    <Command>
                      <CommandInput placeholder="Search customers..." />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {[...customers].sort((a, b) => a.company.localeCompare(b.company)).map(c => {
                            const domain = ((c as any).website_url || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
                            return (
                              <CommandItem
                                key={c.id}
                                value={`${c.company} ${domain}`}
                                onSelect={() => { setForm({ ...form, customer_id: c.id }); setCustomerPickerOpen(false); }}
                              >
                                <Check className={cn("mr-2 h-4 w-4 shrink-0", form.customer_id === c.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate font-medium">{c.company}</span>
                                    <CustomerTypeBadge
                                      type={(c as any).customer_type}
                                      typeOther={(c as any).customer_type_other}
                                    />
                                  </div>
                                  {domain && <p className="text-[11px] text-muted-foreground truncate">{domain}</p>}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/20">
                  <div className="space-y-1"><Label className="text-[10px]">Company *</Label><Input value={form.new_company} onChange={e => setForm({ ...form, new_company: e.target.value })} /></div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Customer Type</Label>
                    <Select value={form.new_customer_type || ""} onValueChange={(v) => setForm({ ...form, new_customer_type: v as CustomerType })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent className="z-[2100]">
                        {CUSTOMER_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.full}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.new_customer_type === "other" && (
                    <div className="space-y-1 col-span-2">
                      <Label className="text-[10px]">Specify type *</Label>
                      <Input value={form.new_customer_type_other} onChange={e => setForm({ ...form, new_customer_type_other: e.target.value })} placeholder="e.g. Utility, EPC, Reseller" />
                    </div>
                  )}
                  <div className="space-y-1"><Label className="text-[10px]">Primary Contact *</Label><Input value={form.new_contact} onChange={e => setForm({ ...form, new_contact: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Email *</Label><Input type="email" value={form.new_email} onChange={e => setForm({ ...form, new_email: e.target.value })} /></div>
                  <div className="space-y-1 col-span-2"><Label className="text-[10px]">Domain / Website</Label><Input placeholder="example.com" value={form.new_website} onChange={e => setForm({ ...form, new_website: e.target.value })} /></div>
                </div>
              )}
            </div>

            <div className="space-y-1.5"><Label className="text-xs">Deal Name *</Label><Input value={form.deal_name} onChange={e => setForm({ ...form, deal_name: e.target.value })} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Initial Stage</Label>
                <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v as DealStage })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEAL_STAGES.filter(s => s !== "Closed Won" && s !== "Closed Lost").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Deal Value ($)</Label><Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Predicted Close Date</Label><Input type="date" value={form.predicted_close_date} onChange={e => setForm({ ...form, predicted_close_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Predicted ARR ($)</Label><Input type="number" value={form.predicted_arr} onChange={e => setForm({ ...form, predicted_arr: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Owner</Label><Input value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} placeholder="e.g. Alex Rivera" /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Next Action</Label><Input value={form.next_action} onChange={e => setForm({ ...form, next_action: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDeal} disabled={createDeal.isPending || createCustomer.isPending}>
              {(createDeal.isPending || createCustomer.isPending) && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}Create Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InsightTile({ label, value, accent = "", icon }: { label: string; value: string; accent?: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">{icon}{label}</p>
      <p className={cn("text-xl font-bold mt-1", accent)}>{value}</p>
    </Card>
  );
}
