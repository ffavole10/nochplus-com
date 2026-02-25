import { useState, useMemo } from "react";
import { CampaignConfig, DEFAULT_CONFIG, SortMethod } from "@/types/campaign";
import { Phase, PriorityLevel, ChargerType, AssessmentCharger, TicketPriority } from "@/types/assessment";
import { filterChargers } from "@/lib/scheduleGenerator";
import { classifyTicketPriority } from "@/lib/ticketPriority";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings2, Users, Calendar, Clock, Filter, Plus, Minus, ChevronDown, Zap, Plug, Battery, BarChart3, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CampaignConfigPanelProps {
  chargers: AssessmentCharger[];
  config: CampaignConfig;
  onChange: (config: CampaignConfig) => void;
}

const ALL_PHASES: Phase[] = ["Needs Assessment", "Scheduled", "In Progress", "Completed", "Deferred"];
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
  const [techInput, setTechInput] = useState("");

  const update = (partial: Partial<CampaignConfig>) => onChange({ ...config, ...partial });

  const toggleDay = (day: number) => {
    const days = config.workingDays.includes(day)
      ? config.workingDays.filter(d => d !== day)
      : [...config.workingDays, day].sort();
    if (days.length === 0) return;
    update({ workingDays: days });
  };

  const togglePhase = (phase: Phase) => {
    const phases = config.includePhases.includes(phase)
      ? config.includePhases.filter(p => p !== phase)
      : [...config.includePhases, phase];
    update({ includePhases: phases });
  };

  const togglePriority = (priority: PriorityLevel) => {
    const priorities = config.includePriorities.includes(priority)
      ? config.includePriorities.filter(p => p !== priority)
      : [...config.includePriorities, priority];
    update({ includePriorities: priorities });
  };

  const toggleType = (type: ChargerType) => {
    const types = config.includeTypes.includes(type)
      ? config.includeTypes.filter(t => t !== type)
      : [...config.includeTypes, type];
    update({ includeTypes: types });
  };

  const addTechnician = () => {
    if (!techInput.trim()) return;
    update({ technicians: [...config.technicians, techInput.trim()] });
    setTechInput("");
  };

  const removeTechnician = (index: number) => {
    update({ technicians: config.technicians.filter((_, i) => i !== index) });
  };

  // Computed metrics
  const selected = useMemo(() => filterChargers(chargers, config), [chargers, config]);
  const selectedCount = selected.length;
  const effectiveHours = config.workingHoursPerDay - config.breakTime;
  const chargersPerDay = Math.max(1, Math.floor(effectiveHours / (config.hoursPerCharger + config.travelBuffer)));
  const totalPerDay = chargersPerDay * config.numberOfTechnicians;
  const estimatedDays = Math.ceil(selectedCount / totalPerDay);
  const estimatedWeeks = Math.ceil(estimatedDays / config.workingDays.length);
  const totalHours = selectedCount * config.hoursPerCharger;

  // Count chargers by type and priority from selection
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { DCFC: 0, L2: 0, HPCD: 0 };
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

  // All available counts for filters
  const allTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { DCFC: 0, L2: 0, HPCD: 0 };
    chargers.forEach(c => counts[c.assetRecordType]++);
    return counts;
  }, [chargers]);

  const allPriorityCounts = useMemo(() => {
    const counts: Record<SchedulePriority, number> = { "P1-Critical": 0, "P2-High": 0, "P3-Medium": 0, "P4-Low": 0, "Optimal": 0 };
    chargers.forEach(c => {
      const hasTicket = !!(c.ticketId || c.ticketCreatedDate);
      if (hasTicket) {
        counts[classifyTicketPriority(c)]++;
      } else {
        counts["Optimal"]++;
      }
    });
    return counts;
  }, [chargers]);

  const allPhaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_PHASES.forEach(p => counts[p] = 0);
    chargers.forEach(c => counts[c.phase]++);
    return counts;
  }, [chargers]);

  // Estimated end date
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
      if (days > 365) break;
    }
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    return end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [config.startDate, config.workingDays, estimatedDays, selectedCount]);

  return (
    <div className="w-full lg:w-[360px] border-r border-border flex flex-col bg-card">
      <ScrollArea className="flex-1">
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
                <Label className="text-[11px]">Technicians</Label>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => update({ numberOfTechnicians: Math.max(1, config.numberOfTechnicians - 1) })}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input className="text-center h-7 w-12 text-xs" value={config.numberOfTechnicians} readOnly />
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => update({ numberOfTechnicians: Math.min(10, config.numberOfTechnicians + 1) })}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <div className="flex gap-1 mt-1">
                  <Input className="h-7 text-xs" placeholder="Add name..." value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTechnician()} />
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={addTechnician}><Plus className="h-3 w-3" /></Button>
                </div>
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
                    <Checkbox checked={true} className="h-3.5 w-3.5" disabled />
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${SCHEDULE_PRIORITY_CONFIG[p].bg}`}>{SCHEDULE_PRIORITY_LABELS[p]}</Badge>
                    <span className="text-muted-foreground ml-auto">({allPriorityCounts[p]})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Phase */}
            <div className="mt-3">
              <Label className="text-[11px]">Current Phase</Label>
              <div className="space-y-1 mt-1">
                {ALL_PHASES.map(phase => (
                  <label key={phase} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={config.includePhases.includes(phase)} onCheckedChange={() => togglePhase(phase)} className="h-3.5 w-3.5" />
                    {phase}
                    <span className="text-muted-foreground ml-auto">({allPhaseCounts[phase]})</span>
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
