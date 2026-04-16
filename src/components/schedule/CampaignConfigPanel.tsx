import { useState, useMemo } from "react";
import { useTechnicians } from "@/hooks/useTechnicians";
import { CampaignConfig, DEFAULT_CONFIG, SortMethod } from "@/types/campaign";
import { PriorityLevel, ChargerType, AssessmentCharger } from "@/types/assessment";
import { getChargerSchedulePriority, SchedulePriority } from "@/lib/ticketPriority";
import { getRegion, ALL_REGIONS, REGION_COLORS, Region } from "@/lib/regionMapping";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings2, Users, Calendar, Clock, Filter, Plus, Minus, ChevronDown, Zap, Plug, Battery, BarChart3, MapPin, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CampaignConfigPanelProps {
  chargers: AssessmentCharger[];
  config: CampaignConfig;
  onChange: (config: CampaignConfig) => void;
}


const ALL_PRIORITIES: PriorityLevel[] = ["Critical", "High", "Medium", "Low"];
const ALL_TYPES: ChargerType[] = ["AC | Level 2", "DC | Level 3"];
const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  Critical: "bg-critical/10 text-critical border-critical/30",
  High: "bg-degraded/10 text-degraded border-degraded/30",
  Medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  Low: "bg-optimal/10 text-optimal border-optimal/30",
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  Critical: "P1 Critical",
  High: "P2 High",
  Medium: "P3 Medium",
  Low: "P4 Low",
};

type SchedulePriority = "P1-Critical" | "P2-High" | "P3-Medium" | "P4-Low" | "Optimal";

