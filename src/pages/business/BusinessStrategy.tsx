import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CustomerLogo } from "@/components/CustomerLogo";
import {
  Search, AlertTriangle, Target, BarChart3, Activity, Clock,
  HelpCircle, Plus, Sparkles, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllStrategies, useTourCompleted, useMarkTourCompleted } from "@/hooks/useStrategy";
import { useCustomers } from "@/hooks/useCustomers";
import { useDeals } from "@/hooks/useDeals";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  ACCOUNT_TYPE_LABELS, STRATEGY_HEALTH_COLORS, STRATEGY_HEALTH_LABELS,
  computeStrategyHealth, formatKpiValue,
  type StrategyAccountType, type StrategyHealth,
} from "@/types/strategy";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatDistanceToNow } from "date-fns";
import { runPortfolioTour } from "@/components/business/strategy/portfolioTour";
import { runStrategyTour } from "@/components/business/strategy/strategyTour";

type SortKey = "health" | "arr" | "reviewed" | "name";

export default function BusinessStrategy() {
  usePageTitle("Account Strategy");
  const navigate = useNavigate();
  const { data: strategies = [], isLoading } = useAllStrategies();
  const { data: customers = [] } = useCustomers();
  const { data: deals = [] } = useDeals();
  const { data: tourDone } = useTourCompleted();
  const markTourDone = useMarkTourCompleted();

  // Bulk-fetch KPIs and plays for portfolio metrics
  const { data: allKpis = [] } = useQuery({
    queryKey: ["all-strategy-kpis"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("strategy_kpis").select("*");
      if (error) throw error;
      return data || [];
    },
  });
  const { data: allPlays = [] } = useQuery({
    queryKey: ["all-strategy-plays"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("strategy_plays").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Real connectors-under-management: count via charger_customer_relationships
  const { data: connectorsUnderMgmt = 0 } = useQuery({
    queryKey: ["connectors-under-mgmt"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await (supabase as any)
        .from("charger_customer_relationships")
        .select("charger_id", { count: "exact", head: true });
      if (!error && typeof count === "number" && count > 0) return count;
      // Fallback: total charger_records
      const { count: c2 } = await (supabase as any)
        .from("charger_records")
        .select("id", { count: "exact", head: true });
      return c2 || 0;
    },
  });

  const customerById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<StrategyAccountType | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<StrategyHealth | "all">("all");
  const [sort, setSort] = useState<SortKey>("health");
  const [createOpen, setCreateOpen] = useState(false);

  const filtersActive =
    !!search.trim() || typeFilter !== "all" || ownerFilter !== "all" || healthFilter !== "all";
  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setOwnerFilter("all");
    setHealthFilter("all");
  };

  const owners = useMemo(
    () => Array.from(new Set(strategies.map((s) => s.owner).filter(Boolean))) as string[],
    [strategies]
  );

  const enriched = useMemo(() => {
    return strategies.map((s) => {
      const customer = customerById[s.customer_id];
      const kpis = allKpis.filter((k: any) => k.strategy_id === s.id);
      const plays = allPlays.filter((p: any) => p.strategy_id === s.id);
      const health = computeStrategyHealth(s, kpis, plays);
      const headlineKpi = kpis.find((k: any) => k.is_primary && !k.is_deferred) || kpis[0];
      const activePlays = plays.filter((p: any) => p.status === "in_progress" || p.status === "complete").length;
      return { strategy: s, customer, kpis, plays, health, headlineKpi, activePlays, totalPlays: plays.length };
    });
  }, [strategies, customerById, allKpis, allPlays]);

  const filtered = useMemo(() => {
    let list = enriched.filter((e) => e.customer);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.customer.company.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") list = list.filter((e) => (e.strategy.account_types || []).includes(typeFilter));
    if (ownerFilter !== "all") list = list.filter((e) => e.strategy.owner === ownerFilter);
    if (healthFilter !== "all") list = list.filter((e) => e.health === healthFilter);

    const healthRank: Record<StrategyHealth, number> = { off_track: 0, at_risk: 1, needs_review: 2, on_track: 3 };
    list.sort((a, b) => {
      if (sort === "health") return healthRank[a.health] - healthRank[b.health];
      if (sort === "name") return a.customer.company.localeCompare(b.customer.company);
      if (sort === "reviewed") {
        const aT = a.strategy.last_reviewed_at ? new Date(a.strategy.last_reviewed_at).getTime() : 0;
        const bT = b.strategy.last_reviewed_at ? new Date(b.strategy.last_reviewed_at).getTime() : 0;
        return bT - aT;
      }
      if (sort === "arr") {
        const aA = a.kpis.find((k: any) => /arr/i.test(k.name))?.target_value || 0;
        const bA = b.kpis.find((k: any) => /arr/i.test(k.name))?.target_value || 0;
        return Number(bA) - Number(aA);
      }
      return 0;
    });
    return list;
  }, [enriched, search, typeFilter, ownerFilter, healthFilter, sort]);

  const connectorsInStrategy = useMemo(() => {
    return allKpis
      .filter((k: any) => /connector/i.test(k.name))
      .reduce((sum: number, k: any) => sum + Number(k.target_value || 0), 0);
  }, [allKpis]);
  const connectorsInPipeline = useMemo(() => {
    return deals
      .filter((d: any) => d.stage !== "Closed Won" && d.stage !== "Closed Lost")
      .reduce((sum: number, d: any) => sum + Number(d.connector_count || 0), 0);
  }, [deals]);
  const needsReviewCount = useMemo(
    () => enriched.filter((e) => e.health === "needs_review").length,
    [enriched]
  );

  // Auto-trigger tour on first visit
  useEffect(() => {
    if (tourDone === false && !isLoading) {
      const t = setTimeout(() => runPortfolioTour(() => markTourDone.mutate()), 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourDone, isLoading]);

  const goToStrategy = (customerId: string, withWizard = false) => {
    navigate(`/business/accounts/${customerId}?tab=strategy${withWizard ? "&wizard=1" : ""}`);
  };

  const hasZeroStrategies = !isLoading && strategies.length === 0;

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap" data-tour="portfolio-header">
          <div>
            <h1 className="text-2xl font-bold">Account Strategy</h1>
            <p className="text-sm text-muted-foreground">
              Strategic plans for every account in the NOCH+ ecosystem.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Create Strategy
            </Button>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10">
                      <HelpCircle className="h-4 w-4" /> Tour
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Show me how Strategy works</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="z-[2100]">
                <DropdownMenuItem onSelect={() => runPortfolioTour()}>Full tour</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => runStrategyTour("quick")}>Quick refresher</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => runPortfolioTour()}>
                  Help with a specific section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Portfolio Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3" data-tour="portfolio-metrics">
          <MetricCard icon={Activity} label="Total Connectors Under Management" value={Number(connectorsUnderMgmt).toLocaleString()} />
          <MetricCard icon={Target} label="Connectors in Active Strategy" value={connectorsInStrategy.toLocaleString()} />
          <MetricCard icon={BarChart3} label="Connectors in Pipeline" value={connectorsInPipeline.toLocaleString()} />
          <div data-tour="needs-review-card">
            <MetricCard
              icon={Clock}
              label="Strategies Needing Review"
              value={needsReviewCount.toString()}
              clickable
              active={healthFilter === "needs_review"}
              onClick={() => setHealthFilter(healthFilter === "needs_review" ? "all" : "needs_review")}
            />
          </div>
        </div>

        {/* Alert Banner */}
        {needsReviewCount > 0 && healthFilter !== "needs_review" && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-medium">{needsReviewCount} strategies need review this week.</p>
              </div>
              <Button size="sm" onClick={() => setHealthFilter("needs_review")}>Review Now</Button>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card data-tour="portfolio-filters">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by account..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {(Object.keys(ACCOUNT_TYPE_LABELS) as StrategyAccountType[]).map((t) => (
                  <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All owners" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {owners.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={healthFilter} onValueChange={(v) => setHealthFilter(v as any)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All health" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All health</SelectItem>
                <SelectItem value="on_track">On Track</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="off_track">Off Track</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="health">Sort: Health</SelectItem>
                <SelectItem value="arr">Sort: ARR Target</SelectItem>
                <SelectItem value="reviewed">Sort: Last Reviewed</SelectItem>
                <SelectItem value="name">Sort: Account Name</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Cards Grid / Empty States */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" />
          </div>
        ) : hasZeroStrategies ? (
          <Card data-tour="portfolio-cards">
            <CardContent className="py-12 px-6 text-center max-w-xl mx-auto space-y-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold">Welcome to Account Strategy</h3>
                <p className="text-sm text-muted-foreground">
                  Every account in NOCH+ deserves a clear plan. Strategy turns prospects into wins
                  and customers into champions.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Create your first strategy
                </Button>
                <Button variant="outline" onClick={() => runPortfolioTour()} className="gap-1.5">
                  <Sparkles className="h-4 w-4" /> Take the tour
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card data-tour="portfolio-cards">
            <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
              <p>No strategies match the current filters.</p>
              {filtersActive && (
                <Button size="sm" variant="outline" onClick={clearFilters} className="gap-1.5">
                  <X className="h-3.5 w-3.5" /> Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-tour="portfolio-cards">
            {filtered.map(({ strategy, customer, headlineKpi, activePlays, totalPlays, health }) => {
              const isNeedsReview = health === "needs_review";
              const types = strategy.account_types || [];
              const visibleTypes = types.slice(0, 2);
              const extraCount = Math.max(0, types.length - 2);
              const daysSinceCreated = Math.max(0, Math.floor((Date.now() - new Date(strategy.created_at).getTime()) / 86400000));

              return (
                <Card
                  key={strategy.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    isNeedsReview
                      ? "border-dashed border-amber-400 bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70 dark:hover:bg-amber-950/20"
                      : "hover:shadow-md"
                  )}
                  onClick={() => goToStrategy(customer.id, isNeedsReview)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <CustomerLogo logoUrl={customer.logo_url} companyName={customer.company} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate" title={customer.company}>{customer.company}</p>
                        {!isNeedsReview && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {visibleTypes.map((t: StrategyAccountType) => (
                              <Badge key={t} variant="secondary" className="text-[10px]">{ACCOUNT_TYPE_LABELS[t]}</Badge>
                            ))}
                            {extraCount > 0 && <Badge variant="outline" className="text-[10px]">+{extraCount}</Badge>}
                          </div>
                        )}
                      </div>
                      {isNeedsReview ? (
                        <Badge className="border border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">
                          ⚠ Needs Review
                        </Badge>
                      ) : (
                        <Badge className={cn("border text-[10px]", STRATEGY_HEALTH_COLORS[health])}>
                          {STRATEGY_HEALTH_LABELS[health]}
                        </Badge>
                      )}
                    </div>

                    {isNeedsReview ? (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                          Needs strategic review
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click to set up this account's strategy
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
                        {strategy.north_star || "No North Star yet"}
                      </p>
                    )}

                    {!isNeedsReview && headlineKpi && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium truncate" title={headlineKpi.name}>{headlineKpi.name}</span>
                          <span className="text-muted-foreground shrink-0 ml-2">
                            {formatKpiValue(headlineKpi.current_value, headlineKpi.unit)} / {formatKpiValue(headlineKpi.target_value, headlineKpi.unit)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, headlineKpi.target_value ? (Number(headlineKpi.current_value) / Number(headlineKpi.target_value)) * 100 : 0)}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      {isNeedsReview ? (
                        <>
                          <span>No plays yet</span>
                          <span>Created {daysSinceCreated === 0 ? "today" : `${daysSinceCreated}d ago`}</span>
                        </>
                      ) : (
                        <>
                          <span>{activePlays} of {totalPlays} plays active</span>
                          <span>
                            {strategy.last_reviewed_at
                              ? `Reviewed ${formatDistanceToNow(new Date(strategy.last_reviewed_at), { addSuffix: true })}`
                              : "Never reviewed"}
                          </span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <CreateStrategyModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          enriched={enriched}
          onPick={(customerId) => {
            setCreateOpen(false);
            goToStrategy(customerId, true);
          }}
        />
      </div>
    </TooltipProvider>
  );
}

function MetricCard({
  icon: Icon, label, value, clickable, active, onClick,
}: {
  icon: any; label: string; value: string;
  clickable?: boolean; active?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "transition-all",
        clickable && "cursor-pointer hover:border-teal-400 hover:shadow-sm",
        active && "border-teal-500 ring-1 ring-teal-500/30"
      )}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// === Create Strategy modal: account picker biased to needs_review accounts ===
function CreateStrategyModal({
  open, onOpenChange, enriched, onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  enriched: { strategy: any; customer: any; health: StrategyHealth }[];
  onPick: (customerId: string) => void;
}) {
  const [q, setQ] = useState("");
  const needsReview = enriched.filter((e) => e.customer && e.health === "needs_review");
  const all = enriched.filter((e) => e.customer);
  const list = q.trim()
    ? all.filter((e) => e.customer.company.toLowerCase().includes(q.trim().toLowerCase()))
    : needsReview.length > 0 ? needsReview : all;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Which account?</DialogTitle>
          <DialogDescription>
            {needsReview.length > 0 && !q.trim()
              ? "These accounts don't have strategies yet. Pick one to start."
              : "Search and pick an account to set up a strategy."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search accounts…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {list.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No matching accounts.</p>
            )}
            {list.map(({ customer, health }) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => onPick(customer.id)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left"
              >
                <CustomerLogo logoUrl={customer.logo_url} companyName={customer.company} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{customer.company}</p>
                </div>
                {health === "needs_review" && (
                  <Badge className="border border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">
                    Needs Review
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
