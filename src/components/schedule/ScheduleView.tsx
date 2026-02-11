import { useState, useCallback } from "react";
import { CampaignConfig, DEFAULT_CONFIG, Campaign } from "@/types/campaign";
import { AssessmentCharger } from "@/types/assessment";
import { createCampaign, filterChargers } from "@/lib/scheduleGenerator";
import { CampaignConfigPanel } from "@/components/schedule/CampaignConfigPanel";
import { ScheduleTimeline } from "@/components/schedule/ScheduleTimeline";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Rocket, CalendarDays } from "lucide-react";
import { toast } from "sonner";

interface ScheduleViewProps {
  chargers: AssessmentCharger[];
  activeCampaign: Campaign | null;
  onCreateCampaign: (campaign: Campaign) => void;
  onStartCampaign: (id: string) => void;
  onEndCampaign: (id: string) => void;
  onUpdateStatus: (campaignId: string, chargerId: string, status: any) => void;
  onUpdateChargerPhase: (id: string, phase: any) => void;
  onSelectCharger: (charger: AssessmentCharger) => void;
}

export function ScheduleView({
  chargers,
  activeCampaign,
  onCreateCampaign,
  onStartCampaign,
  onEndCampaign,
  onUpdateStatus,
  onUpdateChargerPhase,
  onSelectCharger,
}: ScheduleViewProps) {
  const [config, setConfig] = useState<CampaignConfig>({ ...DEFAULT_CONFIG });
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handlePreview = useCallback(() => {
    const selected = filterChargers(chargers, config);
    if (selected.length === 0) {
      toast.error("No chargers match your selection criteria");
      return;
    }
    const campaign = createCampaign(chargers, config);
    setPreviewCampaign(campaign);
    toast.success(`Schedule preview: ${selected.length} chargers across ${campaign.statistics.totalWeeks} weeks`);
  }, [chargers, config]);

  const handleReset = useCallback(() => {
    setConfig({ ...DEFAULT_CONFIG });
    setPreviewCampaign(null);
  }, []);

  const handleStartCampaign = useCallback(() => {
    if (!previewCampaign) return;
    onCreateCampaign(previewCampaign);
    onStartCampaign(previewCampaign.id);

    // Move chargers to Scheduled
    for (const day of previewCampaign.schedule) {
      for (const item of day.chargers) {
        onUpdateChargerPhase(item.chargerId, "Scheduled");
      }
    }

    setConfirmOpen(false);
    setPreviewCampaign(null);
    toast.success(`🚀 Campaign started! ${previewCampaign.statistics.totalChargers} chargers scheduled.`);
  }, [previewCampaign, onCreateCampaign, onStartCampaign, onUpdateChargerPhase]);

  // If there's an active campaign, show it
  const displayCampaign = activeCampaign || previewCampaign;

  if (activeCampaign) {
    return (
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        <ScheduleTimeline
          campaign={activeCampaign}
          chargers={chargers}
          onMarkStatus={(chargerId, status) => {
            onUpdateStatus(activeCampaign.id, chargerId, status);
            if (status === "completed") {
              onUpdateChargerPhase(chargerId, "Completed");
            } else if (status === "in_progress") {
              onUpdateChargerPhase(chargerId, "In Progress");
            }
          }}
          onSelectCharger={onSelectCharger}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
      {/* Config Panel */}
      <CampaignConfigPanel
        chargers={chargers}
        config={config}
        onChange={setConfig}
        onPreview={handlePreview}
        onReset={handleReset}
      />

      {/* Timeline / Empty */}
      {previewCampaign ? (
        <div className="flex-1 flex flex-col">
          {/* Start Campaign Bar */}
          <div className="p-3 border-b border-border bg-optimal/10 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Preview: {previewCampaign.statistics.totalChargers} chargers, {previewCampaign.statistics.totalWeeks} weeks
            </p>
            <Button onClick={() => setConfirmOpen(true)} className="bg-optimal hover:bg-optimal/90 text-optimal-foreground">
              <Rocket className="h-4 w-4 mr-1" /> Start Campaign
            </Button>
          </div>

          <ScheduleTimeline
            campaign={previewCampaign}
            chargers={chargers}
            onSelectCharger={onSelectCharger}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Create a Schedule</h3>
            <p className="text-sm text-muted-foreground">
              Configure your campaign settings on the left panel, then click "Preview Schedule" to generate a week-by-week timeline.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Assessment Campaign?</DialogTitle>
            <DialogDescription>
              This will activate the campaign and move chargers to "Scheduled" phase.
            </DialogDescription>
          </DialogHeader>
          {previewCampaign && (
            <div className="space-y-2 text-sm py-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Campaign</span><span className="font-medium">{previewCampaign.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{previewCampaign.statistics.totalWeeks} weeks</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Chargers</span><span>{previewCampaign.statistics.totalChargers}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Start Date</span><span>{previewCampaign.startDate}</span></div>
              <div className="border-t border-border pt-2 mt-2 space-y-1 text-xs text-muted-foreground">
                <p>✓ Chargers move to "Scheduled" phase</p>
                <p>✓ Weekly tracking enabled</p>
                <p>✓ Progress visible in Dashboard</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleStartCampaign} className="bg-optimal hover:bg-optimal/90 text-optimal-foreground">
              <Rocket className="h-4 w-4 mr-1" /> Start Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
