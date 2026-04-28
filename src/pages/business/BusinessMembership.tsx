import { useState } from "react";
import { BadgeCheck, Crown, Wrench, FileText, Receipt, BookOpen, Layers, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BusinessPageHeader } from "@/components/business/BusinessPageHeader";
import { LockedPlanTiersTab } from "@/components/business/membership/LockedPlanTiersTab";
import { NeuralOsBadge } from "@/components/business/NeuralOsBadge";
import { usePartnershipHub } from "@/hooks/usePartnershipHub";
import { PlanBuilderTab } from "@/components/partnership-hub/PlanBuilderTab";
import { PartnerPlanTab } from "@/components/partnership-hub/PartnerPlanTab";
import { KnowledgeBaseTab } from "@/components/partnership-hub/KnowledgeBaseTab";
import { DemoInvoicesTab } from "@/components/partnership-hub/DemoInvoicesTab";
import NochPlusDashboard from "@/pages/placeholders/NochPlusDashboard";
import NochPlusMembers from "@/pages/placeholders/NochPlusMembers";
import { Card, CardContent } from "@/components/ui/card";
import { MemberRoiSection } from "@/components/business/membership/MemberRoiSection";

export default function BusinessMembership() {
  const [tab, setTab] = useState("active-members");
  const hub = usePartnershipHub();

  return (
    <div className="p-6 space-y-6">
      <BusinessPageHeader
        title="Membership"
        subtitle="NOCH+ Membership tiers, demo invoices, plan builder, and active member management."
        icon={BadgeCheck}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="active-members" className="gap-1.5"><Users className="h-3.5 w-3.5" />Active Members</TabsTrigger>
          <TabsTrigger value="plan-tiers" className="gap-1.5"><Layers className="h-3.5 w-3.5" />Plan Tiers</TabsTrigger>
          <TabsTrigger value="plan-builder" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Plan Builder</TabsTrigger>
          <TabsTrigger value="demo-invoices" className="gap-1.5"><Receipt className="h-3.5 w-3.5" />Demo Invoices</TabsTrigger>
          <TabsTrigger value="partner-plan" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Partner Plan</TabsTrigger>
          <TabsTrigger value="knowledge-base" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="active-members" className="mt-6 space-y-6">
          <Card>
            <CardContent className="p-0">
              <NochPlusDashboard />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <NochPlusMembers />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan-tiers" className="mt-6">
          <LockedPlanTiersTab />
        </TabsContent>

        <TabsContent value="plan-builder" className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <NeuralOsBadge label="neural os recommended" />
            <span>AI-recommended tier suggestions appear inline based on site mix.</span>
          </div>
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
            onNavigate={(t) => setTab(t)}
          />
        </TabsContent>

        <TabsContent value="demo-invoices" className="mt-6">
          <DemoInvoicesTab />
        </TabsContent>

        <TabsContent value="partner-plan" className="mt-6">
          <PartnerPlanTab
            partnerInfo={hub.partnerInfo}
            sites={hub.sites}
            roiInputs={hub.roiInputs}
            summary={hub.summary}
            onLoadPlan={(plan) => {
              const data: any = (plan as any).plan_data || {};
              hub.loadPlan({ partnerInfo: data.partnerInfo, sites: data.sites, roiInputs: data.roiInputs });
              setTab("plan-builder");
            }}
          />
        </TabsContent>

        <TabsContent value="knowledge-base" className="mt-6">
          <KnowledgeBaseTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
