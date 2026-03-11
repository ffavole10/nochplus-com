import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props { timeRange: string; customer: string; }

// MOCK — replace with live OCPP data when integration is complete
const RISK_FACTORS = [
  { emoji: "🌡", label: "Heat Risk", key: "heat" },
  { emoji: "🌊", label: "Coastal", key: "coastal" },
  { emoji: "⛈", label: "Storm", key: "storm" },
  { emoji: "🔆", label: "UV", key: "uv" },
  { emoji: "🏔", label: "Altitude", key: "altitude" },
  { emoji: "❄", label: "Freeze-Thaw", key: "freeze" },
];

const MOCK_LOCATIONS = [
  { name: "Fontainebleau Las Vegas", riskScore: 78, chargers: 12, topRisk: "High Heat Risk", factors: ["heat", "uv"] },
  { name: "Hilton New York", riskScore: 42, chargers: 8, topRisk: "Freeze-Thaw Cycles", factors: ["freeze", "storm"] },
  { name: "Marriott Chicago", riskScore: 55, chargers: 6, topRisk: "Storm Exposure", factors: ["storm", "freeze"] },
  { name: "Fontainebleau Miami", riskScore: 71, chargers: 10, topRisk: "Coastal Corrosion", factors: ["coastal", "heat", "uv"] },
];

const MOCK_CORRELATIONS = [
  { type: "heat", title: "HEAT CORRELATION DETECTED", location: "Fontainebleau Las Vegas", detail: "3 chargers showing thermal errors", weather: "Local temp: 108°F (past 3 days)", strength: 87, recommendation: "Schedule cooling inspection before next heat event" },
  { type: "coastal", title: "COASTAL CORROSION ALERT", location: "Fontainebleau Miami", detail: "2 connector wear anomalies", weather: "Salt air index: High", strength: 64, recommendation: "Inspect connector housing seals" },
];

function riskColor(score: number) {
  if (score >= 75) return "text-destructive";
  if (score >= 50) return "text-amber-500";
  return "text-emerald-500";
}

export function EnvironmentalIntelligence({ timeRange, customer }: Props) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filtered = activeFilter
    ? MOCK_LOCATIONS.filter(l => l.factors.includes(activeFilter))
    : MOCK_LOCATIONS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Environmental Intelligence</CardTitle>
        <CardDescription>Correlating charger behavior with environmental and location factors</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Risk Map */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Environmental Risk Map</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {filtered.map(loc => (
                <Card key={loc.name} className="p-3">
                  <div className="text-sm font-semibold text-foreground">{loc.name}</div>
                  <p className="text-xs text-muted-foreground">{loc.topRisk}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={cn("text-lg font-bold", riskColor(loc.riskScore))}>{loc.riskScore}</span>
                    <span className="text-xs text-muted-foreground">{loc.chargers} chargers</span>
                  </div>
                </Card>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {RISK_FACTORS.map(rf => (
                <button
                  key={rf.key}
                  onClick={() => setActiveFilter(activeFilter === rf.key ? null : rf.key)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    activeFilter === rf.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {rf.emoji} {rf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Active Correlations */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Active Correlations</h3>
            {MOCK_CORRELATIONS.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No environmental correlations detected in the selected time range.</p>
            ) : (
              <div className="space-y-3">
                {MOCK_CORRELATIONS.map((c, i) => (
                  <Card key={i} className="p-4 space-y-2">
                    <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                      {RISK_FACTORS.find(r => r.key === c.type)?.emoji} {c.title}
                    </p>
                    <div className="text-sm font-medium text-foreground">{c.location}</div>
                    <p className="text-xs text-muted-foreground">{c.detail}</p>
                    <p className="text-xs text-muted-foreground">{c.weather}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Correlation:</span>
                      <Progress value={c.strength} className="h-1.5 flex-1" />
                      <span className="font-bold text-foreground">{c.strength}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">{c.recommendation}</p>
                    <Button size="sm" variant="outline">Create Ticket</Button>
                  </Card>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-3">Weather data via Open-Meteo API (free, no key required)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
