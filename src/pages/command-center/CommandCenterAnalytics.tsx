import { useMemo } from "react";
import { Activity, Clock, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import { format, subDays, differenceInHours, startOfDay } from "date-fns";

type KpiCardProps = {
  label: string;
  tooltip: string;
  value: string;
  pillText?: string;
  pillTone?: "pilot" | "active";
  benchmark?: string;
  trend?: { dir: "up" | "down"; text: string } | null;
  muted: boolean;
};

function KpiCard({ label, tooltip, value, pillText, pillTone = "pilot", benchmark, trend, muted }: KpiCardProps) {
  return (
    <Card className={muted ? "border-border/40 bg-muted/20" : "border-border/60"}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-bold tracking-wide ${muted ? "text-muted-foreground" : "text-foreground"}`}>
              {label}
            </span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {muted && <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />}
        </div>

        <div className={`text-2xl font-bold ${muted ? "text-muted-foreground" : "text-foreground"}`}>
          {value}
        </div>

        {trend && !muted && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.dir === "down" ? "text-emerald-600" : "text-amber-600"}`}>
            {trend.dir === "down" ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            <span>{trend.text}</span>
          </div>
        )}

        {pillText && (
          <Badge
            variant="outline"
            className={
              pillTone === "pilot"
                ? "bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-medium"
                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-medium"
            }
          >
            {pillText}
          </Badge>
        )}

        {benchmark && (
          <p className="text-[10px] text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
            {benchmark}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommandCenterAnalytics() {
  usePageTitle("Analytics");
  const allTickets = useServiceTicketsStore((s) => s.tickets);

  // MTTR — average hours/days between createdAt and updatedAt for completed tickets in last 90 days
  const mttr = useMemo(() => {
    const cutoff = subDays(new Date(), 90);
    const completed = allTickets.filter(
      (t) => t.status === "completed" && t.createdAt && t.updatedAt && new Date(t.updatedAt) >= cutoff,
    );
    if (completed.length === 0) return null;
    const totalHrs = completed.reduce(
      (sum, t) => sum + Math.max(0, differenceInHours(new Date(t.updatedAt), new Date(t.createdAt))),
      0,
    );
    const avgHrs = totalHrs / completed.length;
    return { avgHrs, count: completed.length };
  }, [allTickets]);

  // 90-day trend: tickets resolved per day
  const trendData = useMemo(() => {
    const cutoff = subDays(new Date(), 90);
    const buckets: Record<string, number> = {};
    for (let i = 89; i >= 0; i--) {
      const d = format(startOfDay(subDays(new Date(), i)), "MMM d");
      buckets[d] = 0;
    }
    allTickets.forEach((t) => {
      if (t.status !== "completed" || !t.updatedAt) return;
      const d = new Date(t.updatedAt);
      if (d < cutoff) return;
      const key = format(startOfDay(d), "MMM d");
      if (key in buckets) buckets[key] += 1;
    });
    return Object.entries(buckets).map(([date, resolved]) => ({ date, resolved }));
  }, [allTickets]);

  const totalResolved90d = trendData.reduce((sum, d) => sum + d.resolved, 0);

  const formatMTTR = (avgHrs: number) => {
    if (avgHrs >= 48) return `${(avgHrs / 24).toFixed(1)} days`;
    return `${Math.round(avgHrs)} hours`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Asset reliability insights across the NOCH network. The KPIs that define operational health.
            </p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-8">
        {/* Headline KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="RCD"
            tooltip="Reliable Charge Delivery — composite north-star metric"
            value="Awaiting telemetry"
            pillText="Pilot · CARB integration in progress"
            pillTone="pilot"
            muted
          />
          <KpiCard
            label="FTCSR"
            tooltip="First-Time Charge Success Rate — % of charge attempts that succeed on first try"
            value="Awaiting telemetry"
            pillText="Pilot · CARB integration in progress"
            pillTone="pilot"
            benchmark="Industry: 71% · Tesla: 99.95% · Target: 95%+"
            muted
          />
          <KpiCard
            label="MTTR"
            tooltip="Mean Time To Resolution — average time from incident detection to charger back in service"
            value={mttr ? formatMTTR(mttr.avgHrs) : "Awaiting telemetry"}
            pillText={mttr ? `Live · ${mttr.count} resolved (90d)` : "Pilot · awaiting resolved tickets"}
            pillTone={mttr ? "active" : "pilot"}
            muted={!mttr}
          />
          <KpiCard
            label="TRR"
            tooltip="Truck Roll Reduction — % of issues resolved without dispatching a field technician"
            value="Awaiting telemetry"
            pillText="Pilot · CARB integration in progress"
            pillTone="pilot"
            muted
          />
        </div>

        {/* 90-day trend chart */}
        <Card className="border-border/60">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Network Health Trend (Last 90 Days)</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Daily ticket resolution volume.</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total resolved</div>
                <div className="text-lg font-bold text-foreground">{totalResolved90d}</div>
              </div>
            </div>
            {totalResolved90d === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground italic border border-dashed border-border/60 rounded-lg">
                Trend data populates as more tickets are resolved.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      interval={Math.max(0, Math.floor(trendData.length / 8) - 1)}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <RTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card className="border-dashed border-border/60 bg-muted/20">
          <CardContent className="p-6 space-y-2">
            <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground">Coming Soon</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Per-account breakdown, per-OEM analysis, predictive failure trends, and exportable reports will populate here as the Neural OS Sensing layer comes online with the CARB pilot integration.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
