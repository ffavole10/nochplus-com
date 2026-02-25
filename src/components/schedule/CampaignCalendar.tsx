import { useState, useMemo } from "react";
import { Campaign, ScheduleDay, ScheduleItemStatus } from "@/types/campaign";
import { AssessmentCharger } from "@/types/assessment";
import { CalendarDayView } from "./CalendarDayView";
import { CalendarWeekView } from "./CalendarWeekView";
import { CalendarMonthView } from "./CalendarMonthView";
import { ChargerMapPanel, CityCluster } from "./ChargerMapPanel";
import { MapSchedulePanel } from "./MapSchedulePanel";
import { CapacityDashboard } from "./CapacityDashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Map as MapIcon, BarChart3 } from "lucide-react";
import { Region } from "@/lib/regionMapping";
import {
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  format,
} from "date-fns";

export type CalendarViewMode = "day" | "week" | "month" | "map" | "capacity";

interface CampaignCalendarProps {
  campaign: Campaign | null;
  chargers: AssessmentCharger[];
  onMarkStatus?: (chargerId: string, status: ScheduleItemStatus) => void;
  onSelectCharger?: (charger: AssessmentCharger) => void;
}

export function CampaignCalendar({ campaign, chargers, onMarkStatus, onSelectCharger }: CampaignCalendarProps) {
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCluster, setSelectedCluster] = useState<CityCluster | null>(null);

  const chargerMap = useMemo(() => {
    const m = new Map<string, AssessmentCharger>();
    chargers.forEach(c => m.set(c.id, c));
    return m;
  }, [chargers]);

  const scheduleDayMap = useMemo(() => {
    const m = new Map<string, ScheduleDay>();
    if (campaign) {
      campaign.schedule.forEach(day => m.set(day.date, day));
    }
    return m;
  }, [campaign]);

  const totalScheduled = campaign?.statistics.totalChargers ?? 0;

  const navigate = (direction: -1 | 1) => {
    const calView = calendarView === "map" ? "week" : calendarView;
    switch (calView) {
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
    if (calendarView === "map") return "Map View";
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

  const isMapView = calendarView === "map";
  const isCapacityView = calendarView === "capacity";
  const viewModes: CalendarViewMode[] = ["day", "week", "month", "map", "capacity"];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-card">
      {/* Calendar Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {!isMapView && !isCapacityView && (
            <>
              <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <h2 className="text-sm font-semibold text-foreground ml-1">
            {isCapacityView ? "Regional Capacity" : headerLabel}
          </h2>
          {isMapView && (
            <Badge variant="secondary" className="text-xs">{chargers.length} chargers</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isMapView && totalScheduled > 0 && (
            <Badge variant="secondary" className="text-xs">{totalScheduled} chargers scheduled</Badge>
          )}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {viewModes.map(v => (
              <button
                key={v}
                onClick={() => {
                  setCalendarView(v);
                  if (v !== "map") setSelectedCluster(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors flex items-center gap-1 ${
                  calendarView === v
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {v === "map" && <MapIcon className="h-3 w-3" />}
                {v === "capacity" && <BarChart3 className="h-3 w-3" />}
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isCapacityView ? (
          <CapacityDashboard
            chargers={chargers}
            campaign={campaign}
            onSwitchToCluster={(region?: Region) => {
              setCalendarView("map");
              // Could pass region filter in future
            }}
          />
        ) : isMapView ? (
          <div className="flex h-full">
            <div className="w-[60%] h-full border-r border-border">
              <ChargerMapPanel
                chargers={chargers}
                selectedClusterKey={selectedCluster?.key || null}
                onSelectCluster={setSelectedCluster}
              />
            </div>
            <div className="w-[40%] h-full flex flex-col">
              <MapSchedulePanel
                selectedCluster={selectedCluster}
                allChargers={chargers}
                hoursPerCharger={campaign?.configuration.hoursPerCharger || 2}
              />
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
