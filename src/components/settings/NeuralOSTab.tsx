import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYERS, type LayerDef } from "./neural-os/layerData";
import { LayerDetailModal } from "./neural-os/LayerDetailModal";

const KPIS = [
  { label: "Decisions Today", hint: "Autonomous Neural OS actions in last 24h" },
  { label: "Avg Confidence", hint: "Average confidence score across all decisions" },
  { label: "HITL Escalations", hint: "Decisions escalated to human approval" },
  { label: "Resolution Rate (24h)", hint: "% resolved without human dispatch" },
];

export function NeuralOSTab() {
  const [openLayer, setOpenLayer] = useState<LayerDef | null>(null);
  const allHealthy = LAYERS.every((l) => l.status === "active");
  const degradedCount = LAYERS.filter((l) => l.status === "degraded").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Neural OS</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            The agentic intelligence layer behind NOCH+. Six layers, six agents, one
            closed-loop reliability system.
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
            allHealthy
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full animate-pulse",
              allHealthy ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          {allHealthy ? "All systems operational" : `${degradedCount} layer degraded`}
        </div>
      </div>

      {/* Overview strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map((kpi) => (
          <Card key={kpi.label} className="p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold tracking-wider uppercase">
                {kpi.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">—</div>
            <Badge
              variant="outline"
              className="text-[10px] font-medium border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
              Awaiting telemetry · Pilot · CARB integration in progress
            </Badge>
          </Card>
        ))}
      </div>

      {/* Six layer panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {LAYERS.map((layer) => (
          <LayerPanel key={layer.id} layer={layer} onOpen={() => setOpenLayer(layer)} />
        ))}
      </div>

      <LayerDetailModal layer={openLayer} onClose={() => setOpenLayer(null)} />
    </div>
  );
}

function LayerPanel({ layer, onOpen }: { layer: LayerDef; onOpen: () => void }) {
  const Icon = layer.icon;
  const statusColor =
    layer.status === "active"
      ? "bg-emerald-500"
      : layer.status === "degraded"
        ? "bg-amber-500"
        : "bg-muted-foreground";

  return (
    <Card
      onClick={onOpen}
      className="p-5 cursor-pointer hover:border-teal-500/50 hover:shadow-md transition-all space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-teal-500/10 border border-teal-500/30 p-2">
            <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{layer.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <span className={cn("h-2 w-2 rounded-full", statusColor)} />
          {layer.status}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">{layer.description}</p>

      {/* Agents */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Agents
        </div>
        {layer.agents.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Cross-cutting policy layer · no single named agent
          </p>
        ) : (
          <ul className="space-y-1.5">
            {layer.agents.map((a) => (
              <li key={a.name} className="flex items-start gap-2 text-xs">
                <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">
                  {a.name}
                </Badge>
                <span className="text-muted-foreground flex-1">{a.role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Recent activity
        </div>
        <p className="text-xs text-muted-foreground italic">{layer.recentActivity}</p>
      </div>

      {/* Threshold */}
      <div className="pt-2 border-t border-border">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Confidence threshold
        </div>
        <p className="text-xs text-foreground">{layer.confidenceThreshold}</p>
      </div>
    </Card>
  );
}
