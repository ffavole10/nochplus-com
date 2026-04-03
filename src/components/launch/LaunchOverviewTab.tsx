import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import type { CampaignChargerRow } from "@/hooks/useCampaignChargers";

interface ScheduleDay {
  id: string;
  technician_id: string;
  schedule_date: string;
  day_type: string;
  sites: any;
  total_work_hours: number;
}

interface Tech {
  technician_id: string;
  name: string;
  color: string;
  home_base_city: string;
}

interface Props {
  chargers: CampaignChargerRow[];
  scheduleDays: ScheduleDay[];
  techs: Tech[];
  campaignStatus: string;
}

export function LaunchOverviewTab({ chargers, scheduleDays, techs, campaignStatus }: Props) {
  const inScope = chargers.filter(c => c.in_scope);
  const completed = inScope.filter(c => c.status === "completed");
  const skipped = inScope.filter(c => c.status === "skipped");
  const inProgress = inScope.filter(c => c.status === "in_progress");
  const pending = inScope.filter(c => !["completed", "skipped", "in_progress"].includes(c.status));

  const today = new Date().toISOString().split("T")[0];
  const todaySchedule = scheduleDays.filter(d => d.schedule_date === today);

  const chargersByStatus = useMemo(() => {
    const map: Record<string, { color: string; label: string; count: number }> = {
      completed: { color: "bg-green-500", label: "Completed", count: completed.length },
      in_progress: { color: "bg-blue-500", label: "In Progress", count: inProgress.length },
      skipped: { color: "bg-red-500", label: "Skipped", count: skipped.length },
      pending: { color: "bg-muted", label: "Pending", count: pending.length },
    };
    return map;
  }, [completed, inProgress, skipped, pending]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Map Panel */}
      <div className="lg:col-span-3">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Campaign Progress Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] rounded-lg bg-muted/30 border flex items-center justify-center">
              <div className="text-center space-y-3">
                <MapPin className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {inScope.length} chargers across {new Set(inScope.map(c => c.state).filter(Boolean)).size} states
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {Object.entries(chargersByStatus).map(([key, v]) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs">
                      <span className={`h-2.5 w-2.5 rounded-full ${v.color}`} />
                      {v.label}: {v.count}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule Panel */}
      <div className="lg:col-span-2 space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaignStatus !== "active" ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Campaign is not active yet.
              </p>
            ) : todaySchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No scheduled activities today.
              </p>
            ) : (
              todaySchedule.map(day => {
                const tech = techs.find(t => t.technician_id === day.technician_id);
                const sites = Array.isArray(day.sites) ? day.sites : [];
                return (
                  <div key={day.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: tech?.color || "#888" }} />
                      <span className="font-medium text-sm">{tech?.name || "Unknown"}</span>
                      <Badge variant="outline" className="text-xs ml-auto">{day.day_type}</Badge>
                    </div>
                    {sites.map((site: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground pl-5">
                        <span className="mt-0.5">○</span>
                        <span>{site.site_name || site.name || `Site ${i + 1}`} — {site.charger_count || 1} charger(s)</span>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground pl-5">
                      {day.total_work_hours}h work
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Campaign Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Campaign Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Completed</div>
                <div className="font-semibold text-green-500 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> {completed.length}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Remaining</div>
                <div className="font-semibold">{pending.length + inProgress.length}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Skipped</div>
                <div className="font-semibold text-red-400">{skipped.length}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Total Sites</div>
                <div className="font-semibold">
                  {new Set(inScope.map(c => c.site_name).filter(Boolean)).size}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pre-Launch Checklist */}
        {campaignStatus === "pre-launch" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" /> Launch Readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ChecklistItem done={inScope.length > 0} label={`Dataset uploaded (${inScope.length} chargers)`} />
              <ChecklistItem done={inScope.every(c => c.priority && c.priority !== "unset")} label="Triage complete" />
              <ChecklistItem done={scheduleDays.length > 0} label={`Schedule generated (${scheduleDays.length} days)`} />
              <ChecklistItem done={false} label="Quote accepted by customer" />
              <ChecklistItem done={false} label="Site access contacts received" />
              <ChecklistItem done={false} label="Operator credentials confirmed" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
      )}
      <span className={done ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
