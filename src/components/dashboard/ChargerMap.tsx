import { useEffect, useRef, useState, useMemo } from "react";
import { Charger, getGeographicRisk } from "@/data/chargerData";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, AlertTriangle, Layers, Focus, X } from "lucide-react";

interface ChargerMapProps {
  chargers: Charger[];
  allChargers: Charger[];
  selectedCharger: Charger | null;
  onChargerSelect: (charger: Charger | null) => void;
  onLocationFilter: (location: string | null) => void;
  focusedLocation: string | null;
}

export function ChargerMap({
  chargers,
  allChargers,
  selectedCharger,
  onChargerSelect,
  onLocationFilter,
  focusedLocation,
}: ChargerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const layerGroupRef = useRef<any>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  // Always show all risk areas in sidebar, not just filtered ones
  const riskAreas = getGeographicRisk(allChargers);

  // Load Leaflet and MarkerCluster dynamically
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

      // Add MarkerCluster CSS
      if (!document.getElementById("markercluster-css")) {
        const link = document.createElement("link");
        link.id = "markercluster-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
        document.head.appendChild(link);
      }

      if (!document.getElementById("markercluster-default-css")) {
        const link = document.createElement("link");
        link.id = "markercluster-default-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
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

      // Load MarkerCluster JS
      if (!(window as any).L.markerClusterGroup) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
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

  // Update markers - use MarkerCluster for performance with 5000+ points
  useEffect(() => {
    if (!mapLoaded || !leafletMap.current) return;

    const L = (window as any).L;

    // Store current view before clearing (to preserve zoom when toggling overlay)
    const currentCenter = leafletMap.current.getCenter();
    const currentZoom = leafletMap.current.getZoom();
    const hasExistingView = layerGroupRef.current !== null;

    // Clear existing layer group
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
      leafletMap.current.removeLayer(layerGroupRef.current);
    }

    console.log(`Rendering ${chargers.length} chargers on map with clustering`);

    // Color function
    const getColor = (status: string, useRiskColors: boolean) => {
      if (!useRiskColors) return "#1F9DD9"; // Default blue
      switch (status) {
        case "Critical": return "#EF4444";
        case "Degraded": return "#F59E0B";
        default: return "#10B981";
      }
    };

    // Create marker cluster group with custom styling
    layerGroupRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const childMarkers = cluster.getAllChildMarkers();
        
        // Count status types in cluster
        let criticalCount = 0;
        let degradedCount = 0;
        let optimalCount = 0;
        
        childMarkers.forEach((m: any) => {
          const status = m.options.chargerStatus;
          if (status === "Critical") criticalCount++;
          else if (status === "Degraded") degradedCount++;
          else optimalCount++;
        });
        
        // Determine cluster class based on risk overlay toggle
        let className = 'marker-cluster-small';
        
        if (showHeatmap) {
          // Risk overlay on - color by predominant status
          if (criticalCount > 0) {
            className = 'marker-cluster-critical';
          } else if (degradedCount > 0) {
            className = 'marker-cluster-degraded';
          } else {
            className = 'marker-cluster-optimal';
          }
        } else {
          // Risk overlay off - blue based on size
          if (count >= 100) {
            className = 'marker-cluster-large';
          } else if (count >= 20) {
            className = 'marker-cluster-medium';
          }
        }

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster ${className}`,
          iconSize: L.point(40, 40),
        });
      },
    });

    chargers.forEach((charger) => {
      const color = getColor(charger.status, showHeatmap);
      
      // Use CircleMarker for individual markers with status attached for cluster coloring
      const marker = L.circleMarker([charger.lat, charger.lng], {
        radius: 6,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.9,
        fillOpacity: 0.8,
        chargerStatus: charger.status, // Store status for cluster color calculation
      });

      marker.bindPopup(`
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; ${
              charger.status === "Critical" 
                ? "background: #EF4444; color: white;" 
                : charger.status === "High" 
                ? "background: #F97316; color: white;" 
                : charger.status === "Medium"
                ? "background: #EAB308; color: #1a1a1a;"
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
          <a href="${charger.full_report_link}" target="_blank" style="display: inline-block; padding: 6px 12px; background: #1F4E78; color: white; border-radius: 6px; font-size: 12px; text-decoration: none;">
            View Report
          </a>
        </div>
      `);

      marker.on("click", () => {
        onChargerSelect(charger);
      });

      layerGroupRef.current.addLayer(marker);
    });

    // Add cluster group to map
    leafletMap.current.addLayer(layerGroupRef.current);

    // Only set initial view on first load, preserve view on overlay toggle
    if (!hasExistingView) {
      leafletMap.current.setView([39.0, -98.0], 4);
    } else {
      leafletMap.current.setView(currentCenter, currentZoom);
    }
  }, [chargers, mapLoaded, onChargerSelect, showHeatmap]);

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
    const locationGroups = new Map<string, { lat: number; lng: number; critical: number; high: number }>();
    
    chargers.forEach((charger) => {
      const key = `${charger.city}, ${charger.state}`;
      if (!locationGroups.has(key)) {
        locationGroups.set(key, { lat: charger.lat, lng: charger.lng, critical: 0, high: 0 });
      }
      const group = locationGroups.get(key)!;
      if (charger.status === "Critical") group.critical++;
      if (charger.status === "High") group.high++;
    });

    locationGroups.forEach((data, location) => {
      if (data.critical === 0 && data.high === 0) return;

      const isHighRisk = data.critical >= 2;
      const riskLevel = data.critical * 2 + data.high;
      const radius = Math.min(50000, 15000 + riskLevel * 3000); // Scale radius by risk

      const circle = L.circle([data.lat, data.lng], {
        radius: radius,
        fillColor: isHighRisk ? "#EF4444" : "#F59E0B",
        color: isHighRisk ? "#EF4444" : "#F59E0B",
        weight: 2,
        opacity: 0.6,
        fillOpacity: 0.15,
      }).addTo(leafletMap.current);

      circle.bindTooltip(`${location}: ${data.critical} Critical, ${data.high} High`, {
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
            {showHeatmap ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#EF4444" }}></span>
                  <span>Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#F59E0B" }}></span>
                  <span>Degraded</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#10B981" }}></span>
                  <span>Optimal</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#1F9DD9" }}></span>
                <span>Charger Location ({chargers.length.toLocaleString()} total)</span>
              </div>
            )}
          </div>
        </div>

        {/* High Risk Chargers Sidebar */}
        <div className="lg:w-80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-critical" />
              <h3 className="font-semibold">High Risk Areas</h3>
            </div>
            {focusedLocation && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => onLocationFilter(null)}
              >
                <X className="w-3 h-3" />
                Show All
              </Button>
            )}
          </div>

          {(() => {
            const riskChargers = allChargers
              .filter(c => c.status === "Critical" || c.status === "High")
              .sort((a, b) => {
                if (a.status === "Critical" && b.status !== "Critical") return -1;
                if (a.status !== "Critical" && b.status === "Critical") return 1;
                return 0;
              });

            return (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  {riskChargers.length} chargers need attention
                </p>
                <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {riskChargers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No high-risk chargers detected
                    </p>
                  ) : (
                    riskChargers.slice(0, 10).map((charger) => {
                      const isCritical = charger.status === "Critical";
                      const isSelected = selectedCharger?.charger_id === charger.charger_id;
                      return (
                        <div
                          key={charger.charger_id}
                          className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                              : isCritical
                              ? "border-critical/40 bg-critical/5 hover:bg-critical/10"
                              : "border-high/30 bg-high/5 hover:bg-high/10"
                          }`}
                          onClick={() => onChargerSelect(charger)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isCritical ? "bg-critical" : "bg-high"
                              }`}
                            ></span>
                            <span className="font-medium text-sm truncate">
                              {charger.site_name || charger.station_number}
                            </span>
                            <span className={`text-xs ml-auto px-1.5 py-0.5 rounded ${
                              isCritical ? "bg-critical/20 text-critical" : "bg-high/20 text-high"
                            }`}>
                              {charger.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {charger.city}{charger.state ? `, ${charger.state}` : ""}
                          </div>
                          {charger.issues && charger.issues.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {charger.issues.slice(0, 2).join(", ")}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
