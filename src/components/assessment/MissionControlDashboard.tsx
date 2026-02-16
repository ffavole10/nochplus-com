import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { allChargers, getNetworkStats, getChargersByCustomer, Charger } from "@/data/chargerData";
import { HeroMetrics } from "@/components/dashboard/HeroMetrics";
import { FindingsSection } from "@/components/dashboard/FindingsSection";
import { ChargerMap } from "@/components/dashboard/ChargerMap";
import { ComponentAnalysis } from "@/components/dashboard/ComponentAnalysis";
import { SitePerformanceTable } from "@/components/dashboard/SitePerformanceTable";
import { ReportLibrary } from "@/components/dashboard/ReportLibrary";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SampleCampaign } from "@/data/sampleCampaigns";

interface MissionControlDashboardProps {
  campaign?: SampleCampaign | null;
}

export function MissionControlDashboard({ campaign }: MissionControlDashboardProps) {
  // Get campaign-specific chargers based on customer
  const campaignChargers = useMemo(() => {
    if (campaign) {
      return getChargersByCustomer(campaign.customer);
    }
    return allChargers;
  }, [campaign]);

  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [filteredChargers, setFilteredChargers] = useState<Charger[]>(campaignChargers);
  const [focusedLocation, setFocusedLocation] = useState<string | null>(null);
  const criticalRef = useRef<HTMLDivElement>(null);

  // Reset filtered chargers when campaign changes
  useEffect(() => {
    setFilteredChargers(campaignChargers);
    setSelectedCharger(null);
    setFocusedLocation(null);
  }, [campaignChargers]);

  const handleCriticalClick = useCallback(() => {
    criticalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleShowOnMap = useCallback((charger: Charger) => {
    setSelectedCharger(charger);
    document.getElementById("mc-map-section")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleLocationFilter = useCallback((location: string | null) => {
    if (location === null) {
      setFilteredChargers(campaignChargers);
      setFocusedLocation(null);
      setSelectedCharger(null);
    } else {
      const [city, state] = location.split(", ");
      const filtered = campaignChargers.filter(
        (c) => c.city === city && c.state === state
      );
      setFilteredChargers(filtered);
      setFocusedLocation(location);
      if (filtered.length > 0) {
        setSelectedCharger(filtered[0]);
      }
    }
  }, [campaignChargers]);

  const handleComponentClick = useCallback((component: string) => {
    const keyword = component.toLowerCase().split("/")[0];
    const filtered = campaignChargers.filter((c) =>
      c.issues?.some((i) => i.toLowerCase().includes(keyword))
    );
    setFilteredChargers(filtered);
  }, [campaignChargers]);

  const handleSiteClick = useCallback((siteName: string) => {
    const filtered = campaignChargers.filter((c) => c.site_name === siteName);
    setFilteredChargers(filtered);
    if (filtered.length > 0) {
      setSelectedCharger(filtered[0]);
      document.getElementById("mc-map-section")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [campaignChargers]);

  const handleFiltersChange = useCallback((chargers: Charger[]) => {
    setFilteredChargers(chargers);
    setSelectedCharger(null);
  }, []);

  // Use campaign stats if available, otherwise compute from filtered chargers
  const displayStats = useMemo(() => {
    const stats = getNetworkStats(filteredChargers);
    return {
      healthScore: campaign && campaign.totalServiced > 0 ? campaign.healthScore : stats.healthScore,
      critical: stats.critical,
      high: stats.high,
      medium: stats.medium,
      low: stats.low,
      serviced: campaign && campaign.totalServiced > 0 ? campaign.totalServiced : stats.serviced,
      total: stats.total,
    };
  }, [campaign, filteredChargers]);

  return (
    <SidebarProvider>
      <div className="flex-1 flex w-full">
        <DashboardSidebar
          onFiltersChange={handleFiltersChange}
          filteredCount={filteredChargers.length}
          totalCount={campaignChargers.length}
          searchQuery=""
        />

        <div className="flex-1 flex flex-col">
          <main className="flex-1 container mx-auto px-4 py-6 space-y-8">
            <div className="lg:hidden">
              <SidebarTrigger className="mb-4" />
            </div>

            <HeroMetrics
              healthScore={displayStats.healthScore}
              criticalCount={displayStats.critical}
              highCount={displayStats.high}
              mediumCount={displayStats.medium}
              lowCount={displayStats.low}
              totalServiced={displayStats.serviced}
              totalChargers={displayStats.total}
              onCriticalClick={handleCriticalClick}
            />

            <FindingsSection
              chargers={filteredChargers}
              onShowOnMap={handleShowOnMap}
              criticalRef={criticalRef}
            />

            <div id="mc-map-section">
              <ChargerMap
                chargers={filteredChargers}
                allChargers={campaignChargers}
                selectedCharger={selectedCharger}
                onChargerSelect={setSelectedCharger}
                onLocationFilter={handleLocationFilter}
                focusedLocation={focusedLocation}
              />
            </div>

            <ComponentAnalysis
              chargers={filteredChargers}
              onComponentClick={handleComponentClick}
            />

            <SitePerformanceTable
              chargers={filteredChargers}
              onSiteClick={handleSiteClick}
            />

            <ReportLibrary chargers={filteredChargers} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
