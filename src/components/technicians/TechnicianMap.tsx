import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Layers } from "lucide-react";
import type { Technician } from "@/hooks/useTechnicians";
import { getLevelDisplay, getLevelColor, getStatusInfo } from "@/hooks/useTechnicians";
import { normalizeUSCoords } from "@/lib/coordsValidator";

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

// Approximate lat/lng for common US cities
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
  "Seattle": [47.6062, -122.3321],
  "Portland": [45.5152, -122.6784],
  "Phoenix": [33.4484, -112.0740],
  "Las Vegas": [36.1699, -115.1398],
  "Denver": [39.7392, -104.9903],
  "Dallas": [32.7767, -96.7970],
  "Houston": [29.7604, -95.3698],
  "Chicago": [41.8781, -87.6298],
  "New York": [40.7128, -74.0060],
  "Miami": [25.7617, -80.1918],
  "Atlanta": [33.7490, -84.3880],
  "Austin": [30.2672, -97.7431],
  "Salt Lake City": [40.7608, -111.8910],
  "Boise": [43.6150, -116.2023],
  "Tucson": [32.2226, -110.9747],
};

// State center fallbacks
const STATE_COORDS: Record<string, [number, number]> = {
  "Alabama": [32.806671, -86.791130], "Alaska": [61.370716, -152.404419], "Arizona": [33.729759, -111.431221],
  "Arkansas": [34.969704, -92.373123], "California": [36.116203, -119.681564], "Colorado": [39.059811, -105.311104],
  "Connecticut": [41.597782, -72.755371], "Delaware": [39.318523, -75.507141], "Florida": [27.766279, -81.686783],
  "Georgia": [33.040619, -83.643074], "Hawaii": [21.094318, -157.498337], "Idaho": [44.240459, -114.478828],
  "Illinois": [40.349457, -88.986137], "Indiana": [39.849426, -86.258278], "Iowa": [42.011539, -93.210526],
  "Kansas": [38.526600, -96.726486], "Kentucky": [37.668140, -84.670067], "Louisiana": [31.169546, -91.867805],
  "Maine": [44.693947, -69.381927], "Maryland": [39.063946, -76.802101], "Massachusetts": [42.230171, -71.530106],
  "Michigan": [43.326618, -84.536095], "Minnesota": [45.694454, -93.900192], "Mississippi": [32.741646, -89.678696],
  "Missouri": [38.456085, -92.288368], "Montana": [46.921925, -110.454353], "Nebraska": [41.125370, -98.268082],
  "Nevada": [38.313515, -117.055374], "New Hampshire": [43.452492, -71.563896], "New Jersey": [40.298904, -74.521011],
  "New Mexico": [34.840515, -106.248482], "New York": [42.165726, -74.948051], "North Carolina": [35.630066, -79.806419],
  "North Dakota": [47.528912, -99.784012], "Ohio": [40.388783, -82.764915], "Oklahoma": [35.565342, -96.928917],
  "Oregon": [44.572021, -122.070938], "Pennsylvania": [40.590752, -77.209755], "Rhode Island": [41.680893, -71.511780],
  "South Carolina": [33.856892, -80.945007], "South Dakota": [44.299782, -99.438828], "Tennessee": [35.747845, -86.692345],
  "Texas": [31.054487, -97.563461], "Utah": [40.150032, -111.862434], "Vermont": [44.045876, -72.710686],
  "Virginia": [37.769337, -78.169968], "Washington": [47.400902, -121.490494], "West Virginia": [38.491226, -80.954453],
  "Wisconsin": [44.268543, -89.616508], "Wyoming": [42.755966, -107.302490],
};

function getCityCoords(city: string, state: string): [number, number] | null {
  if (CITY_COORDS[city]) return CITY_COORDS[city];
  if (STATE_COORDS[state]) return STATE_COORDS[state];
  return [39.8283, -98.5795]; // US center
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
      const rawCoords = tech.home_base_lat && tech.home_base_lng
        ? [tech.home_base_lat, tech.home_base_lng] as [number, number]
        : getCityCoords(tech.home_base_city, tech.home_base_state);
      if (!rawCoords) return;
      const coords = normalizeUSCoords(rawCoords[0], rawCoords[1]);
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
