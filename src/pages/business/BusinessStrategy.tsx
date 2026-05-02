import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerLogo } from "@/components/CustomerLogo";
import { Search, AlertTriangle, Target, BarChart3, Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllStrategies, useKpis, usePlays } from "@/hooks/useStrategy";
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

type SortKey = "health" | "arr" | "reviewed" | "name";

export default function BusinessStrategy() {
  usePageTitle("Account Strategy");
  const navigate = useNavigate();
  const { data: strategies = [], isLoading } = useAllStrategies();
  const { data: customers = [] } = useCustomers();
  const { data: deals = [] } = useDeals();

  // Bulk-fetch KPIs and plays for all strategies for portfolio metrics
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

  const customerById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<StrategyAccountType | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<StrategyHealth | "all">("all");
  const [sort, setSort] = useState<SortKey>("health");

  const owners = useMemo(() => Array.from(new Set(strategies.map((s) => s.owner).filter(Boolean))) as string[], [strategies]);

  // Compute health for each strategy
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
    let list = enriched.filter((e) => e.customer); // skip orphans
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

  // Portfolio metrics
  const totalConnectorsManaged = useMemo(() => {
    return allKpis
      .filter((k: any) => /connectors under noch\+ management/i.test(k.name))
      .reduce((sum: number, k: any) => sum + Number(k.current_value || 0), 0);
  }, [allKpis]);
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
  const needsReviewCount = useMemo(() => {
    return enriched.filter((e) => e.health === "needs_review").length;
  }, [enriched]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Strategy</h1>
        <p className="text-sm text-muted-foreground">Strategic plans for every account in the NOCH+ ecosystem.</p>
      </div>

      {/* Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <MetricCard icon={Activity} label="Total Connectors Under Management" value={totalConnectorsManaged.toLocaleString()} />
        <MetricCard icon={Target} label="Connectors in Active Strategy" value={connectorsInStrategy.toLocaleString()} />
        <MetricCard icon={BarChart3} label="Connectors in Pipeline" value={connectorsInPipeline.toLocaleString()} />
        <MetricCard icon={Clock} label="Strategies Needing Review" value={needsReviewCount.toString()} />
      </div>

      {/* Alert Banner */}
      {needsReviewCount > 0 && (
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
      <Card>
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

      {/* Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No strategies match the current filters.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ strategy, customer, headlineKpi, activePlays, totalPlays, health }) => {
            const types = strategy.account_types || [];
            const visibleTypes = types.slice(0, 2);
            const extraCount = Math.max(0, types.length - 2);
            return (
              <Card
                key={strategy.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/business/accounts/${customer.id}?tab=strategy`)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CustomerLogo logoUrl={customer.logo_url} companyName={customer.company} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" title={customer.company}>{customer.company}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {visibleTypes.map((t: StrategyAccountType) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{ACCOUNT_TYPE_LABELS[t]}</Badge>
                        ))}
                        {extraCount > 0 && <Badge variant="outline" className="text-[10px]">+{extraCount}</Badge>}
                      </div>
                    </div>
                    <Badge className={cn("border text-[10px]", STRATEGY_HEALTH_COLORS[health])}>
                      {STRATEGY_HEALTH_LABELS[health]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
                    {strategy.north_star || (strategy.status === "needs_review" ? "TBD — needs strategic review" : "No North Star yet")}
                  </p>
                  {headlineKpi && (
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
                    <span>{activePlays} of {totalPlays} plays active</span>
                    <span>
                      {strategy.last_reviewed_at
                        ? `Reviewed ${formatDistanceToNow(new Date(strategy.last_reviewed_at), { addSuffix: true })}`
                        : "Never reviewed"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
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
