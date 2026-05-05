import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerLogo } from "@/components/CustomerLogo";
import { Printer, FileDown, Share2, ArrowRight } from "lucide-react";
import { useAllStrategies } from "@/hooks/useStrategy";
import { useCustomers } from "@/hooks/useCustomers";
import {
  formatKpiValue, getCurrentQuarterInfo,
  type StrategyKpi, type StrategyKpiActual, type QuarterPhasing,
} from "@/types/strategy";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ReferenceArea, ReferenceLine, CartesianGrid, Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

type QKey = "Q1" | "Q2" | "Q3" | "Q4";
const QUARTERS: QKey[] = ["Q1", "Q2", "Q3", "Q4"];

export function AnnualViewTab() {
  const navigate = useNavigate();
  const { data: strategies = [] } = useAllStrategies();
  const { data: customers = [] } = useCustomers();
  const customerById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [scope, setScope] = useState<"focus" | "all">("focus");

  const focusStrategies = useMemo(
    () => strategies.filter((s) => (scope === "focus" ? s.is_focus : true)),
    [strategies, scope]
  );
  const focusIds = useMemo(() => focusStrategies.map((s) => s.id), [focusStrategies]);

  const { data: kpis = [] } = useQuery<StrategyKpi[]>({
    queryKey: ["annual-view-kpis", focusIds],
    enabled: focusIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("strategy_kpis").select("*").in("strategy_id", focusIds);
      if (error) throw error;
      return (data || []) as StrategyKpi[];
    },
  });

  const kpiIds = useMemo(() => kpis.map((k) => k.id), [kpis]);
  const { data: actuals = [] } = useQuery<StrategyKpiActual[]>({
    queryKey: ["annual-view-actuals", kpiIds],
    enabled: kpiIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("strategy_kpi_actuals").select("*").in("strategy_kpi_id", kpiIds);
      if (error) throw error;
      return (data || []) as StrategyKpiActual[];
    },
  });

  // Distinct phased KPI names for selector (group by name)
  const kpiOptions = useMemo(() => {
    const set = new Map<string, { name: string; unit: string }>();
    kpis.filter((k) => k.target_type === "phased").forEach((k) => {
      if (!set.has(k.name)) set.set(k.name, { name: k.name, unit: k.unit });
    });
    return Array.from(set.values());
  }, [kpis]);

  const [selectedKpi, setSelectedKpi] = useState<string>("");
  const activeKpiName = selectedKpi || kpiOptions.find((k) => /arr/i.test(k.name))?.name || kpiOptions[0]?.name || "";
  const activeKpis = kpis.filter((k) => k.name === activeKpiName);
  const activeUnit = activeKpis[0]?.unit || "dollar";

  const { quarter: currentQ, year: currentYear, weeksElapsed: currentQWeeks } = getCurrentQuarterInfo();
  const yearWeek = Math.min(52, Math.max(1, Math.ceil(((Date.now() - new Date(currentYear, 0, 1).getTime()) / (7 * 86400000)))));

  // === Layer 1 banner data ===
  const dollarKpis = kpis.filter((k) => k.target_type === "phased" && k.unit === "dollar");
  const arrCommitted = dollarKpis.reduce((s, k) => s + Number(k.annual_target_value || 0), 0);
  const arrAchieved = actuals
    .filter((a) => a.year === year && dollarKpis.some((k) => k.id === a.strategy_kpi_id))
    .reduce((s, a) => s + Number(a.actual_value || 0), 0);
  const accountsWithDollarKpis = new Set(dollarKpis.map((k) => k.strategy_id)).size;
  const portfolioConnectorTarget = kpis
    .filter((k) => /connector|customer/i.test(k.name))
    .reduce((s, k) => s + Number(k.annual_target_value || k.target_value || 0), 0);
  const onTrackCount = focusStrategies.filter((s) => {
    // simple: any phased KPI for s with pace >= 0.75
    const ks = kpis.filter((k) => k.strategy_id === s.id && k.target_type === "phased");
    if (ks.length === 0) return false;
    return ks.every((k) => {
      const t = Number((k.quarter_phasing as QuarterPhasing)?.[currentQ]?.target_value || 0);
      const a = actuals.filter((x) => x.strategy_kpi_id === k.id && x.quarter === currentQ && x.year === currentYear).reduce((s, x) => s + Number(x.actual_value || 0), 0);
      const exp = t * (currentQWeeks / 13);
      return exp === 0 || a / exp >= 0.75;
    });
  }).length;

  const yearPctElapsed = (yearWeek / 52) * 100;
  const annualPct = arrCommitted > 0 ? (arrAchieved / arrCommitted) * 100 : 0;
  const paceDelta = annualPct - yearPctElapsed;
  const paceColor = paceDelta >= 0 ? "bg-emerald-500" : paceDelta >= -25 ? "bg-amber-500" : "bg-rose-500";

  // === Layer 2 chart data ===
  const chartData = useMemo(() => {
    // cumulative plan + actual, points: Q1, Q2, Q3, Q4
    const cumPlan: number[] = [];
    const cumActual: number[] = [];
    let pSum = 0, aSum = 0;
    QUARTERS.forEach((q, i) => {
      const planQ = activeKpis.reduce((s, k) => s + Number((k.quarter_phasing as QuarterPhasing)?.[q]?.target_value || 0), 0);
      const actualQ = actuals
        .filter((a) => a.quarter === q && a.year === year && activeKpis.some((k) => k.id === a.strategy_kpi_id))
        .reduce((s, a) => s + Number(a.actual_value || 0), 0);
      pSum += planQ;
      // For future quarters, don't accumulate actuals beyond now
      const qIdx = Number(currentQ[1]) - 1;
      if (i <= qIdx) aSum += actualQ;
      cumPlan.push(pSum);
      cumActual.push(aSum);
    });
    const qIdx = Number(currentQ[1]) - 1;
    return QUARTERS.map((q, i) => ({
      quarter: q,
      plan: cumPlan[i],
      actual: i <= qIdx ? cumActual[i] : null,
      isPast: i < qIdx,
      isCurrent: i === qIdx,
      isFuture: i > qIdx,
    }));
  }, [activeKpis, actuals, year, currentQ]);

  // === Layer 3 table rows ===
  const tableRows = useMemo(() => {
    return focusStrategies.map((s) => {
      const customer = customerById[s.customer_id];
      const kp = activeKpis.find((k) => k.strategy_id === s.id);
      const phasing = (kp?.quarter_phasing as QuarterPhasing) || {};
      const annual = Number(kp?.annual_target_value || 0);
      const actualByQ: Record<QKey, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
      if (kp) {
        actuals.filter((a) => a.strategy_kpi_id === kp.id && a.year === year).forEach((a) => {
          actualByQ[a.quarter as QKey] = (actualByQ[a.quarter as QKey] || 0) + Number(a.actual_value || 0);
        });
      }
      const targetByQ: Record<QKey, number> = {
        Q1: Number(phasing.Q1?.target_value || 0),
        Q2: Number(phasing.Q2?.target_value || 0),
        Q3: Number(phasing.Q3?.target_value || 0),
        Q4: Number(phasing.Q4?.target_value || 0),
      };
      const t = Number(targetByQ[currentQ] || 0);
      const a = Number(actualByQ[currentQ] || 0);
      const exp = t * (currentQWeeks / 13);
      const pace = exp > 0 ? a / exp : 0;
      const status = exp === 0 ? "—" : pace >= 1 ? "On track" : pace >= 0.75 ? "Tracking" : "Behind";
      return { strategy: s, customer, kp, targetByQ, actualByQ, annual, status, pace };
    }).filter((r) => r.customer);
  }, [focusStrategies, customerById, activeKpis, actuals, year, currentQ, currentQWeeks]);

  const totals = useMemo(() => {
    const t: Record<QKey, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const a: Record<QKey, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    let annual = 0;
    tableRows.forEach((r) => {
      QUARTERS.forEach((q) => { t[q] += r.targetByQ[q]; a[q] += r.actualByQ[q]; });
      annual += r.annual;
    });
    return { t, a, annual };
  }, [tableRows]);

  // Last update indicator
  const lastUpdate = useMemo(() => {
    const sorted = [...actuals].sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime());
    return sorted[0];
  }, [actuals]);
  const lastUpdateAccount = useMemo(() => {
    if (!lastUpdate) return null;
    const k = kpis.find((kk) => kk.id === lastUpdate.strategy_kpi_id);
    if (!k) return null;
    const s = strategies.find((ss) => ss.id === k.strategy_id);
    return s ? customerById[s.customer_id] : null;
  }, [lastUpdate, kpis, strategies, customerById]);

  const handleExport = () => window.print();
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Annual View link copied to clipboard.");
  };

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-6 print:p-4">
      {/* Header / Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Annual View</h2>
          <p className="text-sm text-muted-foreground">Executive analytics across {scope === "focus" ? "Focus 5" : "all"} strategies.</p>
          {lastUpdate && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Last KPI update: {formatDistanceToNow(new Date(lastUpdate.entered_at), { addSuffix: true })}
              {lastUpdate.entered_by ? ` (${lastUpdate.entered_by}${lastUpdateAccount ? `, ${lastUpdateAccount.company}` : ""})` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={scope} onValueChange={(v) => setScope(v as any)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="focus">All Focus 5</SelectItem>
              <SelectItem value="all">All Strategies</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5"><Printer className="h-3.5 w-3.5" /> Print</Button>
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5"><FileDown className="h-3.5 w-3.5" /> Export PDF</Button>
          <Button size="sm" variant="outline" onClick={handleShare} className="gap-1.5"><Share2 className="h-3.5 w-3.5" /> Share</Button>
        </div>
      </div>

      {/* Layer 1 — Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BannerTile label="ARR Committed" value={`$${(arrCommitted / 1000).toFixed(0)}K`} sub={`across ${accountsWithDollarKpis} accounts`} />
        <BannerTile label="ARR Achieved" value={`$${(arrAchieved / 1000).toFixed(0)}K`} sub={`${Math.round(annualPct)}% of annual`} />
        <BannerTile label="Portfolio Targets" value={portfolioConnectorTarget.toLocaleString()} sub="connectors / customers" />
        <BannerTile label="Focus 5 Status" value={`${onTrackCount}/${focusStrategies.length} on track`} sub={`${currentQ} Week ${currentQWeeks}`} />
      </div>

      {/* Pace bar */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Year progress</span>
            <span className={cn("font-semibold", paceDelta >= 0 ? "text-emerald-700" : paceDelta >= -25 ? "text-amber-700" : "text-rose-700")}>
              {Math.round(annualPct)}% achieved · {Math.round(yearPctElapsed)}% elapsed · {paceDelta >= 0 ? "+" : ""}{Math.round(paceDelta)}% vs pace
            </span>
          </div>
          <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
            <div className={cn("absolute inset-y-0 left-0", paceColor)} style={{ width: `${Math.min(100, annualPct)}%` }} />
            <div className="absolute inset-y-0 w-px bg-foreground/70" style={{ left: `${yearPctElapsed}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* KPI selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">View KPI:</span>
        <Select value={activeKpiName} onValueChange={setSelectedKpi}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select a KPI" /></SelectTrigger>
          <SelectContent className="z-[2100]">
            {kpiOptions.map((k) => <SelectItem key={k.name} value={k.name}>{k.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Layer 2 — Plan vs Actual chart */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{activeKpiName || "—"} · Plan vs Actual</h3>
            <Badge variant="outline" className="text-[10px]">cumulative {year}</Badge>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="quarter" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <RTooltip
                  formatter={(value: any, name: string) => [value == null ? "—" : formatKpiValue(Number(value), activeUnit as any), name]}
                />
                <Legend />
                {chartData.map((d, i) => d.isPast && (
                  <ReferenceArea key={i} x1={d.quarter} x2={d.quarter} strokeOpacity={0} fillOpacity={0.06} fill="hsl(var(--muted-foreground))" />
                ))}
                {chartData.map((d, i) => d.isFuture && (
                  <ReferenceArea key={i} x1={d.quarter} x2={d.quarter} strokeOpacity={0} fillOpacity={0.08} fill="hsl(var(--primary))" />
                ))}
                <ReferenceLine x={currentQ} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: "Today", position: "top", fontSize: 10 }} />
                <Line type="monotone" dataKey="plan" name="Plan" stroke="hsl(var(--primary))" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Layer 3 — Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-2 font-semibold">Account</th>
                {QUARTERS.map((q) => (
                  <th key={q} className="p-2 font-semibold text-right">
                    {q} Plan / Actual
                  </th>
                ))}
                <th className="p-2 font-semibold text-right">Annual</th>
                <th className="p-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.strategy.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/business/accounts/${r.customer.id}?tab=strategy`)}>
                  <td className="p-2 flex items-center gap-2">
                    <CustomerLogo companyName={r.customer.company} logoUrl={r.customer.logo_url || undefined} size="sm" />
                    <span className="font-medium">{r.customer.company}</span>
                  </td>
                  {QUARTERS.map((q) => (
                    <td key={q} className="p-2 text-right font-mono">
                      <span className="text-muted-foreground">{formatKpiValue(r.targetByQ[q], activeUnit as any)}</span>
                      <span className="mx-1 text-muted-foreground/40">/</span>
                      <span>{formatKpiValue(r.actualByQ[q], activeUnit as any)}</span>
                    </td>
                  ))}
                  <td className="p-2 text-right font-semibold">{formatKpiValue(r.annual, activeUnit as any)}</td>
                  <td className="p-2">
                    <Badge variant="outline" className={cn("text-[10px]",
                      r.status === "On track" && "text-emerald-700 border-emerald-300",
                      r.status === "Tracking" && "text-amber-700 border-amber-300",
                      r.status === "Behind" && "text-rose-700 border-rose-300",
                    )}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No Focus 5 strategies with phased KPIs for this selection.</td></tr>
              )}
              {tableRows.length > 0 && (
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="p-2">TOTAL</td>
                  {QUARTERS.map((q) => (
                    <td key={q} className="p-2 text-right font-mono">
                      <span className="text-muted-foreground">{formatKpiValue(totals.t[q], activeUnit as any)}</span>
                      <span className="mx-1 text-muted-foreground/40">/</span>
                      <span>{formatKpiValue(totals.a[q], activeUnit as any)}</span>
                    </td>
                  ))}
                  <td className="p-2 text-right">{formatKpiValue(totals.annual, activeUnit as any)}</td>
                  <td className="p-2"></td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Layer 4 — Pace cards */}
      <div>
        <h3 className="text-sm font-semibold mb-2">{currentQ} {currentYear} Pace · per account</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tableRows.map((r) => {
            const target = r.targetByQ[currentQ];
            const actual = r.actualByQ[currentQ];
            const expected = target * (currentQWeeks / 13);
            const pace = expected > 0 ? actual / expected : 0;
            const behind = expected - actual;
            return (
              <Card key={r.strategy.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CustomerLogo companyName={r.customer.company} logoUrl={r.customer.logo_url || undefined} size="sm" />
                      <div>
                        <p className="text-sm font-semibold">{r.customer.company}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{currentQ} {currentYear}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]",
                      pace >= 1 ? "text-emerald-700 border-emerald-300" :
                      pace >= 0.75 ? "text-amber-700 border-amber-300" :
                      "text-rose-700 border-rose-300"
                    )}>
                      {expected === 0 ? "—" : `${Math.round(pace * 100)}%`}
                    </Badge>
                  </div>
                  <div className="text-[11px] grid grid-cols-3 gap-2">
                    <div><p className="text-muted-foreground">Target</p><p className="font-semibold">{formatKpiValue(target, activeUnit as any)}</p></div>
                    <div><p className="text-muted-foreground">Actual</p><p className="font-semibold">{formatKpiValue(actual, activeUnit as any)} <span className="text-muted-foreground">(W{currentQWeeks}/13)</span></p></div>
                    <div><p className="text-muted-foreground">Expected</p><p className="font-semibold">{formatKpiValue(expected, activeUnit as any)}</p></div>
                  </div>
                  {behind > 0 && expected > 0 && (
                    <p className="text-[11px] text-rose-700">⚠ Behind by {formatKpiValue(behind, activeUnit as any)}</p>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => navigate(`/business/accounts/${r.customer.id}?tab=strategy`)}>
                    View strategy <ArrowRight className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BannerTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
