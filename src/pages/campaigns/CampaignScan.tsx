import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, Zap, AlertTriangle, ArrowRight, Check } from "lucide-react";
import { CampaignSubtitle } from "@/components/campaigns/CampaignSubtitle";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useCampaignChargers, useUpdateCampaignCharger, useBulkUpdateCampaignChargers, type CampaignChargerRow } from "@/hooks/useCampaignChargers";
import { ScanMetrics } from "@/components/scan/ScanMetrics";
import { ScanDataGrid } from "@/components/scan/ScanDataGrid";
import { ScanFiltersPanel } from "@/components/scan/ScanFiltersPanel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ScanFilters {
  priorities: string[];
  scopeFilter: "all" | "in_scope" | "out_of_scope";
  chargerTypes: string[];
  states: string[];
  operators: string[];
  statuses: string[];
  search: string;
}

const ALL_PRIORITIES = ["critical", "high", "medium", "low", "ok"];

export default function CampaignScan() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { selectedCampaignName } = useCampaignContext();
  const { data: campaign } = useCampaign(campaignId || null);
  const { data: chargers = [], isLoading } = useCampaignChargers(campaignId || null);
  const updateCharger = useUpdateCampaignCharger();
  const bulkUpdate = useBulkUpdateCampaignChargers();
  const updateCampaign = useUpdateCampaign();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTriageConfirm, setShowTriageConfirm] = useState(false);
  const [filters, setFilters] = useState<ScanFilters>({
    priorities: [...ALL_PRIORITIES],
    scopeFilter: "all",
    chargerTypes: [],
    states: [],
    operators: [],
    statuses: [],
    search: "",
  });

  // Compute available filter options from data
  const filterOptions = useMemo(() => {
    const types = new Set<string>();
    const states = new Map<string, number>();
    const operators = new Set<string>();
    const statuses = new Set<string>();
    for (const c of chargers) {
      if (c.max_power) {
        types.add(c.max_power > 20 ? "DC Level 3" : "AC Level 2");
      }
      if (c.model) types.add(c.model);
      if (c.state) {
        states.set(c.state, (states.get(c.state) || 0) + 1);
      }
      if (c.charger_status) statuses.add(c.charger_status);
    }
    return {
      chargerTypes: Array.from(types).sort(),
      states: Array.from(states.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      operators: Array.from(operators).sort(),
      statuses: Array.from(statuses).sort(),
    };
  }, [chargers]);

  // Apply filters
  const filteredChargers = useMemo(() => {
    return chargers.filter(c => {
      if (!filters.priorities.includes(c.priority)) return false;
      if (filters.scopeFilter === "in_scope" && !c.in_scope) return false;
      if (filters.scopeFilter === "out_of_scope" && c.in_scope) return false;
      if (filters.states.length > 0 && !filters.states.includes(c.state || "")) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(c.charger_status || "")) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchable = [c.station_id, c.site_name, c.address, c.scan_notes, c.city, c.state, c.model].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [chargers, filters]);

  // Metrics
  const metrics = useMemo(() => {
    let total = chargers.length;
    let inScope = 0, critical = 0, high = 0, medium = 0, low = 0, ok = 0;
    let dc = 0, ac = 0;
    for (const c of chargers) {
      if (c.in_scope) inScope++;
      if (c.priority === "critical") critical++;
      else if (c.priority === "high") high++;
      else if (c.priority === "medium") medium++;
      else if (c.priority === "low") low++;
      else if (c.priority === "ok") ok++;
      if (c.max_power && c.max_power > 20) dc++;
      else ac++;
    }
    return { total, inScope, critical, high, medium, low, ok, dc, ac };
  }, [chargers]);

  const handlePriorityChange = useCallback((id: string, priority: string) => {
    updateCharger.mutate({ id, priority });
  }, [updateCharger]);

  const handleScopeToggle = useCallback((id: string, in_scope: boolean) => {
    updateCharger.mutate({ id, in_scope });
  }, [updateCharger]);

  const handleNotesChange = useCallback((id: string, scan_notes: string) => {
    updateCharger.mutate({ id, scan_notes });
  }, [updateCharger]);

  const handleBulkPriority = useCallback((priority: string) => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate({ ids: Array.from(selectedIds), updates: { priority } });
    toast.success(`Updated ${selectedIds.size} chargers to ${priority}`);
    setSelectedIds(new Set());
  }, [selectedIds, bulkUpdate]);

  const handleBulkScope = useCallback((in_scope: boolean) => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate({ ids: Array.from(selectedIds), updates: { in_scope } });
    toast.success(`${in_scope ? "Included" : "Excluded"} ${selectedIds.size} chargers`);
    setSelectedIds(new Set());
  }, [selectedIds, bulkUpdate]);

  const handleBulkNotes = useCallback((note: string) => {
    if (selectedIds.size === 0 || !note.trim()) return;
    bulkUpdate.mutate({ ids: Array.from(selectedIds), updates: { scan_notes: note } });
    toast.success(`Applied notes to ${selectedIds.size} chargers`);
    setSelectedIds(new Set());
  }, [selectedIds, bulkUpdate]);

  const handleSelectByPriority = useCallback((priority: string) => {
    const ids = new Set(chargers.filter(c => c.priority === priority).map(c => c.id));
    setSelectedIds(ids);
  }, [chargers]);

  const handleSelectByStatus = useCallback((status: string) => {
    const ids = new Set(chargers.filter(c => (c.charger_status || "").toLowerCase().includes(status.toLowerCase())).map(c => c.id));
    setSelectedIds(ids);
  }, [chargers]);

  const handleIncludeAllFiltered = useCallback(() => {
    const ids = filteredChargers.map(c => c.id);
    bulkUpdate.mutate({ ids, updates: { in_scope: true } });
    toast.success(`Included ${ids.length} filtered chargers`);
  }, [filteredChargers, bulkUpdate]);

  const handleExcludeAllFiltered = useCallback(() => {
    const ids = filteredChargers.map(c => c.id);
    bulkUpdate.mutate({ ids, updates: { in_scope: false } });
    toast.success(`Excluded ${ids.length} filtered chargers`);
  }, [filteredChargers, bulkUpdate]);

  const handleCompleteTriage = useCallback(async () => {
    if (!campaignId || !campaign) return;
    const currentStatus = (campaign.stage_status as Record<string, string>) || {};
    await updateCampaign.mutateAsync({
      id: campaignId,
      stage_status: { ...currentStatus, scan: "complete" } as any,
    });
    toast.success("Triage complete!");
    navigate(`/campaigns/${campaignId}/deploy`);
  }, [campaignId, campaign, updateCampaign, navigate]);

  const canCompleteTriage = metrics.inScope > 0;
  const scanComplete = (campaign?.stage_status as any)?.scan === "complete";
  const hasChangedSinceComplete = scanComplete; // simplified

  // Empty state
  if (!isLoading && chargers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Search className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">No Chargers Imported</h1>
        <p className="text-muted-foreground max-w-md">
          No chargers imported yet. Go to Upload to add your dataset.
        </p>
        <Button onClick={() => navigate(`/campaigns/${campaignId}/upload`)} className="gap-2">
          Go to Upload <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {campaign && (
        <div className="px-4 pt-4">
          <CampaignSubtitle
            customerName={campaign.customer}
            campaignName={campaign.name}
            status={campaign.status}
          />
        </div>
      )}
      {/* Metrics strip */}
      <ScanMetrics metrics={metrics} />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Data grid */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r">
          <ScanDataGrid
            chargers={filteredChargers}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onPriorityChange={handlePriorityChange}
            onScopeToggle={handleScopeToggle}
            onNotesChange={handleNotesChange}
            isLoading={isLoading}
            searchValue={filters.search}
            onSearchChange={(s) => setFilters(f => ({ ...f, search: s }))}
          />
        </div>

        {/* Filters panel */}
        <div className="w-[340px] shrink-0 overflow-y-auto bg-card">
          <ScanFiltersPanel
            filters={filters}
            onFiltersChange={setFilters}
            filterOptions={filterOptions}
            selectedCount={selectedIds.size}
            onBulkPriority={handleBulkPriority}
            onBulkScope={handleBulkScope}
            onBulkNotes={handleBulkNotes}
            onSelectByPriority={handleSelectByPriority}
            onSelectByStatus={handleSelectByStatus}
            onIncludeAllFiltered={handleIncludeAllFiltered}
            onExcludeAllFiltered={handleExcludeAllFiltered}
            canCompleteTriage={canCompleteTriage}
            onCompleteTriage={() => setShowTriageConfirm(true)}
            inScopeCount={metrics.inScope}
            stateCount={new Set(chargers.filter(c => c.in_scope && c.state).map(c => c.state!)).size}
            chargers={chargers}
          />
        </div>
      </div>

      <AlertDialog open={showTriageConfirm} onOpenChange={setShowTriageConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Triage?</AlertDialogTitle>
            <AlertDialogDescription>
              {metrics.inScope} chargers in scope across{" "}
              {new Set(chargers.filter(c => c.in_scope && c.state).map(c => c.state!)).size} states.
              Ready to move to Deploy?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteTriage}>
              Complete & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
