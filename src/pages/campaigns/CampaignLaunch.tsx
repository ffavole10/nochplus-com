import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { CampaignSubtitle } from "@/components/campaigns/CampaignSubtitle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useCampaignChargers } from "@/hooks/useCampaignChargers";
import { useFieldReports, useCreateFieldReport, useEscalations, useCreateEscalation, useUpdateEscalation } from "@/hooks/useCampaignLaunch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LaunchStatusBar } from "@/components/launch/LaunchStatusBar";
import { LaunchOverviewTab } from "@/components/launch/LaunchOverviewTab";
import { LaunchFieldReportsTab } from "@/components/launch/LaunchFieldReportsTab";
import { LaunchEscalationsTab } from "@/components/launch/LaunchEscalationsTab";
import { toast } from "sonner";

const TECH_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#06b6d4", "#ec4899", "#eab308"];

export default function CampaignLaunch() {
  const { selectedCampaignId } = useCampaignContext();
  const campaignId = selectedCampaignId || null;
  const { data: campaign } = useCampaign(campaignId);
  const updateCampaign = useUpdateCampaign();
  const { data: chargers = [] } = useCampaignChargers(campaignId);
  const { data: reports = [] } = useFieldReports(campaignId);
  const { data: escalations = [] } = useEscalations(campaignId);
  const createReport = useCreateFieldReport();
  const createEscalation = useCreateEscalation();
  const updateEscalation = useUpdateEscalation();

  // Fetch schedule days
  const { data: scheduleDays = [] } = useQuery({
    queryKey: ["campaign_schedule_launch", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("campaign_schedule")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("schedule_date");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!campaignId,
  });

  // Fetch campaign technicians
  const { data: campaignTechs = [] } = useQuery({
    queryKey: ["campaign_technicians_launch", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("campaign_technicians")
        .select("*, technicians(name)")
        .eq("campaign_id", campaignId);
      if (error) throw error;
      return (data ?? []).map((ct: any, i: number) => ({
        technician_id: ct.technician_id,
        name: ct.technicians?.name || `Tech ${i + 1}`,
        color: TECH_COLORS[i % TECH_COLORS.length],
        home_base_city: ct.home_base_city || "",
      }));
    },
    enabled: !!campaignId,
  });

  // Fetch quotes to check if one exists
  const { data: quotes = [] } = useQuery({
    queryKey: ["campaign_quotes_launch", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("campaign_quotes")
        .select("id, status")
        .eq("campaign_id", campaignId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!campaignId,
  });

  const stageStatus = campaign?.stage_status as Record<string, string> | null;
  const launchStatus = stageStatus?.launch || "not_started";

  // Determine campaign status
  const campaignStatus = useMemo(() => {
    if (campaign?.status === "completed") return "completed";
    if (campaign?.status === "on-hold") return "on-hold";
    if (campaign?.status === "active" || launchStatus === "in_progress") return "active";
    return "pre-launch";
  }, [campaign?.status, launchStatus]);

  const inScope = chargers.filter(c => c.in_scope);
  const completedCount = inScope.filter(c => c.status === "completed" || c.status === "skipped").length;

  // Calculate day progress
  const startDate = campaign?.start_date || null;
  const deadline = campaign?.deadline || null;
  const currentDay = startDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(startDate).getTime()) / 86400000))
    : 0;
  const totalDays = startDate && deadline
    ? Math.ceil((new Date(deadline).getTime() - new Date(startDate).getTime()) / 86400000)
    : 0;

  async function handleActivate() {
    if (!campaignId) return;
    const newStageStatus = { ...((campaign?.stage_status as any) || {}), launch: "in_progress" };
    await updateCampaign.mutateAsync({
      id: campaignId,
      status: "active",
      stage_status: newStageStatus,
    });
    toast.success("Campaign activated!");
  }

  if (!campaignId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Select a campaign to view reports.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-auto">
      <LaunchStatusBar
        campaignStatus={campaignStatus}
        completedCount={completedCount}
        totalCount={inScope.length}
        startDate={startDate}
        deadline={deadline}
        currentDay={currentDay}
        totalDays={totalDays}
        onActivate={handleActivate}
        hasQuote={quotes.length > 0}
      />

      <Tabs defaultValue="reports" className="flex-1">
        <TabsList>
          <TabsTrigger value="reports">
            Field Reports {reports.length > 0 && `(${reports.length})`}
          </TabsTrigger>
          <TabsTrigger value="escalations">
            Escalations {escalations.filter(e => e.status !== "resolved").length > 0 && `(${escalations.filter(e => e.status !== "resolved").length})`}
          </TabsTrigger>
          <TabsTrigger value="completions">Completions</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4">
          <LaunchFieldReportsTab
            reports={reports}
            techs={campaignTechs}
            campaignId={campaignId}
            onAddReport={(r) => createReport.mutate(r)}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <LaunchFieldReportsTab
            reports={reports}
            techs={campaignTechs}
            campaignId={campaignId}
            onAddReport={(r) => createReport.mutate(r)}
          />
        </TabsContent>

        <TabsContent value="escalations" className="mt-4">
          <LaunchEscalationsTab
            escalations={escalations}
            campaignId={campaignId}
            onCreateEscalation={(e) => createEscalation.mutate(e)}
            onUpdateEscalation={(p) => updateEscalation.mutate(p)}
          />
        </TabsContent>

        <TabsContent value="completions" className="mt-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Completed Chargers</h3>
            {inScope.filter(c => c.status === "completed").length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No chargers completed yet.
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Charger ID</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Site</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inScope.filter(c => c.status === "completed").map((c: any) => (
                      <tr key={c.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 text-foreground">{c.charger_records?.station_id || c.charger_id}</td>
                        <td className="px-4 py-2 text-muted-foreground">{c.charger_records?.site_name || "—"}</td>
                        <td className="px-4 py-2"><span className="text-xs text-primary font-medium">Completed</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
