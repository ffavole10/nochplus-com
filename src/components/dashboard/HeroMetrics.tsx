import { AlertTriangle, CheckCircle2, Activity, Zap } from "lucide-react";
import { HealthGauge } from "./HealthGauge";

interface HeroMetricsProps {
  healthScore: number;
  criticalCount: number;
  totalServiced: number;
  totalChargers: number;
  optimalCount: number;
  degradedCount: number;
  onCriticalClick: () => void;
}

export function HeroMetrics({
  healthScore,
  criticalCount,
  totalServiced,
  totalChargers,
  optimalCount,
  degradedCount,
  onCriticalClick,
}: HeroMetricsProps) {
  const completionPercent = Math.round((totalServiced / totalChargers) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Network Health Score */}
      <div className="metric-card flex flex-col items-center justify-center animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Network Health</h3>
        </div>
        <HealthGauge score={healthScore} />
      </div>

      {/* Critical Action Required */}
      <button
        onClick={onCriticalClick}
        className="alert-card-critical flex flex-col items-center justify-center animate-fade-in animation-delay-100"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-semibold">Critical Action Required</h3>
        </div>
        <div className="text-5xl font-bold mb-1">{criticalCount}</div>
        <p className="text-sm opacity-90">Immediate Action Required</p>
        <div className="absolute top-3 right-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-critical-foreground opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-critical-foreground"></span>
          </span>
        </div>
      </button>

      {/* Campaign Progress */}
      <div
        className="metric-card flex flex-col items-center justify-center animate-fade-in"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-optimal" />
          <h3 className="font-semibold text-foreground">Campaign Progress</h3>
        </div>
        <div className="relative">
          <svg width={100} height={100} className="transform -rotate-90">
            <circle
              cx={50}
              cy={50}
              r={40}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={10}
            />
            <circle
              cx={50}
              cy={50}
              r={40}
              fill="none"
              stroke="hsl(var(--optimal))"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (completionPercent / 100) * 251.2}
              className="gauge-ring"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-optimal">{completionPercent}%</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {totalServiced} of {totalChargers} chargers serviced
        </p>
      </div>

      {/* Network Status */}
      <div
        className="metric-card flex flex-col justify-center animate-fade-in"
        style={{ animationDelay: "300ms" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-secondary" />
          <h3 className="font-semibold text-foreground">Network Status</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-optimal"></span>
              <span className="text-sm">Optimal</span>
            </div>
            <span className="font-semibold text-optimal">{optimalCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-degraded"></span>
              <span className="text-sm">Degraded</span>
            </div>
            <span className="font-semibold text-degraded">{degradedCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-critical"></span>
              <span className="text-sm">Critical</span>
            </div>
            <span className="font-semibold text-critical">{criticalCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
