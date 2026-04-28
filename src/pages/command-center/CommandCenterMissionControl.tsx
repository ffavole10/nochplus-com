import { useState } from "react";
import { Map as MapIcon, List as ListIcon, Radar } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import NochPlusMonitoring from "@/pages/NochPlusMonitoring";
import NochPlusChargers from "@/pages/placeholders/NochPlusChargers";
import { NeuralOsBadge } from "@/components/business/NeuralOsBadge";

export default function CommandCenterMissionControl() {
  usePageTitle("Mission Control");
  const [view, setView] = useState<"map" | "list">("map");

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Radar className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Mission Control</h1>
              <NeuralOsBadge label="sensing" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live fleet view across every charger in the NOCH ecosystem. Powered by Neural OS Sensing.
            </p>
          </div>
        </div>

        <div className="flex items-center rounded-full border border-border p-0.5 bg-muted/30 shrink-0">
          <button
            onClick={() => setView("map")}
            className={cn(
              "px-4 py-1.5 text-xs font-medium rounded-full transition-all inline-flex items-center gap-1.5",
              view === "map"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapIcon className="h-3.5 w-3.5" />
            Map
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "px-4 py-1.5 text-xs font-medium rounded-full transition-all inline-flex items-center gap-1.5",
              view === "list"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListIcon className="h-3.5 w-3.5" />
            List
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {view === "map" ? <NochPlusMonitoring /> : <NochPlusChargers />}
      </div>
    </div>
  );
}
