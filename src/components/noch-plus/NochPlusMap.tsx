import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

interface MapSubscriber {
  id: string;
  company: string;
  plan: "Premium" | "Standard" | "Basic";
  status: string;
  chargerCount: number;
  lat: number;
  lng: number;
  city: string;
  state: string;
}

const PLAN_COLORS: Record<string, string> = {
  Premium: "#0d9488",   // teal / primary
  Standard: "#8b5cf6",  // purple
  Basic: "#6b7280",     // gray
};

interface NochPlusMapProps {
  subscribers: MapSubscriber[];
}

export function NochPlusMap({ subscribers }: NochPlusMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

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
      setLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const L = (window as any).L;

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([37.5, -96], 4);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
      }).addTo(leafletMap.current);
    }

    const map = leafletMap.current;

    // Clear existing markers
    map.eachLayer((layer: any) => {
      if (layer._isSubscriberMarker) map.removeLayer(layer);
    });

    // Add subscriber markers
    subscribers.forEach((sub) => {
      const color = PLAN_COLORS[sub.plan] || PLAN_COLORS.Basic;
      const radius = Math.max(6, Math.min(14, sub.chargerCount / 8));

      const marker = L.circleMarker([sub.lat, sub.lng], {
        radius,
        fillColor: color,
        color: "#fff",
        weight: 2,
        fillOpacity: sub.status === "active" ? 0.9 : 0.4,
      });

      marker._isSubscriberMarker = true;

      marker.bindPopup(`
        <div style="min-width:160px">
          <strong style="font-size:13px">${sub.company}</strong><br/>
          <span style="font-size:11px;color:#999">${sub.city}, ${sub.state}</span><br/>
          <span style="display:inline-block;margin-top:4px;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;background:${color}22;color:${color}">${sub.plan}</span>
          <span style="display:inline-block;margin-top:4px;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;background:${sub.status === 'active' ? '#10b98122' : '#ef444422'};color:${sub.status === 'active' ? '#10b981' : '#ef4444'}">${sub.status}</span>
          <br/>
          <span style="font-size:11px;margin-top:4px;display:inline-block">${sub.chargerCount} chargers enrolled</span>
        </div>
      `, { className: "noch-plus-popup" });

      marker.addTo(map);
    });

    // Fit bounds if markers exist
    const active = subscribers.filter(s => s.lat && s.lng);
    if (active.length > 0) {
      const bounds = L.latLngBounds(active.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
    }
  }, [loaded, subscribers]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  return (
    <Card className="overflow-hidden border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Member Locations</h3>
          <p className="text-xs text-muted-foreground">{subscribers.length} subscribers • marker size = charger count</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PLAN_COLORS.Premium }} /> Premium</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PLAN_COLORS.Standard }} /> Standard</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PLAN_COLORS.Basic }} /> Basic</span>
        </div>
      </div>
      <div ref={mapRef} className="h-[340px] w-full bg-background" />
    </Card>
  );
}
