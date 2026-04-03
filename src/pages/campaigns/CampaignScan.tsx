import { Search } from "lucide-react";

export default function CampaignScan() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Search className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold">Scan</h1>
      <p className="text-muted-foreground max-w-md">
        Triage and prioritize chargers. Review flagged issues, set priority levels, and define the scope of work for this campaign.
      </p>
      <p className="text-sm text-muted-foreground/60">Upload charger data first to begin scanning.</p>
    </div>
  );
}
