import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { TicketPriority } from "@/types/assessment";
import { AGE_BANDS, AgeBand, getAgeBand, PRIORITY_COLORS } from "./slaConstants";
import { X, Clock } from "lucide-react";

const BUCKET_COLORS: Record<AgeBand, string> = {
  "0-30": PRIORITY_COLORS["P4-Low"],
  "31-60": PRIORITY_COLORS["P3-Medium"],
  "61-90": PRIORITY_COLORS["P2-High"],
  "90+": PRIORITY_COLORS["P1-Critical"],
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
      onFilter(entry.band as AgeBand, "P1-Critical");
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-1 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
          <Clock className="h-4 w-4" /> Ticket Aging Overview
        </CardTitle>
        {activeFilter && (
          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={onClear}>
            <X className="h-3 w-3" /> Clear filter
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {headline && (
          <p className="text-xs font-semibold text-muted-foreground mb-3">{headline}</p>
        )}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: "Target", position: "right", fontSize: 9, fill: "#9ca3af" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer" onClick={handleBarClick}>
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center">
          {AGE_BANDS.map(band => (
            <div key={band} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: BUCKET_COLORS[band] }} />
              {BUCKET_LABELS[band]}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
