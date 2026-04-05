import { useParams } from "react-router-dom";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCampaign } from "@/hooks/useCampaigns";
import CampaignLaunch from "./CampaignLaunch";

// CampaignReports wraps the existing CampaignLaunch page (field reports, escalations, execution tracking)
export default function CampaignReports() {
  const { campaignId } = useParams();
  const { selectedCampaignId } = useCampaignContext();
  const id = campaignId || selectedCampaignId || null;
  const { data: campaign } = useCampaign(id);

  usePageTitle(campaign ? `Reports | ${campaign.name}` : "Reports");

  return <CampaignLaunch />;
}
