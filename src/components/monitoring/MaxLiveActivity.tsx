import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props { timeRange: string; customer: string; }

// MOCK — replace with live OCPP data when integration is complete
const PIPELINE_STEPS = ["Received", "Analyzing", "Acting", "Resolved"];

const MOCK_ACTIONS = [
  { time: "2m ago", serial: "NAS-DC-042", error: "HighTemperature", step: 4, result: "Soft reboot executed — charger back online" },
  { time: "8m ago", serial: "HLT-DC-003", error: "ConnectorLockFailure", step: 3, result: "Escalated: SWI-BTC-047 matched, ticket created" },
  { time: "12m ago", serial: "NAS-DC-019", error: "EVCommunicationError", step: 2, result: null },
  { time: "18m ago", serial: "FBL-DC-023", error: "PowerMeterFailure", step: 4, result: "Firmware update pushed — v2.1.4 → v2.1.5" },
  { time: "28m ago", serial: "NAS-DC-011", error: "GroundFailure", step: 4, result: "Config reset applied — connector re-enabled" },
];

const MOCK_PERFORMANCE = {
  autoResolutionRate: { value: 78.3, target: 80 },
  avgTimeToAction: { value: 42, target: 60, unit: "s" },
  remoteActions: { reboots: 8, firmware: 3, config: 5 },
  escalationPrecision: 91.2,
  falsePositiveRate: 4.7,
};

export function MaxLiveActivity({ timeRange, customer }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Max — Live Activity</CardTitle>
        <CardDescription>Real-time view of AutoHeal's autonomous diagnostic actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Action Queue */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Action Queue</h3>
            <div className="space-y-3">
              {MOCK_ACTIONS.map((a, i) => (
                <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">{a.time}</span>
                    <span className="text-xs font-medium text-foreground">{a.serial} — {a.error}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {PIPELINE_STEPS.map((step, j) => (
                      <div key={j} className="flex items-center gap-1 flex-1">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          j < a.step ? "bg-teal-500" : "bg-muted"
                        )} />
                        <span className={cn("text-[10px]", j < a.step ? "text-foreground" : "text-muted-foreground")}>{step}</span>
                        {j < PIPELINE_STEPS.length - 1 && <div className={cn("flex-1 h-px", j < a.step - 1 ? "bg-teal-500" : "bg-muted")} />}
                      </div>
                    ))}
                  </div>
                  {a.result && <div className="text-xs text-emerald-500 italic">{a.result}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Performance Today */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Max Performance Today</h3>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Autonomous Resolution Rate"
                value={`${MOCK_PERFORMANCE.autoResolutionRate.value}%`}
                target={`target: >${MOCK_PERFORMANCE.autoResolutionRate.target}%`}
                progress={MOCK_PERFORMANCE.autoResolutionRate.value}
                color={MOCK_PERFORMANCE.autoResolutionRate.value >= MOCK_PERFORMANCE.autoResolutionRate.target ? "teal" : "amber"}
              />
              <MetricCard
                label="Avg Time to First Action"
                value={`${MOCK_PERFORMANCE.avgTimeToAction.value}s`}
                target={`target: <${MOCK_PERFORMANCE.avgTimeToAction.target}s`}
                progress={100 - (MOCK_PERFORMANCE.avgTimeToAction.value / MOCK_PERFORMANCE.avgTimeToAction.target) * 100}
                color={MOCK_PERFORMANCE.avgTimeToAction.value <= MOCK_PERFORMANCE.avgTimeToAction.target ? "teal" : "amber"}
              />
              <Card className="p-3 col-span-2">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Remote Actions Taken</div>
                <div className="flex items-center gap-4 text-sm">
                  <span>Reboots: <strong className="text-foreground">{MOCK_PERFORMANCE.remoteActions.reboots}</strong></span>
                  <span>Firmware: <strong className="text-foreground">{MOCK_PERFORMANCE.remoteActions.firmware}</strong></span>
                  <span>Config: <strong className="text-foreground">{MOCK_PERFORMANCE.remoteActions.config}</strong></span>
                </div>
              </Card>
              <MetricCard
                label="Escalation Precision"
                value={`${MOCK_PERFORMANCE.escalationPrecision}%`}
                target="of escalations confirmed necessary"
                progress={MOCK_PERFORMANCE.escalationPrecision}
                color="teal"
              />
              <MetricCard
                label="False Positive Rate"
                value={`${MOCK_PERFORMANCE.falsePositiveRate}%`}
                target="actions that didn't fix issue"
                progress={100 - MOCK_PERFORMANCE.falsePositiveRate}
                color={MOCK_PERFORMANCE.falsePositiveRate < 10 ? "teal" : "amber"}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, target, progress, color }: {
  label: string; value: string; target: string; progress: number; color: "teal" | "amber";
}) {
  return (
    <Card className="p-3 space-y-1.5">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-xl font-bold", color === "teal" ? "text-teal-500" : "text-amber-500")}>{value}</div>
      <Progress value={progress} className="h-1.5" />
      <div className="text-[10px] text-muted-foreground">{target}</div>
    </Card>
  );
}
