import { TechScheduleSummary } from "@/lib/routeOptimizer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, BarChart3, Plane, Car, Clock, Users, AlertTriangle } from "lucide-react";

interface ScheduleSummaryPanelProps {
  summaries: TechScheduleSummary[];
  warnings: string[];
  startDate: string;
  endDate: string;
  totalDays: number;
}

export function ScheduleSummaryPanel({ summaries, warnings, startDate, endDate, totalDays }: ScheduleSummaryPanelProps) {
  if (summaries.length === 0) return null;

  const totalChargers = summaries.reduce((s, t) => s + t.total_chargers, 0);
  const totalWorkHours = summaries.reduce((s, t) => s + t.total_work_hours, 0);
  const totalFlights = summaries.reduce((s, t) => s + t.total_flights, 0);
  const totalDriveMiles = summaries.reduce((s, t) => s + t.total_drive_miles, 0);
  const totalDriveHours = summaries.reduce((s, t) => s + t.total_drive_hours, 0);
  const totalCost = summaries.reduce((s, t) => s + t.estimated_cost, 0);

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground w-full">
        <BarChart3 className="h-3.5 w-3.5" /> Schedule Summary
        <ChevronDown className="h-3 w-3 ml-auto" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-3">
          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-1">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-degraded">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Overall */}
          <div className="text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Campaign Duration</span>
              <span className="font-medium">{startDate} → {endDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Days</span>
              <span className="font-medium">{totalDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Chargers</span>
              <span className="font-medium">{totalChargers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Work Hours</span>
              <span className="font-medium">{totalWorkHours}h</span>
            </div>
          </div>

          <Separator />

          {/* Travel Summary */}
          <div className="text-[11px] space-y-1">
            <p className="font-medium text-foreground flex items-center gap-1">
              <Car className="h-3 w-3" /> Travel
            </p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Flights</span>
              <span className="font-medium">{totalFlights}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Drive Miles</span>
              <span className="font-medium">{totalDriveMiles.toLocaleString()} mi</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Drive Hours</span>
              <span className="font-medium">{totalDriveHours}h</span>
            </div>
          </div>

          <Separator />

          {/* Per Technician */}
          <div className="text-[11px] space-y-2">
            <p className="font-medium text-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Per Technician
            </p>
            {summaries.map(tech => (
              <div key={tech.technician_id} className="p-2 rounded bg-background border border-border/50 space-y-0.5">
                <p className="font-medium text-foreground">{tech.technician_name}</p>
                <div className="grid grid-cols-2 gap-x-3 text-[10px] text-muted-foreground">
                  <span>Work: {tech.total_work_days}d</span>
                  <span>Travel: {tech.total_travel_days}d</span>
                  <span>Rest: {tech.total_rest_days}d</span>
                  <span>Chargers: {tech.total_chargers}</span>
                  <span>Hours: {tech.total_work_hours}h</span>
                  <span>Drive: {tech.total_drive_miles} mi</span>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Cost Preview */}
          <div className="text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Travel Cost</span>
              <span className="font-semibold text-foreground">${totalCost.toLocaleString()}</span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5 italic">Estimate — see Quote for detailed pricing</p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
