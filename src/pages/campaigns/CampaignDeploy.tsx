import { CalendarDays } from "lucide-react";

export default function CampaignDeploy() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <CalendarDays className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold">Deploy</h1>
      <p className="text-muted-foreground max-w-md">
        Assign technicians, configure work parameters, generate optimized routes, and build the day-by-day deployment schedule.
      </p>
      <p className="text-sm text-muted-foreground/60">Complete the Scan stage to begin deployment planning.</p>
    </div>
  );
}
