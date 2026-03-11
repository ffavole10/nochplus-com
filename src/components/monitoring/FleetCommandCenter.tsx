import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
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

const severityColor: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  warning: "bg-amber-500/20 text-amber-400",
  info: "bg-muted text-muted-foreground",
};

const maxStatusStyle: Record<string, string> = {
  "Auto-healed ✓": "text-emerald-400",
  "Escalated →": "text-orange-400",
  "Analyzing...": "text-amber-400 animate-pulse",
  "Monitoring": "text-muted-foreground",
};

export function FleetCommandCenter({ timeRange, customer }: Props) {
  return (
    <Card className="overflow-hidden border-0" style={{ background: "#0D1117" }}>
      <div className="p-6">
        <h2 className="text-lg font-bold text-white mb-1">Fleet Command Center</h2>
        <p className="text-xs text-gray-500 mb-5">Mission control for your connected charger network</p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: KPI Stats */}
          <div className="lg:col-span-3 grid grid-cols-3 gap-3">
            {/* Row 1 */}
            <StatBlock
              icon={<Activity className="h-4 w-4" />}
              label="CONNECTED CHARGERS"
              value={`${MOCK_STATS.connected.value} / ${MOCK_STATS.connected.total}`}
              subtitle="online now"
              accent={MOCK_STATS.connected.pct > 90 ? "teal" : MOCK_STATS.connected.pct > 70 ? "amber" : "red"}
            />
            <StatBlock
              icon={<Shield className="h-4 w-4" />}
              label="FLEET HEALTH INDEX"
              value={`${MOCK_STATS.fleetHealth.value}%`}
              subtitle={`↑ ${MOCK_STATS.fleetHealth.trend}% vs 24h`}
              accent="teal"
            />
            <StatBlock
              icon={<Zap className="h-4 w-4" />}
              label="AUTONOMOUS RESOLUTION"
              value={`${MOCK_STATS.autoResolution}%`}
              subtitle="errors resolved by Max"
              accent="teal"
              prominent
            />
            {/* Row 2 */}
            <StatBlock
              icon={<AlertTriangle className="h-4 w-4" />}
              label="ACTIVE ALERTS"
              value={`${MOCK_STATS.activeAlerts}`}
              subtitle="require attention"
              accent={MOCK_STATS.activeAlerts > 0 ? "red" : "green"}
            />
            <StatBlock
              icon={<Ticket className="h-4 w-4" />}
              label="TICKETS PREVENTED TODAY"
              value={`${MOCK_STATS.ticketsPrevented}`}
              subtitle="remote interventions"
              accent="teal"
            />
            <StatBlock
              icon={<DollarSign className="h-4 w-4" />}
              label="REVENUE PROTECTED"
              value={`$${MOCK_STATS.revenueProtected.toLocaleString()}`}
              subtitle="downtime revenue saved"
              accent="green"
            />
          </div>

          {/* Right: Live Error Feed */}
          <div className="lg:col-span-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Live Error Feed</div>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
              {MOCK_EVENTS.map((evt, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                  <span className="text-gray-600 w-14 shrink-0 font-mono">{evt.time}</span>
                  <span className="text-gray-300 font-medium w-24 shrink-0">{evt.serial}</span>
                  <span className="text-gray-400 truncate flex-1">{evt.code}</span>
                  <Badge className={cn("text-[10px] px-1.5 py-0", severityColor[evt.severity])}>{evt.severity}</Badge>
                  <span className={cn("text-[10px] font-medium w-24 text-right shrink-0", maxStatusStyle[evt.maxStatus])}>{evt.maxStatus}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatBlock({ icon, label, value, subtitle, accent, prominent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  accent: "teal" | "amber" | "red" | "green";
  prominent?: boolean;
}) {
  const accentColors = {
    teal: "text-teal-400 border-teal-500/30",
    amber: "text-amber-400 border-amber-500/30",
    red: "text-red-400 border-red-500/30",
    green: "text-emerald-400 border-emerald-500/30",
  };
  return (
    <div className={cn("rounded-lg border bg-white/[0.03] p-3", accentColors[accent])}>
      <div className="flex items-center gap-1.5 mb-1 opacity-60">{icon}<span className="text-[10px] font-semibold tracking-wider uppercase text-gray-400">{label}</span></div>
      <div className={cn("font-bold text-white", prominent ? "text-2xl" : "text-xl")}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{subtitle}</div>
    </div>
  );
}
