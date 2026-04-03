import { Badge } from "@/components/ui/badge";

interface ScanMetricsProps {
  metrics: {
    total: number;
    inScope: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    ok: number;
    dc: number;
    ac: number;
  };
}

export function ScanMetrics({ metrics }: ScanMetricsProps) {
  const cards = [
    { label: "Total Chargers", value: metrics.total, sub: `DC: ${metrics.dc}  AC: ${metrics.ac}`, color: "text-foreground" },
    { label: "In Scope", value: metrics.inScope, sub: `of ${metrics.total}`, color: "text-foreground" },
    { label: "Critical", value: metrics.critical, color: "text-[hsl(var(--critical))]" },
    { label: "High", value: metrics.high, color: "text-[hsl(var(--high))]" },
    { label: "Medium", value: metrics.medium, color: "text-[hsl(var(--medium))]" },
    { label: "Low", value: metrics.low, color: "text-[hsl(var(--low))]" },
    { label: "OK", value: metrics.ok, color: "text-primary" },
  ];

  return (
    <div className="px-4 py-3 border-b bg-card flex gap-3 overflow-x-auto">
      {cards.map(card => (
        <div key={card.label} className="flex-1 min-w-[100px] rounded-lg border bg-background p-3 text-center">
          <div className={`text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</div>
          <div className="text-[11px] text-muted-foreground font-medium">{card.label}</div>
          {card.sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{card.sub}</div>}
        </div>
      ))}
    </div>
  );
}
