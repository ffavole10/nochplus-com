import { useState } from "react";
import { MetricsDashboard } from "@/components/ai-agent/MetricsDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { NeuralOsHeader } from "./NeuralOsHeader";

const DATE_RANGES = ["This Month", "Last 30 Days", "All Time"] as const;

export function PerformanceTab() {
  const [dateRange, setDateRange] = useState<string>("This Month");

  return (
    <div className="space-y-6">
      <NeuralOsHeader
        title="Performance | Neural OS"
        description="Aggregate metrics across all Neural OS layers. RCD, FTCSR, MTTR, TRR, accuracy, cost."
      />

      <MetricsDashboard
        headerRight={
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
        }
      />

      <div className="border-t border-border pt-8">
        <div>
          <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">Recent Neural OS executions and outcomes.</p>
        </div>
        <Card className="mt-4">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                Execution history will appear here after Neural OS processes tickets
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
