import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, FileText, BookOpen, Layers, Receipt } from "lucide-react";
import { usePartnershipHub } from "@/hooks/usePartnershipHub";
import { PlanBuilderTab } from "@/components/partnership-hub/PlanBuilderTab";
import { PlanTiersTab, type PlanBuilderPreset } from "@/components/partnership-hub/PlanTiersTab";
import { PartnerPlanTab } from "@/components/partnership-hub/PartnerPlanTab";
import { KnowledgeBaseTab } from "@/components/partnership-hub/KnowledgeBaseTab";
import { DemoInvoicesTab } from "@/components/partnership-hub/DemoInvoicesTab";
import type { PartnershipPlan } from "@/hooks/usePartnershipPlans";
import { toast } from "sonner";

export default function PartnershipHub() {
  const [activeTab, setActiveTab] = useState("plan-tiers");
  const hub = usePartnershipHub();

  const handleNavigate = (tab: string, preset?: PlanBuilderPreset) => {
    if (tab === "plan-builder" && preset && hub.sites.length > 0) {
      // Apply tier + charger-type preset from Plan Tiers to the first site so the
      // builder + summary immediately reflect the user's choice.
      const first = hub.sites[0];
      const updates: Partial<typeof first> = { tier: preset.tier };
      if (first.l2Count === 0 && first.dcCount === 0) {
        if (preset.chargerType === "dc") updates.dcCount = 1;
        else updates.l2Count = 1;
      }
      hub.updateSite(first.id, updates);
    }
    setActiveTab(tab);
  };

  const handleLoadPlan = (plan: PartnershipPlan) => {
    const data = plan.plan_data || {};
    hub.loadPlan({
      partnerInfo: data.partnerInfo,
      sites: data.sites,
      roiInputs: data.roiInputs,
    });
    setActiveTab("plan-builder");
    toast.success(`Loaded plan for ${plan.company_name || plan.contact_email}.`);
  };

  return (
    <div className="p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-4xl">
          <TabsTrigger value="plan-tiers" className="flex items-center gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" /> Plan Tiers
          </TabsTrigger>
          <TabsTrigger value="demo-invoices" className="flex items-center gap-1.5 text-xs">
            <Receipt className="h-3.5 w-3.5" /> Demo Invoices
          </TabsTrigger>
          <TabsTrigger value="plan-builder" className="flex items-center gap-1.5 text-xs">
            <Wrench className="h-3.5 w-3.5" /> Plan Builder
          </TabsTrigger>
          <TabsTrigger value="partner-plan" className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Partner Plan
          </TabsTrigger>
          <TabsTrigger value="knowledge-base" className="flex items-center gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Knowledge Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demo-invoices" className="mt-6">
          <DemoInvoicesTab onNavigate={handleNavigate} />
        </TabsContent>

        <TabsContent value="plan-builder" className="mt-6">
          <PlanBuilderTab
            partnerInfo={hub.partnerInfo}
            setPartnerInfo={hub.setPartnerInfo}
            sites={hub.sites}
            addSite={hub.addSite}
            removeSite={hub.removeSite}
            updateSite={hub.updateSite}
            roiInputs={hub.roiInputs}
            setRoiInputs={hub.setRoiInputs}
            summary={hub.summary}
            onNavigate={handleNavigate}
          />
        </TabsContent>

        <TabsContent value="plan-tiers" className="mt-6">
          <PlanTiersTab onNavigate={handleNavigate} />
        </TabsContent>

        <TabsContent value="partner-plan" className="mt-6">
          <PartnerPlanTab
            partnerInfo={hub.partnerInfo}
            sites={hub.sites}
            roiInputs={hub.roiInputs}
            summary={hub.summary}
            onLoadPlan={handleLoadPlan}
          />
        </TabsContent>

        <TabsContent value="knowledge-base" className="mt-6">
          <KnowledgeBaseTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
