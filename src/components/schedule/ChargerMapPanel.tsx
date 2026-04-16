import { useMemo, useState, useCallback, useEffect } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { geoAlbersUsa } from "d3-geo";
import { AssessmentCharger } from "@/types/assessment";
import { getCityCoords } from "@/lib/cityCoordinates";
import { getRegion, REGION_COLORS, Region } from "@/lib/regionMapping";
import { getChargerSchedulePriority, SchedulePriority } from "@/lib/ticketPriority";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const PRIORITY_DOT_COLORS: Record<SchedulePriority, string> = {
  "P1-Critical": "#ef4444",
  "P2-High": "#f59e0b",
  "P3-Medium": "#eab308",
  "P4-Low": "#22c55e",
  "Optimal": "#25b3a5",
};

const PRIORITY_LABEL: Record<SchedulePriority, string> = {
  "P1-Critical": "Critical",
  "P2-High": "High",
  "P3-Medium": "Medium",
  "P4-Low": "Low",
  "Optimal": "Optimal",
};

interface CityCluster {
  key: string;
  city: string;
  state: string;
  region: Region;
  coords: [number, number];
  chargers: AssessmentCharger[];
  priorityBreakdown: Record<string, number>;
  dominantPriority: string;
}

export interface MapViewport {
  center: [number, number];
  zoom: number;
}

interface ChargerMapPanelProps {
  chargers: AssessmentCharger[];
  selectedClusterKey: string | null;
  onSelectCluster: (cluster: CityCluster | null) => void;
  onViewportChange?: (viewport: MapViewport, visibleClusters: CityCluster[]) => void;
}

export type { CityCluster };

