import { useMemo } from "react";
import { Campaign, ScheduleDay } from "@/types/campaign";
import { AssessmentCharger } from "@/types/assessment";
import { CalendarChargerCard } from "./CalendarChargerCard";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday as isTodayFn,
} from "date-fns";

interface CalendarMonthViewProps {
  currentDate: Date;
  scheduleDayMap: Map<string, ScheduleDay>;
  chargerMap: Map<string, AssessmentCharger>;
  campaign: Campaign | null;
  onSelectCharger?: (charger: AssessmentCharger) => void;
  onDayClick?: (date: Date) => void;
}

export function CalendarMonthView({
  currentDate,
  scheduleDayMap,
  chargerMap,
  campaign,
  onSelectCharger,
  onDayClick,
}: CalendarMonthViewProps) {
  const workingDays = campaign?.configuration.workingDays ?? [1, 2, 3, 4, 5];

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const result: Date[][] = [];
    let day = calStart;
    let week: Date[] = [];
    while (day <= calEnd) {
      week.push(day);
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
      day = addDays(day, 1);
    }
    return result;
  }, [currentDate]);

  const DAYS_HEADER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_HEADER.map(d => (
          <div key={d} className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground uppercase border-r border-border/50 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/50 last:border-b-0">
            {week.map(day => {
              const dateStr = format(day, "yyyy-MM-dd");
              const scheduleDay = scheduleDayMap.get(dateStr);
              const sameMonth = isSameMonth(day, currentDate);
              const today = isTodayFn(day);
              const isWorkDay = workingDays.includes(day.getDay());
              const chargerCount = scheduleDay?.chargers.length ?? 0;

              return (
                <div
                  key={dateStr}
                  className={`border-r border-border/50 last:border-r-0 p-1 min-h-[80px] cursor-pointer hover:bg-muted/30 transition-colors ${
                    !sameMonth ? "opacity-40" : ""
                  } ${!isWorkDay ? "bg-muted/20" : ""} ${today ? "bg-primary/5" : ""} ${
                    chargerCount > 0 ? "bg-secondary/5" : ""
                  }`}
                  onClick={() => onDayClick?.(day)}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-medium ${
                      today
                        ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                        : "text-foreground"
                    }`}>
                      {format(day, "d")}
                    </span>
                    {chargerCount > 0 && (
                      <span className="text-[10px] text-muted-foreground">{chargerCount} ch.</span>
                    )}
                  </div>

                  {/* Show first 3 chargers as compact cards */}
                  <div className="space-y-0.5">
                    {scheduleDay?.chargers.slice(0, 3).map(item => (
                      <CalendarChargerCard
                        key={item.chargerId}
                        item={item}
                        charger={chargerMap.get(item.chargerId)}
                        compact
                        onSelectCharger={onSelectCharger}
                      />
                    ))}
                    {chargerCount > 3 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{chargerCount - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
