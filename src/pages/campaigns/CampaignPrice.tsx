import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DollarSign, ArrowRight, PanelLeftClose, PanelLeft } from "lucide-react";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useCampaign } from "@/hooks/useCampaigns";
import { useCampaignCostAssumptions } from "@/hooks/useCampaignCostAssumptions";
import { CostAssumptionsPanel } from "@/components/price/CostAssumptionsPanel";
import { LiveQuotePanel } from "@/components/price/LiveQuotePanel";
import { loadCampaignQuote, SavedCampaignQuote } from "@/services/campaignQuoteEngine";
import { supabase } from "@/integrations/supabase/client";
import { GeneratedScheduleDay } from "@/lib/routeOptimizer";
import { PlanTechnician, CampaignPlan } from "@/hooks/useCampaignPlan";
import { Button } from "@/components/ui/button";

export default function CampaignPrice() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { data: campaign } = useCampaign(campaignId || null);
  const { assumptions, loading: assumptionsLoading, saving, updateField, toRates } = useCampaignCostAssumptions(campaignId || null);

  const [leftOpen, setLeftOpen] = useState(true);
  const [scheduleDays, setScheduleDays] = useState<GeneratedScheduleDay[]>([]);
  const [techs, setTechs] = useState<{ technician_id: string; name: string }[]>([]);
  const [planTechs, setPlanTechs] = useState<PlanTechnician[]>([]);
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [existingQuote, setExistingQuote] = useState<SavedCampaignQuote | null>(null);
  const [rateCards, setRateCards] = useState<{ id: string; name: string }[]>([]);
  const [schedLoading, setSchedLoading] = useState(true);

  // Load schedule, techs, plan, quote, rate cards
  useEffect(() => {
    if (!campaignId) return;

    (async () => {
      setSchedLoading(true);

      // Load schedule from campaign_schedule
      const { data: schedData } = await supabase
        .from("campaign_schedule")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("schedule_date");

      const days: GeneratedScheduleDay[] = (schedData || []).map((d: any) => ({
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
      }));
      setScheduleDays(days);

      // Load campaign technicians
      const { data: techData } = await supabase
        .from("campaign_technicians")
        .select("*, technicians(first_name, last_name)")
        .eq("campaign_id", campaignId);

      if (techData) {
        const techList = techData.map((t: any) => ({
          technician_id: t.technician_id,
          name: t.technicians
            ? `${t.technicians.first_name} ${t.technicians.last_name}`
            : t.home_base_city || "Technician",
        }));
        setTechs(techList);

        const pt: PlanTechnician[] = techData.map((t: any) => ({
          id: t.id,
          plan_id: "",
          technician_id: t.technician_id,
          home_base_city: t.home_base_city,
          home_base_lat: t.home_base_lat,
          home_base_lng: t.home_base_lng,
          assigned_regions: t.assigned_regions,
          created_at: t.created_at,
          updated_at: t.updated_at,
        }));
        setPlanTechs(pt);
      }

      // Load plan (latest for this campaign)
      const { data: planData } = await supabase
        .from("campaign_plans")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (planData && planData.length > 0) {
        const p = planData[0];
        const planObj: CampaignPlan = {
          id: p.id,
          campaign_id: p.campaign_id,
          name: p.name,
          status: p.status,
          start_date: p.start_date,
          end_date: p.end_date,
          deadline: p.deadline,
          working_days: p.working_days as string[],
          hrs_per_charger: p.hrs_per_charger,
          hrs_per_day: p.hrs_per_day,
          break_hrs: p.break_hrs,
          travel_time_min: p.travel_time_min,
          customer_id: p.customer_id,
          notes: p.notes,
          created_by: p.created_by,
          created_at: p.created_at,
          updated_at: p.updated_at,
        };
        setPlan(planObj);

        // Load existing quote for this plan
        const q = await loadCampaignQuote(p.id);
        setExistingQuote(q);
      }

      // Load rate cards
      const { data: rcData } = await supabase
        .from("rate_cards" as any)
        .select("id, name")
        .order("name");
      if (rcData) setRateCards(rcData as any[]);

      setSchedLoading(false);
    })();
  }, [campaignId]);

  const handleQuoteSaved = async () => {
    if (!plan) return;
    const q = await loadCampaignQuote(plan.id);
    setExistingQuote(q);
  };

  const hrsPerDay = campaign?.hrs_per_day || 8;

  // Empty state: no schedule
  if (!schedLoading && scheduleDays.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <DollarSign className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">No Schedule Generated</h1>
        <p className="text-muted-foreground max-w-md">
          Generate a deployment schedule in the Deploy stage before pricing.
        </p>
        <Button onClick={() => navigate(`/campaigns/${campaignId}/deploy`)} className="gap-2">
          Go to Deploy <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (assumptionsLoading || schedLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading pricing data...
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Cost Assumptions */}
      {leftOpen ? (
        <div className="w-[340px] shrink-0 border-r overflow-hidden bg-card flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-semibold uppercase tracking-wider">Cost Assumptions</span>
            <button onClick={() => setLeftOpen(false)} className="text-muted-foreground hover:text-foreground">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          {assumptions && (
            <CostAssumptionsPanel
              assumptions={assumptions}
              saving={saving}
              onUpdateField={updateField}
              scheduleDays={scheduleDays}
              rateCards={rateCards}
            />
          )}
        </div>
      ) : (
        <button
          onClick={() => setLeftOpen(true)}
          className="w-8 shrink-0 border-r bg-card flex items-center justify-center hover:bg-muted transition-colors"
        >
          <PanelLeft className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Right: Live Quote */}
      <div className="flex-1 min-w-0 flex flex-col bg-background">
        <div className="px-3 py-2 border-b">
          <span className="text-xs font-semibold uppercase tracking-wider">Quote Preview</span>
        </div>
        <LiveQuotePanel
          campaignId={campaignId || ""}
          rates={toRates()}
          hrsPerDay={hrsPerDay}
          scheduleDays={scheduleDays}
          techs={techs}
          planTechs={planTechs}
          plan={plan}
          existingQuote={existingQuote}
          onQuoteSaved={handleQuoteSaved}
          scheduleChanged={false}
          customerId={plan?.customer_id || null}
        />
      </div>
    </div>
  );
}