export function ChargerMapPanel({ chargers, selectedClusterKey, onSelectCluster, onViewportChange }: ChargerMapPanelProps) {
  const [hoveredCluster, setHoveredCluster] = useState<CityCluster | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([-96, 38]);
  const clusters = useMemo(() => {
    const map = new Map<string, CityCluster>();
    chargers.forEach(c => {
      const hasPreciseCoords = typeof c.latitude === "number" && typeof c.longitude === "number"
        && isFinite(c.latitude) && isFinite(c.longitude);
      const coords: [number, number] | null = hasPreciseCoords
        ? [c.latitude as number, c.longitude as number]
        : getCityCoords(c.city, c.state);
      if (!coords) return;
      const key = hasPreciseCoords
        ? `${(c.latitude as number).toFixed(6)},${(c.longitude as number).toFixed(6)}`
        : `${(c.city || "").toLowerCase()},${(c.state || "").toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          city: c.city || "Unknown",
          state: c.state || "",
          region: getRegion(c.city, c.state),
          coords,
          chargers: [],
          priorityBreakdown: { "P1-Critical": 0, "P2-High": 0, "P3-Medium": 0, "P4-Low": 0, "Optimal": 0 },
          dominantPriority: "Optimal",
        });
      }
      const cluster = map.get(key)!;
      cluster.chargers.push(c);
      const p = getChargerSchedulePriority(c);
      cluster.priorityBreakdown[p]++;
    });
    // Set dominant priority
    map.forEach(cluster => {
      const order: SchedulePriority[] = ["P1-Critical", "P2-High", "P3-Medium", "P4-Low", "Optimal"];
      cluster.dominantPriority = order.find(p => cluster.priorityBreakdown[p] > 0) || "Optimal";
    });
    return Array.from(map.values());
  }, [chargers]);

  // Create a matching projection for viewport calculations
  const projection = useMemo(() => geoAlbersUsa().scale(1000).translate([400, 300]), []);

  // Default SVG dimensions for ComposableMap
  const MAP_WIDTH = 800;
  const MAP_HEIGHT = 600;

  const computeVisibleClusters = useCallback((centerCoords: [number, number], z: number) => {
    if (!projection) return [];
    const projectedCenter = projection(centerCoords);
    if (!projectedCenter) return [];
    const [pcx, pcy] = projectedCenter;
    const halfW = MAP_WIDTH / (2 * z);
    const halfH = MAP_HEIGHT / (2 * z);
    return clusters.filter(cl => {
      const [lat, lng] = cl.coords;
      if (lat < 24 || lat > 50 || lng < -130 || lng > -65) return false;
      const projected = projection([lng, lat]);
      if (!projected) return false;
      const [px, py] = projected;
      return Math.abs(px - pcx) <= halfW && Math.abs(py - pcy) <= halfH;
    });
  }, [clusters, projection]);

  // Re-compute visible clusters when chargers/clusters change (e.g. priority filter toggled)
  useEffect(() => {
    if (onViewportChange) {
      const visible = computeVisibleClusters(center, zoom);
      onViewportChange({ center, zoom }, visible);
    }
  }, [clusters]); // intentionally only depends on clusters changing

  const getDotSize = (count: number) => {
    const base = count <= 1 ? 3 : count >= 50 ? 14 : 3 + (count / 50) * 11;
    return Math.max(1.25, base / Math.pow(zoom, 1.2));
  };

  return (
    <div className="relative w-full h-full bg-card overflow-hidden">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup maxZoom={20} onMoveEnd={({ coordinates, zoom: z }) => {
            setZoom(z);
            setCenter(coordinates as [number, number]);
            if (onViewportChange) {
              const visible = computeVisibleClusters(coordinates as [number, number], z);
              onViewportChange({ center: coordinates as [number, number], zoom: z }, visible);
            }
          }}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rpiid}
                  geography={geo}
                  fill="hsl(var(--muted))"
                  stroke="hsl(var(--border))"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "hsl(var(--muted-foreground) / 0.2)", outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          {clusters.map(cluster => {
            const [lat, lng] = cluster.coords;
            // geoAlbersUsa returns null for coords outside continental US — skip to avoid crash
            if (lat < 24 || lat > 50 || lng < -130 || lng > -65) return null;
            const size = getDotSize(cluster.chargers.length);
            const isSelected = selectedClusterKey === cluster.key;
            const color = PRIORITY_DOT_COLORS[cluster.dominantPriority] || "#22c55e";
            return (
              <Marker key={cluster.key} coordinates={[lng, lat]}>
                <circle
                  r={size}
                  fill={color}
                  fillOpacity={isSelected ? 1 : 0.75}
                  stroke={isSelected ? "hsl(var(--primary))" : "#fff"}
                  strokeWidth={isSelected ? 2.5 / zoom : 1 / zoom}
                  className="cursor-pointer transition-all"
                  onMouseEnter={(e) => {
                    setHoveredCluster(cluster);
                    setTooltipPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    setTooltipPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoveredCluster(null)}
                  onClick={() => onSelectCluster(isSelected ? null : cluster)}
                />
                {cluster.chargers.length >= 10 && (
                  <text
                    textAnchor="middle"
                    y={size * 0.35}
                    style={{
                      fontSize: Math.max(2, size * 0.8),
                      fill: "#fff",
                      fontWeight: 700,
                      pointerEvents: "none",
                    }}
                  >
                    {cluster.chargers.length}
                  </text>
                )}
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {hoveredCluster && (
        <div
          className="fixed z-50 pointer-events-none bg-popover border border-border rounded-lg shadow-lg p-3 text-xs max-w-[220px]"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10 }}
        >
          <p className="font-semibold text-foreground">{hoveredCluster.city}, {hoveredCluster.state}</p>
          <p className="text-muted-foreground text-[10px]">{hoveredCluster.region}</p>
          <p className="text-foreground mt-1 font-medium">{hoveredCluster.chargers.length} charger{hoveredCluster.chargers.length !== 1 ? "s" : ""}</p>
          <div className="mt-1 space-y-0.5">
            {Object.entries(hoveredCluster.priorityBreakdown).map(([k, v]) => {
              if (v === 0) return null;
              return (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_DOT_COLORS[k as SchedulePriority] }} />
                  <span>{PRIORITY_LABEL[k as SchedulePriority] || k}: {v}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
