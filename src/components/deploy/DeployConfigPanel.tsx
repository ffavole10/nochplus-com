import { useState, useCallback, useRef } from "react";
import { Calendar, Clock, Coffee, Timer, Users, X, ChevronDown, ChevronRight, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/hooks/useCampaigns";
import type { Technician } from "@/hooks/useTechnicians";
import type { DeployTech } from "@/lib/deployRouteOptimizer";

interface DeployConfigPanelProps {
  campaign: Campaign | null | undefined;
  allTechs: Technician[];
  assignedTechIds: string[];
  techAirports: Record<string, string>;
  deployTechs: DeployTech[];
  regionCounts: Map<string, string[]>;
  regionAssignment: Record<string, string[]>;
  unassignedCount: number;
  onAssignTechs: (ids: string[]) => void;
  onRemoveTech: (id: string) => void;
  onAirportChange: (techId: string, airport: string) => void;
  onRegionToggle: (techId: string, region: string) => void;
  onConfigSave: (field: string, value: any) => void;
  onGenerate: () => void;
  generating: boolean;
  hasGenerated: boolean;
  canGenerate: boolean;
}

const DAY_KEYS = [
  { key: "sun", label: "S" }, { key: "mon", label: "M" }, { key: "tue", label: "T" },
  { key: "wed", label: "W" }, { key: "thu", label: "T" }, { key: "fri", label: "F" },
  { key: "sat", label: "S" },
];

export function DeployConfigPanel({
  campaign, allTechs, assignedTechIds, techAirports, deployTechs,
  regionCounts, regionAssignment, unassignedCount,
  onAssignTechs, onRemoveTech, onAirportChange, onRegionToggle,
  onConfigSave, onGenerate, generating, hasGenerated, canGenerate,
}: DeployConfigPanelProps) {
  const [configOpen, setConfigOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(true);
  const saveTimerRef = useRef<NodeJS.Timeout>();

  const debouncedSave = useCallback((field: string, value: any) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => onConfigSave(field, value), 1000);
  }, [onConfigSave]);

  const workingDays = (campaign?.working_days as string[]) || ["mon", "tue", "wed", "thu", "fri"];
  const availableHrs = (campaign?.hrs_per_day || 8) - (campaign?.break_hrs || 1);
  const chargersPerDay = Math.floor(availableHrs / (campaign?.hrs_per_charger || 2));

  // Regions already taken by other techs
  const regionTaken = (techId: string, region: string) => {
    for (const [tid, regions] of Object.entries(regionAssignment)) {
      if (tid !== techId && regions.includes(region)) return tid;
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Campaign Config */}
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs font-semibold uppercase tracking-wider hover:text-foreground">
            {configOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Campaign Config
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Start Date</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  defaultValue={campaign?.start_date || ""}
                  onChange={e => debouncedSave("start_date", e.target.value || null)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Deadline</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  defaultValue={campaign?.deadline || ""}
                  onChange={e => debouncedSave("deadline", e.target.value || null)}
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground">Working Days</Label>
              <div className="flex gap-1 mt-1">
                {DAY_KEYS.map(d => (
                  <button
                    key={d.key}
                    className={cn(
                      "w-7 h-7 rounded-full text-[10px] font-bold border transition-colors",
                      workingDays.includes(d.key)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                    onClick={() => {
                      const next = workingDays.includes(d.key)
                        ? workingDays.filter(k => k !== d.key)
                        : [...workingDays, d.key];
                      onConfigSave("working_days", next);
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Hrs/Charger
                </Label>
                <Input
                  type="number" step="0.5" min="0.5" max="12"
                  className="h-8 text-xs"
                  defaultValue={campaign?.hrs_per_charger || 2}
                  onChange={e => debouncedSave("hrs_per_charger", parseFloat(e.target.value) || 2)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Timer className="h-3 w-3" /> Hrs/Day
                </Label>
                <Input
                  type="number" step="0.5" min="4" max="16"
                  className="h-8 text-xs"
                  defaultValue={campaign?.hrs_per_day || 8}
                  onChange={e => debouncedSave("hrs_per_day", parseFloat(e.target.value) || 8)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Coffee className="h-3 w-3" /> Break (hrs)
                </Label>
                <Input
                  type="number" step="0.5" min="0" max="4"
                  className="h-8 text-xs"
                  defaultValue={campaign?.break_hrs || 1}
                  onChange={e => debouncedSave("break_hrs", parseFloat(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Travel (min)
                </Label>
                <Input
                  type="number" step="5" min="0" max="120"
                  className="h-8 text-xs"
                  defaultValue={campaign?.travel_time_min || 15}
                  onChange={e => debouncedSave("travel_time_min", parseInt(e.target.value) || 15)}
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-md p-2 text-[10px] text-muted-foreground">
              {campaign?.hrs_per_day || 8}h - {campaign?.break_hrs || 1}h break = {availableHrs}h available → <strong>{chargersPerDay} chargers/day</strong>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Team Assignment */}
        <Collapsible open={teamOpen} onOpenChange={setTeamOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs font-semibold uppercase tracking-wider hover:text-foreground">
            {teamOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Users className="h-3 w-3" /> Team Assignment
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            <Select
              value=""
              onValueChange={v => {
                if (!assignedTechIds.includes(v)) {
                  onAssignTechs([...assignedTechIds, v]);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Add technician..." />
              </SelectTrigger>
              <SelectContent>
                {allTechs.filter(t => t.active && !assignedTechIds.includes(t.id)).map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.first_name} {t.last_name} — {t.home_base_city}, {t.home_base_state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tech cards */}
            {deployTechs.map(tech => (
              <div key={tech.technician_id} className="border rounded-lg p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tech.color }} />
                  <span className="text-xs font-medium flex-1 truncate">{tech.name}</span>
                  <button onClick={() => onRemoveTech(tech.technician_id)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-[10px] text-muted-foreground">{tech.home_base_city}</div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Airport Code</Label>
                  <Input
                    className="h-7 text-xs uppercase"
                    placeholder="e.g. DAL"
                    defaultValue={tech.home_base_airport || ""}
                    maxLength={4}
                    onChange={e => onAirportChange(tech.technician_id, e.target.value.toUpperCase())}
                  />
                </div>

                {/* Region assignment */}
                <div>
                  <Label className="text-[10px] text-muted-foreground">Regions</Label>
                  <div className="space-y-1 mt-1 max-h-40 overflow-y-auto">
                    {Array.from(regionCounts.entries()).map(([region, ids]) => {
                      const takenBy = regionTaken(tech.technician_id, region);
                      const isChecked = (regionAssignment[tech.technician_id] || []).includes(region);
                      const takenTech = takenBy ? deployTechs.find(t => t.technician_id === takenBy) : null;
                      return (
                        <label key={region} className={cn(
                          "flex items-center gap-2 text-[11px] cursor-pointer",
                          takenBy && !isChecked && "opacity-40"
                        )}>
                          <Checkbox
                            checked={isChecked}
                            disabled={!!takenBy && !isChecked}
                            onCheckedChange={() => onRegionToggle(tech.technician_id, region)}
                          />
                          <span className="flex-1">{region}</span>
                          <span className="text-muted-foreground">({ids.length})</span>
                          {takenTech && !isChecked && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: takenTech.color }} />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {unassignedCount > 0 && (
              <div className="text-xs text-destructive font-medium text-center py-1">
                {unassignedCount} chargers unassigned
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Generate button */}
      <div className="p-3 border-t">
        <Button
          className="w-full gap-2"
          disabled={!canGenerate || generating}
          onClick={onGenerate}
          variant={hasGenerated ? "outline" : "default"}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Optimizing routes...
            </>
          ) : hasGenerated ? (
            "Re-generate Route"
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              Generate Route
            </>
          )}
        </Button>
        {!canGenerate && assignedTechIds.length > 0 && unassignedCount > 0 && (
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            Assign all chargers to technicians first
          </p>
        )}
      </div>
    </div>
  );
}
