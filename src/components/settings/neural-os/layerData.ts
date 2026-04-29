import { Eye, Brain, Wrench, Truck, Sparkles, Shield, type LucideIcon } from "lucide-react";

export type LayerStatus = "active" | "degraded" | "standby";

export interface AgentDef {
  name: string;
  role: string;
}

export interface LayerDef {
  id: "sensing" | "reasoning" | "resolution" | "dispatch" | "learning" | "governance";
  name: string;
  icon: LucideIcon;
  status: LayerStatus;
  description: string;
  agents: AgentDef[];
  recentActivity: string;
  confidenceThreshold: string;
}

export const LAYERS: LayerDef[] = [
  {
    id: "sensing",
    name: "Sensing",
    icon: Eye,
    status: "active",
    description:
      "Continuous monitoring, telemetry ingestion, and anomaly detection across the entire NOCH ecosystem. The platform's eyes.",
    agents: [
      { name: "Sentinel", role: "Anomaly detection · OCPP & API stream processor" },
    ],
    recentActivity: "Awaiting telemetry",
    confidenceThreshold: "Auto-detect anomalies above 75% deviation",
  },
  {
    id: "reasoning",
    name: "Reasoning",
    icon: Brain,
    status: "active",
    description:
      "Diagnostic intelligence and pattern analysis. Determines root cause, severity, and remote-fix feasibility from sensed data.",
    agents: [
      { name: "Cortex", role: "AI Triage · Root cause analysis · Assessment generation" },
      { name: "Atlas", role: "Pattern intelligence · Environmental & geographic correlation · Predictive risk scoring" },
    ],
    recentActivity: "Awaiting telemetry",
    confidenceThreshold: "Auto-advance to Resolution above 80% confidence · HITL escalation below 60%",
  },
  {
    id: "resolution",
    name: "Resolution",
    icon: Wrench,
    status: "active",
    description:
      "Remote fix execution and scoping. Attempts software-level fixes, then defines structured scope of work when remote resolution fails.",
    agents: [
      { name: "Forge", role: "Remote resolution · Reset & reconfiguration · Scoping engine" },
    ],
    recentActivity: "Awaiting telemetry",
    confidenceThreshold: "Auto-execute remote fix above 85% safety score · Manual approval required below",
  },
  {
    id: "dispatch",
    name: "Dispatch",
    icon: Truck,
    status: "active",
    description:
      "Field execution orchestration. Assigns technicians, plans parts logistics, and prepares work orders for first-time-fix execution.",
    agents: [
      { name: "Dispatch", role: "Technician assignment · Skill matching · Parts planning · Schedule optimization" },
    ],
    recentActivity: "Awaiting telemetry",
    confidenceThreshold: "Auto-assign within 10mi radius · HITL approval for >2hr travel",
  },
  {
    id: "learning",
    name: "Learning",
    icon: Sparkles,
    status: "active",
    description:
      "Closed-loop intelligence. Compares predicted outcomes to actual field results and continuously improves the system's diagnostic accuracy.",
    agents: [
      { name: "Echo", role: "Outcome analysis · Field report ingestion · Model improvement" },
    ],
    recentActivity: "Awaiting first field reports",
    confidenceThreshold: "Continuous · No threshold gating",
  },
  {
    id: "governance",
    name: "Governance",
    icon: Shield,
    status: "active",
    description:
      "The rule layer above all agents. Enforces HITL approvals, safety guardrails, cost thresholds, and complete audit logs across every Neural OS decision.",
    agents: [],
    recentActivity: "Awaiting telemetry",
    confidenceThreshold:
      "All decisions logged · HITL required when: safety risk, cost > $5K, customer-facing communication, low confidence",
  },
];
