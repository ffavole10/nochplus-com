import { Check, Slash } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WorkflowStepStatus } from "@/lib/ticketWorkflow";

interface StepStepperProps {
  steps: WorkflowStepStatus[];
  /** The step number currently being viewed in the panel (may differ from active). */
  viewedStep: number;
  onSelectStep: (stepNumber: number) => void;
}

const STATE_DOT_CLASSES: Record<string, string> = {
  active:
    "bg-primary border-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.18)] animate-pulse",
  completed: "bg-primary border-primary text-primary-foreground",
  locked:
    "bg-muted border-border text-muted-foreground/50 cursor-not-allowed",
  skipped:
    "bg-muted border-border text-muted-foreground",
  blocked:
    "bg-medium/20 border-medium text-medium",
  failed:
    "bg-critical/15 border-critical text-critical",
};

const STATE_LABEL: Record<string, string> = {
  active: "In progress",
  completed: "Completed",
  locked: "Locked",
  skipped: "Skipped",
  blocked: "Blocked",
  failed: "Escalated",
};

export function StepStepper({ steps, viewedStep, onSelectStep }: StepStepperProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1.5 w-full overflow-x-auto py-1">
        {steps.map((s, i) => {
          const dotCls = STATE_DOT_CLASSES[s.state];
          const isViewed = s.def.number === viewedStep;
          const isLocked = s.state === "locked";
          const tooltipText =
            s.state === "locked"
              ? s.reason || `Awaiting ${steps[i - 1]?.def.shortLabel || "previous step"}`
              : s.state === "skipped"
              ? `Skipped${s.reason ? ` — ${s.reason}` : ""}`
              : s.state === "blocked"
              ? `Blocked${s.reason ? ` — ${s.reason}` : ""}`
              : s.state === "failed"
              ? `Escalated${s.reason ? ` — ${s.reason}` : ""}`
              : `${s.def.label} · ${STATE_LABEL[s.state]}`;

          return (
            <div key={s.def.id} className="flex items-center min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Step ${s.def.number}: ${s.def.label} (${STATE_LABEL[s.state]})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isLocked) return;
                      onSelectStep(s.def.number);
                    }}
                    disabled={isLocked}
                    className={cn(
                      "relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all",
                      dotCls,
                      !isLocked && "hover:scale-110",
                      isViewed && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                    )}
                  >
                    {s.state === "completed" ? (
                      <Check className="h-3 w-3" />
                    ) : s.state === "skipped" ? (
                      <Slash className="h-3 w-3" />
                    ) : (
                      <span>{s.def.number}</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="font-semibold">
                    Step {s.def.number} · {s.def.shortLabel}
                  </div>
                  <div className="text-muted-foreground">{tooltipText}</div>
                </TooltipContent>
              </Tooltip>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-6 mx-0.5 rounded-full",
                    s.state === "completed" ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
