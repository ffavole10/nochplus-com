import { useMemo } from "react";
import { Campaign, ScheduleDay, ScheduleItemStatus } from "@/types/campaign";
import { AssessmentCharger } from "@/types/assessment";
import { CalendarChargerCard } from "./CalendarChargerCard";
import { format, isToday as isTodayFn } from "date-fns";

interface CalendarDayViewProps {
  date: Date;
  scheduleDayMap: Map<string, ScheduleDay>;
  chargerMap: Map<string, AssessmentCharger>;
  campaign: Campaign | null;
  onMarkStatus?: (chargerId: string, status: ScheduleItemStatus) => void;
  onSelectCharger?: (charger: AssessmentCharger) => void;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 7); // 7 AM to 5 PM

export function CalendarDayView({
  date,
  scheduleDayMap,
  chargerMap,
  campaign,
  onMarkStatus,
  onSelectCharger,
}: CalendarDayViewProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const scheduleDay = scheduleDayMap.get(dateStr);
  const isActive = campaign?.status === "active";
  const today = isTodayFn(date);
  const hoursPerCharger = campaign?.configuration.hoursPerCharger ?? 2;

  // Distribute chargers across time slots
  const timeSlots = useMemo(() => {
    if (!scheduleDay) return new Map<number, typeof scheduleDay.chargers>();
    const slots = new Map<number, typeof scheduleDay.chargers>();
    let currentHour = 8; // Start at 8 AM
    const breakStart = 12; // noon break
    const breakDuration = campaign?.configuration.breakTime ?? 1;

    for (const item of scheduleDay.chargers) {
      if (currentHour === breakStart) {
        currentHour += breakDuration;
      }
      const hour = Math.floor(currentHour);
      if (!slots.has(hour)) slots.set(hour, []);
      slots.get(hour)!.push(item);
      currentHour += hoursPerCharger;
    }
    return slots;
  }, [scheduleDay, hoursPerCharger, campaign]);

  const totalHours = scheduleDay ? scheduleDay.chargers.reduce((s, c) => s + c.estimatedHours, 0) : 0;
  const breakTime = campaign?.configuration.breakTime ?? 1;
  const capacity = campaign?.configuration.workingHoursPerDay ?? 8;

  return (
    <div className="h-full flex flex-col">
      {/* Day header */}
      <div className={`px-4 py-2 border-b border-border flex items-center justify-between ${today ? "bg-primary/5" : ""}`}>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${today ? "bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center" : ""}`}>
            {format(date, "d")}
          </span>
          <div>
            <p className="text-sm font-medium">{format(date, "EEEE")}</p>
            <p className="text-xs text-muted-foreground">{format(date, "MMMM yyyy")}</p>
          </div>
        </div>
        {scheduleDay && (
          <div className="text-right text-xs text-muted-foreground">
            <p>{scheduleDay.chargers.length} chargers</p>
            <p>{totalHours}h scheduled + {breakTime}h break = {totalHours + breakTime}h / {capacity}h capacity</p>
          </div>
        )}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {HOURS.map(hour => {
            const items = timeSlots.get(hour) || [];
            const isBreak = hour === 12;

            return (
              <div key={hour} className="flex border-b border-border/50 min-h-[72px]">
                {/* Time label */}
                <div className="w-16 shrink-0 px-2 py-1 text-[11px] text-muted-foreground text-right border-r border-border/50">
                  {hour === 12 ? "noon" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>

                {/* Content */}
                <div className="flex-1 p-1">
                  {isBreak && items.length === 0 && (
                    <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground text-center">
                      Break / Lunch
                    </div>
                  )}
                  <div className="space-y-1">
                    {items.map(item => (
                      <CalendarChargerCard
                        key={item.chargerId}
                        item={item}
                        charger={chargerMap.get(item.chargerId)}
                        isActive={isActive}
                        onMarkStatus={onMarkStatus}
                        onSelectCharger={onSelectCharger}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
