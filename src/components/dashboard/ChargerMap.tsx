import { useEffect, useRef, useState } from "react";
import { Charger, getGeographicRisk } from "@/data/chargerData";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, AlertTriangle, Layers, Focus, ExternalLink } from "lucide-react";

interface ChargerMapProps {
  chargers: Charger[];
  selectedCharger: Charger | null;
  onChargerSelect: (charger: Charger | null) => void;
  onLocationFilter: (location: string) => void;
}

export function ChargerMap({
  chargers,
  selectedCharger,
  onChargerSelect,
  onLocationFilter,
}: ChargerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const riskAreas = getGeographicRisk(chargers);

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      // Add Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      setMapLoaded(true);
    };

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || leafletMap.current) return;

    const L = (window as any).L;
    
    leafletMap.current = L.map(mapRef.current).setView([37.0, -100.0], 4);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(leafletMap.current);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [mapLoaded]);

  // Update markers
  useEffect(() => {
    if (!mapLoaded || !leafletMap.current) return;

    const L = (window as any).L;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const getMarkerColor = (status: string) => {
      switch (status) {
        case "Critical":
          return "#EF4444";
        case "Degraded":
          return "#F59E0B";
        default:
          return "#10B981";
      }
    };

    const getMarkerSize = (status: string) => {
      switch (status) {
        case "Critical":
          return 12;
        case "Degraded":
          return 9;
        default:
          return 6;
      }
    };

    chargers.forEach((charger) => {
      const marker = L.circleMarker([charger.lat, charger.lng], {
        radius: getMarkerSize(charger.status),
        fillColor: getMarkerColor(charger.status),
        color: getMarkerColor(charger.status),
        weight: charger.status === "Critical" ? 3 : 2,
        opacity: 1,
        fillOpacity: charger.status === "Critical" ? 0.9 : 0.7,
      }).addTo(leafletMap.current);

      const statusClass = charger.status === "Critical" 
        ? "bg-red-500 text-white" 
        : charger.status === "Degraded" 
        ? "bg-yellow-500 text-white" 
        : "bg-green-500 text-white";

      marker.bindPopup(`
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; ${
              charger.status === "Critical" 
                ? "background: #EF4444; color: white;" 
                : charger.status === "Degraded" 
                ? "background: #F59E0B; color: white;" 
                : "background: #10B981; color: white;"
            }">
              ${charger.status}
            </span>
            <span style="font-family: monospace; font-size: 14px; font-weight: 600;">
              ${charger.charger_id}
            </span>
          </div>
          <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
            ${charger.site_name}
          </p>
          <p style="font-size: 12px; color: #888; margin-bottom: 12px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            ${charger.summary}
          </p>
          <a href="${charger.full_report_link}" target="_blank" style="display: inline block; padding: 6px 12px; background: #1F4E78; color: white; border-radius: 6px; font-size: 12px; text-decoration: none;">
            View Report
          </a>
        </div>
      `);

      marker.on("click", () => {
        onChargerSelect(charger);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds
    if (chargers.length > 0) {
      const bounds = L.latLngBounds(chargers.map((c) => [c.lat, c.lng]));
      leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [chargers, mapLoaded, onChargerSelect]);

  // Risk overlay circles
  const riskOverlayRef = useRef<any[]>([]);
  
  useEffect(() => {
    if (!mapLoaded || !leafletMap.current) return;

    const L = (window as any).L;

    // Clear existing risk overlays
    riskOverlayRef.current.forEach((overlay) => overlay.remove());
    riskOverlayRef.current = [];

    if (!showHeatmap) return;

    // Group chargers by location and calculate center points
    const locationGroups = new Map<string, { lat: number; lng: number; critical: number; degraded: number }>();
    
    chargers.forEach((charger) => {
      const key = `${charger.city}, ${charger.state}`;
      if (!locationGroups.has(key)) {
        locationGroups.set(key, { lat: charger.lat, lng: charger.lng, critical: 0, degraded: 0 });
      }
      const group = locationGroups.get(key)!;
      if (charger.status === "Critical") group.critical++;
      if (charger.status === "Degraded") group.degraded++;
    });

    locationGroups.forEach((data, location) => {
      if (data.critical === 0 && data.degraded === 0) return;

      const isHighRisk = data.critical >= 2;
      const riskLevel = data.critical * 2 + data.degraded;
      const radius = Math.min(50000, 15000 + riskLevel * 3000); // Scale radius by risk

      const circle = L.circle([data.lat, data.lng], {
        radius: radius,
        fillColor: isHighRisk ? "#EF4444" : "#F59E0B",
        color: isHighRisk ? "#EF4444" : "#F59E0B",
        weight: 2,
        opacity: 0.6,
        fillOpacity: 0.15,
      }).addTo(leafletMap.current);

      circle.bindTooltip(`${location}: ${data.critical} Critical, ${data.degraded} Degraded`, {
        permanent: false,
        direction: "top",
      });

      riskOverlayRef.current.push(circle);
    });
  }, [chargers, mapLoaded, showHeatmap]);

  // Fly to selected charger
  useEffect(() => {
    if (!mapLoaded || !leafletMap.current || !selectedCharger) return;

    leafletMap.current.flyTo([selectedCharger.lat, selectedCharger.lng], 15, {
      duration: 1,
    });
  }, [selectedCharger, mapLoaded]);

  return (
    <div className="dashboard-section">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Map */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="dashboard-section-title">
              <MapPin className="w-5 h-5" />
              Network Map
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="heatmap"
                  checked={showHeatmap}
                  onCheckedChange={setShowHeatmap}
                />
                <Label htmlFor="heatmap" className="text-sm">
                  <Layers className="w-4 h-4 inline mr-1" />
                  Risk Overlay
                </Label>
              </div>
            </div>
          </div>

          <div className="map-container h-[500px] relative">
            <div ref={mapRef} className="w-full h-full rounded-xl" />
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-xl">
                <div className="text-muted-foreground">Loading map...</div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-critical"></span>
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-degraded"></span>
              <span>Degraded</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-optimal"></span>
              <span>Optimal</span>
            </div>
          </div>
        </div>

        {/* Risk Sidebar */}
        <div className="lg:w-80">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-critical" />
            <h3 className="font-semibold">High Risk Areas</h3>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            {riskAreas
              .filter((area) => area.critical > 0 || area.degraded > 0)
              .map((area) => {
                const isHighRisk = area.critical >= 2;
                return (
                  <div
                    key={area.location}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      isHighRisk
                        ? "border-critical/40 bg-critical/5"
                        : "border-degraded/30 bg-degraded/5"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            isHighRisk ? "bg-critical" : "bg-degraded"
                          }`}
                        ></span>
                        <span className="font-medium">{area.location}</span>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="text-critical font-medium">
                        {area.critical} Critical
                      </span>
                      {", "}
                      <span className="text-degraded font-medium">
                        {area.degraded} Degraded
                      </span>
                    </div>

                    {area.issues.length > 0 && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Primary: {area.issues.slice(0, 2).join(", ")}
                      </p>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => onLocationFilter(area.location)}
                    >
                      <Focus className="w-4 h-4" />
                      Focus Here
                    </Button>
                  </div>
                );
              })}

            {riskAreas.filter((a) => a.critical > 0 || a.degraded > 0)
              .length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No high-risk areas detected
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
