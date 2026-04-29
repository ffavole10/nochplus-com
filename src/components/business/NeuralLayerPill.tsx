import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type NeuralLayer =
  | "sensing"
  | "reasoning"
  | "resolution"
  | "dispatch"
  | "learning"
  | "governance";

interface NeuralLayerPillProps {
  layer: NeuralLayer;
  /** When true, drops the "neural os ·" prefix and just shows the layer name. */
  compact?: boolean;
  /** Optional tooltip shown on hover. */
  tooltip?: string;
  className?: string;
}

/**
 * Canonical attribution pill for autonomous Neural OS decisions.
 * - Full form: "neural os · sensing"
 * - Compact form (for dense KPI strips): "sensing"
 */
export function NeuralLayerPill({ layer, compact, tooltip, className }: NeuralLayerPillProps) {
  const text = compact ? layer : `neural os · ${layer}`;

  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10",
        "px-1.5 py-0.5 text-[10px] font-medium lowercase text-teal-700 dark:text-teal-300",
        "whitespace-nowrap",
        className,
      )}
    >
      {!compact && <Brain className="h-2.5 w-2.5" />}
      <span className="tracking-wide">{text}</span>
    </span>
  );

  if (!tooltip) return pill;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{pill}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
