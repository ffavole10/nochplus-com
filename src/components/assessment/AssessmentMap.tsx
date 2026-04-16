import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AssessmentCharger, Phase, PriorityLevel } from "@/types/assessment";
import { getPriorityColor } from "@/lib/assessmentParser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Route, Search, X, List, MapIcon, Download } from "lucide-react";
import { normalizeUSCoords } from "@/lib/coordsValidator";
import { toast } from "sonner";

interface AssessmentMapProps {
  chargers: AssessmentCharger[];
  onSelectCharger: (charger: AssessmentCharger) => void;
  onGeocodeRequest?: () => void;
  isGeocoding?: boolean;
}

const PHASES: Phase[] = ["Needs Assessment", "Scheduled", "In Progress", "Completed", "Deferred"];

// Simple distance calculation (Haversine)
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nearest-neighbor route optimization
function optimizeRoute(chargers: AssessmentCharger[]): AssessmentCharger[] {
  if (chargers.length <= 1) return chargers;
  const withCoords = chargers.filter(c => c.latitude && c.longitude);
  if (withCoords.length === 0) return chargers;

  const visited = new Set<string>();
  const route: AssessmentCharger[] = [];
  let current = withCoords[0];
  visited.add(current.id);
  route.push(current);

  while (route.length < withCoords.length) {
    let nearest: AssessmentCharger | null = null;
    let nearestDist = Infinity;
    for (const c of withCoords) {
      if (visited.has(c.id)) continue;
      const d = haversine(current.latitude!, current.longitude!, c.latitude!, c.longitude!);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = c;
      }
    }
    if (!nearest) break;
    visited.add(nearest.id);
    route.push(nearest);
    current = nearest;
  }

  return route;
}

