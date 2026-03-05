import { CheckCircle, Circle, Loader2, XCircle } from "lucide-react";
import { WorkflowStepInfo, StepStatus } from "@/types/serviceTicket";
import { cn } from "@/lib/utils";

interface WorkflowStepperProps {
  steps: WorkflowStepInfo[];
  currentStep: number;
  compact?: boolean;
}

const PHASES = [
  { label: "Diagnosis", range: [1, 2] },
  { label: "Quoting", range: [3, 5] },
  { label: "Fulfillment", range: [6, 10] },
] as const;

function StepDot({ status, size = "md" }: { status: StepStatus; size?: "sm" | "md" }) {
  const s = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const icon = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  switch (status) {
    case "complete":
      return (
        <div className={cn(s, "rounded-full bg-primary flex items-center justify-center flex-shrink-0")}>
          <CheckCircle className={cn(icon, "text-primary-foreground")} />
        </div>
      );
    case "in_progress":
      return (
        <div className={cn(s, "rounded-full border-2 border-primary bg-background flex items-center justify-center flex-shrink-0")}>
          <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
        </div>
      );
    case "failed":
      return (
        <div className={cn(s, "rounded-full bg-destructive flex items-center justify-center flex-shrink-0")}>
          <XCircle className={cn(icon, "text-destructive-foreground")} />
        </div>
      );
    default:
      return (
        <div className={cn(s, "rounded-full bg-primary/15 flex-shrink-0")} />
      );
  }
}

function ConnectorLine({ fromStatus, toStatus }: { fromStatus: StepStatus; toStatus: StepStatus }) {
  const filled = fromStatus === "complete";
  const partial = fromStatus === "complete" && toStatus === "in_progress";

  return (
    <div className="flex-1 h-0.5 mx-1 relative">
      <div className="absolute inset-0 bg-muted rounded-full" />
      {filled && (
        <div className={cn(
          "absolute inset-y-0 left-0 rounded-full bg-primary",
          partial ? "w-1/2" : "w-full"
        )} />
      )}
    </div>
  );
}

export function WorkflowStepper({ steps, currentStep, compact }: WorkflowStepperProps) {
  const dotSize = compact ? "sm" : "md";

  return (
    <div className="space-y-4">
      {PHASES.map((phase, pi) => {
        const phaseSteps = steps.filter(
          (s) => s.number >= phase.range[0] && s.number <= phase.range[1]
        );

        // Determine phase status
        const allComplete = phaseSteps.every((s) => s.status === "complete");
        const anyInProgress = phaseSteps.some((s) => s.status === "in_progress");
        const allPending = phaseSteps.every((s) => s.status === "pending");

        return (
          <div key={phase.label}>
            {/* Phase label */}
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                allComplete ? "text-primary" :
                anyInProgress ? "text-primary" :
                "text-muted-foreground"
              )}>
                {phase.label}
              </span>
              {allComplete && (
                <span className="text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">Done</span>
              )}
            </div>

            {/* Steps row */}
            <div className="flex items-center">
              {phaseSteps.map((step, si) => (
                <div key={step.number} className="flex items-center" style={{ flex: si < phaseSteps.length - 1 ? 1 : undefined }}>
                  {/* Dot + label */}
                  <div className="flex flex-col items-center" style={{ minWidth: compact ? 48 : 64 }}>
                    <StepDot status={step.status} size={dotSize} />
                    <span className={cn(
                      "mt-1.5 text-center leading-tight",
                      compact ? "text-[10px]" : "text-xs",
                      step.status === "pending" ? "text-muted-foreground" : "text-foreground font-medium"
                    )}>
                      {step.label}
                    </span>
                    <span className={cn(
                      "text-[10px]",
                      step.status === "complete" ? "text-primary" :
                      step.status === "in_progress" ? "text-primary" :
                      "text-muted-foreground"
                    )}>
                      {step.status === "complete" ? "Completed" :
                       step.status === "in_progress" ? "In Progress" :
                       step.status === "failed" ? "Failed" :
                       "Pending"}
                    </span>
                  </div>

                  {/* Connector */}
                  {si < phaseSteps.length - 1 && (
                    <ConnectorLine
                      fromStatus={step.status}
                      toStatus={phaseSteps[si + 1].status}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
