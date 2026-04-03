import { useState, useMemo, useCallback, useRef } from "react";
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CampaignChargerRow } from "@/hooks/useCampaignChargers";

const PAGE_SIZE = 100;

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-[hsl(var(--critical))]/10 text-[hsl(var(--critical))] border-[hsl(var(--critical))]/30" },
  high: { label: "High", className: "bg-[hsl(var(--high))]/10 text-[hsl(var(--high))] border-[hsl(var(--high))]/30" },
  medium: { label: "Medium", className: "bg-[hsl(var(--medium))]/10 text-[hsl(var(--medium))] border-[hsl(var(--medium))]/30" },
  low: { label: "Low", className: "bg-[hsl(var(--low))]/10 text-[hsl(var(--low))] border-[hsl(var(--low))]/30" },
  ok: { label: "OK", className: "bg-primary/10 text-primary border-primary/30" },
};

interface ScanDataGridProps {
  chargers: CampaignChargerRow[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onPriorityChange: (id: string, priority: string) => void;
  onScopeToggle: (id: string, in_scope: boolean) => void;
  onNotesChange: (id: string, notes: string) => void;
  isLoading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

type SortKey = "station_id" | "site_name" | "city" | "model" | "charger_status" | "priority" | "in_scope";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, ok: 4 };

export function ScanDataGrid({
  chargers,
  selectedIds,
  onSelectionChange,
  onPriorityChange,
  onScopeToggle,
  onNotesChange,
  isLoading,
  searchValue,
  onSearchChange,
}: ScanDataGridProps) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("station_id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => {
    const arr = [...chargers];
    arr.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortKey === "priority") {
        aVal = PRIORITY_ORDER[a.priority] ?? 5;
        bVal = PRIORITY_ORDER[b.priority] ?? 5;
      } else if (sortKey === "in_scope") {
        aVal = a.in_scope ? 0 : 1;
        bVal = b.in_scope ? 0 : 1;
      } else if (sortKey === "city") {
        aVal = `${a.city || ""}, ${a.state || ""}`;
        bVal = `${b.city || ""}, ${b.state || ""}`;
      } else {
        aVal = (a as any)[sortKey] || "";
        bVal = (b as any)[sortKey] || "";
      }
      if (typeof aVal === "string") {
        const cmp = aVal.localeCompare(bVal as string);
        return sortDir === "asc" ? cmp : -cmp;
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return arr;
  }, [chargers, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const allPageSelected = pageRows.length > 0 && pageRows.every(r => selectedIds.has(r.id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const next = new Set(selectedIds);
      pageRows.forEach(r => next.delete(r.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      pageRows.forEach(r => next.add(r.id));
      onSelectionChange(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => toggleSort(field)}
    >
      {label}
      {sortKey === field && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 border-b flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Search charger ID, site, address..."
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{chargers.length} results</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
            <tr className="border-b">
              <th className="w-10 px-3 py-2">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-3 py-2 text-left"><SortHeader label="Charger ID" field="station_id" /></th>
              <th className="px-3 py-2 text-left"><SortHeader label="Site Name" field="site_name" /></th>
              <th className="px-3 py-2 text-left"><SortHeader label="City, State" field="city" /></th>
              <th className="px-3 py-2 text-left"><SortHeader label="Model" field="model" /></th>
              <th className="px-3 py-2 text-left"><SortHeader label="Status" field="charger_status" /></th>
              <th className="px-3 py-2 text-left"><SortHeader label="Priority" field="priority" /></th>
              <th className="px-3 py-2 text-center"><SortHeader label="In Scope" field="in_scope" /></th>
              <th className="px-3 py-2 text-left min-w-[120px]">Notes</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, idx) => {
              const pc = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.low;
              const isExpanded = expandedId === row.id;
              return (
                <>
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b hover:bg-muted/30 transition-colors cursor-pointer",
                      !row.in_scope && "opacity-40",
                      selectedIds.has(row.id) && "bg-primary/5"
                    )}
                  >
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs" onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                      {row.station_id}
                    </td>
                    <td className="px-3 py-2 max-w-[160px] truncate" onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                      {row.site_name || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs" onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                      {[row.city, row.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs" onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                      {row.model ? (
                        <Badge variant="outline" className="text-[10px]">{row.model}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Unknown</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs" onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                      {row.charger_status || "—"}
                    </td>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <Select value={row.priority} onValueChange={v => onPriorityChange(row.id, v)}>
                        <SelectTrigger className={cn("h-7 w-[100px] text-xs border", pc.className)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                      <Switch
                        checked={row.in_scope}
                        onCheckedChange={v => onScopeToggle(row.id, v)}
                        className="scale-75"
                      />
                    </td>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      {editingNoteId === row.id ? (
                        <Input
                          ref={noteInputRef}
                          defaultValue={row.scan_notes || ""}
                          className="h-7 text-xs"
                          autoFocus
                          onBlur={e => {
                            onNotesChange(row.id, e.target.value);
                            setEditingNoteId(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              onNotesChange(row.id, (e.target as HTMLInputElement).value);
                              setEditingNoteId(null);
                            }
                          }}
                        />
                      ) : (
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground truncate max-w-[120px] block text-left"
                          onClick={() => setEditingNoteId(row.id)}
                        >
                          {row.scan_notes || "Add note..."}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${row.id}-detail`} className="border-b bg-muted/20">
                      <td colSpan={9} className="px-6 py-3">
                        <div className="grid grid-cols-4 gap-4 text-xs">
                          <div><span className="text-muted-foreground">Address:</span> {row.address || "—"}</div>
                          <div><span className="text-muted-foreground">ZIP:</span> {row.zip || "—"}</div>
                          <div><span className="text-muted-foreground">Lat/Lng:</span> {row.latitude && row.longitude ? `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}` : "—"}</div>
                          <div><span className="text-muted-foreground">Serial:</span> {row.serial_number || "—"}</div>
                          <div><span className="text-muted-foreground">Install Date:</span> {row.start_date || "—"}</div>
                          <div><span className="text-muted-foreground">Last Service:</span> {row.service_date || "—"}</div>
                          <div><span className="text-muted-foreground">Max Power:</span> {row.max_power ? `${row.max_power} kW` : "—"}</div>
                          <div><span className="text-muted-foreground">Summary:</span> {row.summary || "—"}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-2 border-t flex items-center justify-between bg-card text-xs">
        <span className="text-muted-foreground">
          {selectedIds.size > 0 && <span className="font-medium text-foreground">{selectedIds.size} selected · </span>}
          Page {page + 1} of {totalPages} ({sorted.length} total)
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
