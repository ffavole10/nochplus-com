import { useState, useCallback, useMemo } from "react";
import { AssessmentHeader } from "@/components/assessment/AssessmentHeader";
import { AssessmentDashboard } from "@/components/assessment/AssessmentDashboard";
import { AssessmentMap } from "@/components/assessment/AssessmentMap";
import { AssessmentKanban } from "@/components/assessment/AssessmentKanban";
import { ChargerDetailModal } from "@/components/assessment/ChargerDetailModal";
import { MissionControlLanding } from "@/components/assessment/MissionControlLanding";
import { MissionControlDashboard } from "@/components/assessment/MissionControlDashboard";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { CampaignProgressBanner } from "@/components/schedule/CampaignProgressBanner";
import { useAssessmentData } from "@/hooks/useAssessmentData";
import { useCampaignManager } from "@/hooks/useCampaignManager";
import { useAuth } from "@/hooks/useAuth";
import { AssessmentCharger, ViewMode } from "@/types/assessment";
import { Progress } from "@/components/ui/progress";
import { geocodeChargers } from "@/lib/geocoder";
import { sampleCampaigns, CUSTOMER_LABELS } from "@/data/sampleCampaigns";
import { toast } from "sonner";

const AssessmentTracker = () => {
  const { chargers, importChargers, updateCharger, moveChargerToPhase, clearData } = useAssessmentData();
  const { session } = useAuth();
  const {
    campaigns,
    activeCampaign,
    addCampaign,
    startCampaign,
    endCampaign,
    updateChargerStatus,
    rescheduleCharger,
    deleteCampaign,
  } = useCampaignManager(session);
  const [view, setView] = useState<ViewMode>("dataset");
  const [selectedCharger, setSelectedCharger] = useState<AssessmentCharger | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 });
  const [isLandingDismissed, setIsLandingDismissed] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);

  // Build campaign options for the header dropdown
  const campaignOptions = useMemo(() => {
    const opts: { id: string; name: string }[] = [];
    selectedCampaignIds.forEach(id => {
      const userCampaign = campaigns.find(c => c.id === id);
      if (userCampaign) {
        opts.push({ id, name: userCampaign.name });
      } else {
        const sampleId = id.replace("sample-", "");
        const sample = sampleCampaigns.find(c => c.id === sampleId);
        if (sample) opts.push({ id, name: sample.name });
      }
    });
    return opts;
  }, [selectedCampaignIds, campaigns]);

  // Active campaign ID for the header selector (single selection within selected campaigns)
  const [activeCampaignViewId, setActiveCampaignViewId] = useState<string>("");

  // When campaigns are selected from landing, default to the first one
  const handleSelectCampaignsWrapped = useCallback((ids: string[]) => {
    setSelectedCampaignIds(ids);
    setActiveCampaignViewId(ids[0] || "");
    setIsLandingDismissed(true);
  }, []);

  // Resolve the active sample campaign for the dashboard
  const activeSampleCampaign = useMemo(() => {
    if (!activeCampaignViewId) return null;
    const sampleId = activeCampaignViewId.replace("sample-", "");
    return sampleCampaigns.find(c => c.id === sampleId) || null;
  }, [activeCampaignViewId]);

  // Derive campaign name from active campaign
  const selectedCampaignName = useMemo(() => {
    const opt = campaignOptions.find(o => o.id === activeCampaignViewId);
    return opt?.name || "";
  }, [activeCampaignViewId, campaignOptions]);
  const handleSelectCharger = useCallback((charger: AssessmentCharger) => {
    setSelectedCharger(charger);
    setModalOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(chargers, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chargers]);

  const handleUploadFile = useCallback(async (file: File) => {
    const { parseAssessmentExcel } = await import("@/lib/assessmentParser");
    try {
      const data = await parseAssessmentExcel(file);
      importChargers(data);
      setIsLandingDismissed(true);
      setGeocoding(true);
      toast.info("Geocoding charger locations...");
      const geocoded = await geocodeChargers(data, (done, total) => {
        setGeocodeProgress({ done, total });
      });
      importChargers(geocoded);
      setGeocoding(false);
      toast.success(`✓ Geocoded ${geocoded.filter(c => c.latitude).length} charger locations`);
    } catch {
      setGeocoding(false);
      toast.error("Failed to parse file. Check the format.");
    }
  }, [importChargers]);

  // handleSelectCampaigns is now handleSelectCampaignsWrapped above

  const handleCreateNew = useCallback(() => {
    setIsLandingDismissed(true);
    setView("schedule");
  }, []);

  const handleBackToLanding = useCallback(() => {
    setIsLandingDismissed(false);
    setSelectedCampaignIds([]);
  }, []);

  // Show landing page when not dismissed
  if (!isLandingDismissed) {
    return (
      <MissionControlLanding
        campaigns={campaigns}
        onUploadFile={handleUploadFile}
        onSelectCampaigns={handleSelectCampaignsWrapped}
        onCreateNew={handleCreateNew}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AssessmentHeader
        view={view}
        onViewChange={setView}
        onImport={importChargers}
        onExport={handleExport}
        onClear={clearData}
        chargerCount={chargers.length}
        campaignOptions={campaignOptions}
        selectedCampaignId={activeCampaignViewId}
        onCampaignChange={setActiveCampaignViewId}
      />

      {geocoding && (
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Geocoding locations... {geocodeProgress.done}/{geocodeProgress.total}
            </span>
            <Progress value={geocodeProgress.total > 0 ? (geocodeProgress.done / geocodeProgress.total) * 100 : 0} className="flex-1 max-w-xs" />
          </div>
        </div>
      )}

      {/* Campaign Progress Banner on Dataset view */}
      {view === "dataset" && activeCampaign && (
        <div className="px-6 pt-4">
          <CampaignProgressBanner
            campaign={activeCampaign}
            onViewSchedule={() => setView("schedule")}
            onEndCampaign={() => {
              endCampaign(activeCampaign.id);
              toast.success("Campaign ended");
            }}
          />
        </div>
      )}

      {view === "dataset" && (
        <AssessmentDashboard chargers={chargers} onSelectCharger={handleSelectCharger} />
      )}
      {view === "map" && (
        <AssessmentMap
          chargers={chargers}
          onSelectCharger={handleSelectCharger}
          onGeocodeRequest={async () => {
            const needsGeocode = chargers.some(c => !c.latitude || !c.longitude);
            if (!needsGeocode) {
              toast.info("All chargers already have coordinates");
              return;
            }
            setGeocoding(true);
            toast.info("Geocoding charger locations...");
            const geocoded = await geocodeChargers(chargers, (done, total) => {
              setGeocodeProgress({ done, total });
            });
            importChargers(geocoded);
            setGeocoding(false);
            toast.success(`✓ Geocoded ${geocoded.filter(c => c.latitude).length} charger locations`);
          }}
          isGeocoding={geocoding}
        />
      )}
      {view === "kanban" && (
        <AssessmentKanban
          chargers={chargers}
          onMoveCharger={moveChargerToPhase}
          onSelectCharger={handleSelectCharger}
        />
      )}
      {view === "schedule" && (
        <ScheduleView
          chargers={chargers}
          activeCampaign={activeCampaign}
          campaigns={campaigns}
          campaignName={selectedCampaignName}
          onCreateCampaign={addCampaign}
          onStartCampaign={startCampaign}
          onEndCampaign={(id) => {
            endCampaign(id);
            toast.success("Campaign ended");
          }}
          onUpdateStatus={updateChargerStatus}
          onUpdateChargerPhase={moveChargerToPhase}
          onSelectCharger={handleSelectCharger}
          onExport={handleExport}
          onClear={clearData}
          onImport={importChargers}
        />
      )}

      <ChargerDetailModal
        charger={selectedCharger}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={updateCharger}
      />
    </div>
  );
};

export default AssessmentTracker;
