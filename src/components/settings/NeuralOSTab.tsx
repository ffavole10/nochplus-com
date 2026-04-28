import { useState } from "react";
import { cn } from "@/lib/utils";
import { ReasoningTab } from "./neural-os/ReasoningTab";
import { LearningTab } from "./neural-os/LearningTab";
import { GovernanceTab } from "./neural-os/GovernanceTab";
import { PerformanceTab } from "./neural-os/PerformanceTab";
import { ComingSoonTab } from "./neural-os/ComingSoonTab";

type NeuralTab =
  | "sensing"
  | "reasoning"
  | "resolution"
  | "dispatch"
  | "learning"
  | "governance"
  | "performance";

type TabDef = {
  value: NeuralTab;
  label: string;
  group: "operating" | "foundation" | "metrics";
};

const TABS: TabDef[] = [
  { value: "sensing", label: "Sensing", group: "operating" },
  { value: "reasoning", label: "Reasoning", group: "operating" },
  { value: "resolution", label: "Resolution", group: "operating" },
  { value: "dispatch", label: "Dispatch", group: "operating" },
  { value: "learning", label: "Learning", group: "operating" },
  { value: "governance", label: "Governance", group: "foundation" },
  { value: "performance", label: "Performance", group: "metrics" },
];

const GROUP_LABELS: Record<TabDef["group"], string> = {
  operating: "Operating Layers",
  foundation: "Foundation",
  metrics: "Metrics",
};

export function NeuralOSTab() {
  const [active, setActive] = useState<NeuralTab>("reasoning");

  // Build column groupings with their tabs in order
  const groups = (["operating", "foundation", "metrics"] as const).map((g) => ({
    key: g,
    label: GROUP_LABELS[g],
    tabs: TABS.filter((t) => t.group === g),
  }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Neural OS</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          The Reliability Operating System. Configure how NOCH Neural perceives, reasons, resolves,
          dispatches, learns, and governs.
        </p>
      </div>

      {/* Tab nav with grouping labels above */}
      <div>
        <div className="flex items-end gap-2 border-b border-border">
          {groups.map((group, gi) => (
            <div key={group.key} className="flex flex-col">
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground/70 px-1 pb-1">
                {group.label}
              </span>
              <div className="flex">
                {group.tabs.map((tab) => {
                  const isActive = active === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActive(tab.value)}
                      className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              {/* vertical group divider (skip after last) */}
              {gi < groups.length - 1 && (
                <span className="sr-only">divider</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {active === "sensing" && (
          <ComingSoonTab
            title="Sensing Layer | Neural OS"
            description="Configure how Neural OS perceives every charger across every connected source. Real-time anomaly detection."
            emptyState="Sensing configuration coming soon. This layer will allow fine-tuning of telemetry sources, OCPP polling frequency, anomaly detection thresholds, alert routing, charger health scoring weights, and source priority when CMS APIs disagree."
          />
        )}
        {active === "reasoning" && <ReasoningTab />}
        {active === "resolution" && (
          <ComingSoonTab
            title="Resolution Layer | Neural OS"
            description="The highest-leverage layer. Executes remote fixes — soft reset, firmware push, configuration changes — without dispatching a truck."
            emptyState="Resolution configuration coming soon. This layer will manage the remote actions queue, execution policies per OEM, success/fail outcomes, and Truck Roll Reduction (TRR) metrics."
          />
        )}
        {active === "dispatch" && (
          <ComingSoonTab
            title="Dispatch Layer | Neural OS"
            description="Routes field work to certified technicians when remote fix isn't sufficient. AI-driven matching with confidence scores."
            emptyState="Dispatch configuration coming soon. This layer will control auto-routing rules, technician matching logic (skills, proximity, certifications), confidence thresholds for auto-assignment, and override controls."
          />
        )}
        {active === "learning" && <LearningTab />}
        {active === "governance" && <GovernanceTab />}
        {active === "performance" && <PerformanceTab />}
      </div>
    </div>
  );
}
