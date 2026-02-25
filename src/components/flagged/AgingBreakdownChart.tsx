import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TicketPriority } from "@/types/assessment";
import { AGE_BANDS, AgeBand, PRIORITY_KEYS, PRIORITY_COLORS, getAgeBand } from "./slaConstants";
import { X } from "lucide-react";

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
  const data = useMemo(() => {
    const buckets: Record<AgeBand, Record<TicketPriority, number>> = {
      "0-30": { "P1-Critical": 0, "P2-High": 0, "P3-Medium": 0, "P4-Low": 0 },
      "31-60": { "P1-Critical": 0, "P2-High": 0, "P3-Medium": 0, "P4-Low": 0 },
      "61-90": { "P1-Critical": 0, "P2-High": 0, "P3-Medium": 0, "P4-Low": 0 },
      "90+": { "P1-Critical": 0, "P2-High": 0, "P3-Medium": 0, "P4-Low": 0 },
    };
    for (const t of tickets) {
      const band = getAgeBand(t.ageDays);
      buckets[band][t.ticketPriority]++;
    }
    return AGE_BANDS.map(band => ({
      band,
      label: band === "90+" ? "90+ days" : `${band} days`,
      ...buckets[band],
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
            <span className="text-muted-foreground">{entry.dataKey}:</span>
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
              {PRIORITY_KEYS.map(pk => (
                <Bar
                  key={pk}
                  dataKey={pk}
                  stackId="a"
                  fill={PRIORITY_COLORS[pk]}
                  cursor="pointer"
                  onClick={(barData: any) => {
                    if (barData && barData.band) {
                      onFilter(barData.band as AgeBand, pk);
                    }
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center">
          {PRIORITY_KEYS.map(pk => (
            <div key={pk} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PRIORITY_COLORS[pk] }} />
              {pk.split("-")[0]}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
