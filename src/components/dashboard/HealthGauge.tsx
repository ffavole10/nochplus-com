import { useMemo } from "react";

interface HealthGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function HealthGauge({ score, size = 120, strokeWidth = 12 }: HealthGaugeProps) {
  const { color, label } = useMemo(() => {
    if (score >= 85) return { color: "hsl(var(--optimal))", label: "Excellent" };
    if (score >= 70) return { color: "hsl(var(--degraded))", label: "Fair" };
    return { color: "hsl(var(--critical))", label: "Poor" };
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Colored arc segments for reference */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--critical))" />
            <stop offset="50%" stopColor="hsl(var(--degraded))" />
            <stop offset="100%" stopColor="hsl(var(--optimal))" />
          </linearGradient>
        </defs>
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="gauge-ring"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
