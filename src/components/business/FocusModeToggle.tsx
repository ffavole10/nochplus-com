import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusMode } from "@/hooks/useFocus5";

export function FocusModeToggle({ className }: { className?: string }) {
  const focusMode = useFocusMode();
  return (
    <button
      type="button"
      onClick={() => focusMode.toggle(!focusMode.enabled)}
      title={focusMode.enabled ? "Click to turn off Focus mode" : "Click to turn on Focus mode (filters to your Focus 5)"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        focusMode.enabled
          ? "bg-amber-400/90 border-amber-500 text-amber-950 hover:bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.15)]"
          : "bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      data-tour="focus-mode-toggle"
    >
      <Target className="h-3.5 w-3.5" />
      <span>
        {focusMode.enabled
          ? `Focus mode: ON${focusMode.quarter ? ` · ${focusMode.quarter}` : ""}`
          : "Focus mode: OFF"}
      </span>
    </button>
  );
}
