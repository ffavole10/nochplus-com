import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Rocket, CheckCircle, PauseCircle } from "lucide-react";

interface Props {
  campaignStatus: string;
  completedCount: number;
  totalCount: number;
  startDate: string | null;
  deadline: string | null;
  currentDay: number;
  totalDays: number;
  onActivate: () => void;
  hasQuote: boolean;
}

export function LaunchStatusBar({
  campaignStatus, completedCount, totalCount, startDate, deadline,
  currentDay, totalDays, onActivate, hasQuote,
}: Props) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const deadlineDaysLeft = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    : null;

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    "pre-launch": { label: "Pre-Launch", color: "bg-muted text-muted-foreground", icon: <Rocket className="h-3 w-3" /> },
    active: { label: "Active", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /> },
    completed: { label: "Completed", color: "bg-green-700/20 text-green-300", icon: <CheckCircle className="h-3 w-3" /> },
    "on-hold": { label: "On Hold", color: "bg-yellow-500/20 text-yellow-400", icon: <PauseCircle className="h-3 w-3" /> },
  };

  const cfg = statusConfig[campaignStatus] || statusConfig["pre-launch"];

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`gap-1.5 ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
          </Badge>
          {campaignStatus === "pre-launch" && hasQuote && (
            <Button size="sm" onClick={onActivate}>
              <Rocket className="h-3.5 w-3.5 mr-1.5" />
              Activate Campaign
            </Button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {deadlineDaysLeft !== null && deadlineDaysLeft > 0
            ? `Deadline: ${new Date(deadline!).toLocaleDateString("en-US", { month: "short", day: "numeric" })} (${deadlineDaysLeft} days left)`
            : deadlineDaysLeft !== null && deadlineDaysLeft <= 0
            ? `Deadline passed`
            : ""}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{completedCount} of {totalCount} chargers completed ({pct}%)</span>
          {campaignStatus === "active" && totalDays > 0 && (
            <span className="text-muted-foreground">Day {currentDay} of {totalDays}</span>
          )}
        </div>
        <Progress value={pct} className="h-2" />
      </div>
    </div>
  );
}
