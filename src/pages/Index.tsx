import { useRef, useState, useCallback } from "react";
import { allChargers, getNetworkStats, Charger } from "@/data/chargerData";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HeroMetrics } from "@/components/dashboard/HeroMetrics";
import { FindingsSection } from "@/components/dashboard/FindingsSection";
import { ChargerMap } from "@/components/dashboard/ChargerMap";
import { ComponentAnalysis } from "@/components/dashboard/ComponentAnalysis";
import { SitePerformanceTable } from "@/components/dashboard/SitePerformanceTable";
import { ReportLibrary } from "@/components/dashboard/ReportLibrary";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

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
    document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleLocationFilter = useCallback((location: string) => {
    const [city, state] = location.split(", ");
    const filtered = allChargers.filter(
      (c) => c.city === city && c.state === state
    );
    setFilteredChargers(filtered);
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

  const handleFiltersChange = useCallback((chargers: Charger[]) => {
    setFilteredChargers(chargers);
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar
          onFiltersChange={handleFiltersChange}
          filteredCount={filteredChargers.length}
          totalCount={allChargers.length}
        />

        <div className="flex-1 flex flex-col min-h-screen">
          <DashboardHeader lastUpdated={lastUpdated} />

          <main className="flex-1 container mx-auto px-4 py-6 space-y-8">
            {/* Sidebar Toggle for Mobile */}
            <div className="lg:hidden">
              <SidebarTrigger className="mb-4" />
            </div>

            {/* Hero Metrics */}
            <HeroMetrics
              healthScore={filteredStats.healthScore}
              criticalCount={filteredStats.critical}
              totalServiced={filteredStats.serviced}
              totalChargers={filteredStats.total}
              optimalCount={filteredStats.optimal}
              degradedCount={filteredStats.degraded}
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
