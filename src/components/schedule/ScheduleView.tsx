import { useState, useCallback, useMemo } from "react";
import { CampaignConfig, DEFAULT_CONFIG, Campaign } from "@/types/campaign";
import { AssessmentCharger } from "@/types/assessment";
import { createCampaign, filterChargers } from "@/lib/scheduleGenerator";
import { CampaignConfigPanel } from "@/components/schedule/CampaignConfigPanel";
import { CampaignCalendar } from "@/components/schedule/CampaignCalendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, Save, CalendarDays, AlertTriangle, FolderOpen, Download, Trash2, Upload, Loader2 } from "lucide-react";
import { parseAssessmentExcel } from "@/lib/assessmentParser";
import { toast } from "sonner";

interface ScheduleViewProps {
  chargers: AssessmentCharger[];
  activeCampaign: Campaign | null;
  campaigns: Campaign[];
  campaignName?: string;
  onCreateCampaign: (campaign: Campaign) => void;
  onStartCampaign: (id: string) => void;
  onEndCampaign: (id: string) => void;
  onUpdateStatus: (campaignId: string, chargerId: string, status: any) => void;
  onUpdateChargerPhase: (id: string, phase: any) => void;
  onSelectCharger: (charger: AssessmentCharger) => void;
  onSelectCampaign?: (campaign: Campaign) => void;
  onExport: () => void;
  onClear: () => void;
  onImport: (chargers: AssessmentCharger[]) => void;
}

