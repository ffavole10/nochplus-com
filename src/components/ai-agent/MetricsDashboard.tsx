import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Target, Clock, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";

const METRICS = [
  { label: "Assessments Generated", value: "1,247", icon: BarChart3, color: "text-primary" },
  { label: "Average Confidence", value: "84.2%", icon: Target, color: "text-emerald-500" },
  { label: "SWI Match Accuracy", value: "87.3%", icon: CheckCircle2, color: "text-emerald-500" },
  { label: "Cost Estimate Accuracy", value: "±12%", icon: TrendingUp, color: "text-amber-500" },
  { label: "Time Estimate Accuracy", value: "±18%", icon: Clock, color: "text-amber-500" },
  { label: "Flags for Review", value: "14.2%", icon: AlertTriangle, color: "text-orange-500" },
];

export function MetricsDashboard({ headerRight }: { headerRight?: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Success Metrics</h2>
          <p className="text-sm text-muted-foreground">This month's performance overview.</p>
        </div>
        {headerRight}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {METRICS.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4 text-center">
              <m.icon className={`h-5 w-5 mx-auto mb-2 ${m.color}`} />
              <p className="text-xl font-bold text-foreground">{m.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Improvement trend placeholder */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Improvement Over Time</h3>
          <div className="h-32 flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">Accuracy trend chart will appear after 30+ executions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
