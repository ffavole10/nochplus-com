import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CalendarDays, ArrowRight, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from "lucide-react";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useCampaignChargers, useBulkUpdateCampaignChargers } from "@/hooks/useCampaignChargers";
import { useTechnicians } from "@/hooks/useTechnicians";
import { DeployConfigPanel } from "@/components/deploy/DeployConfigPanel";
import { DeployMapPanel } from "@/components/deploy/DeployMapPanel";
import { DeployTimelinePanel } from "@/components/deploy/DeployTimelinePanel";
import { generateDeploySchedule, type DeployScheduleResult, type DeployTech, type DeployCharger } from "@/lib/deployRouteOptimizer";
import { getRegion } from "@/lib/regionMapping";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TECH_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#06b6d4", "#ec4899", "#eab308"];

export default function CampaignDeploy() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { data: campaign, refetch: refetchCampaign } = useCampaign(campaignId || null);
  const { data: chargers = [], isLoading: chargersLoading } = useCampaignChargers(campaignId || null);
  const { data: allTechs = [] } = useTechnicians();
  const updateCampaign = useUpdateCampaign();
  const bulkUpdateChargers = useBulkUpdateCampaignChargers();

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [assignedTechIds, setAssignedTechIds] = useState<string[]>([]);
  const [techAirports, setTechAirports] = useState<Record<string, string>>({});
  const [regionAssignment, setRegionAssignment] = useState<Record<string, string[]>>({});
  const [scheduleResult, setScheduleResult] = useState<DeployScheduleResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const initializedRef = useRef(false);

  // In-scope chargers
  const inScopeChargers = useMemo(() => chargers.filter(c => c.in_scope), [chargers]);

  // Regions present in data
  const regionCounts = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of inScopeChargers) {
      const r = getRegion(c.city, c.state);
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(c.id);
    }
    return map;
  }, [inScopeChargers]);

  // Load existing campaign_technicians on mount
  useEffect(() => {
    if (!campaignId || initializedRef.current) return;
    initializedRef.current = true;
    (async () => {
      const { data } = await supabase
        .from("campaign_technicians")
        .select("*")
        .eq("campaign_id", campaignId);
      if (data && data.length > 0) {
        setAssignedTechIds(data.map(d => d.technician_id));
        const airports: Record<string, string> = {};
        const regions: Record<string, string[]> = {};
        for (const d of data) {
          if (d.home_base_airport) airports[d.technician_id] = d.home_base_airport;
          if (d.assigned_regions) regions[d.technician_id] = d.assigned_regions as string[];
        }
        setTechAirports(airports);
        setRegionAssignment(regions);
      }
      // Load existing schedule
      const { data: schedData } = await supabase
        .from("campaign_schedule")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("schedule_date");
      if (schedData && schedData.length > 0) {
        setScheduleResult({
          days: schedData.map((d: any) => ({
            technician_id: d.technician_id,
            schedule_date: d.schedule_date,
            day_number: d.day_number,
            day_type: d.day_type,
            sites: d.sites || [],
            travel_segments: d.travel_segments || [],
            overnight_city: d.overnight_city || "",
            total_work_hours: Number(d.total_work_hours) || 0,
            total_travel_hours: Number(d.total_travel_hours) || 0,
            total_drive_miles: Number(d.total_drive_miles) || 0,
            notes: d.notes || "",
          })),
          summaries: [],
          warnings: [],
          start_date: schedData[0]?.schedule_date || "",
          end_date: schedData[schedData.length - 1]?.schedule_date || "",
        });
        setHasGenerated(true);
      }
    })();
  }, [campaignId]);

  // Derived tech objects
  const deployTechs: DeployTech[] = useMemo(() => {
    return assignedTechIds.map((id, i) => {
      const t = allTechs.find(tech => tech.id === id);
      return {
        technician_id: id,
        name: t ? `${t.first_name} ${t.last_name}` : "Unknown",
        home_base_lat: t?.home_base_lat || 0,
        home_base_lng: t?.home_base_lng || 0,
        home_base_city: t ? `${t.home_base_city}, ${t.home_base_state}` : "",
        home_base_airport: techAirports[id] || null,
        color: TECH_COLORS[i % TECH_COLORS.length],
      };
    });
  }, [assignedTechIds, allTechs, techAirports]);

  // Charger-to-tech mapping from regions
  const chargerTechMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [techId, regions] of Object.entries(regionAssignment)) {
      for (const c of inScopeChargers) {
        const r = getRegion(c.city, c.state);
        if (regions.includes(r)) map.set(c.id, techId);
      }
    }
    return map;
  }, [regionAssignment, inScopeChargers]);

  const unassignedCount = inScopeChargers.filter(c => !chargerTechMap.has(c.id)).length;

  // Save tech assignments
  const saveTechs = useCallback(async (techIds: string[], airports: Record<string, string>, regions: Record<string, string[]>) => {
    if (!campaignId) return;
    await supabase.from("campaign_technicians").delete().eq("campaign_id", campaignId);
    if (techIds.length > 0) {
      const rows = techIds.map(id => {
        const t = allTechs.find(tech => tech.id === id);
        return {
          campaign_id: campaignId,
          technician_id: id,
          home_base_city: t ? `${t.home_base_city}, ${t.home_base_state}` : "",
          home_base_lat: t?.home_base_lat || null,
          home_base_lng: t?.home_base_lng || null,
          home_base_airport: airports[id] || null,
          assigned_regions: regions[id] || [],
        };
      });
      await supabase.from("campaign_technicians").insert(rows);
    }
    // Update stage_status
    const currentStatus = (campaign?.stage_status as Record<string, string>) || {};
    if (currentStatus.deploy !== "complete") {
      await updateCampaign.mutateAsync({
        id: campaignId,
        stage_status: { ...currentStatus, deploy: "in_progress" } as any,
      });
    }
  }, [campaignId, allTechs, campaign, updateCampaign]);

  const handleAssignTech = useCallback((ids: string[]) => {
    setAssignedTechIds(ids);
    saveTechs(ids, techAirports, regionAssignment);
  }, [techAirports, regionAssignment, saveTechs]);

  const handleRemoveTech = useCallback((id: string) => {
    const next = assignedTechIds.filter(t => t !== id);
    const nextRegions = { ...regionAssignment };
    delete nextRegions[id];
    setAssignedTechIds(next);
    setRegionAssignment(nextRegions);
    saveTechs(next, techAirports, nextRegions);
  }, [assignedTechIds, regionAssignment, techAirports, saveTechs]);

  const handleAirportChange = useCallback((techId: string, airport: string) => {
    const next = { ...techAirports, [techId]: airport };
    setTechAirports(next);
    saveTechs(assignedTechIds, next, regionAssignment);
  }, [assignedTechIds, techAirports, regionAssignment, saveTechs]);

  const handleRegionToggle = useCallback((techId: string, region: string) => {
    const current = regionAssignment[techId] || [];
    let next: string[];
    if (current.includes(region)) {
      next = current.filter(r => r !== region);
    } else {
      next = [...current, region];
    }
    const nextAll = { ...regionAssignment, [techId]: next };
    // Remove from other techs
    for (const otherTech of assignedTechIds) {
      if (otherTech !== techId && nextAll[otherTech]?.includes(region)) {
        nextAll[otherTech] = nextAll[otherTech].filter(r => r !== region);
      }
    }
    setRegionAssignment(nextAll);
    saveTechs(assignedTechIds, techAirports, nextAll);
  }, [assignedTechIds, regionAssignment, techAirports, saveTechs]);

  // Config changes
  const handleConfigSave = useCallback(async (field: string, value: any) => {
    if (!campaignId) return;
    await updateCampaign.mutateAsync({ id: campaignId, [field]: value } as any);
  }, [campaignId, updateCampaign]);

  // Generate route
  const handleGenerate = useCallback(async () => {
    if (!campaignId || !campaign) return;
    setGenerating(true);

    try {
      const deployChargers: DeployCharger[] = inScopeChargers
        .filter(c => chargerTechMap.has(c.id) && c.latitude && c.longitude)
        .map(c => ({
          id: c.id,
          charger_id: c.charger_id,
          station_id: c.station_id,
          site_name: c.site_name || c.station_id,
          address: c.address || "",
          city: c.city || "",
          state: c.state || "",
          lat: c.latitude!,
          lng: c.longitude!,
          estimated_hours: c.estimated_hours || campaign.hrs_per_charger,
          priority: c.priority,
          technician_id: chargerTechMap.get(c.id)!,
        }));

      const result = generateDeploySchedule(
        {
          start_date: campaign.start_date,
          deadline: campaign.deadline,
          working_days: (campaign.working_days as string[]) || ["mon", "tue", "wed", "thu", "fri"],
          hrs_per_charger: campaign.hrs_per_charger,
          hrs_per_day: campaign.hrs_per_day,
          break_hrs: campaign.break_hrs,
        },
        deployTechs,
        deployChargers,
      );

      // Delete existing schedule
      await supabase.from("campaign_schedule").delete().eq("campaign_id", campaignId);

      // Insert new schedule in batches
      const BATCH = 100;
      for (let i = 0; i < result.days.length; i += BATCH) {
        const batch = result.days.slice(i, i + BATCH).map(d => ({
          campaign_id: campaignId,
          technician_id: d.technician_id,
          schedule_date: d.schedule_date,
          day_number: d.day_number,
          day_type: d.day_type,
          sites: d.sites,
          travel_segments: d.travel_segments,
          overnight_city: d.overnight_city,
          total_work_hours: d.total_work_hours,
          total_travel_hours: d.total_travel_hours,
          total_drive_miles: d.total_drive_miles,
          notes: d.notes,
        }));
        const { error } = await supabase.from("campaign_schedule").insert(batch);
        if (error) throw error;
      }

      // Update campaign charger sequence orders
      let seqOrder = 0;
      for (const day of result.days) {
        for (const site of day.sites) {
          const cc = inScopeChargers.find(c => c.charger_id === site.charger_id);
          if (cc) {
            await supabase.from("campaign_chargers").update({
              sequence_order: seqOrder++,
              technician_id: day.technician_id,
            }).eq("id", cc.id);
          }
        }
      }

      // Update stage status
      const currentStatus = (campaign.stage_status as Record<string, string>) || {};
      await updateCampaign.mutateAsync({
        id: campaignId,
        stage_status: { ...currentStatus, deploy: "complete" } as any,
        start_date: result.start_date,
        end_date: result.end_date,
      });

      setScheduleResult(result);
      setHasGenerated(true);
      setRightOpen(true);

      if (result.warnings.length > 0) {
        result.warnings.forEach(w => toast.warning(w));
      }
      toast.success(`Schedule generated: ${result.days.length} days`);
      refetchCampaign();
    } catch (e: any) {
      toast.error(e.message || "Route generation failed");
    } finally {
      setGenerating(false);
    }
  }, [campaignId, campaign, inScopeChargers, chargerTechMap, deployTechs, updateCampaign, refetchCampaign]);

  // Empty state
  if (!chargersLoading && inScopeChargers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <CalendarDays className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">No Chargers In Scope</h1>
        <p className="text-muted-foreground max-w-md">
          Complete the Scan stage to set charger priorities and scope before deployment planning.
        </p>
        <Button onClick={() => navigate(`/campaigns/${campaignId}/scan`)} className="gap-2">
          Go to Scan <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Config */}
      {leftOpen ? (
        <div className="w-[300px] shrink-0 border-r overflow-y-auto bg-card flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-semibold uppercase tracking-wider">Configuration</span>
            <button onClick={() => setLeftOpen(false)} className="text-muted-foreground hover:text-foreground">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <DeployConfigPanel
            campaign={campaign}
            allTechs={allTechs}
            assignedTechIds={assignedTechIds}
            techAirports={techAirports}
            deployTechs={deployTechs}
            regionCounts={regionCounts}
            regionAssignment={regionAssignment}
            unassignedCount={unassignedCount}
            onAssignTechs={handleAssignTech}
            onRemoveTech={handleRemoveTech}
            onAirportChange={handleAirportChange}
            onRegionToggle={handleRegionToggle}
            onConfigSave={handleConfigSave}
            onGenerate={handleGenerate}
            generating={generating}
            hasGenerated={hasGenerated}
            canGenerate={assignedTechIds.length > 0 && unassignedCount === 0}
          />
        </div>
      ) : (
        <button
          onClick={() => setLeftOpen(true)}
          className="w-8 shrink-0 border-r bg-card flex items-center justify-center hover:bg-muted transition-colors"
        >
          <PanelLeft className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Center: Map */}
      <div className="flex-1 min-w-0 relative">
        <DeployMapPanel
          chargers={inScopeChargers}
          chargerTechMap={chargerTechMap}
          deployTechs={deployTechs}
          scheduleResult={scheduleResult}
        />
      </div>

      {/* Right: Timeline */}
      {rightOpen ? (
        <div className="w-[340px] shrink-0 border-l overflow-y-auto bg-card flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-semibold uppercase tracking-wider">Itinerary</span>
            <button onClick={() => setRightOpen(false)} className="text-muted-foreground hover:text-foreground">
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>
          <DeployTimelinePanel
            scheduleResult={scheduleResult}
            deployTechs={deployTechs}
            campaign={campaign}
            campaignId={campaignId || ""}
          />
        </div>
      ) : (
        <button
          onClick={() => setRightOpen(true)}
          className="w-8 shrink-0 border-l bg-card flex items-center justify-center hover:bg-muted transition-colors"
        >
          <PanelRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
