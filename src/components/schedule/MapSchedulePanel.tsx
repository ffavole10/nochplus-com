import { useMemo, useState } from "react";
import { AssessmentCharger } from "@/types/assessment";
import { getRegion, REGION_COLORS, Region } from "@/lib/regionMapping";
import { getCityCoords } from "@/lib/cityCoordinates";
import { getChargerSchedulePriority, SchedulePriority } from "@/lib/ticketPriority";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarPlus, Plane, Clock, MapPin, Zap, Plug, AlertTriangle } from "lucide-react";
import type { CityCluster } from "./ChargerMapPanel";

const PRIORITY_BADGE: Record<SchedulePriority, string> = {
  "P1-Critical": "bg-critical/10 text-critical border-critical/30",
  "P2-High": "bg-degraded/10 text-degraded border-degraded/30",
  "P3-Medium": "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  "P4-Low": "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  "Optimal": "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

const PRIORITY_LABEL: Record<SchedulePriority, string> = {
  "P1-Critical": "Critical",
  "P2-High": "High",
  "P3-Medium": "Medium",
  "P4-Low": "Low",
  "Optimal": "Optimal",
};

interface MapSchedulePanelProps {
  selectedCluster: CityCluster | null;
  visibleClusters?: CityCluster[];
  allChargers: AssessmentCharger[];
  hoursPerCharger?: number;
}

export function MapSchedulePanel({ selectedCluster, visibleClusters = [], allChargers, hoursPerCharger = 2 }: MapSchedulePanelProps) {
  const [tripMode, setTripMode] = useState(false);


  const getPriority = (c: AssessmentCharger): SchedulePriority => getChargerSchedulePriority(c);

  // Trip estimate for a group
  const tripEstimate = (count: number) => {
    const workingDays = Math.ceil((count * hoursPerCharger) / 8);
    return { travelDays: 2, workingDays, totalDays: workingDays + 2 };
  };

  // Chargers to display: selected cluster chargers, or all visible chargers from viewport
  const displayChargers = useMemo(() => {
    if (selectedCluster) return selectedCluster.chargers;
    return visibleClusters.flatMap(cl => cl.chargers);
  }, [selectedCluster, visibleClusters]);

  const displayTitle = selectedCluster
    ? `${selectedCluster.city}, ${selectedCluster.state}`
    : `Chargers in View`;

  const displaySubtitle = selectedCluster
    ? selectedCluster.region
    : `${visibleClusters.length} location${visibleClusters.length !== 1 ? "s" : ""}`;

  const totalHours = displayChargers.length * hoursPerCharger;

  // Count chargers that can't be mapped (no coords and no city lookup match)
  const unmappableCount = useMemo(() => {
    return allChargers.filter(c => {
      const hasPrecise = typeof c.latitude === "number" && typeof c.longitude === "number"
        && isFinite(c.latitude) && isFinite(c.longitude);
      if (hasPrecise) {
        // Check continental US bounds
        return c.latitude! < 24 || c.latitude! > 50 || c.longitude! < -130 || c.longitude! > -65;
      }
      return !getCityCoords(c.city, c.state);
    }).length;
  }, [allChargers]);
  // Group by region
  const grouped = useMemo(() => {
    const map = new Map<Region, AssessmentCharger[]>();
    displayChargers.forEach(c => {
      const r = getRegion(c.city, c.state);
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(c);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [displayChargers]);

  if (displayChargers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-[200px]">
          <MapPin className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No chargers in view</p>
          <p className="text-xs text-muted-foreground mt-1">
            Zoom or pan the map to see chargers in this area
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Summary header */}
      <div className="p-4 border-b border-border space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {displayTitle}
          </h3>
          <p className="text-[11px] text-muted-foreground">{displaySubtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Chargers: </span>
            <span className="font-semibold">{displayChargers.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Est. hours: </span>
            <span className="font-semibold">{totalHours}h</span>
          </div>
        </div>
        <Button size="sm" className="w-full h-8 text-xs bg-[#00b388] hover:bg-[#00b388]/90 text-white">
          <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
          Schedule All {selectedCluster ? "Selected" : "in View"}
        </Button>
      </div>

      {/* Trip Mode toggle */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1.5 cursor-pointer">
          <Plane className="h-3.5 w-3.5 text-muted-foreground" />
          Trip Mode
        </Label>
        <Switch checked={tripMode} onCheckedChange={setTripMode} className="scale-75" />
      </div>

      {/* Charger list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {selectedCluster ? (
            // Grouped by region when a specific cluster is selected
            grouped.map(([region, regionChargers]) => {
              const trip = tripEstimate(regionChargers.length);
              return (
                <div key={region} className="space-y-1 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: REGION_COLORS[region] }} />
                    <span className="text-xs font-semibold text-foreground">{region}</span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">{regionChargers.length}</Badge>
                  </div>
                  {tripMode && (
                    <div className="mb-2 p-2 rounded-md bg-muted/50 border border-border text-[10px] flex items-center gap-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Plane className="h-3 w-3" />
                        <span>{trip.travelDays}d travel</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{trip.workingDays}d work</span>
                      </div>
                      <div className="font-medium text-foreground ml-auto">
                        {trip.totalDays} days total
                      </div>
                    </div>
                  )}
                  {regionChargers.map(c => {
                    const priority = getPriority(c);
                    return (
                      <div key={c.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-foreground truncate">{c.assetName || c.evseId || c.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-muted-foreground">{c.city}, {c.state}</p>
                        </div>
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${PRIORITY_BADGE[priority]}`}>{PRIORITY_LABEL[priority]}</Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          {c.assetRecordType === "DC | Level 3" ? <Zap className="h-2.5 w-2.5" /> : <Plug className="h-2.5 w-2.5" />}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" title="Add to Schedule">
                          <CalendarPlus className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                  <Separator className="mt-3" />
                </div>
              );
            })
          ) : (
            // Flat list when viewing viewport chargers (no region headers)
            displayChargers.map(c => {
              const priority = getPriority(c);
              return (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-foreground truncate">{c.assetName || c.evseId || c.id.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground">{c.city}, {c.state}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${PRIORITY_BADGE[priority]}`}>{PRIORITY_LABEL[priority]}</Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    {c.assetRecordType === "DC | Level 3" ? <Zap className="h-2.5 w-2.5" /> : <Plug className="h-2.5 w-2.5" />}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" title="Add to Schedule">
                    <CalendarPlus className="h-3 w-3" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Unmappable chargers note */}
      {unmappableCount > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span>{unmappableCount} charger{unmappableCount !== 1 ? "s" : ""} not shown — missing or invalid coordinates</span>
        </div>
      )}
    </div>
  );
}
