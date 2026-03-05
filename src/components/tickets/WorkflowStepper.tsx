import { CheckCircle, Clock } from "lucide-react";
import { WorkflowStepInfo, StepStatus } from "@/types/serviceTicket";
import { cn } from "@/lib/utils";

interface WorkflowStepperProps {
  steps: WorkflowStepInfo[];
  currentStep: number;
  compact?: boolean;
}

const PHASES = [
  { label: "Diagnosis", range: [1, 2], number: 1 },
  { label: "Quoting", range: [3, 5], number: 2 },
  { label: "Fulfillment", range: [6, 10], number: 3 },
] as const;

function PhaseCard({
  phase,
  phaseSteps,
  phaseNumber,
  compact,
}: {
  phase: (typeof PHASES)[number];
  phaseSteps: WorkflowStepInfo[];
  phaseNumber: number;
  compact?: boolean;
}) {
  const total = phaseSteps.length;
  const completed = phaseSteps.filter((s) => s.status === "complete").length;
  const hasFailed = phaseSteps.some((s) => s.status === "failed");
  const anyInProgress = phaseSteps.some((s) => s.status === "in_progress");
  const allComplete = completed === total;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Estimate remaining steps as ~5 min each
  const remaining = total - completed;
  const estMinutes = anyInProgress ? remaining * 5 : remaining * 5;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-all",
        allComplete
          ? "border-primary/30 bg-primary/5"
          : hasFailed
          ? "border-destructive/30 bg-destructive/5"
          : anyInProgress
          ? "border-primary/20 bg-card"
          : "border-border bg-card"
      )}
    >
      {/* Phase number badge */}
      <div
        className={cn(
          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold",
          allComplete
            ? "bg-primary text-primary-foreground"
            : anyInProgress
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {allComplete ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          `0${phaseNumber}`
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {phase.label}
          </span>
          {!allComplete && anyInProgress && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-[10px]">~{estMinutes}min</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-semibold",
              allComplete
                ? "text-primary"
                : hasFailed
                ? "text-destructive"
                : anyInProgress
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {allComplete
              ? "Complete"
              : hasFailed
              ? "Issue found"
              : `${pct}% to complete`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              allComplete
                ? "bg-primary"
                : hasFailed
                ? "bg-destructive"
                : "bg-gradient-to-r from-primary/80 to-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function WorkflowStepper({ steps, currentStep, compact }: WorkflowStepperProps) {
  return (
    <div className="space-y-2">
      {PHASES.map((phase) => {
        const phaseSteps = steps.filter(
          (s) => s.number >= phase.range[0] && s.number <= phase.range[1]
        );

        return (
          <PhaseCard
            key={phase.label}
            phase={phase}
            phaseSteps={phaseSteps}
            phaseNumber={phase.number}
            compact={compact}
          />
        );
      })}
    </div>
  );
}
