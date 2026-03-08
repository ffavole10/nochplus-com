import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, HeartPulse, TrendingUp, TrendingDown, Minus, Package,
  AlertTriangle, Lightbulb, ShoppingCart, Cpu, BarChart3, ArrowRight,
  CheckCircle2, XCircle, AlertCircle, Brain, Zap, Target
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, Area, AreaChart } from "recharts";
import type { Part } from "@/hooks/useParts";
import type { StockMovement } from "@/hooks/useParts";
import { startOfMonth, subMonths, format, differenceInDays } from "date-fns";

function getStatus(p: Part): "in_stock" | "low_stock" | "out_of_stock" {
  if (p.qty_in_stock === 0) return "out_of_stock";
  if (p.qty_in_stock <= p.reorder_point) return "low_stock";
  return "in_stock";
}

interface Props {
  parts: Part[];
  movements: StockMovement[];
  onFilterLowStock: () => void;
  onViewPart: (p: Part) => void;
}

// Tiny sparkline component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendIndicator({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value > 0) return <span className="flex items-center gap-0.5 text-sm font-medium text-emerald-600"><TrendingUp className="h-3.5 w-3.5" />+{value.toFixed(1)}{suffix}</span>;
  if (value < 0) return <span className="flex items-center gap-0.5 text-sm font-medium text-destructive"><TrendingDown className="h-3.5 w-3.5" />{value.toFixed(1)}{suffix}</span>;
  return <span className="flex items-center gap-0.5 text-sm font-medium text-muted-foreground"><Minus className="h-3.5 w-3.5" />0{suffix}</span>;
}

