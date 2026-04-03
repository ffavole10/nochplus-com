import { DollarSign } from "lucide-react";

export default function CampaignPrice() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <DollarSign className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold">Price</h1>
      <p className="text-muted-foreground max-w-md">
        Generate a detailed quote from the deployment schedule. Apply rate cards, review per-technician costs, and export the proposal PDF.
      </p>
      <p className="text-sm text-muted-foreground/60">Generate a schedule first to begin pricing.</p>
    </div>
  );
}
