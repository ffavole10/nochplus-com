import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, Shield, Zap, AlertTriangle, Ticket, DollarSign } from "lucide-react";

interface Props {
  timeRange: string;
  customer: string;
}

// MOCK — replace with live OCPP data when integration is complete
const MOCK_EVENTS = [
  { time: "2m ago", serial: "NAS-DC-042", code: "HighTemperature", severity: "critical", maxStatus: "Auto-healed ✓" },
  { time: "5m ago", serial: "FBL-AC-017", code: "WeakSignal", severity: "warning", maxStatus: "Monitoring" },
  { time: "8m ago", serial: "HLT-DC-003", code: "ConnectorLockFailure", severity: "critical", maxStatus: "Escalated →" },
  { time: "12m ago", serial: "NAS-DC-019", code: "EVCommunicationError", severity: "warning", maxStatus: "Analyzing..." },
  { time: "15m ago", serial: "MRT-AC-008", code: "ReaderFailure", severity: "info", maxStatus: "Auto-healed ✓" },
  { time: "18m ago", serial: "FBL-DC-023", code: "PowerMeterFailure", severity: "critical", maxStatus: "Escalated →" },
  { time: "22m ago", serial: "NAS-DC-011", code: "GroundFailure", severity: "warning", maxStatus: "Auto-healed ✓" },
  { time: "28m ago", serial: "HLT-AC-006", code: "InternalError", severity: "critical", maxStatus: "Analyzing..." },
  { time: "35m ago", serial: "MRT-DC-015", code: "PowerSwitchFailure", severity: "warning", maxStatus: "Monitoring" },
  { time: "41m ago", serial: "FBL-AC-029", code: "WeakSignal", severity: "info", maxStatus: "Auto-healed ✓" },
];

const MOCK_STATS = {
  connected: { value: 47, total: 52, pct: 90.4 },
  fleetHealth: { value: 84, trend: 2.1 },
  autoResolution: 78.3,
  activeAlerts: 3,
  ticketsPrevented: 12,
  revenueProtected: 18400,
};

const severityVariant: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  warning: "secondary",
  info: "outline",
};

const maxStatusStyle: Record<string, string> = {
  "Auto-healed ✓": "text-emerald-500",
  "Escalated →": "text-orange-500",
  "Analyzing...": "text-amber-500 animate-pulse",
  "Monitoring": "text-muted-foreground",
};

export function FleetCommandCenter({ timeRange, customer }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fleet Command Center</CardTitle>
        <CardDescription>Mission control for your connected charger network</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: KPI Stats */}
          <div className="lg:col-span-3 grid grid-cols-3 gap-3">
            <StatBlock
              icon={<Activity className="h-4 w-4" />}
              label="Connected Chargers"
              value={`${MOCK_STATS.connected.value} / ${MOCK_STATS.connected.total}`}
              subtitle="online now"
              accent={MOCK_STATS.connected.pct > 90 ? "teal" : MOCK_STATS.connected.pct > 70 ? "amber" : "red"}
            />
            <StatBlock
              icon={<Shield className="h-4 w-4" />}
              label="Fleet Health Index"
              value={`${MOCK_STATS.fleetHealth.value}%`}
              subtitle={`↑ ${MOCK_STATS.fleetHealth.trend}% vs 24h`}
              accent="teal"
            />
            <StatBlock
              icon={<Zap className="h-4 w-4" />}
              label="Autonomous Resolution"
              value={`${MOCK_STATS.autoResolution}%`}
              subtitle="errors resolved by Max"
              accent="teal"
              prominent
            />
            <StatBlock
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Active Alerts"
              value={`${MOCK_STATS.activeAlerts}`}
              subtitle="require attention"
              accent={MOCK_STATS.activeAlerts > 0 ? "red" : "teal"}
            />
            <StatBlock
              icon={<Ticket className="h-4 w-4" />}
              label="Tickets Prevented Today"
              value={`${MOCK_STATS.ticketsPrevented}`}
              subtitle="remote interventions"
              accent="teal"
            />
            <StatBlock
              icon={<DollarSign className="h-4 w-4" />}
              label="Revenue Protected"
              value={`$${MOCK_STATS.revenueProtected.toLocaleString()}`}
              subtitle="downtime revenue saved"
              accent="teal"
            />
          </div>

          {/* Right: Live Error Feed */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-2">Live Error Feed</h3>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {MOCK_EVENTS.map((evt, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-md border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="text-muted-foreground w-14 shrink-0 font-mono">{evt.time}</span>
                  <span className="text-foreground font-medium w-24 shrink-0">{evt.serial}</span>
                  <span className="text-muted-foreground truncate flex-1">{evt.code}</span>
                  <Badge variant={severityVariant[evt.severity]} className="text-[10px]">{evt.severity}</Badge>
                  <span className={cn("text-[10px] font-medium w-24 text-right shrink-0", maxStatusStyle[evt.maxStatus])}>{evt.maxStatus}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBlock({ icon, label, value, subtitle, accent, prominent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  accent: "teal" | "amber" | "red";
  prominent?: boolean;
}) {
  const accentText = {
    teal: "text-emerald-500",
    amber: "text-amber-500",
    red: "text-destructive",
  };
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold tracking-wider uppercase">{label}</span>
      </div>
      <div className={cn("font-bold", prominent ? "text-2xl" : "text-xl", accentText[accent])}>{value}</div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
    </Card>
  );
}
