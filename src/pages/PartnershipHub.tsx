import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Presentation, Share2, BookOpen, Layers } from "lucide-react";
import { usePartnershipHub } from "@/hooks/usePartnershipHub";
import { PlanBuilderTab } from "@/components/partnership-hub/PlanBuilderTab";
import { PlanTiersTab } from "@/components/partnership-hub/PlanTiersTab";
import { PresentTab } from "@/components/partnership-hub/PresentTab";
import { ShareActivateTab } from "@/components/partnership-hub/ShareActivateTab";
import { KnowledgeBaseTab } from "@/components/partnership-hub/KnowledgeBaseTab";

export default function PartnershipHub() {
  const [activeTab, setActiveTab] = useState("plan-builder");
  const hub = usePartnershipHub();

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="plan-builder" className="flex items-center gap-1.5 text-xs">
            <Wrench className="h-3.5 w-3.5" /> Plan Builder
          </TabsTrigger>
          <TabsTrigger value="plan-tiers" className="flex items-center gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" /> Plan Tiers
          </TabsTrigger>
          <TabsTrigger value="present" className="flex items-center gap-1.5 text-xs">
            <Presentation className="h-3.5 w-3.5" /> Present
          </TabsTrigger>
          <TabsTrigger value="share" className="flex items-center gap-1.5 text-xs">
            <Share2 className="h-3.5 w-3.5" /> Share & Activate
          </TabsTrigger>
          <TabsTrigger value="knowledge-base" className="flex items-center gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Knowledge Base
          </TabsTrigger>
        </TabsList>

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
          <PlanTiersTab />
        </TabsContent>

        <TabsContent value="present" className="mt-6">
          <PresentTab
            partnerInfo={hub.partnerInfo}
            sites={hub.sites}
            summary={hub.summary}
          />
        </TabsContent>

        <TabsContent value="share" className="mt-6">
          <ShareActivateTab
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
