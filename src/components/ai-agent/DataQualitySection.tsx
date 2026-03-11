import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface QualityBreakdown {
  high: number;
  medium: number;
  low: number;
  total: number;
}

const CRITERIA = [
  { label: "Complete Fields", description: "All required columns present (serial number, issue, location)", weight: "25%" },
  { label: "Issue Description Length", description: "Descriptions over 50 characters with actionable detail", weight: "25%" },
  { label: "Photo Coverage", description: "At least one photo per charger entry", weight: "20%" },
  { label: "Serial Number Format", description: "Valid, parseable serial numbers matching known OEM patterns", weight: "15%" },
  { label: "No Duplicates", description: "Unique records not already in the training set", weight: "15%" },
];

export function DataQualitySection() {
  const [breakdown, setBreakdown] = useState<QualityBreakdown>({ high: 0, medium: 0, low: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("deep_learning_uploads" as any)
        .select("quality_score")
        .eq("status", "completed");

      if (data) {
        const records = data as unknown as { quality_score: number | null }[];
        const high = records.filter((r) => r.quality_score != null && r.quality_score >= 80).length;
        const medium = records.filter((r) => r.quality_score != null && r.quality_score >= 50 && r.quality_score < 80).length;
        const low = records.filter((r) => r.quality_score != null && r.quality_score < 50).length;
        setBreakdown({ high, medium, low, total: records.length });
      }
      setLoading(false);
    })();
  }, []);

  const pct = (n: number) => (breakdown.total > 0 ? Math.round((n / breakdown.total) * 100) : 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Training Data Quality</h2>
        <p className="text-sm text-muted-foreground">
          Quality of data used to train AutoHeal. Higher quality data produces more accurate diagnostics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Overall Data Health */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Overall Data Health</h3>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : breakdown.total === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No completed uploads yet</p>
            ) : (
              <div className="space-y-3">
                <QualityBar label="High Quality" count={breakdown.high} pct={pct(breakdown.high)} color="bg-emerald-500" />
                <QualityBar label="Medium Quality" count={breakdown.medium} pct={pct(breakdown.medium)} color="bg-amber-500" />
                <QualityBar label="Low Quality" count={breakdown.low} pct={pct(breakdown.low)} color="bg-red-500" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quality Score Breakdown */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Quality Score Breakdown</h3>
            <p className="text-xs text-muted-foreground mb-4">How quality scores are calculated</p>
            <div className="space-y-3">
              {CRITERIA.map((c) => (
                <div key={c.label} className="flex items-start gap-3">
                  <span className="text-xs font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">{c.weight}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QualityBar({ label, count, pct, color }: { label: string; count: number; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{pct}% · {count} files</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
