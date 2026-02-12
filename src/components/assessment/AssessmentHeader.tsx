import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileSpreadsheet, Loader2, LayoutDashboard, Map, Columns, CalendarDays, Database, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssessmentCharger, ViewMode } from "@/types/assessment";
import { parseAssessmentExcel } from "@/lib/assessmentParser";
import { toast } from "sonner";
import nochLogo from "@/assets/noch-logo-white.png";
import { sampleCampaigns, CUSTOMER_LABELS } from "@/data/sampleCampaigns";

interface CampaignOption {
  id: string;
  name: string;
}

interface AssessmentHeaderProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onImport: (chargers: AssessmentCharger[]) => void;
  onExport: () => void;
  onClear: () => void;
  chargerCount: number;
  campaignOptions?: CampaignOption[];
  selectedCampaignId?: string;
  onCampaignChange?: (id: string) => void;
}

export function AssessmentHeader({ view, onViewChange, onImport, onExport, onClear, chargerCount, campaignOptions = [], selectedCampaignId, onCampaignChange }: AssessmentHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const chargers = await parseAssessmentExcel(file);
      onImport(chargers);
      toast.success(`✓ ${chargers.length} chargers imported successfully`);
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Failed to parse file. Check the format.");
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  }, [onImport]);

  return (
    <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <img src={nochLogo} alt="Noch Power" className="h-8 brightness-0 dark:brightness-100" />
        <div className="h-6 w-px bg-border" />
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Mission Control
        </h1>
        {chargerCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {chargerCount} chargers
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Tabs value={view} onValueChange={(v) => onViewChange(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="campaign-dashboard" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="dataset" className="gap-1.5">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Dataset</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5">
              <Columns className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {campaignOptions.length > 0 && onCampaignChange && (
          <div className="h-6 w-px bg-border" />
        )}
        {campaignOptions.length > 0 && onCampaignChange && selectedCampaignId && (
          <Select value={selectedCampaignId} onValueChange={onCampaignChange}>
            <SelectTrigger className="w-[220px] h-8 text-sm bg-background border-border">
              <SelectValue placeholder="Select Campaign" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-lg z-[100]">
              {campaignOptions.map((c) => (
                <SelectItem key={c.id} value={c.id} className="cursor-pointer text-sm">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="h-6 w-px bg-border" />
        <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-1.5">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Button>
      </div>
    </header>
  );
}
