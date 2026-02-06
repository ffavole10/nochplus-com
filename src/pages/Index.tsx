import { useRef, useState, useCallback, useMemo } from "react";
import { allChargers, getNetworkStats, Charger, ChargerStatus } from "@/data/chargerData";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HeroMetrics } from "@/components/dashboard/HeroMetrics";
import { FindingsSection } from "@/components/dashboard/FindingsSection";
import { ChargerMap } from "@/components/dashboard/ChargerMap";
import { ComponentAnalysis } from "@/components/dashboard/ComponentAnalysis";
import { SitePerformanceTable } from "@/components/dashboard/SitePerformanceTable";
import { ReportLibrary } from "@/components/dashboard/ReportLibrary";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CampaignHistoryPanel } from "@/components/campaigns/CampaignHistoryPanel";
import { useChargerRecords, Campaign } from "@/hooks/useCampaigns";

const Index = () => {
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [filteredChargers, setFilteredChargers] = useState<Charger[]>(allChargers);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("evgo");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const criticalRef = useRef<HTMLDivElement>(null);

  // Fetch charger records if a campaign is selected
  const { data: campaignChargerRecords } = useChargerRecords(selectedCampaign?.id || null);

  // Convert campaign charger records to Charger format for dashboard components
  const campaignChargers = useMemo((): Charger[] => {
    if (!campaignChargerRecords) return [];
    return campaignChargerRecords.map((record) => ({
      charger_id: record.station_id,
      station_number: record.station_name || record.station_id,
      model: record.model || "Unknown",
      manufacturer: "BTC",
      address: record.address || "",
      city: record.city || "",
      state: record.state || "",
      zip: record.zip || "",
      site_name: record.site_name || "",
      serviced: record.serviced_qty || 0,
      status: (record.status as ChargerStatus) || "Optimal",
      summary: record.summary || "",
      full_report_link: record.report_url || "",
      start_date: record.start_date || "",
      max_power: record.max_power || 50,
      lat: record.latitude || 32.7 + Math.random() * 0.1,
      lng: record.longitude || -117.2 + Math.random() * 0.1,
      issues: [
        record.ccs_cable_issue && "CCS Cable",
        record.chademo_cable_issue && "CHAdeMO Cable",
        record.screen_damage && "Screen Damage",
        record.cc_reader_issue && "CC Reader",
        record.rfid_reader_issue && "RFID Reader",
        record.power_supply_issue && "Power Supply",
        record.circuit_board_issue && "Circuit Board",
        record.other_issue && "Other",
      ].filter(Boolean) as string[],
    }));
  }, [campaignChargerRecords]);

  // Use campaign chargers if a campaign is selected, otherwise use mock data
  const activeChargers = selectedCampaign ? campaignChargers : filteredChargers;

  const stats = getNetworkStats(allChargers);
  const filteredStats = getNetworkStats(activeChargers);

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
          <DashboardHeader 
            lastUpdated={lastUpdated} 
            selectedCustomer={selectedCustomer}
            onCustomerChange={setSelectedCustomer}
          />

          <main className="flex-1 container mx-auto px-4 py-6 space-y-8">
            {/* Sidebar Toggle for Mobile */}
            <div className="lg:hidden">
              <SidebarTrigger className="mb-4" />
            </div>

            {/* Campaign History Panel */}
            <div className="max-w-md">
              <CampaignHistoryPanel
                selectedCampaignId={selectedCampaign?.id || null}
                onSelectCampaign={(campaign) => {
                  setSelectedCampaign(campaign);
                  if (!campaign) {
                    setFilteredChargers(allChargers);
                  }
                }}
              />
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
              chargers={activeChargers}
              onShowOnMap={handleShowOnMap}
              criticalRef={criticalRef}
            />

            {/* Map Section */}
            <div id="map-section">
              <ChargerMap
                chargers={activeChargers}
                selectedCharger={selectedCharger}
                onChargerSelect={setSelectedCharger}
                onLocationFilter={handleLocationFilter}
              />
            </div>

            {/* Component Analysis */}
            <ComponentAnalysis
              chargers={activeChargers}
              onComponentClick={handleComponentClick}
            />

            {/* Site Performance */}
            <SitePerformanceTable
              chargers={activeChargers}
              onSiteClick={handleSiteClick}
            />

            {/* Report Library */}
            <ReportLibrary chargers={activeChargers} />
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
      </div>
    </SidebarProvider>
  );
};

export default Index;