const SCHEDULE_PRIORITY_CONFIG: Record<SchedulePriority, { color: string; bg: string; dotColor: string }> = {
  "P1-Critical": { color: "text-critical", bg: "bg-critical/10 text-critical border-critical/30", dotColor: "hsl(var(--critical))" },
  "P2-High": { color: "text-orange-500", bg: "bg-degraded/10 text-degraded border-degraded/30", dotColor: "hsl(var(--degraded))" },
  "P3-Medium": { color: "text-yellow-500", bg: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", dotColor: "#eab308" },
  "P4-Low": { color: "text-optimal", bg: "bg-optimal/10 text-optimal border-optimal/30", dotColor: "hsl(var(--optimal))" },
  "Optimal": { color: "text-blue-500", bg: "bg-blue-500/10 text-blue-600 border-blue-500/30", dotColor: "hsl(210, 80%, 55%)" },
};

const SCHEDULE_PRIORITY_LABELS: Record<SchedulePriority, string> = {
  "P1-Critical": "P1 Critical",
  "P2-High": "P2 High",
  "P3-Medium": "P3 Medium",
  "P4-Low": "P4 Low",
  "Optimal": "Optimal",
};

const ALL_SCHEDULE_PRIORITIES: SchedulePriority[] = ["P1-Critical", "P2-High", "P3-Medium", "P4-Low", "Optimal"];

const TYPE_ICONS: Record<ChargerType, React.ReactNode> = {
  "AC | Level 2": <Plug className="h-3 w-3" />,
  "DC | Level 3": <Zap className="h-3 w-3" />,
};

export function CampaignConfigPanel({ chargers, config, onChange }: CampaignConfigPanelProps) {
  const includeOptimal = config.includeOptimal !== false;
  const { data: dbTechnicians = [] } = useTechnicians();

  const update = (partial: Partial<CampaignConfig>) => onChange({ ...config, ...partial });

  const toggleDay = (day: number) => {
    const days = config.workingDays.includes(day)
      ? config.workingDays.filter(d => d !== day)
      : [...config.workingDays, day].sort();
    if (days.length === 0) return;
    update({ workingDays: days });
  };


  const togglePriority = (priority: PriorityLevel) => {
    const priorities = config.includePriorities.includes(priority)
      ? config.includePriorities.filter(p => p !== priority)
      : [...config.includePriorities, priority];
    update({ includePriorities: priorities });
  };

  // Map schedule priority keys to underlying PriorityLevel for filtering
  const SCHEDULE_TO_PRIORITY: Record<SchedulePriority, PriorityLevel | null> = {
    "P1-Critical": "Critical",
    "P2-High": "High",
    "P3-Medium": "Medium",
    "P4-Low": "Low",
    "Optimal": null, // Optimal chargers don't have a matching priority filter
  };

  const toggleSchedulePriority = (sp: SchedulePriority) => {
    if (sp === "Optimal") {
      update({ includeOptimal: !includeOptimal });
      return;
    }
    const pl = SCHEDULE_TO_PRIORITY[sp];
    if (pl) togglePriority(pl);
  };

  const isSchedulePriorityChecked = (sp: SchedulePriority): boolean => {
    if (sp === "Optimal") return includeOptimal;
    const pl = SCHEDULE_TO_PRIORITY[sp];
    if (!pl) return true;
    return config.includePriorities.includes(pl);
  };

  const toggleType = (type: ChargerType) => {
    const types = config.includeTypes.includes(type)
      ? config.includeTypes.filter(t => t !== type)
      : [...config.includeTypes, type];
    update({ includeTypes: types });
  };

  const addTechnician = (name: string) => {
    if (!name || config.technicians.includes(name)) return;
    update({ technicians: [...config.technicians, name] });
  };

  const removeTechnician = (index: number) => {
    update({ technicians: config.technicians.filter((_, i) => i !== index) });
  };

  // Available technicians not yet added
  const availableTechnicians = useMemo(() => {
    return dbTechnicians
      .filter(t => t.active)
      .filter(t => !config.technicians.includes(`${t.first_name} ${t.last_name}`));
  }, [dbTechnicians, config.technicians]);

  // Helper: classify a charger into SchedulePriority
  const getSchedulePriority = (c: AssessmentCharger): SchedulePriority => {
    const hasTicket = !!(c.ticketId || c.ticketCreatedDate);
    if (!hasTicket) return "Optimal";
    return classifyTicketPriority(c);
  };

  // Computed metrics — custom filtering by type + priority + region
  const selected = useMemo(() => {
    return chargers.filter(c => {
      if (!config.includeTypes.includes(c.assetRecordType)) return false;
      // Region filter
      if (config.includeRegions.length > 0) {
        const region = getRegion(c.city, c.state);
        if (!config.includeRegions.includes(region)) return false;
      }
      const sp = getSchedulePriority(c);
      if (sp === "Optimal") return includeOptimal;
      const pl = SCHEDULE_TO_PRIORITY[sp];
      if (pl && !config.includePriorities.includes(pl)) return false;
      return true;
    });
  }, [chargers, config.includeTypes, config.includePriorities, config.includeRegions, includeOptimal]);
  const selectedCount = selected.length;
  const effectiveHours = config.workingHoursPerDay - config.breakTime;
  const chargersPerDay = Math.max(1, Math.floor(effectiveHours / (config.hoursPerCharger + config.travelBuffer)));
  const totalPerDay = chargersPerDay * Math.max(1, config.technicians.length);
  const estimatedDays = Math.ceil(selectedCount / totalPerDay);
  const estimatedWeeks = Math.ceil(estimatedDays / config.workingDays.length);
  const totalHours = selectedCount * config.hoursPerCharger;

  // Count chargers by type and priority from selection
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { "AC | Level 2": 0, "DC | Level 3": 0 };
    selected.forEach(c => counts[c.assetRecordType]++);
    return counts;
  }, [selected]);

  const priorityCounts = useMemo(() => {
    const counts: Record<SchedulePriority, number> = { "P1-Critical": 0, "P2-High": 0, "P3-Medium": 0, "P4-Low": 0, "Optimal": 0 };
    selected.forEach(c => {
      const hasTicket = !!(c.ticketId || c.ticketCreatedDate);
      if (hasTicket) {
        counts[classifyTicketPriority(c)]++;
      } else {
        counts["Optimal"]++;
      }
    });
    return counts;
  }, [selected]);

  // Type counts filtered by current priority selection
  const allTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { "AC | Level 2": 0, "DC | Level 3": 0 };
    chargers.forEach(c => {
      const sp = getSchedulePriority(c);
      if (sp === "Optimal" && !includeOptimal) return;
      if (sp !== "Optimal") {
        const pl = SCHEDULE_TO_PRIORITY[sp];
        if (pl && !config.includePriorities.includes(pl)) return;
      }
      counts[c.assetRecordType]++;
    });
    return counts;
  }, [chargers, config.includePriorities, includeOptimal]);

  // Priority counts filtered by current type selection
  const allPriorityCounts = useMemo(() => {
    const counts: Record<SchedulePriority, number> = { "P1-Critical": 0, "P2-High": 0, "P3-Medium": 0, "P4-Low": 0, "Optimal": 0 };
    chargers.forEach(c => {
      if (!config.includeTypes.includes(c.assetRecordType)) return;
      counts[getSchedulePriority(c)]++;
    });
    return counts;
  }, [chargers, config.includeTypes]);


  // Region counts (respecting type + priority filters)
  const regionCounts = useMemo(() => {
    const counts: Record<Region, number> = {} as Record<Region, number>;
    ALL_REGIONS.forEach(r => counts[r] = 0);
    chargers.forEach(c => {
      if (!config.includeTypes.includes(c.assetRecordType)) return;
      const sp = getSchedulePriority(c);
      if (sp === "Optimal" && !includeOptimal) return;
      if (sp !== "Optimal") {
        const pl = SCHEDULE_TO_PRIORITY[sp];
        if (pl && !config.includePriorities.includes(pl)) return;
      }
      const region = getRegion(c.city, c.state);
      counts[region]++;
    });
    return counts;
  }, [chargers, config.includeTypes, config.includePriorities, includeOptimal]);

  // Region counts for selected chargers (for summary)
  const selectedRegionCounts = useMemo(() => {
    const counts: Record<Region, number> = {} as Record<Region, number>;
    ALL_REGIONS.forEach(r => counts[r] = 0);
    selected.forEach(c => {
      const region = getRegion(c.city, c.state);
      counts[region]++;
    });
    return counts;
  }, [selected]);

  const toggleRegion = (region: Region) => {
    const regions = config.includeRegions.includes(region)
      ? config.includeRegions.filter(r => r !== region)
      : [...config.includeRegions, region];
    update({ includeRegions: regions });
  };

  const clearRegions = () => update({ includeRegions: [] });

  const estimatedEndDate = useMemo(() => {
    if (!config.startDate || selectedCount === 0) return null;
    const start = new Date(config.startDate + "T00:00:00");
    let days = 0;
    let working = 0;
    while (working < estimatedDays) {
      const d = new Date(start);
      d.setDate(d.getDate() + days);
      if (config.workingDays.includes(d.getDay())) working++;
      days++;
      if (days > 3650) break;
    }
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    return end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [config.startDate, config.workingDays, estimatedDays, selectedCount]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Schedule Configuration */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Schedule Configuration
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <div>
                <Label className="text-[11px]">Start Date</Label>
                <Input type="date" className="h-8 text-xs" value={config.startDate} onChange={e => update({ startDate: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px]">End Date <span className="text-muted-foreground">(opt.)</span></Label>
                <Input type="date" className="h-8 text-xs" value={config.endDate || ""} onChange={e => update({ endDate: e.target.value || null })} />
              </div>
            </div>
            {!config.endDate && estimatedEndDate && (
              <p className="text-[11px] text-muted-foreground mt-1">Auto: ~{estimatedEndDate}</p>
            )}
          </div>

          {/* Working Days */}
          <div>
            <Label className="text-[11px]">Working Days</Label>
            <div className="flex gap-1 mt-1">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`text-xs w-8 h-8 rounded-md font-medium transition-colors ${
                    config.workingDays.includes(i)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Work Hours */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Work Hours
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {[
                { label: "Hrs/charger", key: "hoursPerCharger" as const, min: 0.5, max: 8, step: 0.25, value: config.hoursPerCharger },
                { label: "Hrs/day", key: "workingHoursPerDay" as const, min: 4, max: 12, step: 0.5, value: config.workingHoursPerDay },
                { label: "Break (hrs)", key: "breakTime" as const, min: 0, max: 3, step: 0.25, value: config.breakTime },
                { label: "Travel (min)", key: "travelBuffer" as const, min: 0, max: 1, step: 0.25, value: config.travelBuffer },
              ].map(({ label, key, min, max, step, value }) => (
                <div key={key}>
                  <Label className="text-[11px]">{label}</Label>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => update({ [key]: Math.max(min, value - step) })}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input className="text-center h-7 text-xs" value={key === "travelBuffer" ? Math.round(value * 60) : value} readOnly />
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => update({ [key]: Math.min(max, value + step) })}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {/* Capacity Box */}
            <div className="mt-2 p-2 rounded-lg bg-secondary/10 border border-secondary/20">
              <p className="text-[11px] font-medium text-secondary flex items-center gap-1">
                <Zap className="h-3 w-3" /> Daily Capacity
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {config.workingHoursPerDay}h - {config.breakTime}h = {effectiveHours}h → <span className="font-semibold text-foreground">{totalPerDay} chargers/day</span>
              </p>
            </div>
          </div>

          <Separator />

          {/* Team */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground w-full">
              <Users className="h-3.5 w-3.5" /> Team Configuration
              <ChevronDown className="h-3 w-3 ml-auto" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              <div>
                <Label className="text-[11px]">Assign Technicians</Label>
                <Select onValueChange={(v) => addTechnician(v)} value="">
                  <SelectTrigger className="h-8 mt-0.5 text-xs">
                    <SelectValue placeholder={availableTechnicians.length > 0 ? "Select technician..." : "All assigned"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {availableTechnicians.map(t => (
                      <SelectItem key={t.id} value={`${t.first_name} ${t.last_name}`} className="text-xs">
                        {t.first_name} {t.last_name} — {t.home_base_city}, {t.home_base_state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {config.technicians.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {config.technicians.map((name, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 cursor-pointer text-[10px]" onClick={() => removeTechnician(i)}>{name} ×</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* REGION FILTER */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground w-full">
              <Globe className="h-3.5 w-3.5" /> Region
              {config.includeRegions.length > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">{config.includeRegions.length}</Badge>
              )}
              <ChevronDown className="h-3 w-3 ml-auto" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              {config.includeRegions.length > 0 && (
                <button onClick={clearRegions} className="text-[10px] text-primary hover:underline mb-1">Clear</button>
              )}
              <div className="space-y-1">
                {ALL_REGIONS.map(r => {
                  const count = regionCounts[r];
                  if (count === 0) return null;
                  return (
                    <label key={r} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={config.includeRegions.length === 0 || config.includeRegions.includes(r)}
                        onCheckedChange={() => toggleRegion(r)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: REGION_COLORS[r] }} />
                      <span className="truncate">{r}</span>
                      <span className="text-muted-foreground ml-auto flex-shrink-0">({count})</span>
                    </label>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* FILTERS */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Charger Filters
            </Label>

            {/* Charger Type */}
            <div className="mt-2">
              <Label className="text-[11px]">Charger Type</Label>
              <div className="space-y-1 mt-1">
                {ALL_TYPES.map(t => (
                  <label key={t} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={config.includeTypes.includes(t)} onCheckedChange={() => toggleType(t)} className="h-3.5 w-3.5" />
                    <span className="flex items-center gap-1">{TYPE_ICONS[t]} {t}</span>
                    <span className="text-muted-foreground ml-auto">({allTypeCounts[t]})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Level */}
            <div className="mt-3">
              <Label className="text-[11px]">Priority Level</Label>
              <div className="space-y-1 mt-1">
                {ALL_SCHEDULE_PRIORITIES.map(p => (
                  <label key={p} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={isSchedulePriorityChecked(p)} onCheckedChange={() => toggleSchedulePriority(p)} className="h-3.5 w-3.5" />
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${SCHEDULE_PRIORITY_CONFIG[p].bg}`}>{SCHEDULE_PRIORITY_LABELS[p]}</Badge>
                    <span className="text-muted-foreground ml-auto">({allPriorityCounts[p]})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div className="mt-3">
              <Label className="text-[11px]">Sort by</Label>
              <Select value={config.sortBy} onValueChange={v => update({ sortBy: v as SortMethod })}>
                <SelectTrigger className="h-8 mt-0.5 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority score (highest first)</SelectItem>
                  <SelectItem value="type">Charger type (DCFC first)</SelectItem>
                  <SelectItem value="age">In-service date (oldest first)</SelectItem>
                  <SelectItem value="warranty">Warranty expiration (soonest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* SELECTION SUMMARY */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Campaign Selection
            </p>
            <p className="text-lg font-bold text-foreground mt-1">{selectedCount} chargers</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px]">
              <div className="text-muted-foreground">By Type:</div>
              <div></div>
              {ALL_TYPES.map(t => (
                <div key={t} className="flex items-center gap-1 col-span-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span>{t}:</span>
                  <span className="font-medium ml-auto">{typeCounts[t]}</span>
                </div>
              ))}
              <div className="text-muted-foreground mt-1">By Priority:</div>
              <div></div>
              {ALL_SCHEDULE_PRIORITIES.map(p => (
                <div key={p} className="flex items-center gap-1 col-span-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: SCHEDULE_PRIORITY_CONFIG[p].dotColor }} />
                  <span>{SCHEDULE_PRIORITY_LABELS[p]}:</span>
                  <span className="font-medium ml-auto">{priorityCounts[p]} ({selectedCount > 0 ? Math.round((priorityCounts[p] / selectedCount) * 100) : 0}%)</span>
                </div>
              ))}
              <div className="text-muted-foreground mt-1">By Region:</div>
              <div></div>
              {ALL_REGIONS.map(r => {
                const count = selectedRegionCounts[r];
                if (count === 0) return null;
                return (
                  <div key={r} className="flex items-center gap-1 col-span-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: REGION_COLORS[r] }} />
                    <span className="truncate">{r}:</span>
                    <span className="font-medium ml-auto">{count}</span>
                  </div>
                );
              })}
            </div>
            <Separator className="my-2" />
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Total hours</span><span className="font-medium">{totalHours}h</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Working days</span><span className="font-medium">{estimatedDays} days</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Est. weeks</span><span className="font-medium">{estimatedWeeks} weeks</span></div>
              {estimatedEndDate && (
                <div className="flex justify-between"><span className="text-muted-foreground">Est. end</span><span className="font-medium">~{estimatedEndDate}</span></div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
