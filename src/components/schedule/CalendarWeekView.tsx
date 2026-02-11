import { useMemo } from "react";
import { Campaign, ScheduleDay, ScheduleItemStatus } from "@/types/campaign";
import { AssessmentCharger } from "@/types/assessment";
import { CalendarChargerCard } from "./CalendarChargerCard";
import { format, startOfWeek, addDays, isToday as isTodayFn, isSameDay } from "date-fns";

interface CalendarWeekViewProps {
  currentDate: Date;
  scheduleDayMap: Map<string, ScheduleDay>;
  chargerMap: Map<string, AssessmentCharger>;
  campaign: Campaign | null;
  onMarkStatus?: (chargerId: string, status: ScheduleItemStatus) => void;
  onSelectCharger?: (charger: AssessmentCharger) => void;
}

export function CalendarWeekView({
  currentDate,
  scheduleDayMap,
  chargerMap,
  campaign,
  onMarkStatus,
  onSelectCharger,
}: CalendarWeekViewProps) {
  const isActive = campaign?.status === "active";
  const workingDays = campaign?.configuration.workingDays ?? [1, 2, 3, 4, 5];

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  return (
    <div className="h-full flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map(day => {
          const today = isTodayFn(day);
          const dayOfWeek = day.getDay();
          const isWorkDay = workingDays.includes(dayOfWeek);

          return (
            <div
              key={day.toISOString()}
              className={`px-2 py-2 text-center border-r border-border/50 last:border-r-0 ${
                !isWorkDay ? "bg-muted/30" : ""
              }`}
            >
              <p className="text-[11px] text-muted-foreground uppercase">{format(day, "EEE")}</p>
              <p className={`text-lg font-semibold mt-0.5 ${
                today
                  ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                  : ""
              }`}>
                {format(day, "d")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Day columns */}
      <div className="flex-1 grid grid-cols-7 overflow-y-auto">
        {weekDays.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const scheduleDay = scheduleDayMap.get(dateStr);
          const dayOfWeek = day.getDay();
          const isWorkDay = workingDays.includes(dayOfWeek);
          const today = isTodayFn(day);

          return (
            <div
              key={day.toISOString()}
              className={`border-r border-border/50 last:border-r-0 p-1 space-y-1 ${
                !isWorkDay ? "bg-muted/20" : ""
              } ${today ? "bg-primary/5" : ""}`}
            >
              {scheduleDay?.chargers.map(item => (
                <CalendarChargerCard
                  key={item.chargerId}
                  item={item}
                  charger={chargerMap.get(item.chargerId)}
                  isActive={isActive}
                  onMarkStatus={onMarkStatus}
                  onSelectCharger={onSelectCharger}
                />
              ))}
              {!isWorkDay && !scheduleDay && (
                <p className="text-[10px] text-muted-foreground text-center py-4">No work</p>
              )}
              {isWorkDay && !scheduleDay && (
                <p className="text-[10px] text-muted-foreground text-center py-4">—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