export function PartsAnalyticsDashboard({ parts, movements, onFilterLowStock, onViewPart }: Props) {
  const analytics = useMemo(() => {
    const now = new Date();
    const totalParts = parts.length;
    const inStock = parts.filter(p => getStatus(p) === "in_stock").length;
    const lowStock = parts.filter(p => getStatus(p) === "low_stock").length;
    const outOfStock = parts.filter(p => getStatus(p) === "out_of_stock").length;

    // Total inventory value
    const totalValue = parts.reduce((s, p) => s + p.qty_in_stock * p.unit_cost, 0);

    // Health score
    const healthScore = totalParts > 0 ? Math.round(
      (inStock / totalParts * 70) +
      ((totalParts - lowStock) / totalParts * 20) +
      ((totalParts - outOfStock) / totalParts * 10)
    ) : 100;

    const healthLabel = healthScore > 90 ? "Excellent" : healthScore > 80 ? "Good" : healthScore > 60 ? "Fair" : "Poor";
    const healthColor = healthScore > 90 ? "text-emerald-600" : healthScore > 80 ? "text-primary" : healthScore > 60 ? "text-yellow-600" : "text-destructive";

    // Monthly burn rates from stock movements
    const monthlyData: { month: string; used: number; cost: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = startOfMonth(subMonths(now, i - 1));
      const monthLabel = format(monthStart, "MMM");
      const monthMvts = movements.filter(m => {
        const d = new Date(m.created_at);
        return m.movement_type === "use" && d >= monthStart && d < monthEnd;
      });
      const usedQty = monthMvts.reduce((s, m) => s + Math.abs(m.quantity), 0);
      const usedCost = monthMvts.reduce((s, m) => {
        const part = parts.find(p => p.id === m.part_id);
        return s + Math.abs(m.quantity) * (part?.unit_cost || 0);
      }, 0);
      monthlyData.push({ month: monthLabel, used: usedQty, cost: usedCost });
    }

    const currentMonthBurn = monthlyData[5]?.cost || 0;
    const prevMonthBurn = monthlyData[4]?.cost || 0;
    const burnTrend = prevMonthBurn > 0 ? ((currentMonthBurn - prevMonthBurn) / prevMonthBurn) * 100 : 0;
    const projectedNext = currentMonthBurn * (1 + burnTrend / 100);

    // Value sparkline (simulated from monthly data)
    const valueSparkline = monthlyData.map((_, i) => totalValue - (5 - i) * (totalValue * 0.01 * (Math.random() - 0.3)));

    // Availability rate
    const thisMonthStart = startOfMonth(now);
    const thisMonthUse = movements.filter(m => m.movement_type === "use" && new Date(m.created_at) >= thisMonthStart);
    const stockoutIncidents = thisMonthUse.filter(m => m.balance_after === 0).length;
    const totalRequests = Math.max(thisMonthUse.length, 1);
    const availabilityRate = ((totalRequests - stockoutIncidents) / totalRequests) * 100;

    // Top used part (last 30 days)
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const usageCounts: Record<string, number> = {};
    movements.filter(m => m.movement_type === "use" && new Date(m.created_at) >= last30).forEach(m => {
      usageCounts[m.part_id] = (usageCounts[m.part_id] || 0) + Math.abs(m.quantity);
    });
    const topPartEntry = Object.entries(usageCounts).sort((a, b) => b[1] - a[1])[0];
    const topPart = topPartEntry ? parts.find(p => p.id === topPartEntry[0]) : null;
    const topPartCount = topPartEntry ? topPartEntry[1] : 0;

    // Reorder alerts
    const reorderParts = parts.filter(p => p.qty_in_stock <= p.reorder_point);
    const reorderCost = reorderParts.reduce((s, p) => s + p.reorder_quantity * p.unit_cost, 0);
    const urgentReorder = reorderParts.filter(p => p.qty_in_stock === 0).length;

    // Cost savings opportunity (estimated)
    const deadStockParts = parts.filter(p => p.qty_in_stock > 0 && (p.usage_count_30d || 0) === 0);
    const deadStockValue = deadStockParts.reduce((s, p) => s + p.qty_in_stock * p.unit_cost, 0);
    const bulkSavings = totalValue * 0.03; // estimate 3% bulk savings
    const supplierOpt = totalValue * 0.01;
    const totalSavings = deadStockValue * 0.15 + bulkSavings + supplierOpt;

    // Category distribution
    const categoryMap: Record<string, number> = {};
    parts.forEach(p => { categoryMap[p.category] = (categoryMap[p.category] || 0) + 1; });
    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // 30-day forecast
    const avgDailyUse: Record<string, number> = {};
    movements.filter(m => m.movement_type === "use" && new Date(m.created_at) >= last30).forEach(m => {
      avgDailyUse[m.part_id] = (avgDailyUse[m.part_id] || 0) + Math.abs(m.quantity);
    });
    const partsRunningOut = parts.filter(p => {
      const dailyRate = (avgDailyUse[p.id] || 0) / 30;
      if (dailyRate <= 0) return false;
      const daysLeft = p.qty_in_stock / dailyRate;
      return daysLeft <= 30;
    }).map(p => {
      const dailyRate = (avgDailyUse[p.id] || 0) / 30;
      return { part: p, daysLeft: Math.round(p.qty_in_stock / dailyRate) };
    }).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);

    const forecastUsage = Object.values(avgDailyUse).reduce((s, v) => s + v, 0);
    const forecastCost = parts.reduce((s, p) => {
      const daily = (avgDailyUse[p.id] || 0) / 30;
      return s + daily * 30 * p.unit_cost;
    }, 0);

    // AI stats (from ai_execution_log - we'll use movements as proxy)
    const aiAssessments = movements.filter(m => m.notes?.toLowerCase().includes("autoheal") || m.notes?.toLowerCase().includes("ai")).length;

    return {
      totalParts, inStock, lowStock, outOfStock, totalValue,
      healthScore, healthLabel, healthColor,
      currentMonthBurn, burnTrend, projectedNext, monthlyData, valueSparkline,
      availabilityRate, stockoutIncidents,
      topPart, topPartCount,
      reorderParts, reorderCost, urgentReorder,
      totalSavings, deadStockValue, bulkSavings, supplierOpt,
      categoryData,
      partsRunningOut, forecastUsage, forecastCost,
      aiAssessments,
    };
  }, [parts, movements]);

  const CHART_COLORS = [
    "hsl(174, 66%, 42%)", // primary teal
    "hsl(217, 69%, 52%)", // secondary blue
    "hsl(45, 93%, 47%)",  // medium yellow
    "hsl(25, 95%, 53%)",  // high orange
    "hsl(0, 84%, 60%)",   // critical red
    "hsl(280, 60%, 55%)", // purple
  ];

  const alertCount = analytics.lowStock + analytics.outOfStock;
  const alertColor = alertCount > 25 ? "bg-destructive/10 border-destructive/30 text-destructive" :
    alertCount > 10 ? "bg-orange-500/10 border-orange-500/30 text-orange-700" :
    "bg-yellow-500/10 border-yellow-500/30 text-yellow-700";

  return (
    <div className="space-y-6">
      {/* ROW 1: PRIMARY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Inventory Value */}
        <Card className="hover:shadow-metric-hover transition-shadow cursor-pointer group">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Inventory Value</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-foreground">${analytics.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <Sparkline data={analytics.valueSparkline} color="hsl(174, 66%, 42%)" />
            </div>
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">{analytics.totalParts} unique parts tracked</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Stock Health Score */}
        <Card className="hover:shadow-metric-hover transition-shadow cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stock Health Score</span>
              <HeartPulse className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold text-foreground">{analytics.healthScore}<span className="text-lg text-muted-foreground">/100</span></p>
              <Badge className={`text-xs ${analytics.healthScore > 90 ? "bg-emerald-500/20 text-emerald-700 border-emerald-500/30" : analytics.healthScore > 80 ? "bg-primary/20 text-primary border-primary/30" : analytics.healthScore > 60 ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" : "bg-destructive/20 text-destructive border-destructive/30"}`}>
                {analytics.healthLabel}
              </Badge>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span className="text-muted-foreground">{analytics.totalParts > 0 ? Math.round(analytics.inStock / analytics.totalParts * 100) : 0}% in stock</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <AlertCircle className="h-3 w-3 text-yellow-600" />
                <span className="text-muted-foreground">{analytics.totalParts > 0 ? Math.round(analytics.lowStock / analytics.totalParts * 100) : 0}% low stock</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <XCircle className="h-3 w-3 text-destructive" />
                <span className="text-muted-foreground">{analytics.totalParts > 0 ? Math.round(analytics.outOfStock / analytics.totalParts * 100) : 0}% out of stock</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Monthly Burn Rate */}
        <Card className="hover:shadow-metric-hover transition-shadow cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Monthly Burn Rate</span>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-foreground">${analytics.currentMonthBurn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <TrendIndicator value={analytics.burnTrend} />
            </div>
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Projected next: <span className="font-medium text-foreground">${analytics.projectedNext.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Parts Availability */}
        <Card className="hover:shadow-metric-hover transition-shadow cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Parts Availability</span>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{analytics.availabilityRate.toFixed(1)}%</p>
              {analytics.availabilityRate < 95 && <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs">Below Target</Badge>}
              {analytics.availabilityRate >= 95 && <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-xs">On Target</Badge>}
            </div>
            <Progress value={analytics.availabilityRate} className="mt-2 h-1.5" />
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Target: &gt;95% · {analytics.stockoutIncidents} stockout{analytics.stockoutIncidents !== 1 ? "s" : ""} this month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: DETAILED BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 5: Parts Count Summary */}
        <Card className="hover:shadow-metric-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Parts Inventory</span>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{analytics.totalParts} <span className="text-sm font-normal text-muted-foreground">parts</span></p>
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> In Stock</span>
                <span className="font-medium">{analytics.inStock}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3 text-yellow-600" /> Low Stock</span>
                <span className="font-medium">{analytics.lowStock}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><XCircle className="h-3 w-3 text-destructive" /> Out of Stock</span>
                <span className="font-medium">{analytics.outOfStock}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Top Used Part */}
        <Card className="hover:shadow-metric-hover transition-shadow cursor-pointer" onClick={() => analytics.topPart && onViewPart(analytics.topPart)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Most Used Part</span>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
            {analytics.topPart ? (
              <>
                <p className="text-lg font-bold text-foreground truncate">{analytics.topPart.part_name}</p>
                <p className="text-xs font-mono text-muted-foreground">{analytics.topPart.part_number}</p>
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">Used <span className="font-medium text-foreground">{analytics.topPartCount}</span> times (30d)</p>
                  <p className="text-xs text-muted-foreground">Stock: <span className="font-medium text-foreground">{analytics.topPart.qty_in_stock}</span> units</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No usage data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Card 7: Reorder Alerts */}
        <Card className="hover:shadow-metric-hover transition-shadow cursor-pointer" onClick={onFilterLowStock}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reorder Alerts</span>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{analytics.reorderParts.length}</p>
              {analytics.reorderParts.length > 0 && <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs">Need Reorder</Badge>}
            </div>
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Est. cost: <span className="font-medium text-foreground">${analytics.reorderCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></p>
              {analytics.urgentReorder > 0 && <p className="text-xs text-destructive font-medium">{analytics.urgentReorder} out of stock (urgent)</p>}
            </div>
          </CardContent>
        </Card>

        {/* Card 8: Cost Savings */}
        <Card className="hover:shadow-metric-hover transition-shadow cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cost Savings Opportunity</span>
              <Lightbulb className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">${analytics.totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <p className="text-xs text-muted-foreground">Bulk orders: <span className="font-medium">${analytics.bulkSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></p>
              <p className="text-xs text-muted-foreground">Dead stock: <span className="font-medium">${(analytics.deadStockValue * 0.15).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></p>
              <p className="text-xs text-muted-foreground">Supplier opt: <span className="font-medium">${analytics.supplierOpt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: TRENDS & CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 9: Usage Trend */}
        <Card className="hover:shadow-metric-hover transition-shadow">
          <CardContent className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Parts Usage Trend (6 Months)</span>
            <div className="h-44 mt-3">
              <ChartContainer config={{ used: { label: "Parts Used", color: "hsl(174, 66%, 42%)" } }} className="h-full w-full [&_.recharts-wrapper]:!overflow-hidden">
                <LineChart data={analytics.monthlyData} margin={{ top: 5, right: 10, bottom: 20, left: 5 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="used" stroke="hsl(174, 66%, 42%)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ChartContainer>
            </div>
            {analytics.monthlyData.length >= 2 && (() => {
              const first = analytics.monthlyData[0]?.used || 0;
              const last = analytics.monthlyData[5]?.used || 0;
              const change = first > 0 ? ((last - first) / first * 100) : 0;
              return <p className="text-xs text-muted-foreground mt-1">Usage {change >= 0 ? "up" : "down"} {Math.abs(change).toFixed(0)}% since {analytics.monthlyData[0]?.month}</p>;
            })()}
          </CardContent>
        </Card>

        {/* Card 10: Category Distribution */}
        <Card className="hover:shadow-metric-hover transition-shadow">
          <CardContent className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Parts by Category</span>
            <div className="h-40 mt-3 flex items-center">
              {analytics.categoryData.length > 0 ? (
                <div className="flex items-center gap-4 w-full">
                  <div className="w-28 h-28 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.categoryData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={2}>
                          {analytics.categoryData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {analytics.categoryData.slice(0, 5).map((cat, i) => (
                      <div key={cat.name} className="flex items-center gap-2 text-xs">
                        <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="truncate text-muted-foreground">{cat.name}</span>
                        <span className="ml-auto font-medium shrink-0">{cat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No parts data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 11: 30-Day Forecast */}
        <Card className="hover:shadow-metric-hover transition-shadow">
          <CardContent className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">30-Day Forecast</span>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Predicted Usage</span>
                <span className="text-sm font-bold">{Math.round(analytics.forecastUsage)} parts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Estimated Cost</span>
                <span className="text-sm font-bold">${analytics.forecastCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              {analytics.partsRunningOut.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs font-medium text-destructive mb-1.5">Parts likely to run out:</p>
                  {analytics.partsRunningOut.map(({ part, daysLeft }) => (
                    <div key={part.id} className="flex items-center justify-between text-xs py-0.5 cursor-pointer hover:text-primary" onClick={() => onViewPart(part)}>
                      <span className="truncate text-muted-foreground">{part.part_number}</span>
                      <span className="font-medium shrink-0 ml-2">~{daysLeft}d</span>
                    </div>
                  ))}
                </div>
              )}
              {analytics.partsRunningOut.length === 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> All parts have adequate stock</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: AUTOHEAL INTEGRATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="hover:shadow-metric-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AutoHeal Accuracy</span>
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">—</p>
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Prediction accuracy (30d)</p>
              <p className="text-xs text-muted-foreground">Tracking begins with AI assessments</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-metric-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Parts Usage by AI</span>
              <Cpu className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{analytics.aiAssessments} <span className="text-sm font-normal text-muted-foreground">parts</span></p>
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Recommended by AutoHeal</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-metric-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top AI Recommendation</span>
              <Cpu className="h-4 w-4 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground">—</p>
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Data populates from AI assessments</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-metric-hover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Improvement</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">—</p>
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Accuracy improvement (90d)</p>
              <p className="text-xs text-muted-foreground">Requires field report data</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Alert Banner */}
      {alertCount > 0 && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm flex items-center justify-between ${alertColor}`}>
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {alertCount} part{alertCount !== 1 ? "s" : ""} at or below reorder point
          </span>
          <Button variant="ghost" size="sm" onClick={onFilterLowStock} className="text-inherit hover:text-inherit">
            View Low Stock <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
