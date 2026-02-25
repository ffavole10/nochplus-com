import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { TicketPriority } from "@/types/assessment";
import { AGE_BANDS, AgeBand, getAgeBand } from "./slaConstants";
import { X } from "lucide-react";

const BUCKET_COLORS: Record<AgeBand, string> = {
  "0-30": "#4ade80",
  "31-60": "#facc15",
  "61-90": "#fb923c",
  "90+": "#ef4444",
};

const BUCKET_LABELS: Record<AgeBand, string> = {
  "0-30": "0–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+": "90+ days",
};

interface TicketItem {
  ticketPriority: TicketPriority;
  ageDays: number;
}

interface Props {
  tickets: TicketItem[];
  activeFilter: { band: AgeBand; priority: TicketPriority } | null;
  onFilter: (band: AgeBand, priority: TicketPriority) => void;
  onClear: () => void;
}

export function AgingBreakdownChart({ tickets, activeFilter, onFilter, onClear }: Props) {
  const { data, headline } = useMemo(() => {
    const counts: Record<AgeBand, number> = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    for (const t of tickets) {
      counts[getAgeBand(t.ageDays)]++;
    }
    const total = tickets.length;

    const chartData = AGE_BANDS.map(band => ({
      band,
      label: BUCKET_LABELS[band],
      count: counts[band],
      pct: total > 0 ? Math.round((counts[band] / total) * 100) : 0,
      color: BUCKET_COLORS[band],
    }));

    // Find the most impactful insight
    let headline = "";
    if (total > 0) {
      const over90Pct = Math.round((counts["90+"] / total) * 100);
      const over60Pct = Math.round(((counts["61-90"] + counts["90+"]) / total) * 100);
      const under30Pct = Math.round((counts["0-30"] / total) * 100);

      if (counts["90+"] > 0 && over90Pct >= 10) {
        headline = `${over90Pct}% of open tickets are over 90 days old.`;
      } else if (over60Pct >= 20) {
        headline = `${over60Pct}% of open tickets are over 60 days old.`;
      } else if (under30Pct >= 80) {
        headline = `${under30Pct}% of open tickets are under 30 days old — strong aging performance.`;
      } else {
        const oldest = AGE_BANDS.slice().reverse().find(b => counts[b] > 0);
        if (oldest && oldest !== "0-30") {
          headline = `${counts[oldest]} ticket${counts[oldest] !== 1 ? "s" : ""} in the ${BUCKET_LABELS[oldest]} bucket need${counts[oldest] === 1 ? "s" : ""} attention.`;
        } else {
          headline = `All ${total} open tickets are under 30 days old.`;
        }
      }
    }

    return { data: chartData, headline };
  }, [tickets]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold mb-1">{d.label}</p>
        <p><span className="font-medium">{d.count}</span> ticket{d.count !== 1 ? "s" : ""}</p>
        <p className="text-muted-foreground">{d.pct}% of all open tickets</p>
      </div>
    );
  };

  const handleBarClick = (entry: any) => {
    if (entry && entry.band) {
      // Filter by band with first priority as placeholder — the parent filters by band
      onFilter(entry.band as AgeBand, "P1-Critical");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-1 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Ticket Aging Overview</CardTitle>
        {activeFilter && (
          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={onClear}>
            <X className="h-3 w-3" /> Clear filter
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {headline && (
          <p className="text-sm font-bold text-foreground mb-3">{headline}</p>
        )}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: "Target", position: "right", fontSize: 10, fill: "#9ca3af" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer" onClick={handleBarClick}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
