import { useMemo } from "react";
import { MapPin } from "lucide-react";
import type { CampaignChargerRow } from "@/hooks/useCampaignChargers";
import type { DeployTech, DeployScheduleResult } from "@/lib/deployRouteOptimizer";

interface DeployMapPanelProps {
  chargers: CampaignChargerRow[];
  chargerTechMap: Map<string, string>;
  deployTechs: DeployTech[];
  scheduleResult: DeployScheduleResult | null;
}

export function DeployMapPanel({ chargers, chargerTechMap, deployTechs, scheduleResult }: DeployMapPanelProps) {
  const techColorMap = useMemo(() => {
    const map = new Map<string, string>();
    deployTechs.forEach(t => map.set(t.technician_id, t.color));
    return map;
  }, [deployTechs]);

  // Group chargers by location for display
  const chargersByState = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of chargers) {
      const st = c.state || "Unknown";
      map.set(st, (map.get(st) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [chargers]);

  const hasCoords = chargers.some(c => c.latitude && c.longitude);

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Map placeholder with charger distribution */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
        {/* Visual map representation */}
        <div className="w-full max-w-lg space-y-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">Charger Distribution</h3>
          </div>

          {/* Tech legend */}
          {deployTechs.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center mb-4">
              {deployTechs.map(t => {
                const count = chargers.filter(c => chargerTechMap.get(c.id) === t.technician_id).length;
                return (
                  <div key={t.technician_id} className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span>{t.name}</span>
                    <span className="text-muted-foreground">({count})</span>
                  </div>
                );
              })}
              {chargers.filter(c => !chargerTechMap.has(c.id)).length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                  <span className="text-muted-foreground">Unassigned ({chargers.filter(c => !chargerTechMap.has(c.id)).length})</span>
                </div>
              )}
            </div>
          )}

          {/* State distribution bars */}
          <div className="space-y-1.5">
            {chargersByState.slice(0, 15).map(([state, count]) => {
              const maxCount = chargersByState[0]?.[1] || 1;
              const pct = (count / maxCount) * 100;
              // Color by primary tech in this state
              const stateChargers = chargers.filter(c => c.state === state);
              const techCounts = new Map<string, number>();
              stateChargers.forEach(c => {
                const tid = chargerTechMap.get(c.id);
                if (tid) techCounts.set(tid, (techCounts.get(tid) || 0) + 1);
              });
              let topTechColor = "hsl(var(--muted-foreground) / 0.3)";
              let topCount = 0;
              techCounts.forEach((cnt, tid) => {
                if (cnt > topCount) { topCount = cnt; topTechColor = techColorMap.get(tid) || topTechColor; }
              });

              return (
                <div key={state} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-right text-muted-foreground font-mono">{state}</span>
                  <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all"
                      style={{ width: `${pct}%`, backgroundColor: topTechColor, opacity: 0.7 }}
                    />
                  </div>
                  <span className="w-8 text-muted-foreground tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Schedule route info */}
          {scheduleResult && scheduleResult.days.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h4 className="text-xs font-semibold mb-2">Route Summary</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-card rounded-md p-2 border">
                  <div className="text-lg font-bold text-primary">{scheduleResult.days.length}</div>
                  <div className="text-[10px] text-muted-foreground">Total Days</div>
                </div>
                <div className="bg-card rounded-md p-2 border">
                  <div className="text-lg font-bold text-foreground">
                    {scheduleResult.days.filter(d => d.day_type === "work").reduce((s, d) => s + d.sites.length, 0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Chargers</div>
                </div>
                <div className="bg-card rounded-md p-2 border">
                  <div className="text-lg font-bold text-foreground">
                    {Math.round(scheduleResult.days.reduce((s, d) => s + d.total_drive_miles, 0)).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Miles</div>
                </div>
              </div>
            </div>
          )}

          {!hasCoords && (
            <p className="text-xs text-muted-foreground mt-4">
              Chargers missing coordinates won't appear on the map. Return to Upload to fix.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
