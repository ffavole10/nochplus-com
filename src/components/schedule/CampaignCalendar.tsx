import { useState, useMemo } from "react";
import { Campaign, ScheduleDay, ScheduleItemStatus } from "@/types/campaign";
import { AssessmentCharger } from "@/types/assessment";
import { CalendarDayView } from "./CalendarDayView";
import { CalendarWeekView } from "./CalendarWeekView";
import { CalendarMonthView } from "./CalendarMonthView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";

export type CalendarViewMode = "day" | "week" | "month";

interface CampaignCalendarProps {
  campaign: Campaign | null;
  chargers: AssessmentCharger[];
  onMarkStatus?: (chargerId: string, status: ScheduleItemStatus) => void;
  onSelectCharger?: (charger: AssessmentCharger) => void;
}

export function CampaignCalendar({ campaign, chargers, onMarkStatus, onSelectCharger }: CampaignCalendarProps) {
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const chargerMap = useMemo(() => {
    const m = new Map<string, AssessmentCharger>();
    chargers.forEach(c => m.set(c.id, c));
    return m;
  }, [chargers]);

  // Build a map of date -> ScheduleDay for quick lookup
  const scheduleDayMap = useMemo(() => {
    const m = new Map<string, ScheduleDay>();
    if (campaign) {
      campaign.schedule.forEach(day => m.set(day.date, day));
    }
    return m;
  }, [campaign]);

  const totalScheduled = campaign?.statistics.totalChargers ?? 0;

  const navigate = (direction: -1 | 1) => {
    switch (calendarView) {
      case "day":
        setCurrentDate(prev => direction === 1 ? addDays(prev, 1) : subDays(prev, 1));
        break;
      case "week":
        setCurrentDate(prev => direction === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1));
        break;
      case "month":
        setCurrentDate(prev => direction === 1 ? addMonths(prev, 1) : subMonths(prev, 1));
        break;
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const headerLabel = useMemo(() => {
    switch (calendarView) {
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "week": {
        const start = startOfWeek(currentDate, { weekStartsOn: 0 });
        const end = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
      }
      case "month":
        return format(currentDate, "MMMM yyyy");
    }
  }, [calendarView, currentDate]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-card">
      {/* Calendar Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold text-foreground ml-1">{headerLabel}</h2>
        </div>

        <div className="flex items-center gap-2">
          {totalScheduled > 0 && (
            <Badge variant="secondary" className="text-xs">{totalScheduled} chargers scheduled</Badge>
          )}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["day", "week", "month"] as CalendarViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setCalendarView(v)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  calendarView === v
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto">
        {calendarView === "day" && (
          <CalendarDayView
            date={currentDate}
            scheduleDayMap={scheduleDayMap}
            chargerMap={chargerMap}
            campaign={campaign}
            onMarkStatus={onMarkStatus}
            onSelectCharger={onSelectCharger}
          />
        )}
        {calendarView === "week" && (
          <CalendarWeekView
            currentDate={currentDate}
            scheduleDayMap={scheduleDayMap}
            chargerMap={chargerMap}
            campaign={campaign}
            onMarkStatus={onMarkStatus}
            onSelectCharger={onSelectCharger}
          />
        )}
        {calendarView === "month" && (
          <CalendarMonthView
            currentDate={currentDate}
            scheduleDayMap={scheduleDayMap}
            chargerMap={chargerMap}
            campaign={campaign}
            onSelectCharger={onSelectCharger}
            onDayClick={(date) => {
              setCurrentDate(date);
              setCalendarView("day");
            }}
          />
        )}
      </div>
    </div>
  );
}
