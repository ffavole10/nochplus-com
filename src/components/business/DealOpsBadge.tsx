import { Zap, Wrench, DollarSign, Info } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AccountOpsSnapshot } from "@/types/growth";

interface Props {
  ops?: AccountOpsSnapshot | null;
  customerName: string;
  lastBriefAt?: string | null;
  buyingSignal?: "none" | "weak" | "moderate" | "strong" | null;
}

function incidentColor(incidents: number, chargers: number): string {
  if (chargers <= 0) return "text-muted-foreground";
  const ratio = incidents / chargers;
  if (ratio < 0.3) return "text-emerald-600";
  if (ratio <= 0.7) return "text-amber-600";
  return "text-rose-600";
}

function relativeTime(iso?: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const SIGNAL_LABEL: Record<string, { label: string; color: string }> = {
  none: { label: "None", color: "text-muted-foreground" },
  weak: { label: "Weak 🟡", color: "text-amber-600" },
  moderate: { label: "Moderate 🟠", color: "text-orange-600" },
  strong: { label: "Strong 🟢", color: "text-emerald-600" },
};

export function DealOpsBadge({ ops, customerName, lastBriefAt, buyingSignal }: Props) {
  const hasData = ops && (ops.charger_count ?? 0) > 0;
  const signal = buyingSignal && SIGNAL_LABEL[buyingSignal] ? SIGNAL_LABEL[buyingSignal] : SIGNAL_LABEL.none;

  return (
    <HoverCard openDelay={500} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-1.5 text-[10px] border-t border-border/50 pt-1.5 cursor-default select-none">
          {hasData ? (
            <>
              <Zap className="h-3 w-3 text-primary shrink-0" />
              <span className="text-muted-foreground">{ops!.charger_count} chargers</span>
              <span className="text-muted-foreground">·</span>
              <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className={cn("font-semibold tabular-nums", incidentColor(ops!.incidents_30d, ops!.charger_count))}>
                {ops!.incidents_30d}/30d
              </span>
              <span className="text-muted-foreground">·</span>
              <DollarSign className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="text-emerald-700 font-medium tabular-nums">
                ~${Number(ops!.estimated_monthly_savings || 0).toLocaleString()}/mo
              </span>
            </>
          ) : (
            <>
              <Zap className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              <span className="text-muted-foreground/70 italic">No ops data yet</span>
            </>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-80 z-[1500]">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between border-b pb-2">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              {customerName}
            </p>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Live Ops</span>
          </div>
          {hasData ? (
            <div className="space-y-1.5 text-xs">
              <Row label="Chargers" value={`${ops!.charger_count} across ${ops!.sites_count} sites`} />
              <Row label="Incidents (30d)" value={String(ops!.incidents_30d)} valueClass={incidentColor(ops!.incidents_30d, ops!.charger_count)} />
              <Row label="Truck rolls (30d)" value={String(ops!.truck_rolls_30d)} />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  Uptime (estimated)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground/60" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-xs z-[2000]">
                        Estimated from service ticket data. Will update with OCPP telemetry.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
                <span className="font-semibold tabular-nums">{Number(ops!.uptime_pct ?? 100).toFixed(1)}%</span>
              </div>
              <Row
                label="Est. NOCH+ savings"
                value={`~$${Number(ops!.estimated_monthly_savings || 0).toLocaleString()}/mo`}
                valueClass="text-emerald-700 font-bold"
              />
              <div className="border-t pt-2 mt-2 space-y-1">
                <Row label="Last brief" value={relativeTime(lastBriefAt)} />
                <Row label="Buying signal" value={signal.label} valueClass={signal.color + " font-semibold"} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No ops data yet — this customer doesn't have chargers in the NOCH+ system.
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function Row({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", valueClass)}>{value}</span>
    </div>
  );
}