export function AssessmentMap({ chargers, onSelectCharger, onGeocodeRequest, isGeocoding }: AssessmentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const layerGroup = useRef<any>(null);
  const routeLayer = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showRoute, setShowRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ stops: number; distance: number } | null>(null);
  const [showList, setShowList] = useState(false);
  const [routeOrder, setRouteOrder] = useState<AssessmentCharger[]>([]);

  const filtered = useMemo(() => {
    let result = chargers;
    if (phaseFilter !== "all") result = result.filter(c => c.phase === phaseFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.assetName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.accountName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [chargers, phaseFilter, search]);

  // Load Leaflet
  useEffect(() => {
    if ((window as any).L) { setMapLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const clusterCss = document.createElement("link");
    clusterCss.rel = "stylesheet";
    clusterCss.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
    document.head.appendChild(clusterCss);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const clusterScript = document.createElement("script");
      clusterScript.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
      clusterScript.onload = () => setMapLoaded(true);
      document.head.appendChild(clusterScript);
    };
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || leafletMap.current) return;
    const L = (window as any).L;
    leafletMap.current = L.map(mapRef.current).setView([39.0, -98.0], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
    }).addTo(leafletMap.current);
  }, [mapLoaded]);

  // Update markers
  useEffect(() => {
    if (!mapLoaded || !leafletMap.current) return;
    const L = (window as any).L;

    // Clear
    if (layerGroup.current) leafletMap.current.removeLayer(layerGroup.current);
    if (routeLayer.current) leafletMap.current.removeLayer(routeLayer.current);
    routeLayer.current = null;

    const cluster = L.markerClusterGroup({ maxClusterRadius: 50, spiderfyOnMaxZoom: true });

    const withCoords = filtered
      .map(c => {
        const n = normalizeUSCoords(c.latitude, c.longitude);
        return n ? { ...c, latitude: n[0], longitude: n[1] } : null;
      })
      .filter((c): c is AssessmentCharger => c !== null);

    withCoords.forEach(charger => {
      const color = getPriorityColor(charger.priorityLevel);
      const isLarge = charger.assetRecordType === "DC | Level 3";
      const size = isLarge ? 14 : 10;
      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([charger.latitude, charger.longitude], { icon });
      marker.bindPopup(`
        <div style="min-width:200px">
          <strong>${charger.assetName}</strong><br/>
          <span style="color:${color};font-weight:600">${charger.priorityLevel}</span> · ${charger.assetRecordType}<br/>
          ${charger.address}, ${charger.city}, ${charger.state}<br/>
          <em>${charger.status}</em> · ${charger.phase}
        </div>
      `);
      marker.on("click", () => onSelectCharger(charger));
      cluster.addLayer(marker);
    });

    leafletMap.current.addLayer(cluster);
    layerGroup.current = cluster;

    // Fit bounds
    if (withCoords.length > 0) {
      const bounds = L.latLngBounds(withCoords.map((c: AssessmentCharger) => [c.latitude, c.longitude]));
      leafletMap.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [filtered, mapLoaded, onSelectCharger]);

  // Generate route
  const generateRoute = useCallback(() => {
    if (!mapLoaded || !leafletMap.current) return;
    const L = (window as any).L;
    const withCoords = filtered.filter(c => c.latitude && c.longitude);
    if (withCoords.length < 2) {
      toast.error("Need at least 2 chargers with coordinates to generate a route");
      return;
    }

    const route = optimizeRoute(withCoords);
    setRouteOrder(route);

    // Calculate total distance
    let totalDist = 0;
    for (let i = 1; i < route.length; i++) {
      totalDist += haversine(route[i - 1].latitude!, route[i - 1].longitude!, route[i].latitude!, route[i].longitude!);
    }

    // Draw route
    if (routeLayer.current) leafletMap.current.removeLayer(routeLayer.current);
    const latlngs = route.map(c => [c.latitude, c.longitude]);
    const polyline = L.polyline(latlngs, { color: "hsl(217, 69%, 52%)", weight: 3, opacity: 0.8, dashArray: "8 4" });

    // Add numbered markers
    const routeGroup = L.layerGroup([polyline]);
    route.forEach((c, i) => {
      const numIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:24px;height:24px;border-radius:50%;background:hsl(217,69%,52%);color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${i + 1}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([c.latitude, c.longitude], { icon: numIcon }).addTo(routeGroup);
    });

    routeGroup.addTo(leafletMap.current);
    routeLayer.current = routeGroup;

    setRouteInfo({ stops: route.length, distance: Math.round(totalDist) });
    setShowRoute(true);
    setShowList(true);
    toast.success(`✓ Route generated: ${route.length} stops, ${Math.round(totalDist)} miles`);
  }, [filtered, mapLoaded]);

  const clearRoute = useCallback(() => {
    if (routeLayer.current && leafletMap.current) {
      leafletMap.current.removeLayer(routeLayer.current);
      routeLayer.current = null;
    }
    setShowRoute(false);
    setRouteInfo(null);
    setRouteOrder([]);
    setShowList(false);
  }, []);

  const exportRoute = useCallback(() => {
    if (routeOrder.length === 0) return;
    const csv = ["Stop,Asset Name,Address,City,State,Zip"];
    routeOrder.forEach((c, i) => {
      csv.push(`${i + 1},"${c.assetName}","${c.address}","${c.city}","${c.state}","${c.zip}"`);
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `route-${phaseFilter}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [routeOrder, phaseFilter]);

  const withCoords = filtered.filter(c => c.latitude && c.longitude);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Controls */}
      <div className="flex items-center gap-3 p-4 border-b border-border flex-wrap">
        <Select value={phaseFilter} onValueChange={(v) => { setPhaseFilter(v); clearRoute(); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Show phase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Chargers</SelectItem>
            {PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <span className="text-sm text-muted-foreground">
          Showing {filtered.length} chargers{phaseFilter !== "all" ? ` in ${phaseFilter}` : ""}
          {withCoords.length < filtered.length && ` (${withCoords.length} with coordinates)`}
        </span>

        {withCoords.length < filtered.length && onGeocodeRequest && (
          <Button size="sm" onClick={onGeocodeRequest} disabled={isGeocoding} variant="secondary">
            <MapIcon className="h-4 w-4 mr-1" />
            {isGeocoding ? "Geocoding..." : "Geocode Locations"}
          </Button>
        )}

        {phaseFilter !== "all" && withCoords.length >= 2 && (
          <Button size="sm" onClick={showRoute ? clearRoute : generateRoute} variant={showRoute ? "outline" : "default"}>
            <Route className="h-4 w-4 mr-1" />
            {showRoute ? "Clear Route" : "Generate Route"}
          </Button>
        )}

        {showRoute && routeInfo && (
          <>
            <Badge variant="secondary">{routeInfo.stops} stops · {routeInfo.distance} mi</Badge>
            <Button size="sm" variant="outline" onClick={() => setShowList(!showList)}>
              <List className="h-4 w-4 mr-1" /> {showList ? "Hide" : "Show"} List
            </Button>
            <Button size="sm" variant="outline" onClick={exportRoute}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </>
        )}
      </div>

      {/* Map + Route List */}
      <div className="flex-1 flex">
        <div ref={mapRef} className="flex-1" style={{ minHeight: 400 }} />

        {showList && routeOrder.length > 0 && (
          <div className="w-80 border-l border-border overflow-y-auto bg-card p-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Route Stops</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowList(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {routeOrder.map((c, i) => {
              const dist = i > 0
                ? Math.round(haversine(routeOrder[i - 1].latitude!, routeOrder[i - 1].longitude!, c.latitude!, c.longitude!))
                : 0;
              return (
                <div
                  key={c.id}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer text-sm"
                  onClick={() => onSelectCharger(c)}
                >
                  <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.assetName}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.address}, {c.city}</p>
                    {i > 0 && <p className="text-xs text-muted-foreground">~{dist} mi · ~{Math.round(dist / 40 * 60)} min drive</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-3 border-t border-border text-xs text-muted-foreground">
        <span className="font-medium">Legend:</span>
        {(["Critical", "High", "Medium", "Low"] as PriorityLevel[]).map(level => (
          <span key={level} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: getPriorityColor(level) }} />
            {level}
          </span>
        ))}
        <span className="ml-2">⚡ DCFC (large) · 🔌 L2/HPCD (small)</span>
      </div>
    </div>
  );
}
