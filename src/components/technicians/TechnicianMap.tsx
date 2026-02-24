import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Layers } from "lucide-react";
import type { Technician } from "@/hooks/useTechnicians";
import { getLevelDisplay, getLevelColor, getStatusInfo } from "@/hooks/useTechnicians";

interface Props {
  technicians: Technician[];
  onTechSelect?: (tech: Technician) => void;
}

const LEVEL_PIN_COLORS: Record<string, string> = {
  level_1: "#3B82F6",
  level_2: "#8B5CF6",
  level_3: "#F97316",
  level_4: "#10B981",
};

const LEVEL_COVERAGE_COLORS: Record<string, string> = {
  level_1: "#3B82F6",
  level_2: "#8B5CF6",
  level_3: "#F97316",
  level_4: "#10B981",
};

// Approximate lat/lng for California cities
const CITY_COORDS: Record<string, [number, number]> = {
  "Los Angeles": [34.0522, -118.2437],
  "San Diego": [32.7157, -117.1611],
  "San Francisco": [37.7749, -122.4194],
  "Sacramento": [38.5816, -121.4944],
  "Irvine": [33.6846, -117.8265],
  "Riverside": [33.9533, -117.3962],
  "Oakland": [37.8044, -122.2712],
  "San Jose": [37.3382, -121.8863],
  "Anaheim": [33.8366, -117.9143],
  "Long Beach": [33.7701, -118.1937],
};

function getCityCoords(city: string, state: string): [number, number] | null {
  if (CITY_COORDS[city]) return CITY_COORDS[city];
  // Fallback: center of California
  if (state === "California") return [36.7783, -119.4179];
  return [37.0, -100.0];
}

const MILES_TO_METERS = 1609.34;

export function TechnicianMap({ technicians, onTechSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showCoverage, setShowCoverage] = useState(true);

  // Load Leaflet
  useEffect(() => {
    const load = async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
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
    load();
  }, []);

  // Init map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || leafletMap.current) return;
    const L = (window as any).L;
    leafletMap.current = L.map(mapRef.current).setView([35.5, -119.5], 6);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(leafletMap.current);
    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    };
  }, [mapLoaded]);

  // Render technicians
  useEffect(() => {
    if (!mapLoaded || !leafletMap.current) return;
    const L = (window as any).L;

    // Clear
    layersRef.current.forEach(l => leafletMap.current.removeLayer(l));
    layersRef.current = [];

    const activeTechs = technicians.filter(t => t.active);

    activeTechs.forEach(tech => {
      const coords = tech.home_base_lat && tech.home_base_lng
        ? [tech.home_base_lat, tech.home_base_lng] as [number, number]
        : getCityCoords(tech.home_base_city, tech.home_base_state);
      if (!coords) return;

      const pinColor = tech.employee_type === "subcontractor"
        ? "#F97316"
        : (tech.active ? (LEVEL_PIN_COLORS[tech.level] || "#3B82F6") : "#9CA3AF");

      const coverageColor = LEVEL_COVERAGE_COLORS[tech.level] || "#3B82F6";
      const status = getStatusInfo(tech.status);
      const fullName = `${tech.first_name} ${tech.last_name}`;

      // Coverage circle
      if (showCoverage) {
        const circle = L.circle(coords, {
          radius: tech.coverage_radius_miles * MILES_TO_METERS,
          fillColor: coverageColor,
          color: coverageColor,
          weight: 1.5,
          opacity: 0.4,
          fillOpacity: 0.08,
        }).addTo(leafletMap.current);
        circle.bindTooltip(`${fullName} — ${tech.coverage_radius_miles} mi radius`, { direction: "top" });
        layersRef.current.push(circle);
      }

      // Pin marker
      const marker = L.circleMarker(coords, {
        radius: 8,
        fillColor: pinColor,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(leafletMap.current);

      marker.bindPopup(`
        <div style="min-width:180px;font-family:system-ui,sans-serif;">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${fullName}</div>
          <div style="font-size:12px;color:#666;margin-bottom:4px;">${getLevelDisplay(tech.level)}</div>
          <div style="font-size:12px;margin-bottom:2px;">${status.icon} ${status.label}</div>
          <div style="font-size:12px;color:#888;">📍 ${tech.home_base_city}, ${tech.home_base_state}</div>
          <div style="font-size:12px;color:#888;">📡 ${tech.coverage_radius_miles} mi radius</div>
          <div style="font-size:12px;color:#888;">💼 ${tech.active_jobs_count}/${tech.max_jobs_per_day} jobs</div>
          <div style="font-size:11px;color:#aaa;margin-top:4px;">${tech.employee_type === "employee" ? "🟢 Employee" : "🟠 Subcontractor"}</div>
        </div>
      `);

      if (onTechSelect) {
        marker.on("click", () => onTechSelect(tech));
      }

      // Name label
      const label = L.marker(coords, {
        icon: L.divIcon({
          className: "tech-label",
          html: `<div style="font-size:10px;font-weight:600;color:${pinColor};white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;">${tech.first_name} ${tech.last_name[0]}.</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, -12],
        }),
      }).addTo(leafletMap.current);

      layersRef.current.push(marker);
      layersRef.current.push(label);
    });

    // Fit bounds
    if (activeTechs.length > 0) {
      const allCoords = activeTechs.map(t => {
        if (t.home_base_lat && t.home_base_lng) return [t.home_base_lat, t.home_base_lng];
        return getCityCoords(t.home_base_city, t.home_base_state);
      }).filter(Boolean);
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        leafletMap.current.fitBounds(bounds.pad(0.3));
      }
    }
  }, [technicians, mapLoaded, showCoverage, onTechSelect]);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Technician Coverage Map</h3>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="coverage-toggle" checked={showCoverage} onCheckedChange={setShowCoverage} />
            <Label htmlFor="coverage-toggle" className="text-sm">
              <Layers className="w-4 h-4 inline mr-1" />
              Coverage Circles
            </Label>
          </div>
        </div>

        <div className="relative rounded-lg overflow-hidden border border-border">
          <div ref={mapRef} className="w-full h-[420px]" />
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-muted-foreground text-sm">Loading map...</div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3B82F6" }} /> Level 1
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#8B5CF6" }} /> Level 2
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#F97316" }} /> Level 3 / Sub
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#10B981" }} /> Level 4
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: "#9CA3AF" }} /> Inactive
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
