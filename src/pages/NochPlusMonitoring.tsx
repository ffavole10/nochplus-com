import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { MonitoringMapView } from "@/components/monitoring/MonitoringMapView";
import { MonitoringAnalyticsView } from "@/components/monitoring/MonitoringAnalyticsView";
import { ChargerSchematicModal } from "@/components/monitoring/ChargerSchematicModal";
import { MonitoringInterventionBar } from "@/components/monitoring/MonitoringInterventionBar";
import { KPI_CHIPS } from "@/components/monitoring/monitoringData";
import { cn } from "@/lib/utils";

const FILTERS = ['All', 'Critical', 'Warning', 'Healthy', 'Offline', 'Env. Risks'] as const;

export default function NochPlusMonitoring() {
  usePageTitle("Mission Control");
  const [view, setView] = useState<'map' | 'analytics'>('map');
  const [filter, setFilter] = useState('All');
  const [selectedCharger, setSelectedCharger] = useState<string | null>(null);
  const [pulse, setPulse] = useState(true);

  // Pulse animation
  useEffect(() => {
    const iv = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(iv);
  }, []);


  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div>
          <h1 className="text-xl font-bold text-foreground">Mission Control</h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("w-2 h-2 rounded-full bg-emerald-500", pulse && "animate-pulse")} />
            Fontainebleau Las Vegas · 12 Chargers · Live
          </div>
        </div>
        <div className="flex items-center rounded-full border border-border p-0.5 bg-muted/30">
          <button onClick={() => setView('map')}
            className={cn("px-4 py-1.5 text-xs font-medium rounded-full transition-all",
              view === 'map' ? "bg-[#1B8A7A] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>Map View</button>
          <button onClick={() => setView('analytics')}
            className={cn("px-4 py-1.5 text-xs font-medium rounded-full transition-all",
              view === 'analytics' ? "bg-purple-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>Analytics</button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="flex items-center gap-2 px-6 py-2 border-b border-border bg-card overflow-x-auto">
        {KPI_CHIPS.map(kpi => (
          <div key={kpi.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs whitespace-nowrap flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: kpi.color }} />
            <span className="text-muted-foreground">{kpi.label}</span>
            <span className="font-bold" style={{ color: kpi.color }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Filter chips (map view only) */}
      {view === 'map' && (
        <div className="flex items-center gap-1.5 px-6 py-2 bg-card border-b border-border">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1 text-[11px] font-medium rounded-full transition-colors border",
                filter === f ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}>{f}</button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {view === 'map' ? (
          <MonitoringMapView filter={filter} onSelectCharger={setSelectedCharger} />
        ) : (
          <MonitoringAnalyticsView onSelectCharger={setSelectedCharger} />
        )}
      </div>

      {/* Intervention Bar */}
      <div className="px-4 pb-3">
        <MonitoringInterventionBar />
      </div>

      {/* Schematic Modal */}
      <ChargerSchematicModal chargerId={selectedCharger} onClose={() => setSelectedCharger(null)} />
    </div>
  );
}
