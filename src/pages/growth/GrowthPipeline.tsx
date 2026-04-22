import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useDeals, useUpdateDealStage } from "@/hooks/useDeals";
import { useCustomers } from "@/hooks/useCustomers";
import { useGrowthUsers, useGrowthUserMap } from "@/hooks/useGrowthUsers";
import { DEAL_STAGES, DEAL_STAGE_COLORS, type DealStage, type Deal } from "@/types/growth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CustomerLogo } from "@/components/CustomerLogo";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LayoutGrid, List, Search, TrendingUp, Loader2 } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { toast } from "sonner";

export default function GrowthPipeline() {
  usePageTitle("Pipeline");
  const navigate = useNavigate();
  const { data: deals = [], isLoading } = useDeals();
  const { data: customers = [] } = useCustomers();
  const { data: users = [] } = useGrowthUsers();
  const userMap = useGrowthUserMap();
  const updateStage = useUpdateDealStage();

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");

  // Stage change confirm dialog
  const [pendingMove, setPendingMove] = useState<{ deal: Deal; newStage: DealStage } | null>(null);
  const [moveNote, setMoveNote] = useState("");

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

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const deal = deals.find(d => d.id === draggableId);
    if (!deal) return;
    setPendingMove({ deal, newStage: destination.droppableId as DealStage });
    setMoveNote("");
  };

  const confirmMove = () => {
    if (!pendingMove) return;
    updateStage.mutate({
      id: pendingMove.deal.id,
      stage: pendingMove.newStage,
      note: moveNote,
      partner_id: pendingMove.deal.partner_id,
    }, {
      onSuccess: () => {
        toast.success(`Deal moved to "${pendingMove.newStage}"`);
        setPendingMove(null);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const dateColor = (date: string | null) => {
    if (!date) return "text-muted-foreground";
    const d = new Date(date);
    if (isPast(d) && differenceInDays(new Date(), d) > 0) return "text-destructive";
    if (differenceInDays(d, new Date()) <= 3) return "text-amber-600";
    return "text-emerald-600";
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Pipeline</h1>
        </div>
        <Tabs value={view} onValueChange={v => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="kanban" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Kanban</TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5"><List className="h-3.5 w-3.5" />List</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
                        return (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(prov, snap) => (
                              <Card
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={`p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all ${
                                  snap.isDragging ? "shadow-lg rotate-1" : ""
                                }`}
                                onClick={() => navigate(`/growth/deals/${deal.id}`)}
                              >
                                <div className="flex items-start gap-2 mb-2">
                                  {partner && <CustomerLogo logoUrl={partner.logo_url} companyName={partner.company} size="sm" />}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-muted-foreground truncate">{partner?.company || "Unknown"}</p>
                                    <p className="text-sm font-semibold truncate">{deal.deal_name}</p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-bold text-primary">${Number(deal.value).toLocaleString()}</span>
                                  <span className="text-xs text-muted-foreground">{deal.probability}%</span>
                                </div>
                                {deal.next_action && (
                                  <p className="text-xs text-foreground line-clamp-2 mb-1">{deal.next_action}</p>
                                )}
                                {deal.next_action_date && (
                                  <p className={`text-[11px] font-medium ${dateColor(deal.next_action_date)}`}>
                                    {format(new Date(deal.next_action_date), "MMM d, yyyy")}
                                  </p>
                                )}
                                {deal.owner_user_id && userMap[deal.owner_user_id] && (
                                  <div className="mt-2 pt-2 border-t border-border/50">
                                    <span className="text-[10px] text-muted-foreground">{userMap[deal.owner_user_id].display_name}</span>
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
                  <th className="py-2 px-4 font-medium text-right">Prob.</th>
                  <th className="py-2 px-4 font-medium">Next Action</th>
                  <th className="py-2 px-4 font-medium">Owner</th>
                  <th className="py-2 px-4 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const partner = customerMap[d.partner_id];
                  return (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/growth/deals/${d.id}`)}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {partner && <CustomerLogo logoUrl={partner.logo_url} companyName={partner.company} size="sm" />}
                          <span className="font-medium">{partner?.company || "—"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">{d.deal_name}</td>
                      <td className="py-3 px-4"><Badge variant="outline" className={`text-xs ${DEAL_STAGE_COLORS[d.stage]}`}>{d.stage}</Badge></td>
                      <td className="py-3 px-4 text-right font-medium">${Number(d.value).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{d.probability}%</td>
                      <td className="py-3 px-4 text-xs">
                        <div>{d.next_action || "—"}</div>
                        {d.next_action_date && <div className={dateColor(d.next_action_date)}>{format(new Date(d.next_action_date), "MMM d")}</div>}
                      </td>
                      <td className="py-3 px-4 text-xs">{d.owner_user_id ? (userMap[d.owner_user_id]?.display_name ?? "—") : "—"}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{format(new Date(d.updated_at), "MMM d")}</td>
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

      {/* Stage change note dialog */}
      <Dialog open={!!pendingMove} onOpenChange={(o) => !o && setPendingMove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move deal to "{pendingMove?.newStage}"?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">What moved this deal forward? (Logged to activity feed)</Label>
            <Textarea rows={3} value={moveNote} onChange={e => setMoveNote(e.target.value)} placeholder="e.g. Champion confirmed budget approval" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingMove(null)}>Cancel</Button>
            <Button onClick={confirmMove} disabled={updateStage.isPending}>
              {updateStage.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}Confirm Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
