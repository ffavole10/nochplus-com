import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, MapPin, ArrowRight, ChevronLeft } from "lucide-react";
import { UploadedRow, ColumnMapping } from "@/hooks/useUploadFlow";

interface ConfirmPhaseProps {
  rows: UploadedRow[];
  mappings: ColumnMapping[];
  stats: { total: number; valid: number; warnings: number; errors: number; needsGeocoding: number };
  importing: boolean;
  onImport: () => void;
  onBack: () => void;
}

export function ConfirmPhase({ rows, mappings, stats, importing, onImport, onBack }: ConfirmPhaseProps) {
  const getVal = (row: UploadedRow, field: string) => {
    const m = mappings.find(m => m.targetField === field);
    if (!m) return "";
    return String(row[m.sourceColumn] ?? "").trim();
  };

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => {
      const t = getVal(r, "charger_type") || "Unknown";
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [rows, mappings]);

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => {
      const s = getVal(r, "state") || "Unknown";
      counts[s.toUpperCase()] = (counts[s.toUpperCase()] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [rows, mappings]);

  const siteCount = useMemo(() => {
    const sites = new Set<string>();
    rows.forEach(r => {
      const s = getVal(r, "site_name");
      if (s) sites.add(s);
    });
    return sites.size;
  }, [rows, mappings]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-primary" />
      </div>

      <h2 className="text-xl font-bold">Ready to Import</h2>

      <div className="w-full border rounded-lg bg-card divide-y">
        <div className="p-4 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total chargers</span>
          <span className="text-lg font-bold">{stats.total}</span>
        </div>
        <div className="p-4 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Sites</span>
          <span className="font-semibold">{siteCount}</span>
        </div>
        <div className="p-4">
          <span className="text-sm text-muted-foreground">By type</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(typeCounts).map(([type, count]) => (
              <span key={type} className="text-xs bg-muted px-2 py-1 rounded">{type}: {count}</span>
            ))}
          </div>
        </div>
        <div className="p-4">
          <span className="text-sm text-muted-foreground">By state</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {stateCounts.slice(0, 15).map(([state, count]) => (
              <span key={state} className="text-xs bg-muted px-2 py-1 rounded">{state}: {count}</span>
            ))}
            {stateCounts.length > 15 && (
              <span className="text-xs text-muted-foreground">+{stateCounts.length - 15} more</span>
            )}
          </div>
        </div>
        {stats.warnings > 0 && (
          <div className="p-4 flex justify-between items-center">
            <span className="text-sm text-amber-600">Warnings (non-blocking)</span>
            <span className="text-sm font-medium text-amber-600">{stats.warnings}</span>
          </div>
        )}
        {stats.needsGeocoding > 0 && (
          <div className="p-4 flex justify-between items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Needs geocoding
            </span>
            <span className="text-sm font-medium">{stats.needsGeocoding}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 w-full">
        <Button variant="outline" onClick={onBack} className="flex-1 gap-2" disabled={importing}>
          <ChevronLeft className="h-4 w-4" /> Back to Mapping
        </Button>
        <Button onClick={onImport} className="flex-1 gap-2" disabled={importing}>
          {importing ? "Importing..." : `Import ${stats.total} Chargers`}
          {!importing && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
