import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, AlertTriangle, XCircle, MapPin, Filter } from "lucide-react";
import { UploadedRow, ColumnMapping, SYSTEM_FIELDS } from "@/hooks/useUploadFlow";
import { cn } from "@/lib/utils";

interface MapValidatePhaseProps {
  headers: string[];
  mappings: ColumnMapping[];
  rows: UploadedRow[];
  stats: { total: number; valid: number; warnings: number; errors: number; needsGeocoding: number };
  onUpdateMapping: (sourceColumn: string, targetField: string | null) => void;
  onUpdateCell: (rowIndex: number, column: string, value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

const PAGE_SIZE = 100;

export function MapValidatePhase({
  headers, mappings, rows, stats, onUpdateMapping, onUpdateCell, onContinue, onBack,
}: MapValidatePhaseProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | "error" | "warning">("all");
  const [page, setPage] = useState(0);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);

  const filteredRows = useMemo(() => {
    if (filterStatus === "all") return rows;
    return rows.filter(r => r._status === filterStatus);
  }, [rows, filterStatus]);

  const pagedRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);

  // Get mapped columns for display
  const mappedHeaders = useMemo(() => {
    return mappings.filter(m => m.targetField).map(m => ({
      source: m.sourceColumn,
      target: m.targetField!,
      label: SYSTEM_FIELDS.find(f => f.key === m.targetField)?.label || m.targetField!,
    }));
  }, [mappings]);

  return (
    <div className="flex-1 flex gap-4 p-4 overflow-hidden">
      {/* Left: Column Mapping */}
      <div className="w-[320px] shrink-0 border rounded-lg bg-card overflow-y-auto">
        <div className="p-3 border-b">
          <h3 className="text-sm font-semibold">Column Mapping</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Map your file columns to system fields</p>
        </div>
        <div className="p-2 space-y-1.5">
          {mappings.map(m => (
            <div key={m.sourceColumn} className="flex items-center gap-2">
              <span className="text-xs truncate w-[110px] shrink-0 text-muted-foreground" title={m.sourceColumn}>
                {m.sourceColumn}
              </span>
              <span className="text-xs text-muted-foreground">→</span>
              <Select
                value={m.targetField || "__ignore__"}
                onValueChange={v => onUpdateMapping(m.sourceColumn, v === "__ignore__" ? null : v)}
              >
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__ignore__" className="text-xs text-muted-foreground">Ignore</SelectItem>
                  {SYSTEM_FIELDS.map(f => (
                    <SelectItem key={f.key} value={f.key} className="text-xs">
                      {f.label} {f.required && <span className="text-critical">*</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Data Preview */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card overflow-hidden">
        {/* Stats bar */}
        <div className="p-3 border-b flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium">{stats.total}</span> rows
          </div>
          <button onClick={() => { setFilterStatus("all"); setPage(0); }} className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded", filterStatus === "all" && "bg-muted")}>
            <CheckCircle className="h-3 w-3 text-primary" /> {stats.valid} valid
          </button>
          <button onClick={() => { setFilterStatus("warning"); setPage(0); }} className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded", filterStatus === "warning" && "bg-muted")}>
            <AlertTriangle className="h-3 w-3 text-amber-500" /> {stats.warnings} warnings
          </button>
          <button onClick={() => { setFilterStatus("error"); setPage(0); }} className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded", filterStatus === "error" && "bg-muted")}>
            <XCircle className="h-3 w-3 text-destructive" /> {stats.errors} errors
          </button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {stats.needsGeocoding} need geocoding
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onBack}>Back</Button>
            <Button size="sm" className="h-7 text-xs" onClick={onContinue} disabled={stats.errors > 0}>
              Continue to Confirm
            </Button>
          </div>
        </div>

        {/* Data grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
              <tr>
                <th className="px-2 py-1.5 text-left w-8">#</th>
                <th className="px-2 py-1.5 text-left w-10">✓</th>
                {mappedHeaders.map(h => (
                  <th key={h.source} className="px-2 py-1.5 text-left whitespace-nowrap font-medium">
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map(row => (
                <tr key={row._rowIndex} className={cn(
                  "border-b border-border/50 hover:bg-muted/30",
                  row._status === "error" && "bg-destructive/5",
                  row._status === "warning" && "bg-amber-500/5"
                )}>
                  <td className="px-2 py-1 text-muted-foreground">{row._rowIndex + 1}</td>
                  <td className="px-2 py-1">
                    {row._status === "valid" ? <CheckCircle className="h-3.5 w-3.5 text-primary" /> :
                     row._status === "warning" ? (
                       <span title={row._errors.join(", ")}><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /></span>
                     ) : (
                       <span title={row._errors.join(", ")}><XCircle className="h-3.5 w-3.5 text-destructive" /></span>
                     )}
                  </td>
                  {mappedHeaders.map(h => {
                    const val = String(row[h.source] ?? "");
                    const isEditing = editingCell?.row === row._rowIndex && editingCell?.col === h.source;
                    return (
                      <td key={h.source} className="px-2 py-1 max-w-[200px]">
                        {isEditing ? (
                          <Input
                            autoFocus
                            defaultValue={val}
                            className="h-6 text-xs px-1"
                            onBlur={e => {
                              onUpdateCell(row._rowIndex, h.source, e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                          />
                        ) : (
                          <span
                            className="truncate block cursor-pointer hover:bg-muted/50 px-1 rounded"
                            onClick={() => setEditingCell({ row: row._rowIndex, col: h.source })}
                            title={val}
                          >
                            {val || <span className="text-muted-foreground/50">—</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-2 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages} ({filteredRows.length} rows)
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-6 text-xs px-2" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" className="h-6 text-xs px-2" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
