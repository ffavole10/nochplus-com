import { Upload } from "lucide-react";
import { useCampaignContext } from "@/contexts/CampaignContext";

export default function CampaignUpload() {
  const { selectedCampaignName } = useCampaignContext();
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Upload className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold">Upload</h1>
      <p className="text-muted-foreground max-w-md">
        Import your charger dataset for this campaign. Upload an Excel file or CSV with charger records, addresses, and status data.
      </p>
      <p className="text-sm text-muted-foreground/60">No data uploaded yet. Click "Import Dataset" to get started.</p>
    </div>
  );
}
