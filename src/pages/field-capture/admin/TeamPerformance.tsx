import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Download, Search } from "lucide-react";

interface TechRow {
  technician_id: string;
  display_name: string;
  email: string;
  noch_pro_score: number;
  last_30_days_efficiency: number;
  quality_score: number;
  reliability_score: number;
  mastery_score: number;
  total_jobs_completed: number;
  total_chargers_captured: number;
  current_on_time_streak: number;
}

type SortKey = keyof TechRow;

export default function TeamPerformance() {
  usePageTitle("Team Performance");
  const [rows, setRows] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "noch_pro_score",
    dir: "desc",
  });
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Get all technicians (user_roles role=technician)
      const { data: techRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "technician");
      const techIds = Array.from(new Set((techRoles ?? []).map((r: any) => r.user_id)));
      if (!techIds.length) {
        setRows([]); setLoading(false); return;
      }
      const [{ data: profiles }, { data: stats }] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,email").in("user_id", techIds),
        supabase.from("technician_stats_cache").select("*").in("technician_id", techIds),
      ]);
      const statsMap = new Map((stats ?? []).map((s: any) => [s.technician_id, s]));
      const list: TechRow[] = (profiles ?? []).map((p: any) => {
        const s = statsMap.get(p.user_id) ?? {};
        return {
          technician_id: p.user_id,
          display_name: p.display_name || p.email?.split("@")[0] || "Technician",
          email: p.email || "",
          noch_pro_score: s.noch_pro_score ?? 0,
          last_30_days_efficiency: s.last_30_days_efficiency ?? 0,
          quality_score: s.quality_score ?? 0,
          reliability_score: s.reliability_score ?? 0,
          mastery_score: s.mastery_score ?? 0,
          total_jobs_completed: s.total_jobs_completed ?? 0,
          total_chargers_captured: s.total_chargers_captured ?? 0,
          current_on_time_streak: s.current_on_time_streak ?? 0,
        };
      });
      setRows(list);
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const filtered = f
      ? rows.filter(
          (r) =>
            r.display_name.toLowerCase().includes(f) ||
            r.email.toLowerCase().includes(f),
        )
      : rows;
    const sgn = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key]; const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sgn;
      return String(av).localeCompare(String(bv)) * sgn;
    });
  }, [rows, sort, filter]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const exportCsv = () => {
    const headers = [
      "Name", "Email", "NOCH Pro Score", "30d Efficiency %", "Quality", "Reliability",
      "Mastery", "Total Jobs", "Total Chargers", "Current Streak",
    ];
    const lines = [headers.join(",")];
    for (const r of sorted) {
      lines.push([
        `"${r.display_name}"`, `"${r.email}"`, r.noch_pro_score, r.last_30_days_efficiency,
        r.quality_score, r.reliability_score, r.mastery_score, r.total_jobs_completed,
        r.total_chargers_captured, r.current_on_time_streak,
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
      {label} <ArrowUpDown className="h-3 w-3 opacity-60" />
    </button>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team Performance</h1>
          <p className="text-sm text-muted-foreground">
            NOCH Pro scores and lifetime stats across all technicians.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!sorted.length}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search technicians…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader k="display_name" label="Technician" /></TableHead>
              <TableHead className="text-right"><SortHeader k="noch_pro_score" label="NOCH Pro" /></TableHead>
              <TableHead className="text-right"><SortHeader k="last_30_days_efficiency" label="Efficiency" /></TableHead>
              <TableHead className="text-right"><SortHeader k="quality_score" label="Quality" /></TableHead>
              <TableHead className="text-right"><SortHeader k="reliability_score" label="Reliability" /></TableHead>
              <TableHead className="text-right"><SortHeader k="mastery_score" label="Mastery" /></TableHead>
              <TableHead className="text-right"><SortHeader k="total_jobs_completed" label="Jobs" /></TableHead>
              <TableHead className="text-right"><SortHeader k="total_chargers_captured" label="Chargers" /></TableHead>
              <TableHead className="text-right"><SortHeader k="current_on_time_streak" label="Streak" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!loading && !sorted.length && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No technicians found.</TableCell></TableRow>
            )}
            {!loading && sorted.map((r) => (
              <TableRow key={r.technician_id}>
                <TableCell>
                  <div className="font-medium">{r.display_name}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums">{r.noch_pro_score}</TableCell>
                <TableCell className="text-right tabular-nums">{Math.round(r.last_30_days_efficiency)}%</TableCell>
                <TableCell className="text-right tabular-nums">{r.quality_score}</TableCell>
                <TableCell className="text-right tabular-nums">{r.reliability_score}%</TableCell>
                <TableCell className="text-right tabular-nums">{r.mastery_score}</TableCell>
                <TableCell className="text-right tabular-nums">{r.total_jobs_completed}</TableCell>
                <TableCell className="text-right tabular-nums">{r.total_chargers_captured}</TableCell>
                <TableCell className="text-right tabular-nums">{r.current_on_time_streak}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
