import { useRef, useState, useCallback } from "react";
import { allChargers, getNetworkStats, Charger } from "@/data/chargerData";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HeroMetrics } from "@/components/dashboard/HeroMetrics";
import { FindingsSection } from "@/components/dashboard/FindingsSection";
import { ChargerMap } from "@/components/dashboard/ChargerMap";
import { ComponentAnalysis } from "@/components/dashboard/ComponentAnalysis";
import { SitePerformanceTable } from "@/components/dashboard/SitePerformanceTable";
import { ReportLibrary } from "@/components/dashboard/ReportLibrary";

const Index = () => {
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [filteredChargers, setFilteredChargers] = useState<Charger[]>(allChargers);
  const criticalRef = useRef<HTMLDivElement>(null);

  const stats = getNetworkStats(allChargers);
  const filteredStats = getNetworkStats(filteredChargers);

  const handleCriticalClick = useCallback(() => {
    criticalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleShowOnMap = useCallback((charger: Charger) => {
    setSelectedCharger(charger);
    // Scroll to map section
    document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleLocationFilter = useCallback((location: string) => {
    const [city, state] = location.split(", ");
    const filtered = allChargers.filter(
      (c) => c.city === city && c.state === state
    );
    setFilteredChargers(filtered);
    // Zoom map to first charger in location
    if (filtered.length > 0) {
      setSelectedCharger(filtered[0]);
    }
  }, []);

  const handleComponentClick = useCallback((component: string) => {
    const keyword = component.toLowerCase().split("/")[0];
    const filtered = allChargers.filter((c) =>
      c.issues?.some((i) => i.toLowerCase().includes(keyword))
    );
    setFilteredChargers(filtered);
  }, []);

  const handleSiteClick = useCallback((siteName: string) => {
    const filtered = allChargers.filter((c) => c.site_name === siteName);
    setFilteredChargers(filtered);
    if (filtered.length > 0) {
      setSelectedCharger(filtered[0]);
      document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilteredChargers(allChargers);
    setSelectedCharger(null);
  }, []);

  const lastUpdated = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader lastUpdated={lastUpdated} />

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Filter indicator */}
        {filteredChargers.length !== allChargers.length && (
          <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-secondary/30">
            <span className="text-sm">
              Showing <strong>{filteredChargers.length}</strong> of{" "}
              <strong>{allChargers.length}</strong> chargers
            </span>
            <button
              onClick={handleResetFilters}
              className="text-sm text-secondary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Hero Metrics */}
        <HeroMetrics
          healthScore={stats.healthScore}
          criticalCount={stats.critical}
          totalServiced={stats.serviced}
          totalChargers={stats.total}
          optimalCount={stats.optimal}
          degradedCount={stats.degraded}
          onCriticalClick={handleCriticalClick}
        />

        {/* Critical Findings */}
        <FindingsSection
          chargers={filteredChargers}
          onShowOnMap={handleShowOnMap}
          criticalRef={criticalRef}
        />

        {/* Map Section */}
        <div id="map-section">
          <ChargerMap
            chargers={filteredChargers}
            selectedCharger={selectedCharger}
            onChargerSelect={setSelectedCharger}
            onLocationFilter={handleLocationFilter}
          />
        </div>

        {/* Component Analysis */}
        <ComponentAnalysis
          chargers={filteredChargers}
          onComponentClick={handleComponentClick}
        />

        {/* Site Performance */}
        <SitePerformanceTable
          chargers={filteredChargers}
          onSiteClick={handleSiteClick}
        />

        {/* Report Library */}
        <ReportLibrary chargers={filteredChargers} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            PM Campaign Dashboard • Powered by Noch Power •{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
