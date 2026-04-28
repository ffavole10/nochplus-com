import { LineChart } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AnalyticsTab } from "@/components/settings/AnalyticsTab";

export default function CommandCenterPlatformAnalytics() {
  usePageTitle("Platform Analytics");

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <LineChart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Platform Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              User activity, feature usage, and platform health metrics.
            </p>
          </div>
        </div>
      </div>
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <AnalyticsTab />
      </main>
    </div>
  );
}
