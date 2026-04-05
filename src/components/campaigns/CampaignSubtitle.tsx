import { Badge } from "@/components/ui/badge";

interface CampaignSubtitleProps {
  customerName: string;
  campaignName: string;
  status?: string | null;
}

function formatDisplayName(name: string): string {
  if (!name) return "";
  // If it looks like a slug (all lowercase, no spaces), title-case it
  if (name === name.toLowerCase() && !name.includes(" ")) {
    return name
      .split(/[-_]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return name;
}

export function CampaignSubtitle({ customerName, campaignName, status }: CampaignSubtitleProps) {
  const displayCustomer = formatDisplayName(customerName);
  const displayStatus = (status || "draft").replace("_", " ");

  return (
    <div className="flex items-center justify-between">
      <p className="text-[13px] text-muted-foreground">
        {displayCustomer} · {campaignName}
      </p>
      <Badge variant="outline" className="capitalize text-xs">
        {displayStatus}
      </Badge>
    </div>
  );
}
