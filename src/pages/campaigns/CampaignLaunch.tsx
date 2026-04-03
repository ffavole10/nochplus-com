import { Rocket } from "lucide-react";

export default function CampaignLaunch() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Rocket className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold">Launch</h1>
      <p className="text-muted-foreground max-w-md">
        Activate the campaign and track field progress. View real-time completion status, field reports, and technician check-ins.
      </p>
      <p className="text-sm text-muted-foreground/60">Accept a quote to launch the campaign.</p>
    </div>
  );
}
