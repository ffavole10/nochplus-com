import { useParams } from "react-router-dom";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCampaign } from "@/hooks/useCampaigns";
import CampaignScan from "./CampaignScan";

// CampaignChargers wraps the existing CampaignScan page (the dataset grid with priority/scope management)
export default function CampaignChargers() {
  const { campaignId } = useParams();
  const { selectedCampaignId } = useCampaignContext();
  const id = campaignId || selectedCampaignId || null;
  const { data: campaign } = useCampaign(id);
  
  usePageTitle(campaign ? `Chargers | ${campaign.name}` : "Chargers");

  return <CampaignScan />;
}
