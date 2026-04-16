import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { TicketPriority } from "@/types/assessment";
import { lookupCityCoords } from "./cityLookup";
import { PRIORITY_COLORS, PRIORITY_KEYS } from "./slaConstants";
import { normalizeUSCoords } from "@/lib/coordsValidator";
import { X, MapPin } from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

interface TicketLocation {
  city: string;
  state: string;
  ticketPriority: TicketPriority;
  ticketId: string | null;
}

interface Props {
  tickets: TicketLocation[];
  activeLocationFilter: string | null; // "city|state" or state abbrev
  onFilterCity: (city: string, state: string) => void;
  onFilterState: (state: string) => void;
  onClear: () => void;
}

interface CityCluster {
  city: string;
  state: string;
  lat: number;
  lng: number;
  count: number;
  highestPriority: TicketPriority;
  breakdown: Record<TicketPriority, number>;
}

function getHighestPriority(breakdown: Record<TicketPriority, number>): TicketPriority {
  for (const p of PRIORITY_KEYS) {
    if (breakdown[p] > 0) return p;
  }
  return "P4-Low";
}

function getDominantPriority(breakdown: Record<TicketPriority, number>): TicketPriority {
  let max = 0;
  let dominant: TicketPriority = "P4-Low";
  for (const p of PRIORITY_KEYS) {
    if (breakdown[p] > max) { max = breakdown[p]; dominant = p; }
  }
  return dominant;
}

export function GeographicMapView({ tickets, activeLocationFilter, onFilterCity, onFilterState, onClear }: Props) {
  const [hoveredCity, setHoveredCity] = useState<CityCluster | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const { clusters, stateSummary } = useMemo(() => {
    const cityMap = new Map<string, CityCluster>();
    const stateMap = new Map<string, { count: number; breakdown: Record<TicketPriority, number> }>();

    for (const t of tickets) {
      if (!t.city || !t.state) continue;
      const rawCoords = lookupCityCoords(t.city, t.state);
      const coords = rawCoords ? (() => {
        const n = normalizeUSCoords(rawCoords.lat, rawCoords.lng);
        return n ? { lat: n[0], lng: n[1] } : null;
      })() : null;
      const cityKey = `${t.city.toLowerCase()}|${t.state.toLowerCase()}`;

      if (coords) {
        if (!cityMap.has(cityKey)) {
          cityMap.set(cityKey, {
            city: t.city, state: t.state, lat: coords.lat, lng: coords.lng,
            count: 0, highestPriority: "P4-Low",
            breakdown: { "P1-Critical": 0, "P2-High": 0, "P3-Medium": 0, "P4-Low": 0 },
          });
        }
        const cluster = cityMap.get(cityKey)!;
        cluster.count++;
        cluster.breakdown[t.ticketPriority]++;
        cluster.highestPriority = getHighestPriority(cluster.breakdown);
      }

      if (!stateMap.has(t.state)) {
        stateMap.set(t.state, { count: 0, breakdown: { "P1-Critical": 0, "P2-High": 0, "P3-Medium": 0, "P4-Low": 0 } });
      }
      const s = stateMap.get(t.state)!;
      s.count++;
      s.breakdown[t.ticketPriority]++;
    }

    const stateSummary = Array.from(stateMap.entries())
      .map(([state, data]) => ({ state, ...data, dominantPriority: getDominantPriority(data.breakdown) }))
      .sort((a, b) => b.count - a.count);

    return { clusters: Array.from(cityMap.values()), stateSummary };
  }, [tickets]);

  const markerSize = (count: number) => Math.min(24, Math.max(8, 6 + count * 2));

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Geographic Distribution
        </CardTitle>
        {activeLocationFilter && (
          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={onClear}>
            <X className="h-3 w-3" /> Clear filter
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Map */}
          <div className="flex-1 relative" style={{ height: 320 }}>
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 900 }}
              style={{ width: "100%", height: "100%" }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rpisonKey || geo.properties?.name}
                      geography={geo}
                      fill="hsl(210, 20%, 93%)"
                      stroke="hsl(214, 32%, 85%)"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "hsl(210, 20%, 88%)", outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>
              {clusters.map((c) => (
                <Marker
                  key={`${c.city}-${c.state}`}
                  coordinates={[c.lng, c.lat]}
                  onMouseEnter={(e) => {
                    setHoveredCity(c);
                    setTooltipPos({ x: (e as any).clientX || 0, y: (e as any).clientY || 0 });
                  }}
                  onMouseLeave={() => setHoveredCity(null)}
                  onClick={() => onFilterCity(c.city, c.state)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    r={markerSize(c.count)}
                    fill={PRIORITY_COLORS[c.highestPriority]}
                    fillOpacity={0.75}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  {c.count > 1 && (
                    <text textAnchor="middle" y={4} style={{ fontSize: 9, fill: "white", fontWeight: 700, pointerEvents: "none" }}>
                      {c.count}
                    </text>
                  )}
                </Marker>
              ))}
            </ComposableMap>

            {/* Hover tooltip */}
            {hoveredCity && (
              <div
                className="absolute bg-card border border-border rounded-lg p-3 shadow-lg text-xs z-50 pointer-events-none"
                style={{ top: 10, right: 10 }}
              >
                <p className="font-semibold">{hoveredCity.city}, {hoveredCity.state}</p>
                <p className="text-muted-foreground mb-1">{hoveredCity.count} charger{hoveredCity.count !== 1 ? "s" : ""}</p>
                {PRIORITY_KEYS.map(p => hoveredCity.breakdown[p] > 0 && (
                  <div key={p} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                    <span>{p.split("-")[1]}: {hoveredCity.breakdown[p]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-2 left-2 bg-card/90 border border-border rounded-lg px-3 py-2 flex gap-3 z-10">
              {PRIORITY_KEYS.map(p => (
                <div key={p} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                  {p.replace("-", " ")}
                </div>
              ))}
            </div>
          </div>

          {/* State Sidebar */}
          <div className="w-full lg:w-48 max-h-[320px] overflow-y-auto space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">By State</p>
            {stateSummary.map(s => (
              <button
                key={s.state}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted/70 transition-colors text-left ${
                  activeLocationFilter === s.state ? "bg-primary/10 font-semibold" : ""
                }`}
                onClick={() => onFilterState(s.state)}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[s.dominantPriority] }} />
                <span className="font-medium flex-1">{s.state}</span>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">{s.count}</Badge>
              </button>
            ))}
            {stateSummary.length === 0 && (
              <p className="text-xs text-muted-foreground">No location data</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
