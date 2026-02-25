import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TicketPriority } from "@/types/assessment";
import { AGE_BANDS, AgeBand, PRIORITY_KEYS, getAgeBand } from "./slaConstants";
import { X } from "lucide-react";

const AGE_BAND_COLORS: Record<AgeBand, string> = {
  "90+": "hsl(0, 72%, 45%)",
  "61-90": "hsl(0, 65%, 58%)",
  "31-60": "hsl(25, 90%, 55%)",
  "0-30": "hsl(40, 90%, 60%)",
};

const AGE_BAND_LABELS: Record<AgeBand, string> = {
  "0-30": "0–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+": "90+ days",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  "P1-Critical": "P1 Critical",
  "P2-High": "P2 High",
  "P3-Medium": "P3 Medium",
  "P4-Low": "P4 Low",
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
  // Data: one row per priority, stacked by age band
  const data = useMemo(() => {
    const buckets: Record<TicketPriority, Record<AgeBand, number>> = {
      "P1-Critical": { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
      "P2-High": { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
      "P3-Medium": { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
      "P4-Low": { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
    };
    for (const t of tickets) {
      const band = getAgeBand(t.ageDays);
      buckets[t.ticketPriority][band]++;
    }
    return PRIORITY_KEYS.map(pk => ({
      priority: pk,
      label: PRIORITY_LABELS[pk],
      ...buckets[pk],
    }));
  }, [tickets]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.fill }} />
            <span className="text-muted-foreground">{AGE_BAND_LABELS[entry.dataKey as AgeBand]}:</span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Aging Breakdown by Priority</CardTitle>
        {activeFilter && (
          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={onClear}>
            <X className="h-3 w-3" /> Clear filter
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              {AGE_BANDS.map(band => (
                <Bar
                  key={band}
                  dataKey={band}
                  stackId="a"
                  fill={AGE_BAND_COLORS[band]}
                  cursor="pointer"
                  onClick={(barData: any) => {
                    if (barData && barData.priority) {
                      onFilter(band, barData.priority as TicketPriority);
                    }
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center">
          {AGE_BANDS.map(band => (
            <div key={band} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: AGE_BAND_COLORS[band] }} />
              {AGE_BAND_LABELS[band]}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
