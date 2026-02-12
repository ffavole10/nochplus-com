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
  const totalAll = optimalCount + degradedCount + criticalCount;

  const titleClass = "text-sm font-semibold text-foreground";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Network Health */}
      <div className="metric-card flex flex-col items-center justify-center animate-fade-in">
        <h3 className={`${titleClass} mb-3`}>Network Health</h3>
        <HealthGauge score={healthScore} />
      </div>

      {/* Critical Actions */}
      <button
        onClick={onCriticalClick}
        className="metric-card flex flex-col items-center justify-center animate-fade-in relative"
        style={{ animationDelay: "100ms" }}
      >
        <h3 className={`${titleClass} mb-3`}>Critical Actions</h3>
        <div className="text-5xl font-bold text-critical">{criticalCount}</div>
        <div className="absolute top-3 right-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-critical opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-critical"></span>
          </span>
        </div>
      </button>

      {/* Campaign Progress */}
      <div
        className="metric-card flex flex-col items-center justify-center animate-fade-in"
        style={{ animationDelay: "200ms" }}
      >
        <h3 className={`${titleClass} mb-3`}>Campaign Progress</h3>
        <HealthGauge score={completionPercent} />
      </div>

      {/* Network Status */}
      <div
        className="metric-card flex flex-col items-center justify-center animate-fade-in"
        style={{ animationDelay: "300ms" }}
      >
        <h3 className={`${titleClass} mb-3`}>Network Status</h3>
        <div className="space-y-2 w-full px-2">
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
          <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="font-bold text-foreground">{totalAll}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
