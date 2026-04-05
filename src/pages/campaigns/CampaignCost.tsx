import { useParams } from "react-router-dom";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useCampaign } from "@/hooks/useCampaigns";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { CampaignSubtitle } from "@/components/campaigns/CampaignSubtitle";

export default function CampaignCost() {
  const { campaignId } = useParams();
  const { selectedCampaignId } = useCampaignContext();
  const id = campaignId || selectedCampaignId || null;
  const { data: campaign } = useCampaign(id);

  usePageTitle(campaign ? `Cost | ${campaign.name}` : "Cost");

  if (!campaign) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-muted-foreground">
        Select a campaign to view cost details.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <CampaignSubtitle
        customerName={campaign.customer}
        campaignName={campaign.name}
        status={campaign.status}
      />
      <Card>
        <CardContent className="p-8 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">Cost — Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Rate cards, cost assumptions, and quote generation will be built here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
