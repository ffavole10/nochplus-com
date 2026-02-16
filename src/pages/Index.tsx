import { useRef, useState, useCallback } from "react";
import { allChargers, getNetworkStats, Charger, getChargersByCustomer } from "@/data/chargerData";
import { HeroMetrics } from "@/components/dashboard/HeroMetrics";
import { FindingsSection } from "@/components/dashboard/FindingsSection";
import { ChargerMap } from "@/components/dashboard/ChargerMap";
import { ComponentAnalysis } from "@/components/dashboard/ComponentAnalysis";
import { SitePerformanceTable } from "@/components/dashboard/SitePerformanceTable";
import { ReportLibrary } from "@/components/dashboard/ReportLibrary";

const Index = () => {
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [filteredChargers, setFilteredChargers] = useState<Charger[]>(allChargers);
  const [focusedLocation, setFocusedLocation] = useState<string | null>(null);
  const criticalRef = useRef<HTMLDivElement>(null);

  const filteredStats = getNetworkStats(filteredChargers);

  const handleCriticalClick = useCallback(() => {
    criticalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleShowOnMap = useCallback((charger: Charger) => {
    setSelectedCharger(charger);
    document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleLocationFilter = useCallback((location: string | null) => {
    if (location === null) {
      setFilteredChargers(allChargers);
      setFocusedLocation(null);
      setSelectedCharger(null);
    } else {
      const [city, state] = location.split(", ");
      const filtered = allChargers.filter(
        (c) => c.city === city && c.state === state
      );
      setFilteredChargers(filtered);
      setFocusedLocation(location);
      if (filtered.length > 0) {
        setSelectedCharger(filtered[0]);
      }
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

  return (
    <div className="container mx-auto px-4 py-4 space-y-8">
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

      <div id="map-section">
        <ChargerMap
          chargers={filteredChargers}
          allChargers={allChargers}
          selectedCharger={selectedCharger}
          onChargerSelect={setSelectedCharger}
          onLocationFilter={handleLocationFilter}
          focusedLocation={focusedLocation}
        />
      </div>

      {/* Critical Findings */}
      <FindingsSection
        chargers={filteredChargers}
        onShowOnMap={handleShowOnMap}
        criticalRef={criticalRef}
      />

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

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-12">
        <div className="text-center text-sm text-muted-foreground">
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
