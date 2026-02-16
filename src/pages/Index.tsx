import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { getNetworkStats, Charger, chargerRecordToCharger } from "@/data/chargerData";
import { HeroMetrics } from "@/components/dashboard/HeroMetrics";
import { FindingsSection } from "@/components/dashboard/FindingsSection";
import { ChargerMap } from "@/components/dashboard/ChargerMap";
import { ComponentAnalysis } from "@/components/dashboard/ComponentAnalysis";
import { SitePerformanceTable } from "@/components/dashboard/SitePerformanceTable";
import { ReportLibrary } from "@/components/dashboard/ReportLibrary";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useChargerRecords, useCampaign } from "@/hooks/useCampaigns";
import { Database } from "lucide-react";

const Index = () => {
  const { selectedCampaignId, selectedCustomer } = useCampaignContext();
  const { data: campaignData } = useCampaign(selectedCampaignId || null);
  const { data: chargerRecords = [] } = useChargerRecords(selectedCampaignId || null);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [focusedLocation, setFocusedLocation] = useState<string | null>(null);
  const criticalRef = useRef<HTMLDivElement>(null);

  // No data until a campaign is selected
  const hasCampaign = !!selectedCampaignId;

  const baseChargers = useMemo(() => {
    if (!hasCampaign || chargerRecords.length === 0) return [];
    const customer = campaignData?.customer || selectedCustomer || "";
    return chargerRecords.map(r => chargerRecordToCharger(r, customer));
  }, [hasCampaign, chargerRecords, campaignData, selectedCustomer]);

  const [filteredChargers, setFilteredChargers] = useState<Charger[]>([]);
  const prevRecordsRef = useRef(chargerRecords);

  useEffect(() => {
    if (prevRecordsRef.current !== chargerRecords) {
      prevRecordsRef.current = chargerRecords;
      setFilteredChargers(baseChargers);
      setSelectedCharger(null);
      setFocusedLocation(null);
    } else if (filteredChargers.length === 0 && baseChargers.length > 0) {
      setFilteredChargers(baseChargers);
    }
  }, [baseChargers, chargerRecords]);

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
      setFilteredChargers(baseChargers);
      setFocusedLocation(null);
      setSelectedCharger(null);
    } else {
      const [city, state] = location.split(", ");
      const filtered = baseChargers.filter(
        (c) => c.city === city && c.state === state
      );
      setFilteredChargers(filtered);
      setFocusedLocation(location);
      if (filtered.length > 0) {
        setSelectedCharger(filtered[0]);
      }
    }
  }, [baseChargers]);

  const handleComponentClick = useCallback((component: string) => {
    const keyword = component.toLowerCase().split("/")[0];
    const filtered = baseChargers.filter((c) =>
      c.issues?.some((i) => i.toLowerCase().includes(keyword))
    );
    setFilteredChargers(filtered);
  }, [baseChargers]);

  const handleSiteClick = useCallback((siteName: string) => {
    const filtered = baseChargers.filter((c) => c.site_name === siteName);
    setFilteredChargers(filtered);
    if (filtered.length > 0) {
      setSelectedCharger(filtered[0]);
      document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [baseChargers]);

  if (!hasCampaign) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Database className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h2 className="text-lg font-medium text-muted-foreground">No Campaign Selected</h2>
          <p className="text-sm text-muted-foreground/70 max-w-xs">
            Select a partner and campaign from the sidebar to view dashboard data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 space-y-8">
      <HeroMetrics
        healthScore={filteredStats.healthScore}
        criticalCount={filteredStats.critical}
        highCount={filteredStats.high}
        mediumCount={filteredStats.medium}
        lowCount={filteredStats.low}
        totalServiced={filteredStats.serviced}
        totalChargers={filteredStats.total}
        onCriticalClick={handleCriticalClick}
      />

      <div id="map-section">
        <ChargerMap
          chargers={filteredChargers}
          allChargers={baseChargers}
          selectedCharger={selectedCharger}
          onChargerSelect={setSelectedCharger}
          onLocationFilter={handleLocationFilter}
          focusedLocation={focusedLocation}
        />
      </div>

      <FindingsSection
        chargers={filteredChargers}
        onShowOnMap={handleShowOnMap}
        criticalRef={criticalRef}
      />

      <ComponentAnalysis
        chargers={filteredChargers}
        onComponentClick={handleComponentClick}
      />

      <SitePerformanceTable
        chargers={filteredChargers}
        onSiteClick={handleSiteClick}
      />

      <ReportLibrary chargers={filteredChargers} />

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
