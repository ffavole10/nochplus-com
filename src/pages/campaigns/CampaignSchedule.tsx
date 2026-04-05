import { useParams } from "react-router-dom";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useCampaign } from "@/hooks/useCampaigns";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { CampaignSubtitle } from "@/components/campaigns/CampaignSubtitle";

export default function CampaignSchedule() {
  const { campaignId } = useParams();
  const { selectedCampaignId } = useCampaignContext();
  const id = campaignId || selectedCampaignId || null;
  const { data: campaign } = useCampaign(id);

  usePageTitle(campaign ? `Schedule | ${campaign.name}` : "Schedule");

  if (!campaign) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-muted-foreground">
        Select a campaign to view its schedule.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardContent className="p-8 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">Schedule — Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Tech assignment, route optimization, and day-by-day itinerary will be built here.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4 max-w-lg mx-auto text-sm">
            <div className="border border-border rounded-lg p-3">
              <p className="font-medium text-foreground">{campaign.hrs_per_charger}h</p>
              <p className="text-xs text-muted-foreground">Per Charger</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="font-medium text-foreground">{campaign.hrs_per_day}h</p>
              <p className="text-xs text-muted-foreground">Per Day</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="font-medium text-foreground">{campaign.travel_time_min}min</p>
              <p className="text-xs text-muted-foreground">Travel Time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
