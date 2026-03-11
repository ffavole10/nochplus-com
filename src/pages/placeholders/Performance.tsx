import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { MetricsDashboard } from "@/components/ai-agent/MetricsDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

const DATE_RANGES = ["This Month", "Last 30 Days", "All Time"] as const;

const Performance = () => {
  usePageTitle("Performance");
  const [dateRange, setDateRange] = useState<string>("This Month");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Performance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AutoHeal™ accuracy metrics and diagnostic outcomes over time
            </p>
          </div>
          <div className="flex gap-1">
            {DATE_RANGES.map((r) => (
              <Button
                key={r}
                variant={dateRange === r ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setDateRange(r)}
              >
                {r}
              </Button>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <MetricsDashboard />

        {/* Recent Activity */}
        <div className="border-t border-border pt-8">
          <div>
            <h2 className="text-lg font-bold text-foreground">Recent Activity</h2>
            <p className="text-sm text-muted-foreground">Recent AutoHeal executions and outcomes.</p>
          </div>
          <Card className="mt-4">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Execution history will appear here after AutoHeal processes tickets
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Performance;
