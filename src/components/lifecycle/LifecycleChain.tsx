import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export type LifecycleStageKey =
  | "submission"
  | "ai_triage"
  | "ticket"
  | "estimate"
  | "work_order"
  | "field_report"
  | "assessment";

export type LifecycleStageState = "complete" | "current" | "future" | "skipped";

export interface LifecycleStage {
  key: LifecycleStageKey;
  label: string;
  state: LifecycleStageState;
  /** Entity ID to display in tooltip (e.g. NP-1023) */
  entityId?: string;
  /** Status text for tooltip */
  status?: string;
  /** ISO timestamp for tooltip */
  timestamp?: string;
  /** Route to navigate to when clicked */
  href?: string;
}

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStageKey, string> = {
  submission: "Submission",
  ai_triage: "AI Triage",
  ticket: "Ticket",
  estimate: "Estimate",
  work_order: "Work Order",
  field_report: "Field Report",
  assessment: "Assessment",
};

export const LIFECYCLE_ORDER: LifecycleStageKey[] = [
  "submission",
  "ai_triage",
  "ticket",
  "estimate",
  "work_order",
  "field_report",
  "assessment",
];

interface LifecycleChainProps {
  stages: LifecycleStage[];
  /** Optional title shown to the left of the chain */
  title?: string;
}

function StageNode({ stage }: { stage: LifecycleStage }) {
  const navigate = useNavigate();
  const isComplete = stage.state === "complete";
  const isCurrent = stage.state === "current";
  const isSkipped = stage.state === "skipped";
  const isFuture = stage.state === "future";

  const clickable = !!stage.href && !isFuture;

  const node = (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && stage.href && navigate(stage.href)}
      className={cn(
        "group relative flex flex-col items-center gap-1.5 min-w-[68px]",
        clickable && "cursor-pointer",
        !clickable && "cursor-default",
      )}
    >
      <span
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
          isComplete && "border-primary bg-primary text-primary-foreground",
          isCurrent &&
            "border-primary bg-primary/10 text-primary ring-4 ring-primary/15 animate-pulse",
          isFuture &&
            "border-muted-foreground/30 bg-muted text-muted-foreground/50",
          isSkipped &&
            "border-muted-foreground/30 bg-muted text-muted-foreground/50",
          clickable && "group-hover:scale-110",
        )}
      >
        {isComplete ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
        {isSkipped && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="block h-[2px] w-7 bg-muted-foreground/50 rotate-[-30deg]" />
          </span>
        )}
      </span>
      <span
        className={cn(
          "text-[10px] font-medium leading-tight whitespace-nowrap",
          isComplete && "text-primary",
          isCurrent && "text-primary font-semibold",
          (isFuture || isSkipped) && "text-muted-foreground",
        )}
      >
        {stage.label}
      </span>
    </button>
  );

  const hasTooltip = stage.entityId || stage.status || stage.timestamp;

  if (!hasTooltip) return node;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{node}</TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-0.5">
          {stage.entityId && (
            <div className="font-mono font-semibold">{stage.entityId}</div>
          )}
          {stage.status && (
            <div className="capitalize text-muted-foreground">{stage.status}</div>
          )}
          {stage.timestamp && (
            <div className="text-muted-foreground">
              {new Date(stage.timestamp).toLocaleString()}
            </div>
          )}
          {isSkipped && (
            <div className="text-muted-foreground italic">Skipped</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function LifecycleChain({ stages, title = "Lifecycle" }: LifecycleChainProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Card className="border-border/60">
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
              {title}
            </span>
            <div className="flex items-center gap-0.5 flex-wrap">
              {stages.map((stage, i) => {
                const next = stages[i + 1];
                const connectorActive =
                  stage.state === "complete" &&
                  (next?.state === "complete" || next?.state === "current");
                return (
                  <div key={stage.key} className="flex items-center">
                    <StageNode stage={stage} />
                    {i < stages.length - 1 && (
                      <ChevronRight
                        className={cn(
                          "h-3 w-3 mx-0.5 mb-4 shrink-0 transition-colors",
                          connectorActive
                            ? "text-primary"
                            : "text-muted-foreground/40",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
