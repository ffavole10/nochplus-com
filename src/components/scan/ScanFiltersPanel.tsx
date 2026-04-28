import { useState } from "react";
import { Filter, Zap, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ScanFilters } from "@/pages/campaigns/CampaignScan";
import type { CampaignChargerRow } from "@/hooks/useCampaignChargers";

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "bg-[hsl(var(--critical))]" },
  { value: "high", label: "High", color: "bg-[hsl(var(--high))]" },
  { value: "medium", label: "Medium", color: "bg-[hsl(var(--medium))]" },
  { value: "low", label: "Low", color: "bg-[hsl(var(--low))]" },
  { value: "ok", label: "OK", color: "bg-primary" },
];

interface ScanFiltersPanelProps {
  filters: ScanFilters;
  onFiltersChange: (f: ScanFilters) => void;
  filterOptions: {
    chargerTypes: string[];
    states: [string, number][];
    operators: string[];
    statuses: string[];
  };
  selectedCount: number;
  onBulkPriority: (priority: string) => void;
  onBulkScope: (in_scope: boolean) => void;
  onBulkNotes: (note: string) => void;
  onSelectByPriority: (priority: string) => void;
  onSelectByStatus: (status: string) => void;
  onIncludeAllFiltered: () => void;
  onExcludeAllFiltered: () => void;
  canCompleteTriage: boolean;
  onCompleteTriage: () => void;
  inScopeCount: number;
  stateCount: number;
  chargers: CampaignChargerRow[];
}

export function ScanFiltersPanel({
  filters,
  onFiltersChange,
  filterOptions,
  selectedCount,
  onBulkPriority,
  onBulkScope,
  onBulkNotes,
  onSelectByPriority,
  onSelectByStatus,
  onIncludeAllFiltered,
  onExcludeAllFiltered,
  canCompleteTriage,
  onCompleteTriage,
  inScopeCount,
  stateCount,
  chargers,
}: ScanFiltersPanelProps) {
  const [bulkNote, setBulkNote] = useState("");
  const [bulkPriority, setBulkPriority] = useState("low");

  const togglePriority = (p: string) => {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter(x => x !== p)
      : [...filters.priorities, p];
    onFiltersChange({ ...filters, priorities: next });
  };

  const toggleState = (s: string) => {
    const next = filters.states.includes(s)
      ? filters.states.filter(x => x !== s)
      : [...filters.states, s];
    onFiltersChange({ ...filters, states: next });
  };

  const toggleStatus = (s: string) => {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter(x => x !== s)
      : [...filters.statuses, s];
    onFiltersChange({ ...filters, statuses: next });
  };

  const clearAll = () => {
    onFiltersChange({
      priorities: ["critical", "high", "medium", "low", "ok"],
      scopeFilter: "all",
      chargerTypes: [],
      states: [],
      operators: [],
      statuses: [],
      search: filters.search,
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Neural OS placeholder */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" className="w-full gap-2 opacity-60 cursor-not-allowed" disabled>
              <Sparkles className="h-4 w-4" />
              Run Neural OS Scan
              <Badge variant="secondary" className="text-[9px] ml-auto">Coming Soon</Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            AI-powered diagnostics coming soon. For now, set priorities manually.
          </TooltipContent>
        </Tooltip>

        <Separator />

        {/* Filters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filters
            </h3>
            <button className="text-[10px] text-primary hover:underline" onClick={clearAll}>Clear All</button>
          </div>

          {/* Priority */}
          <div className="space-y-1.5 mb-3">
            <Label className="text-[11px] text-muted-foreground">Priority</Label>
            {PRIORITY_OPTIONS.map(p => (
              <label key={p.value} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={filters.priorities.includes(p.value)}
                  onCheckedChange={() => togglePriority(p.value)}
                />
                <span className={cn("w-2 h-2 rounded-full", p.color)} />
                {p.label}
              </label>
            ))}
          </div>

          {/* Scope */}
          <div className="space-y-1.5 mb-3">
            <Label className="text-[11px] text-muted-foreground">Scope</Label>
            <Select value={filters.scopeFilter} onValueChange={v => onFiltersChange({ ...filters, scopeFilter: v as any })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="in_scope" className="text-xs">In Scope Only</SelectItem>
                <SelectItem value="out_of_scope" className="text-xs">Out of Scope Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* States */}
          {filterOptions.states.length > 0 && (
            <div className="space-y-1.5 mb-3">
              <Label className="text-[11px] text-muted-foreground">State</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filterOptions.states.map(([st, count]) => (
                  <label key={st} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={filters.states.length === 0 || filters.states.includes(st)}
                      onCheckedChange={() => toggleState(st)}
                    />
                    {st}
                    <span className="ml-auto text-muted-foreground text-[10px]">{count}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          {filterOptions.statuses.length > 0 && (
            <div className="space-y-1.5 mb-3">
              <Label className="text-[11px] text-muted-foreground">Charger Status</Label>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {filterOptions.statuses.map(st => (
                  <label key={st} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={filters.statuses.length === 0 || filters.statuses.includes(st)}
                      onCheckedChange={() => toggleStatus(st)}
                    />
                    {st}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Bulk Actions */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2">
            Bulk Actions {selectedCount > 0 && <span className="text-primary">({selectedCount})</span>}
          </h3>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Select value={bulkPriority} onValueChange={setBulkPriority}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(p => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={selectedCount === 0} onClick={() => onBulkPriority(bulkPriority)}>
                Set Priority
              </Button>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs flex-1 gap-1" disabled={selectedCount === 0} onClick={() => onBulkScope(true)}>
                <CheckCircle className="h-3 w-3" /> Include
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs flex-1 gap-1" disabled={selectedCount === 0} onClick={() => onBulkScope(false)}>
                <XCircle className="h-3 w-3" /> Exclude
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add note..."
                value={bulkNote}
                onChange={e => setBulkNote(e.target.value)}
                className="h-8 text-xs flex-1"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={selectedCount === 0 || !bulkNote.trim()} onClick={() => { onBulkNotes(bulkNote); setBulkNote(""); }}>
                Apply
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2">Quick Select</h3>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onSelectByPriority("critical")}>All Critical</Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onSelectByPriority("high")}>All High</Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onSelectByStatus("offline")}>All Offline</Button>
          </div>
          <div className="flex gap-1.5 mt-2">
            <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={onIncludeAllFiltered}>Include All Filtered</Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={onExcludeAllFiltered}>Exclude All Filtered</Button>
          </div>
        </div>

        <Separator />

        {/* Complete Triage */}
        <div className="space-y-2">
          <Button
            className="w-full gap-2"
            disabled={!canCompleteTriage}
            onClick={onCompleteTriage}
          >
            <Zap className="h-4 w-4" />
            Complete Triage
          </Button>
          {!canCompleteTriage && (
            <p className="text-[10px] text-muted-foreground text-center">At least 1 charger must be in scope.</p>
          )}
          {canCompleteTriage && (
            <p className="text-[10px] text-muted-foreground text-center">
              {inScopeCount} chargers in scope across {stateCount} states
            </p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
