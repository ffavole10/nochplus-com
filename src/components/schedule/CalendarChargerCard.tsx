import { ScheduleItem, ScheduleItemStatus } from "@/types/campaign";
import { AssessmentCharger } from "@/types/assessment";
import { getPriorityColor } from "@/lib/assessmentParser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Plug, Battery, Play, CheckCircle, Circle } from "lucide-react";

interface CalendarChargerCardProps {
  item: ScheduleItem;
  charger: AssessmentCharger | undefined;
  isActive?: boolean;
  compact?: boolean;
  onMarkStatus?: (chargerId: string, status: ScheduleItemStatus) => void;
  onSelectCharger?: (charger: AssessmentCharger) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  "DC | Level 3": <Zap className="h-3 w-3" />,
  "AC | Level 2": <Plug className="h-3 w-3" />,
};

const STATUS_CONFIG: Record<ScheduleItemStatus, { icon: React.ReactNode; bg: string }> = {
  not_started: { icon: <Circle className="h-3 w-3 text-muted-foreground" />, bg: "" },
  in_progress: { icon: <Play className="h-3 w-3 text-secondary fill-secondary" />, bg: "bg-secondary/5" },
  completed: { icon: <CheckCircle className="h-3 w-3 text-optimal" />, bg: "bg-optimal/5" },
  cancelled: { icon: <Circle className="h-3 w-3 text-critical" />, bg: "bg-critical/5" },
  rescheduled: { icon: <Circle className="h-3 w-3 text-degraded" />, bg: "bg-degraded/5" },
};

export function CalendarChargerCard({
  item,
  charger,
  isActive,
  compact,
  onMarkStatus,
  onSelectCharger,
}: CalendarChargerCardProps) {
  if (!charger) return null;

  const priorityColor = getPriorityColor(charger.priorityLevel);
  const statusCfg = STATUS_CONFIG[item.status];

  if (compact) {
    return (
      <div
        className={`px-1.5 py-1 rounded text-[10px] cursor-pointer hover:opacity-80 transition-opacity truncate ${statusCfg.bg}`}
        style={{ borderLeft: `3px solid ${priorityColor}` }}
        onClick={() => onSelectCharger?.(charger)}
        title={`${charger.assetName} - ${charger.city}, ${charger.state}`}
      >
        <span className="font-medium">{TYPE_ICONS[charger.assetRecordType]}</span>{" "}
        <span>{charger.assetName.split("-").pop()}</span>
      </div>
    );
  }

  return (
    <div
      className={`p-2 rounded-lg border cursor-pointer hover:shadow-sm transition-all text-xs ${statusCfg.bg}`}
      style={{ borderLeft: `3px solid ${priorityColor}` }}
      onClick={() => onSelectCharger?.(charger)}
    >
      <div className="flex items-start gap-1.5">
        {statusCfg.icon}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{charger.assetName}</p>
          <p className="text-[10px] text-muted-foreground truncate">{charger.city}, {charger.state}</p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 gap-0.5">
              {TYPE_ICONS[charger.assetRecordType]}
              {charger.assetRecordType}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              ● {charger.priorityLevel === "Critical" ? "P1" : charger.priorityLevel === "High" ? "P2" : charger.priorityLevel === "Medium" ? "P3" : "P4"} {charger.priorityLevel}
            </span>
            <span className="text-[10px] text-muted-foreground">⏱ {item.estimatedHours}h</span>
          </div>
          {item.assignedTo && (
            <p className="text-[10px] text-muted-foreground mt-0.5">👤 {item.assignedTo}</p>
          )}
        </div>
        {isActive && item.status !== "completed" && onMarkStatus && (
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMarkStatus(item.chargerId, item.status === "not_started" ? "in_progress" : "completed");
            }}
          >
            {item.status === "not_started" ? <Play className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  );
}
