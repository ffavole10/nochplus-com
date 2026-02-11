import { useState } from "react";
import { CampaignConfig, DEFAULT_CONFIG, SortMethod } from "@/types/campaign";
import { Phase, PriorityLevel, ChargerType, AssessmentCharger } from "@/types/assessment";
import { filterChargers } from "@/lib/scheduleGenerator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings2, Users, Calendar, Clock, Filter, RotateCcw, Eye, Plus, Minus } from "lucide-react";

interface CampaignConfigPanelProps {
  chargers: AssessmentCharger[];
  config: CampaignConfig;
  onChange: (config: CampaignConfig) => void;
  onPreview: () => void;
  onReset: () => void;
}

const ALL_PHASES: Phase[] = ["Needs Assessment", "Scheduled", "In Progress", "Completed", "Deferred"];
const ALL_PRIORITIES: PriorityLevel[] = ["Critical", "High", "Medium", "Low"];
const ALL_TYPES: ChargerType[] = ["DCFC", "L2", "HPCD"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CampaignConfigPanel({ chargers, config, onChange, onPreview, onReset }: CampaignConfigPanelProps) {
  const [techInput, setTechInput] = useState("");

  const update = (partial: Partial<CampaignConfig>) => onChange({ ...config, ...partial });

  const toggleDay = (day: number) => {
    const days = config.workingDays.includes(day)
      ? config.workingDays.filter(d => d !== day)
      : [...config.workingDays, day].sort();
    if (days.length === 0) return; // at least one day
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

  const effectiveHours = config.workingHoursPerDay - config.breakTime;
  const chargersPerDay = Math.max(1, Math.floor(effectiveHours / (config.hoursPerCharger + config.travelBuffer)));
  const totalPerDay = chargersPerDay * config.numberOfTechnicians;
  const selectedCount = filterChargers(chargers, config).length;
  const estimatedDays = Math.ceil(selectedCount / totalPerDay);

  return (
    <div className="w-full lg:w-[400px] border-r border-border overflow-y-auto custom-scrollbar bg-card">
      <div className="p-4 space-y-5">
        {/* Campaign Name */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5" /> Campaign Name
          </Label>
          <Input
            className="mt-1"
            placeholder="e.g., Q1 2025 DCFC Assessment"
            value={config.name}
            onChange={e => update({ name: e.target.value.slice(0, 100) })}
            maxLength={100}
          />
        </div>

        <Separator />

        {/* Dates */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Schedule Dates
          </Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={config.startDate} onChange={e => update({ startDate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">End Date (optional)</Label>
              <Input type="date" value={config.endDate || ""} onChange={e => update({ endDate: e.target.value || null })} />
            </div>
          </div>
        </div>

        {/* Working Days */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Working Days</Label>
          <div className="flex gap-1 mt-1">
            {DAY_NAMES.map((name, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`text-xs px-2 py-1.5 rounded-md font-medium transition-colors ${
                  config.workingDays.includes(i)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{config.workingDays.length} working days/week</p>
        </div>

        <Separator />

        {/* Time Allocation */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Time Allocation
          </Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label className="text-xs">Hours per charger</Label>
              <div className="flex items-center gap-1 mt-1">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => update({ hoursPerCharger: Math.max(0.5, config.hoursPerCharger - 0.5) })}>
                  <Minus className="h-3 w-3" />
                </Button>
                <Input className="text-center h-8" value={config.hoursPerCharger} readOnly />
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => update({ hoursPerCharger: Math.min(8, config.hoursPerCharger + 0.5) })}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Hours per day</Label>
              <div className="flex items-center gap-1 mt-1">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => update({ workingHoursPerDay: Math.max(1, config.workingHoursPerDay - 1) })}>
                  <Minus className="h-3 w-3" />
                </Button>
                <Input className="text-center h-8" value={config.workingHoursPerDay} readOnly />
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => update({ workingHoursPerDay: Math.min(12, config.workingHoursPerDay + 1) })}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Break time (hrs)</Label>
              <div className="flex items-center gap-1 mt-1">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => update({ breakTime: Math.max(0, config.breakTime - 0.5) })}>
                  <Minus className="h-3 w-3" />
                </Button>
                <Input className="text-center h-8" value={config.breakTime} readOnly />
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => update({ breakTime: Math.min(3, config.breakTime + 0.5) })}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Travel buffer (min)</Label>
              <div className="flex items-center gap-1 mt-1">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => update({ travelBuffer: Math.max(0, config.travelBuffer - 0.25) })}>
                  <Minus className="h-3 w-3" />
                </Button>
                <Input className="text-center h-8" value={Math.round(config.travelBuffer * 60)} readOnly />
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => update({ travelBuffer: Math.min(1, config.travelBuffer + 0.25) })}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Can assess <span className="font-semibold text-foreground">{totalPerDay}</span> chargers per day
          </p>
        </div>

        <Separator />

        {/* Team */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Team Configuration
          </Label>
          <div className="mt-2">
            <Label className="text-xs">Number of technicians</Label>
            <div className="flex items-center gap-1 mt-1">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => update({ numberOfTechnicians: Math.max(1, config.numberOfTechnicians - 1) })}>
                <Minus className="h-3 w-3" />
              </Button>
              <Input className="text-center h-8 w-16" value={config.numberOfTechnicians} readOnly />
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => update({ numberOfTechnicians: Math.min(10, config.numberOfTechnicians + 1) })}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Team members (optional)</Label>
            <div className="flex gap-1 mt-1">
              <Input
                className="h-8 text-sm"
                placeholder="Add name..."
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTechnician()}
              />
              <Button size="sm" variant="outline" className="h-8" onClick={addTechnician}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {config.technicians.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {config.technicians.map((name, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeTechnician(i)}>
                    {name} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Charger Selection */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Charger Selection
          </Label>

          <div className="mt-2 space-y-3">
            <div>
              <Label className="text-xs">Include phases</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ALL_PHASES.map(phase => (
                  <label key={phase} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={config.includePhases.includes(phase)}
                      onCheckedChange={() => togglePhase(phase)}
                      className="h-3.5 w-3.5"
                    />
                    {phase}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Priority levels</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ALL_PRIORITIES.map(p => (
                  <label key={p} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={config.includePriorities.includes(p)}
                      onCheckedChange={() => togglePriority(p)}
                      className="h-3.5 w-3.5"
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Charger types</Label>
              <div className="flex gap-3 mt-1">
                {ALL_TYPES.map(t => (
                  <label key={t} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={config.includeTypes.includes(t)}
                      onCheckedChange={() => toggleType(t)}
                      className="h-3.5 w-3.5"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Sort by</Label>
              <Select value={config.sortBy} onValueChange={v => update({ sortBy: v as SortMethod })}>
                <SelectTrigger className="h-8 mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority score (highest first)</SelectItem>
                  <SelectItem value="type">Charger type (DCFC first)</SelectItem>
                  <SelectItem value="age">In-service date (oldest first)</SelectItem>
                  <SelectItem value="warranty">Warranty expiration (soonest first)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 p-2 rounded-lg bg-muted/50">
            <p className="text-xs font-medium text-foreground">
              {selectedCount} chargers selected · ~{estimatedDays} working days
            </p>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onPreview} disabled={selectedCount === 0}>
            <Eye className="h-4 w-4 mr-1" /> Preview Schedule
          </Button>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
