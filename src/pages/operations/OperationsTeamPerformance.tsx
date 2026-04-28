import { useState } from "react";
import { Users, Map as MapIcon, BarChart3 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { OperationsPageHeader } from "@/components/operations/OperationsPageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Locations from "@/pages/placeholders/Locations";
import TeamPerformance from "@/pages/field-capture/admin/TeamPerformance";

type View = "map" | "scorecard";

export default function OperationsTeamPerformance() {
  usePageTitle("Team Performance");
  const [view, setView] = useState<View>("map");

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <OperationsPageHeader
          title="Team Performance"
          subtitle="Where your techs are, what they're doing, and how they're performing."
          icon={Users}
          actions={
            <div className="inline-flex rounded-lg border border-border bg-card p-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setView("map")}
                className={cn(
                  "h-8 gap-1.5",
                  view === "map" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
              >
                <MapIcon className="h-4 w-4" /> Map
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setView("scorecard")}
                className={cn(
                  "h-8 gap-1.5",
                  view === "scorecard" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
              >
                <BarChart3 className="h-4 w-4" /> Scorecard
              </Button>
            </div>
          }
        />
      </div>
      {view === "map" ? <Locations /> : <TeamPerformance />}
    </div>
  );
}
