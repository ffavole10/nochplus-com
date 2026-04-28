import { Clock, HelpCircle, TrendingUp, TrendingDown, Minus, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatMTTR, formatPct } from "@/services/reliabilityMetrics";

export type ReliabilityMetric = "RCD" | "FTCSR" | "MTTR" | "TRR";

const METRIC_LABELS: Record<ReliabilityMetric, { label: string; tooltip: string }> = {
  RCD: {
    label: "RCD",
    tooltip: "Reliable Charge Delivery — composite reliability metric blending FTCSR, MTTR and TRR.",
  },
  FTCSR: {
    label: "FTCSR",
    tooltip: "First-Time Charge Success Rate — % of charge attempts that succeed on first try.",
  },
  MTTR: {
    label: "MTTR",
    tooltip: "Mean Time To Resolution — average duration from ticket creation to ticket completion.",
  },
  TRR: {
    label: "TRR",
    tooltip: "Truck Roll Reduction — % of issues resolved without dispatching a field technician.",
  },
};

export type ReliabilityKpiCardProps = {
  metric: ReliabilityMetric;
  /** Numeric value used for delta math; null = awaiting telemetry. */
  value: number | null;
  /** Pre-formatted display value. Falls back to "Awaiting telemetry" when value is null. */
  valueLabel?: string;
  statusPill?: { label: string; tone: "amber" | "green" | "red" | "neutral" };
  /**
   * 30-day delta. `lowerIsBetter` controls polarity for color
   * (MTTR lower=good → green, TRR higher=good → green).
   */
  delta?: { direction: "up" | "down" | "flat"; pct: number; label?: string } | null;
  lowerIsBetter?: boolean;
  /** NOCH+ network avg & top performers in the SAME unit as value. */
  networkAvgLabel?: string | null;
  topPerformersLabel?: string | null;
  /** When true, surface NEVI compliance line on FTCSR card. */
  neviAlert?: boolean;
  scope?: "fleet" | "campaign" | "account";
  size?: "large" | "compact";
  /** Show "Neural OS · <layer>" attribution pill. */
  neuralLayer?: string;
};

const TONE_CLASSES: Record<NonNullable<ReliabilityKpiCardProps["statusPill"]>["tone"], string> = {
  amber: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  green: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  red: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function ReliabilityKpiCard(props: ReliabilityKpiCardProps) {
  const {
    metric,
    value,
    valueLabel,
    statusPill,
    delta,
    lowerIsBetter = false,
    networkAvgLabel,
    topPerformersLabel,
    neviAlert,
    size = "large",
    neuralLayer,
  } = props;

  const muted = value == null;
  const display = valueLabel ?? (muted ? "Awaiting telemetry" : String(value));
  const meta = METRIC_LABELS[metric];

  // Delta polarity: green when "going the right way".
  let deltaTone = "text-muted-foreground";
  let DeltaIcon = Minus;
  if (delta && delta.direction !== "flat") {
    DeltaIcon = delta.direction === "up" ? TrendingUp : TrendingDown;
    const isImproving = lowerIsBetter ? delta.direction === "down" : delta.direction === "up";
    deltaTone = isImproving ? "text-emerald-600" : "text-rose-600";
  }

  const deltaLabel =
    delta?.label ??
    (delta
      ? delta.direction === "flat"
        ? "— no change"
        : `${delta.direction === "up" ? "↑ +" : "↓ -"}${delta.pct.toFixed(0)}% vs 30 days ago`
      : null);

  return (
    <Card className={cn(muted ? "border-border/40 bg-muted/20" : "border-border/60")}>
      <CardContent className={cn(size === "large" ? "p-5 space-y-3" : "p-4 space-y-2")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-bold tracking-wide",
                size === "large" ? "text-sm" : "text-xs",
                muted ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {meta.label}
            </span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{meta.tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {muted && <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />}
        </div>

        <div
          className={cn(
            "font-bold leading-tight",
            size === "large" ? "text-2xl" : "text-xl",
            muted ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {display}
        </div>

        {deltaLabel && !muted && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", deltaTone)}>
            <DeltaIcon className="h-3 w-3" />
            <span>{deltaLabel}</span>
          </div>
        )}

        {statusPill && (
          <Badge
            variant="outline"
            className={cn("text-[10px] font-medium", TONE_CLASSES[statusPill.tone])}
          >
            {statusPill.label}
          </Badge>
        )}

        {neuralLayer && (
          <Badge
            variant="outline"
            className="text-[10px] font-normal lowercase bg-teal-500/5 text-teal-600 border-teal-500/20 gap-1"
          >
            <Brain className="h-2.5 w-2.5" />
            neural os · {neuralLayer}
          </Badge>
        )}

        {(networkAvgLabel || topPerformersLabel || neviAlert) && (
          <div className="pt-2 border-t border-border/40 space-y-0.5">
            {networkAvgLabel && (
              <p className="text-[10px] text-muted-foreground">
                NOCH+ network avg: <span className="font-medium text-foreground/80">{networkAvgLabel}</span>
              </p>
            )}
            {topPerformersLabel && (
              <p className="text-[10px] text-muted-foreground">
                Top NOCH+ performers: <span className="font-medium text-foreground/80">{topPerformersLabel}</span>
              </p>
            )}
            {neviAlert && (
              <p className="text-[10px] text-amber-600 font-medium">
                NEVI compliance threshold: 97%
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Re-export utilities so consumers can import in one place. */
export { formatMTTR, formatPct };
