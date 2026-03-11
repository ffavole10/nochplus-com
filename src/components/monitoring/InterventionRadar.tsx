import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props { timeRange: string; customer: string; }

// MOCK — replace with live OCPP data when integration is complete
const MOCK_DISPATCH = [
  { serial: "MRT-AC-008", reason: "CVS 33 — Critical thermal + connector wear", swi: "SWI-EATON-012" },
  { serial: "FBL-AC-017", reason: "Predicted failure in ~18 days, CVS 45", swi: "SWI-CP-003" },
];

const MOCK_SCHEDULE = [
  { serial: "NAS-DC-019", reason: "CVS trending down — firmware outdated", window: "Wed–Fri this week" },
];

const MOCK_MAX_HANDLING = [
  { serial: "NAS-DC-042", error: "HighTemperature", action: "Monitoring thermal cycle", eta: "~15m" },
  { serial: "NAS-DC-011", error: "GroundFailure", action: "Config reset in progress", eta: "~5m" },
  { serial: "HLT-AC-006", error: "InternalError", action: "Diagnostic analysis running", eta: "~8m" },
];

function ColumnHeader({ title, count, variant }: { title: string; count: number; variant: "destructive" | "warning" | "default" }) {
  const borderClass = variant === "destructive" ? "border-destructive" : variant === "warning" ? "border-amber-500" : "border-primary";
  return (
    <div className={cn("flex items-center justify-between mb-3 pb-2 border-b-2", borderClass)}>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <Badge variant="outline" className="text-xs">{count}</Badge>
    </div>
  );
}

export function InterventionRadar({ timeRange, customer }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Intervention Radar</CardTitle>
        <CardDescription>Chargers requiring proactive attention before they become reactive problems</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Dispatch Now */}
          <div>
            <ColumnHeader title="Dispatch Now" count={MOCK_DISPATCH.length} variant="destructive" />
            {MOCK_DISPATCH.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nothing critical ✓</p>
            ) : (
              <div className="space-y-2">
                {MOCK_DISPATCH.map((d, i) => (
                  <Card key={i} className="p-3 space-y-1.5">
                    <div className="text-sm font-medium text-foreground">{d.serial}</div>
                    <p className="text-xs text-muted-foreground">{d.reason}</p>
                    <p className="text-xs text-muted-foreground">Recommended SWI: <span className="font-medium text-foreground">{d.swi}</span></p>
                    <Button size="sm" variant="destructive" className="w-full">Create Estimate</Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Schedule This Week */}
          <div>
            <ColumnHeader title="Schedule This Week" count={MOCK_SCHEDULE.length} variant="warning" />
            {MOCK_SCHEDULE.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Fleet is healthy ✓</p>
            ) : (
              <div className="space-y-2">
                {MOCK_SCHEDULE.map((s, i) => (
                  <Card key={i} className="p-3 space-y-1.5">
                    <div className="text-sm font-medium text-foreground">{s.serial}</div>
                    <p className="text-xs text-muted-foreground">{s.reason}</p>
                    <p className="text-xs text-muted-foreground">Optimal window: <span className="font-medium text-foreground">{s.window}</span></p>
                    <Button size="sm" variant="outline" className="w-full">Schedule</Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Max Is Handling */}
          <div>
            <ColumnHeader title="Max Is Handling" count={MOCK_MAX_HANDLING.length} variant="default" />
            {MOCK_MAX_HANDLING.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No active auto-healing</p>
            ) : (
              <div className="space-y-2">
                {MOCK_MAX_HANDLING.map((m, i) => (
                  <Card key={i} className="p-3 space-y-1.5">
                    <div className="text-sm font-medium text-foreground">{m.serial}</div>
                    <Badge variant="outline" className="text-[10px]">{m.error}</Badge>
                    <p className="text-xs text-muted-foreground">{m.action}</p>
                    <p className="text-xs text-primary font-medium">ETA: {m.eta}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
