import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import { Charger, getGeographicRisk } from "@/data/chargerData";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, AlertTriangle, Layers, Focus } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface ChargerMapProps {
  chargers: Charger[];
  selectedCharger: Charger | null;
  onChargerSelect: (charger: Charger | null) => void;
  onLocationFilter: (location: string) => void;
}

function MapController({ selectedCharger }: { selectedCharger: Charger | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCharger) {
      map.flyTo([selectedCharger.lat, selectedCharger.lng], 15, { duration: 1 });
    }
  }, [selectedCharger, map]);

  return null;
}

function FitBounds({ chargers }: { chargers: Charger[] }) {
  const map = useMap();

  useEffect(() => {
    if (chargers.length > 0) {
      const bounds = new LatLngBounds(
        chargers.map((c) => [c.lat, c.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [chargers, map]);

  return null;
}

export function ChargerMap({
  chargers,
  selectedCharger,
  onChargerSelect,
  onLocationFilter,
}: ChargerMapProps) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const riskAreas = getGeographicRisk(chargers);

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

  const getMarkerColor = (status: string) => {
    switch (status) {
      case "Critical":
        return "hsl(var(--critical))";
      case "Degraded":
        return "hsl(var(--degraded))";
      default:
        return "hsl(var(--optimal))";
    }
  };

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

          <div className="map-container h-[500px]">
            <MapContainer
              center={[37.0, -100.0]}
              zoom={4}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <FitBounds chargers={chargers} />
              <MapController selectedCharger={selectedCharger} />

              {chargers.map((charger) => (
                <CircleMarker
                  key={charger.charger_id}
                  center={[charger.lat, charger.lng]}
                  radius={getMarkerSize(charger.status)}
                  pathOptions={{
                    color: getMarkerColor(charger.status),
                    fillColor: getMarkerColor(charger.status),
                    fillOpacity: charger.status === "Critical" ? 0.9 : 0.7,
                    weight: charger.status === "Critical" ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => onChargerSelect(charger),
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            charger.status === "Critical"
                              ? "status-critical"
                              : charger.status === "Degraded"
                              ? "status-degraded"
                              : "status-optimal"
                          }`}
                        >
                          {charger.status}
                        </span>
                        <span className="font-mono text-sm font-semibold">
                          {charger.charger_id}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {charger.site_name}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {charger.summary}
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          window.open(charger.full_report_link, "_blank")
                        }
                      >
                        View Report
                      </Button>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
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
