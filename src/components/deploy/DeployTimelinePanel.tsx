import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Car, Moon, Coffee, MapPin, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { DeployScheduleResult, DeployTech, GeneratedDay } from "@/lib/deployRouteOptimizer";
import type { Campaign } from "@/hooks/useCampaigns";

interface DeployTimelinePanelProps {
  scheduleResult: DeployScheduleResult | null;
  deployTechs: DeployTech[];
  campaign: Campaign | null | undefined;
  campaignId: string;
}

const DAY_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  work: { label: "Work", color: "bg-primary/10 text-primary border-primary/30", icon: CheckCircle },
  travel: { label: "Travel", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: Plane },
  rest: { label: "Rest", color: "bg-muted text-muted-foreground border-border", icon: Coffee },
  off: { label: "Off", color: "bg-muted/50 text-muted-foreground/60 border-border", icon: Moon },
};

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function DayCard({ day, tech }: { day: GeneratedDay; tech?: DeployTech }) {
  const cfg = DAY_TYPE_CONFIG[day.day_type] || DAY_TYPE_CONFIG.work;
  const Icon = cfg.icon;

  // Group sites by site_name for "×N" display
  const siteGroups: { name: string; count: number; city: string; hours: number }[] = [];
  for (const site of day.sites) {
    const last = siteGroups[siteGroups.length - 1];
    if (last && last.name === site.site_name) {
      last.count++;
      last.hours += site.estimated_hours;
    } else {
      siteGroups.push({ name: site.site_name, count: 1, city: site.address.split(",").slice(-2, -1)[0]?.trim() || "", hours: site.estimated_hours });
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Day header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
        <Badge variant="outline" className={cn("text-[10px] gap-1", cfg.color)}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </Badge>
        <span className="text-xs font-medium">{formatDateShort(day.schedule_date)}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">Day {day.day_number}</span>
        {tech && (
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tech.color }} />
        )}
      </div>

      {/* Day content */}
      <div className="px-3 py-2 space-y-1.5">
        {day.day_type === "rest" && (
          <div className="text-xs text-muted-foreground">Rest Day — {day.overnight_city || "TBD"}</div>
        )}

        {day.day_type === "travel" && day.travel_segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <Plane className="h-3 w-3 text-blue-500 shrink-0" />
            <span>{seg.from_site} → {seg.to_site}</span>
            <span className="text-muted-foreground ml-auto">{seg.duration_hours}h</span>
          </div>
        ))}

        {day.day_type === "work" && (
          <>
            {siteGroups.map((sg, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground shrink-0 w-4 text-right">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">
                    {sg.name}
                    {sg.count > 1 && <span className="text-muted-foreground"> ×{sg.count}</span>}
                  </span>
                  {sg.city && <span className="text-muted-foreground ml-1">— {sg.city}</span>}
                </div>
                <span className="text-muted-foreground shrink-0">{sg.hours}h</span>
              </div>
            ))}

            {/* Drive segments */}
            {day.travel_segments.filter(s => s.mode === "drive" && s.distance_miles > 5).map((seg, i) => (
              <div key={`drive-${i}`} className="flex items-center gap-2 text-[10px] text-muted-foreground pl-6">
                <Car className="h-3 w-3 shrink-0" />
                <span>Drive to {seg.to_site} ({seg.distance_miles} mi, {seg.duration_hours}h)</span>
              </div>
            ))}

            {/* Day footer */}
            <div className="flex items-center justify-between pt-1 border-t mt-2 text-[10px] text-muted-foreground">
              <span>{day.total_work_hours}h work · {day.total_travel_hours}h drive</span>
              {day.overnight_city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {day.overnight_city}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function DeployTimelinePanel({ scheduleResult, deployTechs, campaign, campaignId }: DeployTimelinePanelProps) {
  const navigate = useNavigate();
  const [selectedTech, setSelectedTech] = useState<string>("all");

  const filteredDays = useMemo(() => {
    if (!scheduleResult) return [];
    if (selectedTech === "all") return scheduleResult.days.sort((a, b) => a.schedule_date.localeCompare(b.schedule_date));
    return scheduleResult.days.filter(d => d.technician_id === selectedTech);
  }, [scheduleResult, selectedTech]);

  const summary = useMemo(() => {
    if (!scheduleResult || scheduleResult.days.length === 0) return null;
    const workDays = scheduleResult.days.filter(d => d.day_type === "work");
    const travelDays = scheduleResult.days.filter(d => d.day_type === "travel");
    const restDays = scheduleResult.days.filter(d => d.day_type === "rest");
    const totalChargers = workDays.reduce((s, d) => s + d.sites.length, 0);

    let deadlineCheck: { ok: boolean; message: string } | null = null;
    if (campaign?.deadline && scheduleResult.end_date) {
      const endD = new Date(scheduleResult.end_date);
      const dlD = new Date(campaign.deadline);
      const diff = Math.ceil((dlD.getTime() - endD.getTime()) / 86400000);
      if (diff >= 0) {
        deadlineCheck = { ok: true, message: `Completes ${scheduleResult.end_date} — ${diff} days before deadline` };
      } else {
        deadlineCheck = { ok: false, message: `Extends to ${scheduleResult.end_date} — ${Math.abs(diff)} days past deadline` };
      }
    }

    return {
      totalDays: scheduleResult.days.length,
      workDays: workDays.length,
      travelDays: travelDays.length,
      restDays: restDays.length,
      totalChargers,
      deadlineCheck,
    };
  }, [scheduleResult, campaign]);

  if (!scheduleResult || scheduleResult.days.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <MapPin className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Configure technicians and generate a route to see the deployment itinerary.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Tech tabs */}
      <div className="px-3 py-2 border-b">
        <div className="flex gap-1 overflow-x-auto">
          <button
            className={cn(
              "px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap",
              selectedTech === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
            onClick={() => setSelectedTech("all")}
          >
            All
          </button>
          {deployTechs.map(t => (
            <button
              key={t.technician_id}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap flex items-center gap-1",
                selectedTech === t.technician_id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
              onClick={() => setSelectedTech(t.technician_id)}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredDays.map((day, i) => (
            <DayCard
              key={`${day.technician_id}-${day.schedule_date}-${i}`}
              day={day}
              tech={deployTechs.find(t => t.technician_id === day.technician_id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Summary + continue */}
      {summary && (
        <div className="p-3 border-t space-y-2">
          <div className="grid grid-cols-4 gap-1 text-center">
            <div className="bg-muted/50 rounded p-1">
              <div className="text-sm font-bold">{summary.totalDays}</div>
              <div className="text-[9px] text-muted-foreground">Total</div>
            </div>
            <div className="bg-primary/5 rounded p-1">
              <div className="text-sm font-bold text-primary">{summary.workDays}</div>
              <div className="text-[9px] text-muted-foreground">Work</div>
            </div>
            <div className="bg-blue-500/5 rounded p-1">
              <div className="text-sm font-bold text-blue-600">{summary.travelDays}</div>
              <div className="text-[9px] text-muted-foreground">Travel</div>
            </div>
            <div className="bg-muted/50 rounded p-1">
              <div className="text-sm font-bold">{summary.restDays}</div>
              <div className="text-[9px] text-muted-foreground">Rest</div>
            </div>
          </div>

          {summary.deadlineCheck && (
            <div className={cn(
              "flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded",
              summary.deadlineCheck.ok
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            )}>
              {summary.deadlineCheck.ok ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {summary.deadlineCheck.message}
            </div>
          )}

          {scheduleResult.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              {w}
            </div>
          ))}

          <Button
            className="w-full gap-2"
            onClick={() => navigate(`/campaigns/${campaignId}/price`)}
          >
            Continue to Price <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
