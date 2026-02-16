import { Badge } from "@/components/ui/badge";
import { CampaignType, CAMPAIGN_TYPE_CONFIG } from "@/types/campaign";

interface CampaignTypeBadgeProps {
  type: CampaignType;
  className?: string;
}

export function CampaignTypeBadge({ type, className }: CampaignTypeBadgeProps) {
  const config = CAMPAIGN_TYPE_CONFIG[type];
  return (
    <Badge variant="outline" className={`${config.className} text-xs gap-1 ${className || ""}`}>
      <span>{config.icon}</span>
      {config.label}
    </Badge>
  );
}
