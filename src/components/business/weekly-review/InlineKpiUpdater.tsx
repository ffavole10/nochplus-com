import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useKpis, useKpiActuals, useKpiActualMutations } from "@/hooks/useStrategy";
import {
  computePhasedKpiStatus, getCurrentQuarterInfo, formatKpiValue,
  PHASED_STATUS_LABELS, PHASED_STATUS_COLORS,
  type StrategyKpi,
} from "@/types/strategy";

interface Props {
  strategyId: string;
  weeklyReviewId: string;
}

function mondayOf(d = new Date()): string {
  const day = d.getDay(); // 0..6, Sun=0
  const diff = (day + 6) % 7; // days back to Monday
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  m.setHours(0, 0, 0, 0);
  return m.toISOString().slice(0, 10);
}

export function InlineKpiUpdater({ strategyId, weeklyReviewId }: Props) {
  const { data: kpis = [] } = useKpis(strategyId);
  const { data: actuals = [] } = useKpiActuals(strategyId);
  const { add, remove } = useKpiActualMutations(strategyId);
  const { quarter, year } = getCurrentQuarterInfo();
  const weekStart = mondayOf();

  const activeKpis = kpis.filter((k) => !k.is_deferred);

  if (activeKpis.length === 0) {
    return (
      <div className="rounded-md bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground italic">
        No KPIs defined for this strategy.
      </div>
    );
  }

  return (
    <div className="rounded-md bg-muted/40 border px-2.5 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          KPI Updates · {quarter} {year}
        </p>
      </div>
      <div className="space-y-1.5">
        {activeKpis.map((k) => (
          <KpiRow
            key={k.id}
            kpi={k}
            actuals={actuals.filter((a) => a.strategy_kpi_id === k.id)}
            weekStart={weekStart}
            quarter={quarter}
            year={year}
            onAdd={async (delta, replaceId) => {
              if (replaceId) await remove.mutateAsync(replaceId);
              await add.mutateAsync({
                strategy_kpi_id: k.id,
                quarter, year,
                actual_value: delta,
                delta_value: delta,
                week_starting: weekStart,
                entered_in_weekly_review: true,
                weekly_review_id: weeklyReviewId,
                notes: null,
                entered_by: null,
              } as any);
              const newTotal = actuals
                .filter((a) => a.strategy_kpi_id === k.id && a.quarter === quarter && a.year === year && a.id !== replaceId)
                .reduce((s, a) => s + Number(a.actual_value || 0), 0) + delta;
              toast.success(`Updated ${k.name} by ${delta > 0 ? "+" : ""}${formatKpiValue(delta, k.unit)}. New ${quarter} total: ${formatKpiValue(newTotal, k.unit)}`);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function KpiRow({
  kpi: k, actuals, weekStart, quarter, year, onAdd,
}: {
  kpi: StrategyKpi;
  actuals: any[];
  weekStart: string;
  quarter: "Q1"|"Q2"|"Q3"|"Q4";
  year: number;
  onAdd: (delta: number, replaceId?: string) => Promise<void>;
}) {
  const [val, setVal] = useState("");
  const [flash, setFlash] = useState(false);
  const [pending, setPending] = useState(false);

  const isPhased = k.target_type === "phased";
  const isBinary = k.unit === "yes_no";

  const status = useMemo(() => isPhased ? computePhasedKpiStatus(k, actuals) : null, [isPhased, k, actuals]);
  const qActuals = actuals.filter((a) => a.quarter === quarter && a.year === year);
  const currentQuarterTotal = qActuals.reduce((s, a) => s + Number(a.actual_value || 0), 0);
  const cumulative = isPhased ? currentQuarterTotal : Number(k.current_value || 0) + qActuals.reduce((s, a) => s + Number(a.actual_value || 0), 0);
  const targetForDisplay = isPhased ? (status?.quarterTarget || 0) : Number(k.target_value || 0);

  const existingThisWeek = qActuals.find((a) => a.week_starting === weekStart && a.entered_in_weekly_review);

  const handleSave = async () => {
    const n = Number(val);
    if (!n || n <= 0 || isNaN(n)) {
      toast.error("Enter a positive number");
      return;
    }
    let replaceId: string | undefined;
    if (existingThisWeek) {
      const choice = window.confirm(
        `You already added ${formatKpiValue(Number(existingThisWeek.actual_value), k.unit)} for "${k.name}" this week. OK = replace, Cancel = add to it.`
      );
      if (choice) replaceId = existingThisWeek.id;
    }
    setPending(true);
    try {
      await onAdd(n, replaceId);
      setVal("");
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
    } finally {
      setPending(false);
    }
  };

  if (isBinary) {
    const last = qActuals[0];
    const currentStatus = last?.notes || "Not yet";
    return (
      <div className={cn("rounded px-2 py-1.5 transition-colors", flash ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-background")}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{k.name}</p>
            <p className="text-[10px] text-muted-foreground">Status: {currentStatus}</p>
          </div>
          <div className="flex gap-1">
            {["Still on track", "Slipping", "Achieved"].map((label) => (
              <Button
                key={label}
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  try { await onAdd(label === "Achieved" ? 1 : 0); setFlash(true); setTimeout(() => setFlash(false), 800); }
                  finally { setPending(false); }
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded px-2 py-1.5 transition-colors", flash ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-background")}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium truncate">{k.name}</p>
            {status && (
              <Badge variant="outline" className={cn("text-[9px] py-0 h-4", PHASED_STATUS_COLORS[status.status])}>
                📊 {Math.round(status.pace * 100)}% · {PHASED_STATUS_LABELS[status.status]}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Current: <span className="font-medium text-foreground">{formatKpiValue(cumulative, k.unit)}</span>
            {targetForDisplay > 0 && (
              <> / {formatKpiValue(targetForDisplay, k.unit)} {isPhased ? `${quarter} target` : "target"}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Add this week"
            className="h-7 w-24 text-xs"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
          <Button size="sm" className="h-7 text-[10px] px-2 bg-teal-600 hover:bg-teal-700 text-white" disabled={pending || !val} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
