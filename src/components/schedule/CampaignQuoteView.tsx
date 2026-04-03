import { useState, useEffect } from "react";
import { SavedCampaignQuote, QuoteLineItem, updateQuoteStatus, loadCampaignQuote } from "@/services/campaignQuoteEngine";
import { CampaignPlan, PlanTechnician } from "@/hooks/useCampaignPlan";
import { GeneratedScheduleDay } from "@/lib/routeOptimizer";
import { assembleProposalData, generateProposalPdf, uploadProposalToStorage } from "@/services/campaignProposalPdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, DollarSign, FileText, Send, CheckCircle2, XCircle, AlertTriangle, Edit, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CampaignQuoteViewProps {
  planId: string;
  plan?: CampaignPlan | null;
  planStatus: string;
  techs: PlanTechnician[];
  scheduleDays?: GeneratedScheduleDay[];
  scheduleChanged?: boolean;
  onStatusChanged?: () => void;
}

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  draft: { className: "bg-muted text-muted-foreground", label: "Draft" },
  sent: { className: "bg-blue-500/10 text-blue-600 border-blue-500/30", label: "Sent" },
  accepted: { className: "bg-optimal/10 text-optimal border-optimal/30", label: "Accepted" },
  declined: { className: "bg-critical/10 text-critical border-critical/30", label: "Declined" },
  expired: { className: "bg-amber-500/10 text-amber-600 border-amber-500/30", label: "Expired" },
};

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

export function CampaignQuoteView({ planId, plan, planStatus, techs, scheduleDays = [], scheduleChanged, onStatusChanged }: CampaignQuoteViewProps) {
  const [quote, setQuote] = useState<SavedCampaignQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadCampaignQuote(planId).then(q => { setQuote(q); setLoading(false); });
  }, [planId]);

  const handleStatusUpdate = async (status: string) => {
    if (!quote) return;
    await updateQuoteStatus(quote.id, status);
    setQuote(prev => prev ? { ...prev, status } : null);
    onStatusChanged?.();
    toast.success(`Quote marked as ${status}`);
  };

  const handleExportPdf = async () => {
    if (!quote || !plan) return;
    setExporting(true);
    try {
      const proposalData = await assembleProposalData(plan, techs, scheduleDays, quote);
      const doc = await generateProposalPdf(proposalData);
      
      // Download
      const safeName = (plan.name || "proposal").replace(/[^a-zA-Z0-9_-]/g, "_");
      doc.save(`${safeName}_Proposal.pdf`);

      // Upload to storage
      const pdfBlob = doc.output("blob");
      await uploadProposalToStorage(pdfBlob, plan.name || "proposal", 1);
      
      toast.success("Proposal PDF generated and saved");
    } catch (err) {
      console.error("PDF export failed:", err);
      toast.error("Failed to generate proposal PDF");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Loading quote...</div>;
  }

  if (!quote) {
    return (
      <div className="p-6 text-center">
        <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No quote generated yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Generate a schedule first, then create a quote.</p>
      </div>
    );
  }

  // Group items by tech
  const techIds = [...new Set(quote.lineItems.map(i => i.technician_id).filter(Boolean))] as string[];
  const itemsByTech = new Map<string, QuoteLineItem[]>();
  for (const techId of techIds) {
    itemsByTech.set(techId, quote.lineItems.filter(i => i.technician_id === techId));
  }

  const techNameLookup = new Map<string, string>();
  techs.forEach(t => techNameLookup.set(t.technician_id, t.home_base_city || "Technician"));

  const statusBadge = STATUS_BADGE[quote.status] || STATUS_BADGE.draft;

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Stale warning */}
      {scheduleChanged && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>The schedule has changed since this quote was generated. Generate a new quote to reflect the updated schedule.</span>
        </div>
      )}

      {/* Quote Header */}
      <div className="p-4 rounded-lg bg-card border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{quote.quote_number}</span>
            <Badge variant="outline" className={`text-[10px] capitalize ${statusBadge.className}`}>
              {statusBadge.label}
            </Badge>
          </div>
          {quote.valid_until && (
            <span className="text-[11px] text-muted-foreground">
              Valid until {new Date(quote.valid_until + "T00:00:00").toLocaleDateString()}
            </span>
          )}
        </div>
        {quote.notes && (
          <p className="text-xs text-muted-foreground">{quote.notes}</p>
        )}
        <div className="text-2xl font-bold text-foreground">
          ${quote.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Per-Technician Breakdown */}
      {techIds.map(techId => {
        const techItems = itemsByTech.get(techId) || [];
        const techSubtotal = techItems.reduce((s, it) => s + it.amount, 0);
        const techName = techNameLookup.get(techId) || "Technician";

        return (
          <Collapsible key={techId} defaultOpen>
            <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors">
              <span className="text-xs font-semibold">{techName} — Detailed Cost Estimate</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">
                  ${techSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
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
                    {techItems.map((item, idx) => (
                      <tr key={idx} className="border-t border-border/50">
                        <td className="p-2 text-foreground font-medium">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </td>
                        <td className="p-2 text-muted-foreground">{item.description}</td>
                        <td className="p-2 text-right font-medium text-foreground">
                          ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td colSpan={2} className="p-2 font-semibold text-foreground">
                        Subtotal — {techName}
                      </td>
                      <td className="p-2 text-right font-bold text-foreground">
                        ${techSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Grand Total */}
      {techIds.length > 1 && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">
                TOTAL — {techIds.map(id => techNameLookup.get(id) || "Tech").join(" + ")}
              </p>
              {quote.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{quote.notes}</p>}
            </div>
            <span className="text-lg font-bold text-foreground">
              ${quote.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <Separator />
      <div className="flex flex-wrap gap-2">
        {quote.status === "draft" && (
          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate("sent")}>
            <Send className="h-3.5 w-3.5 mr-1" /> Mark as Sent
          </Button>
        )}
        {(quote.status === "draft" || quote.status === "sent") && (
          <Button size="sm" variant="outline" className="text-optimal border-optimal/30" onClick={() => handleStatusUpdate("accepted")}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept
          </Button>
        )}
        {(quote.status === "draft" || quote.status === "sent") && (
          <Button size="sm" variant="outline" className="text-critical border-critical/30" onClick={() => handleStatusUpdate("declined")}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
          </Button>
        )}
      </div>
    </div>
  );
}
