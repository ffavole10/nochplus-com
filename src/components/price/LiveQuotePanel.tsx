import { useMemo, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown, FileText, Download, Save, ArrowRight, Loader2, AlertTriangle,
} from "lucide-react";
import {
  CampaignRates, calculateTechQuote, TechQuoteSummary, generateCampaignQuote,
  SavedCampaignQuote, loadCampaignQuote,
} from "@/services/campaignQuoteEngine";
import { GeneratedScheduleDay } from "@/lib/routeOptimizer";
import { assembleProposalData, generateProposalPdf, uploadProposalToStorage } from "@/services/campaignProposalPdf";
import { PlanTechnician, CampaignPlan } from "@/hooks/useCampaignPlan";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface LiveQuotePanelProps {
  campaignId: string;
  rates: CampaignRates;
  hrsPerDay: number;
  scheduleDays: GeneratedScheduleDay[];
  techs: { technician_id: string; name: string }[];
  planTechs: PlanTechnician[];
  plan?: CampaignPlan | null;
  existingQuote: SavedCampaignQuote | null;
  onQuoteSaved: () => void;
  scheduleChanged: boolean;
  customerId: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  labor_base: "Labor — Base",
  labor_overtime: "Labor — Overtime",
  travel_driving: "Travel — Driving",
  travel_flight_time: "Travel — Flight Time",
  airfare: "Airfare",
  ev_rental: "EV Rental",
  hotel: "Hotel",
  hotel_tax: "Hotel Tax (est.)",
  per_diem: "Per Diem",
  luggage: "Luggage",
  misc_supplies: "Misc Supplies",
};

function fmt$(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function LiveQuotePanel({
  campaignId,
  rates,
  hrsPerDay,
  scheduleDays,
  techs,
  planTechs,
  plan,
  existingQuote,
  onQuoteSaved,
  scheduleChanged,
  customerId,
}: LiveQuotePanelProps) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Live calculation from current rates + schedule
  const liveQuote = useMemo(() => {
    if (scheduleDays.length === 0) return { techSummaries: [] as TechQuoteSummary[], grandTotal: 0 };

    const daysByTech = new Map<string, GeneratedScheduleDay[]>();
    for (const day of scheduleDays) {
      const arr = daysByTech.get(day.technician_id) || [];
      arr.push(day);
      daysByTech.set(day.technician_id, arr);
    }

    const techSummaries: TechQuoteSummary[] = [];
    for (const tech of techs) {
      const techDays = daysByTech.get(tech.technician_id) || [];
      if (techDays.length === 0) continue;
      techSummaries.push(calculateTechQuote(tech.technician_id, tech.name, techDays, rates, hrsPerDay));
    }
    const grandTotal = techSummaries.reduce((s, t) => s + t.subtotal, 0);
    return { techSummaries, grandTotal };
  }, [scheduleDays, techs, rates, hrsPerDay]);

  // Summary line
  const summaryLine = useMemo(() => {
    const sites = new Set<string>();
    const states = new Set<string>();
    let units = 0;
    for (const d of scheduleDays) {
      for (const s of d.sites) {
        sites.add(s.site_name);
        units++;
        const parts = s.address.split(",").map(p => p.trim());
        if (parts.length >= 2) states.add(parts[parts.length - 1].split(" ")[0]);
      }
    }
    const dates = scheduleDays.map(d => d.schedule_date).sort();
    const range = dates.length > 0 ? `${fmtShort(dates[0])} – ${fmtShort(dates[dates.length - 1])}` : "";
    return `${sites.size} Sites · ${units} Units · ${states.size} States · ${range}`;
  }, [scheduleDays]);

  const handleSaveQuote = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      await generateCampaignQuote(
        plan.id,
        plan.name,
        scheduleDays,
        planTechs,
        rates,
        hrsPerDay,
        customerId,
        null,
        validUntil.toISOString().split("T")[0],
      );

      // Update stage status
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("stage_status")
        .eq("id", campaignId)
        .single();

      const currentStatus = (campaign?.stage_status as Record<string, string>) || {};
      await supabase
        .from("campaigns")
        .update({ stage_status: { ...currentStatus, price: "complete" } as any })
        .eq("id", campaignId);

      toast.success("Quote saved successfully");
      onQuoteSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save quote");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!plan || !existingQuote) return;
    setExporting(true);
    try {
      const proposalData = await assembleProposalData(plan, planTechs, scheduleDays, existingQuote);
      const doc = await generateProposalPdf(proposalData);
      const safeName = (plan.name || "proposal").replace(/[^a-zA-Z0-9_-]/g, "_");
      doc.save(`${safeName}_Proposal.pdf`);
      const pdfBlob = doc.output("blob");
      await uploadProposalToStorage(pdfBlob, plan.name || "proposal", existingQuote.version || 1);
      toast.success("Proposal PDF generated");
    } catch (err) {
      console.error("PDF export failed:", err);
      toast.error("Failed to generate proposal PDF");
    } finally {
      setExporting(false);
    }
  };

  if (scheduleDays.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium">No schedule generated</p>
        <p className="text-xs text-muted-foreground mt-1">
          Generate a deployment schedule in the Deploy stage first.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4 gap-1"
          onClick={() => navigate(`/campaigns/${campaignId}/deploy`)}
        >
          Go to Deploy <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Schedule changed warning */}
        {scheduleChanged && existingQuote && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>The deployment schedule has changed since this quote was generated. Save an updated quote to reflect changes.</span>
          </div>
        )}

        {/* Quote Header */}
        <div className="p-4 rounded-lg bg-card border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">
                {existingQuote ? existingQuote.quote_number : "New Quote"}
              </span>
              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                {existingQuote ? existingQuote.status : "Draft"}
              </Badge>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">{summaryLine}</p>
          <div className="text-2xl font-bold">{fmt$(liveQuote.grandTotal)}</div>
        </div>

        {/* Per-Tech Sections */}
        {liveQuote.techSummaries.map(tech => (
          <Collapsible key={tech.technician_id} defaultOpen>
            <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors">
              <span className="text-xs font-semibold">{tech.technician_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{fmt$(tech.subtotal)}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 text-muted-foreground">
                      <th className="text-left p-2 font-medium">Item</th>
                      <th className="text-left p-2 font-medium">Detail</th>
                      <th className="text-right p-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tech.items.map((item, idx) => (
                      <tr key={idx} className="border-t border-border/50">
                        <td className="p-2 font-medium">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </td>
                        <td className="p-2 text-muted-foreground">{item.description}</td>
                        <td className="p-2 text-right font-medium">{fmt$(item.amount)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td colSpan={2} className="p-2 font-semibold">Subtotal — {tech.technician_name}</td>
                      <td className="p-2 text-right font-bold">{fmt$(tech.subtotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}

        {/* Grand Total */}
        {liveQuote.techSummaries.length > 1 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">
                TOTAL — {liveQuote.techSummaries.map(t => t.technician_name).join(" + ")}
              </p>
              <span className="text-lg font-bold">{fmt$(liveQuote.grandTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t px-4 py-3 space-y-2 bg-card">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleSaveQuote} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving..." : "Save Quote"}
          </Button>
          {existingQuote && (
            <Button size="sm" variant="outline" onClick={handleExportPdf} disabled={exporting} className="gap-1">
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {exporting ? "Generating..." : "Export PDF"}
            </Button>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="w-full gap-1 text-xs"
          onClick={() => navigate(`/campaigns/${campaignId}/launch`)}
        >
          Continue to Launch <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function fmtShort(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${m[dt.getMonth()]} ${dt.getDate()}`;
}
