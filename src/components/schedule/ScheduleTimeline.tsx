import { useMemo } from "react";
import { Campaign, ScheduleDay, ScheduleItemStatus } from "@/types/campaign";
import { AssessmentCharger } from "@/types/assessment";
import { getPriorityColor } from "@/lib/assessmentParser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle, Clock, Play, Zap, Plug, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useState } from "react";

interface ScheduleTimelineProps {
  campaign: Campaign;
  chargers: AssessmentCharger[];
  onMarkStatus?: (chargerId: string, status: ScheduleItemStatus) => void;
  onSelectCharger?: (charger: AssessmentCharger) => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_ICONS: Record<ScheduleItemStatus, React.ReactNode> = {
  not_started: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  in_progress: <Play className="h-3.5 w-3.5 text-secondary fill-secondary" />,
  completed: <CheckCircle className="h-3.5 w-3.5 text-optimal" />,
  cancelled: <Circle className="h-3.5 w-3.5 text-critical" />,
  rescheduled: <Clock className="h-3.5 w-3.5 text-degraded" />,
};

export function ScheduleTimeline({ campaign, chargers, onMarkStatus, onSelectCharger }: ScheduleTimelineProps) {
  const [currentWeekView, setCurrentWeekView] = useState(1);

  const chargerMap = useMemo(() => {
    const m = new Map<string, AssessmentCharger>();
    chargers.forEach(c => m.set(c.id, c));
    return m;
  }, [chargers]);

  const weekGroups = useMemo(() => {
    const groups: Record<number, ScheduleDay[]> = {};
    campaign.schedule.forEach(day => {
      if (!groups[day.weekNumber]) groups[day.weekNumber] = [];
      groups[day.weekNumber].push(day);
    });
    return groups;
  }, [campaign.schedule]);

  const weekNumbers = Object.keys(weekGroups).map(Number).sort((a, b) => a - b);
  const totalWeeks = weekNumbers.length;
  const today = new Date().toISOString().split("T")[0];

  const stats = campaign.statistics;
  const completionPct = stats.totalChargers > 0
    ? Math.round((stats.completedChargers / stats.totalChargers) * 100)
    : 0;

  // Show 3 weeks at a time
  const visibleWeeks = weekNumbers.filter(
    w => w >= currentWeekView && w < currentWeekView + 3
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{campaign.name}</h2>
            <p className="text-xs text-muted-foreground">
              {campaign.startDate} → {campaign.endDate} · {totalWeeks} weeks
            </p>
          </div>
          {campaign.status === "active" && (
            <Badge className="bg-optimal text-optimal-foreground">Active</Badge>
          )}
          {campaign.status === "draft" && (
            <Badge variant="secondary">Preview</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Progress value={completionPct} className="flex-1 h-2" />
          <span className="text-sm font-medium text-foreground">{completionPct}%</span>
          <span className="text-xs text-muted-foreground">
            {stats.completedChargers}/{stats.totalChargers} chargers
          </span>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={currentWeekView <= 1}
          onClick={() => setCurrentWeekView(Math.max(1, currentWeekView - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1 overflow-x-auto flex-1">
          {weekNumbers.map(w => (
            <button
              key={w}
              onClick={() => setCurrentWeekView(w)}
              className={`text-xs px-2 py-1 rounded-md whitespace-nowrap transition-colors ${
                visibleWeeks.includes(w)
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              W{w}
            </button>
          ))}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={currentWeekView >= (weekNumbers[weekNumbers.length - 1] || 1)}
          onClick={() => setCurrentWeekView(Math.min(weekNumbers[weekNumbers.length - 1] || 1, currentWeekView + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Columns */}
      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {visibleWeeks.map(weekNum => {
          const days = weekGroups[weekNum] || [];
          const weekCompleted = days.flatMap(d => d.chargers).filter(c => c.status === "completed").length;
          const weekTotal = days.flatMap(d => d.chargers).length;
          const weekPct = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

          return (
            <div key={weekNum} className="flex-1 min-w-[280px] max-w-[400px] flex flex-col rounded-xl border border-border bg-card">
              {/* Week Header */}
              <div className="p-3 border-b border-border/50 bg-muted/30 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Week {weekNum}</h3>
                  <Badge variant="outline" className="text-xs">{weekTotal} chargers</Badge>
                </div>
                {days.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {days[0].date} – {days[days.length - 1].date}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={weekPct} className="flex-1 h-1.5" />
                  <span className="text-xs text-muted-foreground">{weekCompleted}/{weekTotal}</span>
                </div>
              </div>

              {/* Days */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {days.map(day => {
                  const isToday = day.date === today;
                  const isPast = day.date < today;
                  return (
                    <div
                      key={day.date}
                      className={`rounded-lg border p-2 space-y-1.5 ${
                        isToday ? "border-primary bg-primary/5" : isPast ? "opacity-70 border-border/50" : "border-border/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">
                          {SHORT_DAY_NAMES[day.dayOfWeek]}, {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        {isToday && <Badge className="bg-primary text-primary-foreground text-[10px] px-1 py-0">Today</Badge>}
                      </div>

                      {day.chargers.map(item => {
                        const charger = chargerMap.get(item.chargerId);
                        if (!charger) return null;
                        return (
                          <Card
                            key={item.chargerId}
                            className="p-2 cursor-pointer hover:shadow-sm transition-shadow"
                            style={{ borderLeft: `3px solid ${getPriorityColor(charger.priorityLevel)}` }}
                            onClick={() => onSelectCharger?.(charger)}
                          >
                            <div className="flex items-start gap-1.5">
                              {STATUS_ICONS[item.status]}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{charger.assetName}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{charger.city}, {charger.state}</p>
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                    {charger.assetRecordType === "DCFC" ? <Zap className="h-2 w-2 mr-0.5" /> : <Plug className="h-2 w-2 mr-0.5" />}
                                    {charger.assetRecordType}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">{item.estimatedHours}h</span>
                                  {item.assignedTo && (
                                    <span className="text-[10px] text-muted-foreground">· {item.assignedTo}</span>
                                  )}
                                </div>
                              </div>
                              {campaign.status === "active" && item.status !== "completed" && onMarkStatus && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkStatus(
                                      item.chargerId,
                                      item.status === "not_started" ? "in_progress" : "completed"
                                    );
                                  }}
                                >
                                  {item.status === "not_started"
                                    ? <Play className="h-3 w-3" />
                                    : <CheckCircle className="h-3 w-3" />
                                  }
                                </Button>
                              )}
                            </div>
                          </Card>
                        );
                      })}

                      {day.chargers.length === 0 && (
                        <p className="text-[10px] text-muted-foreground text-center py-2">No assessments</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
