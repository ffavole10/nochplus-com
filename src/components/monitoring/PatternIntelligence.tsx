import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props { timeRange: string; customer: string; }

// MOCK — replace with live OCPP data when integration is complete
const MOCK_CASCADE = [
  { serial: "MRT-AC-008", location: "Chicago", sequence: ["WeakSignal", "EVCommunicationError", "InternalError"], step: 2, predictedDays: 8 },
];

const MOCK_ANOMALIES = [
  { serial: "FBL-AC-017", errorMultiplier: 3.2, anomalyScore: 78, since: "4 days ago" },
  { serial: "NAS-DC-042", errorMultiplier: 2.1, anomalyScore: 55, since: "2 days ago" },
];

const MOCK_MODEL_VULNS = [
  { brand: "BTC Power", model: "DC Fast 150kW", errorCode: "HighTemperature", affects: "4 of 6", note: "Possible OEM defect or firmware issue" },
];

export function PatternIntelligence({ timeRange, customer }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pattern Intelligence</CardTitle>
        <CardDescription>Emerging failure patterns detected across the connected fleet</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Panel A */}
          <Card className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-1">Cascading Failure Watch</h4>
            <p className="text-xs text-muted-foreground mb-3">Error sequences that historically precede hard failure</p>
            {MOCK_CASCADE.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No cascading patterns detected ✓</p>
            ) : (
              <div className="space-y-3">
                {MOCK_CASCADE.map((c, i) => (
                  <div key={i} className="space-y-2">
                    <div className="text-sm font-medium text-foreground">{c.serial} · {c.location}</div>
                    <div className="flex items-center gap-1 text-xs">
                      {c.sequence.map((s, j) => (
                        <span key={j} className="flex items-center gap-1">
                          <Badge variant={j < c.step ? "default" : "outline"} className="text-[10px]">{s}</Badge>
                          {j < c.sequence.length - 1 && <span className="text-muted-foreground">→</span>}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">Step {c.step} of {c.sequence.length} detected</div>
                    <Progress value={(c.step / c.sequence.length) * 100} className="h-1.5" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-orange-500 font-medium">Predicted failure: ~{c.predictedDays} days</span>
                      <Button size="sm" variant="outline" className="h-6 text-[10px]">Dispatch Tech</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Panel B */}
          <Card className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-1">Fleet Anomalies</h4>
            <p className="text-xs text-muted-foreground mb-3">Chargers behaving differently than their peers</p>
            {MOCK_ANOMALIES.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No anomalies detected ✓</p>
            ) : (
              <div className="space-y-3">
                {MOCK_ANOMALIES.map((a, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border space-y-1">
                    <div className="text-sm font-medium text-foreground">{a.serial}</div>
                    <div className="text-xs text-muted-foreground">{a.errorMultiplier}x more errors than site average</div>
                    <div className="text-xs">Anomaly score: <span className={cn("font-bold", a.anomalyScore >= 70 ? "text-orange-500" : "text-amber-500")}>{a.anomalyScore}/100</span></div>
                    <div className="text-xs text-muted-foreground">Diverging since: {a.since}</div>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]">Investigate</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Panel C */}
          <Card className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-1">Model Vulnerability Alerts</h4>
            <p className="text-xs text-muted-foreground mb-3">Error patterns across same charger model in your fleet</p>
            {MOCK_MODEL_VULNS.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No model vulnerabilities detected ✓</p>
            ) : (
              <div className="space-y-3">
                {MOCK_MODEL_VULNS.map((v, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border space-y-1">
                    <div className="text-sm font-medium text-foreground">{v.brand} {v.model}</div>
                    <Badge variant="outline" className="text-[10px]">{v.errorCode}</Badge>
                    <div className="text-xs text-muted-foreground">Affects {v.affects} units in fleet</div>
                    <div className="text-xs text-amber-500 italic">{v.note}</div>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]">View All Affected</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
