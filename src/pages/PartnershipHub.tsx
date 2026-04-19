import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, FileText, BookOpen, Layers, Receipt } from "lucide-react";
import { usePartnershipHub } from "@/hooks/usePartnershipHub";
import { PlanBuilderTab } from "@/components/partnership-hub/PlanBuilderTab";
import { PlanTiersTab } from "@/components/partnership-hub/PlanTiersTab";
import { PartnerPlanTab } from "@/components/partnership-hub/PartnerPlanTab";
import { KnowledgeBaseTab } from "@/components/partnership-hub/KnowledgeBaseTab";
import { DemoInvoicesTab } from "@/components/partnership-hub/DemoInvoicesTab";

export default function PartnershipHub() {
  const [activeTab, setActiveTab] = useState("plan-tiers");
  const hub = usePartnershipHub();

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
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
            summary={hub.summary}
          />
        </TabsContent>

        <TabsContent value="knowledge-base" className="mt-6">
          <KnowledgeBaseTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
