import {
  CheckCircle, Search, FileText, Send, ThumbsUp, CalendarDays,
  Package, Clock, Wrench, ClipboardCheck, XCircle,
} from "lucide-react";
import { WorkflowStepInfo, StepStatus, WORKFLOW_STEPS_TEMPLATE } from "@/types/serviceTicket";
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

const STEP_ICONS: Record<number, React.ElementType> = {
  1: Search,
  2: FileText,
  3: FileText,
  4: Send,
  5: ThumbsUp,
  6: CalendarDays,
  7: Package,
  8: Clock,
  9: Wrench,
  10: ClipboardCheck,
};

function HorizontalStep({
  step,
  isLast,
  nextStatus,
}: {
  step: WorkflowStepInfo;
  isLast: boolean;
  nextStatus?: StepStatus;
}) {
  const Icon = STEP_ICONS[step.number] || FileText;
  const isComplete = step.status === "complete";
  const isActive = step.status === "in_progress";
  const isFailed = step.status === "failed";

  return (
    <div className="flex items-center flex-1 min-w-0">
      {/* Node */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div
          className={cn(
            "relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
            isComplete
              ? "border-primary bg-primary text-primary-foreground"
              : isActive
              ? "border-primary bg-primary/10 text-primary ring-4 ring-primary/15"
              : isFailed
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-muted-foreground/25 bg-muted text-muted-foreground/50"
          )}
        >
          {isComplete ? (
            <CheckCircle className="h-4 w-4" />
          ) : isFailed ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
          {isActive && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <span
          className={cn(
            "text-[10px] font-medium text-center leading-tight w-full",
            isComplete
              ? "text-primary"
              : isActive
              ? "text-primary font-semibold"
              : isFailed
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        >
          {step.label}
        </span>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div className="flex-1 mx-1.5 mt-[-18px]">
          <div className="h-0.5 w-full rounded-full bg-muted-foreground/15 relative overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                isComplete && (nextStatus === "complete" || nextStatus === "in_progress")
                  ? "bg-primary w-full"
                  : isComplete
                  ? "bg-gradient-to-r from-primary to-primary/30 w-full"
                  : "w-0"
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseSection({
  phase,
  phaseSteps,
}: {
  phase: (typeof PHASES)[number];
  phaseSteps: WorkflowStepInfo[];
}) {
  const completed = phaseSteps.filter((s) => s.status === "complete").length;
  const allComplete = completed === phaseSteps.length;
  const anyActive = phaseSteps.some((s) => s.status === "in_progress");
  const hasFailed = phaseSteps.some((s) => s.status === "failed");

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        allComplete
          ? "border-primary/30 bg-primary/5"
          : hasFailed
          ? "border-destructive/30 bg-destructive/5"
          : anyActive
          ? "border-primary/20 bg-card"
          : "border-border bg-card"
      )}
    >
      {/* Phase header — centered */}
      <div className="flex flex-col items-center gap-1 mb-4">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {phase.label}
        </span>
        <span
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
            allComplete
              ? "bg-primary/15 text-primary"
              : anyActive
              ? "bg-primary/10 text-primary"
              : hasFailed
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
        >
          {allComplete ? "Complete" : hasFailed ? "Issue" : anyActive ? "In Progress" : `${completed}/${phaseSteps.length}`}
        </span>
      </div>

      {/* Horizontal step track */}
      <div className="flex items-start justify-center">
        {phaseSteps.map((step, i) => (
          <HorizontalStep
            key={step.number}
            step={step}
            isLast={i === phaseSteps.length - 1}
            nextStatus={phaseSteps[i + 1]?.status}
          />
        ))}
      </div>
    </div>
  );
}

export function WorkflowStepper({ steps, currentStep, compact }: WorkflowStepperProps) {
  // Always build from the canonical template to ensure all 10 steps exist,
  // even if the persisted ticket has stale/incomplete workflowSteps.
  const derivedSteps: WorkflowStepInfo[] = WORKFLOW_STEPS_TEMPLATE.map((tmpl) => ({
    ...tmpl,
    status:
      tmpl.number < currentStep
        ? "complete" as StepStatus
        : tmpl.number === currentStep
        ? "in_progress" as StepStatus
        : "pending" as StepStatus,
  }));

  return (
    <div className="space-y-3">
      {PHASES.map((phase) => {
        const phaseSteps = derivedSteps.filter(
          (s) => s.number >= phase.range[0] && s.number <= phase.range[1]
        );
        return (
          <PhaseSection key={phase.label} phase={phase} phaseSteps={phaseSteps} />
        );
      })}
    </div>
  );
}