export function ScheduleView({
  chargers,
  activeCampaign,
  campaigns,
  campaignName,
  onCreateCampaign,
  onStartCampaign,
  onEndCampaign,
  onUpdateStatus,
  onUpdateChargerPhase,
  onSelectCharger,
  onSelectCampaign,
  onExport,
  onClear,
  onImport,
}: ScheduleViewProps) {
  const [config, setConfig] = useState<CampaignConfig>(() => {
    return { ...DEFAULT_CONFIG, name: campaignName || "" };
  });
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const chargers = await parseAssessmentExcel(file);
      onImport(chargers);
      toast.success(`✓ ${chargers.length} chargers imported successfully`);
    } catch {
      toast.error("Failed to parse file. Check the format.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }, [onImport]);

  // Auto-generate preview whenever config changes and there are matching chargers
  const autoPreview = useMemo(() => {
    const selected = filterChargers(chargers, config);
    if (selected.length === 0) return null;
    return createCampaign(chargers, config);
  }, [chargers, config]);

  const handleSaveDraft = useCallback(() => {
    if (!autoPreview) {
      toast.error("No chargers match your selection criteria");
      return;
    }
    onCreateCampaign({ ...autoPreview, status: "draft" });
    toast.success("Campaign saved as draft");
  }, [autoPreview, onCreateCampaign]);

  const validate = useCallback((): string[] => {
    const errors: string[] = [];
    if (!config.name.trim()) errors.push("Campaign name is required");
    if (config.workingDays.length === 0) errors.push("At least one working day required");
    const selected = filterChargers(chargers, config);
    if (selected.length === 0) errors.push("No chargers match selection criteria");
    const today = new Date().toISOString().split("T")[0];
    if (config.startDate < today) errors.push("Start date cannot be in the past");
    return errors;
  }, [chargers, config]);

  const handleStartCampaign = useCallback(() => {
    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setErrorDialogOpen(true);
      return;
    }
    setConfirmOpen(true);
  }, [validate]);

  const handleConfirmStart = useCallback(() => {
    if (!autoPreview) return;
    const campaign = { ...autoPreview, name: config.name || autoPreview.name };
    onCreateCampaign(campaign);
    onStartCampaign(campaign.id);

    for (const day of campaign.schedule) {
      for (const item of day.chargers) {
        onUpdateChargerPhase(item.chargerId, "Scheduled");
      }
    }

    setConfirmOpen(false);
    toast.success(`🚀 Campaign started! ${campaign.statistics.totalChargers} chargers scheduled.`);
  }, [autoPreview, config.name, onCreateCampaign, onStartCampaign, onUpdateChargerPhase]);

  // If active campaign, show it in calendar mode
  const displayCampaign = activeCampaign || autoPreview;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Top bar */}
      <div className="px-4 py-2 border-b border-border bg-card flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Campaign Management</h2>
          {activeCampaign && (
            <Badge className="bg-optimal text-optimal-foreground text-[10px]">Active</Badge>
          )}
          {!activeCampaign && autoPreview && (
            <Badge variant="secondary" className="text-[10px]">Preview</Badge>
          )}
          {/* Campaign Selector */}
          {campaigns.length > 0 && (
            <Select
              value=""
              onValueChange={(val) => {
                const found = campaigns.find(c => c.id === val);
                if (found && onSelectCampaign) onSelectCampaign(found);
              }}
            >
              <SelectTrigger className="h-7 w-[220px] text-xs">
                <FolderOpen className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Switch campaign..." />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${c.status === "active" ? "bg-optimal" : c.status === "draft" ? "bg-muted-foreground" : "bg-primary"}`} />
                      {c.name || `Campaign ${c.id.slice(0, 6)}`}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!activeCampaign && (
            <>
              {chargers.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={onExport}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={onClear}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                </>
              )}
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="schedule-upload"
                  disabled={isUploading}
                />
                <label htmlFor="schedule-upload">
                  <Button asChild variant="outline" size="sm" disabled={isUploading}>
                    <span className="cursor-pointer">
                      {isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 mr-1" />
                      )}
                      {isUploading ? "Parsing..." : "Upload File"}
                    </span>
                  </Button>
                </label>
              </div>
              <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={!autoPreview}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save Draft
              </Button>
              <Button size="sm" onClick={handleStartCampaign} className="bg-optimal hover:bg-optimal/90 text-optimal-foreground" disabled={!autoPreview}>
                <Rocket className="h-3.5 w-3.5 mr-1" /> Start Campaign
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Config panel - only when no active campaign */}
        {!activeCampaign && (
          <CampaignConfigPanel
            chargers={chargers}
            config={config}
            onChange={setConfig}
          />
        )}

        {/* Calendar */}
        {displayCampaign ? (
          <CampaignCalendar
            campaign={displayCampaign}
            chargers={chargers}
            onMarkStatus={activeCampaign ? (chargerId, status) => {
              onUpdateStatus(activeCampaign.id, chargerId, status);
              if (status === "completed") onUpdateChargerPhase(chargerId, "Completed");
              else if (status === "in_progress") onUpdateChargerPhase(chargerId, "In Progress");
            } : undefined}
            onSelectCharger={onSelectCharger}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Create a Campaign</h3>
              <p className="text-sm text-muted-foreground">
                Configure your campaign settings on the left panel. The calendar will populate automatically as chargers match your filters.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Validation Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-degraded" />
              Cannot Start Campaign
            </DialogTitle>
            <DialogDescription>Fix these issues before starting:</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {validationErrors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-critical">✗</span>
                <span>{err}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setErrorDialogOpen(false)}>Fix Issues</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-optimal" />
              Start Campaign?
            </DialogTitle>
            <DialogDescription>This will activate the campaign and schedule chargers.</DialogDescription>
          </DialogHeader>
          {autoPreview && (
            <div className="space-y-2 text-sm py-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{config.name || autoPreview.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{autoPreview.statistics.totalWeeks} weeks</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Chargers</span><span>{autoPreview.statistics.totalChargers}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Start</span><span>{autoPreview.startDate}</span></div>
              <div className="border-t border-border pt-2 mt-2 space-y-1 text-xs text-muted-foreground">
                <p>✓ Chargers move to "Scheduled" phase</p>
                <p>✓ Weekly tracking enabled</p>
                <p>✓ Progress visible in Dashboard</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmStart} className="bg-optimal hover:bg-optimal/90 text-optimal-foreground">
              <Rocket className="h-4 w-4 mr-1" /> Start Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
