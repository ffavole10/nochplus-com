import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Gauge, Sparkles, Plug, Clock, Brain } from "lucide-react";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import { subDays } from "date-fns";
import {
  computeMTTR,
  computeNetworkBenchmarks,
  formatMTTR,
  TRUCK_ROLL_COST_USD,
} from "@/services/reliabilityMetrics";

function RoiCard({
  icon: Icon,
  label,
  value,
  sub,
  neuralLayer,
  building,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  neuralLayer?: string;
  building?: boolean;
}) {
  return (
    <Card className={building ? "border-border/40 bg-muted/20" : "border-border/60"}>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon className={`h-4 w-4 ${building ? "text-muted-foreground" : "text-primary"}`} />
            <span className={`text-sm font-bold ${building ? "text-muted-foreground" : "text-foreground"}`}>
              {label}
            </span>
          </div>
          {building && <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />}
        </div>
        <div className={`text-2xl font-bold ${building ? "text-muted-foreground" : "text-foreground"}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{sub}</p>
        {neuralLayer && !building && (
          <Badge
            variant="outline"
            className="text-[10px] font-normal lowercase bg-teal-500/5 text-teal-600 border-teal-500/20 gap-1"
          >
            <Brain className="h-2.5 w-2.5" />
            neural os · {neuralLayer}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export function MemberRoiSection() {
  const allTickets = useServiceTicketsStore((s) => s.tickets);

  const stats = useMemo(() => {
    const cutoff = subDays(new Date(), 90);
    const resolved = allTickets.filter(
      (t) => t.status === "completed" && t.updatedAt && new Date(t.updatedAt) >= cutoff,
    );
    const truckRollsAvoided = resolved.filter((t) => !t.fieldReportUrl).length;
    const autoTriaged = allTickets.filter(
      (t) =>
        t.assessmentData &&
        t.createdAt &&
        new Date(t.createdAt) >= cutoff,
    ).length;

    // MTTR improvement: members vs non-members proxy. With no member flag
    // available we use the ratio of network avg MTTR to top performers as
    // a stand-in: i.e. how much faster the leaders resolve.
    const benchmarks = computeNetworkBenchmarks(allTickets);
    const mttrAll = computeMTTR(allTickets);
    let improvementPct: number | null = null;
    if (benchmarks.mttrAvgHrs && benchmarks.mttrTopHrs && benchmarks.mttrAvgHrs > 0) {
      improvementPct = ((benchmarks.mttrAvgHrs - benchmarks.mttrTopHrs) / benchmarks.mttrAvgHrs) * 100;
    }

    return {
      truckRollsAvoided,
      autoTriaged,
      improvementPct,
      mttrAll,
      benchmarks,
    };
  }, [allTickets]);

  const dollarsSaved = stats.truckRollsAvoided * TRUCK_ROLL_COST_USD;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-bold text-foreground">Member ROI Delivered</h2>
        <p className="text-xs text-muted-foreground">What NOCH+ has saved members in the last 90 days.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RoiCard
          icon={Truck}
          label="Truck Rolls Avoided"
          value={stats.truckRollsAvoided > 0 ? String(stats.truckRollsAvoided) : "Building baseline"}
          sub={
            stats.truckRollsAvoided > 0
              ? `≈ $${dollarsSaved.toLocaleString()} saved`
              : "Tracking remote resolutions"
          }
          building={stats.truckRollsAvoided === 0}
        />
        <RoiCard
          icon={Gauge}
          label="Avg MTTR Improvement"
          value={stats.improvementPct != null ? `${stats.improvementPct.toFixed(0)}%` : "Building baseline"}
          sub={
            stats.improvementPct != null
              ? `Top members resolve ${stats.improvementPct.toFixed(0)}% faster than network avg`
              : "Awaiting comparable resolved-ticket sample"
          }
          neuralLayer="learning from outcomes"
          building={stats.improvementPct == null}
        />
        <RoiCard
          icon={Sparkles}
          label="Tickets Auto-Triaged"
          value={stats.autoTriaged > 0 ? String(stats.autoTriaged) : "Building baseline"}
          sub="Issues diagnosed without manual dispatch"
          neuralLayer="reasoning layer"
          building={stats.autoTriaged === 0}
        />
        <RoiCard
          icon={Plug}
          label="Chargers Under NOCH+ Mgmt"
          value="Building baseline"
          sub="— AC L2 · — DC Fast"
          building
        />
      </div>
    </section>
  );
}
