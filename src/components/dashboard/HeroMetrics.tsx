import { Activity, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { HealthGauge } from "./HealthGauge";

interface HeroMetricsProps {
  healthScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalServiced: number;
  totalChargers: number;
  ticketStats?: { total: number; p1: number; p2: number; p3: number; p4: number };
  onCriticalClick: () => void;
}

export function HeroMetrics({
  healthScore,
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
  totalServiced,
  totalChargers,
  ticketStats,
  onCriticalClick,
}: HeroMetricsProps) {
  const completionPercent = Math.round((totalServiced / totalChargers) * 100);
  
  // Use ticket priority stats if available, otherwise fall back to charger status counts
  const displayCritical = ticketStats ? ticketStats.p1 : criticalCount;
  const displayHigh = ticketStats ? ticketStats.p2 : highCount;
  const displayMedium = ticketStats ? ticketStats.p3 : mediumCount;
  const displayLow = ticketStats ? ticketStats.p4 : lowCount;
  const totalAll = displayCritical + displayHigh + displayMedium + displayLow;

  const titleClass = "text-base font-semibold text-foreground flex items-center gap-2";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Network Health */}
      <div className="metric-card flex flex-col animate-fade-in">
        <h3 className={`${titleClass} mb-3`}>
          <Activity className="w-4 h-4 text-primary" />
          Network Health
        </h3>
        <div className="flex-1 flex items-center justify-center">
          <HealthGauge score={healthScore} />
        </div>
      </div>

      {/* Critical Actions */}
      <button
        onClick={onCriticalClick}
        className="metric-card flex flex-col animate-fade-in relative text-left"
        style={{ animationDelay: "100ms" }}
      >
        <h3 className={`${titleClass} mb-3`}>
          <AlertTriangle className="w-4 h-4 text-critical" />
          Critical Actions
        </h3>
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="text-5xl font-bold text-critical">{criticalCount}</div>
          <div className="text-sm text-muted-foreground mt-1">{Math.round((criticalCount / totalChargers) * 100)}% of network</div>
        </div>
        <div className="absolute top-3 right-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-critical opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-critical"></span>
          </span>
        </div>
      </button>

      {/* Campaign Progress */}
      <div
        className="metric-card flex flex-col animate-fade-in"
        style={{ animationDelay: "200ms" }}
      >
        <h3 className={`${titleClass} mb-3`}>
          <CheckCircle2 className="w-4 h-4 text-optimal" />
          Campaign Progress
        </h3>
        <div className="flex-1 flex items-center justify-center">
          <HealthGauge score={completionPercent} suffix="%" />
        </div>
      </div>

      {/* Network Status */}
      <div
        className="metric-card flex flex-col animate-fade-in"
        style={{ animationDelay: "300ms" }}
      >
        <h3 className={`${titleClass} mb-3`}>
          <Zap className="w-4 h-4 text-secondary" />
          Network Status
        </h3>
        <div className="space-y-2 w-full px-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-critical"></span>
              <span className="text-sm">Critical</span>
            </div>
            <span className="font-semibold text-critical">{displayCritical}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-high"></span>
              <span className="text-sm">High</span>
            </div>
            <span className="font-semibold text-high">{displayHigh}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-medium"></span>
              <span className="text-sm">Medium</span>
            </div>
            <span className="font-semibold text-medium">{displayMedium}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-low"></span>
              <span className="text-sm">Low</span>
            </div>
            <span className="font-semibold text-low">{displayLow}</span>
          </div>
          <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
            <span className="text-sm font-medium">Total</span>
            <div className="text-right">
              <span className="font-bold text-foreground">{totalAll}</span>
              <div className="text-xs text-muted-foreground">{Math.round((totalAll / totalChargers) * 100)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
