import { CheckCircle, Clock, XCircle } from "lucide-react";
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

function StepDot({ status, label, number }: { status: StepStatus; label: string; number: number }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div
        className={cn(
          "h-2.5 w-2.5 rounded-full flex-shrink-0",
          status === "complete" ? "bg-primary" :
          status === "in_progress" ? "bg-primary animate-pulse" :
          status === "failed" ? "bg-destructive" :
          "bg-muted-foreground/25"
        )}
      />
      <span
        className={cn(
          "text-xs",
          status === "complete" ? "text-foreground" :
          status === "in_progress" ? "text-primary font-medium" :
          status === "failed" ? "text-destructive" :
          "text-muted-foreground"
        )}
      >
        {number}. {label}
      </span>
      {status === "complete" && (
        <CheckCircle className="h-3 w-3 text-primary ml-auto flex-shrink-0" />
      )}
      {status === "in_progress" && (
        <span className="text-[10px] text-primary font-medium ml-auto bg-primary/10 px-1.5 py-0.5 rounded-full">Active</span>
      )}
      {status === "failed" && (
        <XCircle className="h-3 w-3 text-destructive ml-auto flex-shrink-0" />
      )}
    </div>
  );
}

function PhaseCard({
  phase,
  phaseSteps,
  phaseNumber,
}: {
  phase: (typeof PHASES)[number];
  phaseSteps: WorkflowStepInfo[];
  phaseNumber: number;
}) {
  const total = phaseSteps.length;
  const completed = phaseSteps.filter((s) => s.status === "complete").length;
  const hasFailed = phaseSteps.some((s) => s.status === "failed");
  const anyInProgress = phaseSteps.some((s) => s.status === "in_progress");
  const allComplete = completed === total;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all",
        allComplete
          ? "border-primary/30 bg-primary/5"
          : hasFailed
          ? "border-destructive/30 bg-destructive/5"
          : anyInProgress
          ? "border-primary/20 bg-card"
          : "border-border bg-card"
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold",
            allComplete
              ? "bg-primary text-primary-foreground"
              : anyInProgress
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {allComplete ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            `0${phaseNumber}`
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{phase.label}</span>
            <span
              className={cn(
                "text-xs font-semibold",
                allComplete
                  ? "text-primary"
                  : hasFailed
                  ? "text-destructive"
                  : anyInProgress
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {allComplete ? "Complete" : `${pct}%`}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
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

      {/* Step list */}
      <div className="ml-10 border-l border-border pl-3 space-y-0">
        {phaseSteps.map((step) => (
          <StepDot key={step.number} status={step.status} label={step.label} number={step.number} />
        ))}
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
          />
        );
      })}
    </div>
  );
}
