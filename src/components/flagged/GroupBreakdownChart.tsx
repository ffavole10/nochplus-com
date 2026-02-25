import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TicketPriority } from "@/types/assessment";
import { PRIORITY_KEYS, PRIORITY_COLORS } from "./slaConstants";
import { X, Layers } from "lucide-react";

// Distinct colors avoiding red/orange/yellow (reserved for priority)
const GROUP_COLORS = [
  "hsl(210, 60%, 50%)", // blue
  "hsl(270, 50%, 55%)", // purple
  "hsl(174, 66%, 42%)", // teal
  "hsl(330, 55%, 50%)", // pink
  "hsl(195, 70%, 45%)", // cyan
  "hsl(240, 45%, 55%)", // indigo
  "hsl(150, 50%, 45%)", // green-teal
  "hsl(290, 40%, 60%)", // lavender
  "hsl(180, 55%, 40%)", // dark cyan
  "hsl(220, 55%, 60%)", // light blue
];

interface TicketItem {
  ticketPriority: TicketPriority;
  group: string | null;
}

interface Props {
  tickets: TicketItem[];
  activeGroupFilter: string | null;
  onFilter: (group: string) => void;
  onClear: () => void;
}

interface GroupData {
  name: string;
  count: number;
  pct: number;
  byPriority: Record<TicketPriority, number>;
}

export function GroupBreakdownChart({ tickets, activeGroupFilter, onFilter, onClear }: Props) {
  const { groups, total } = useMemo(() => {
    const map = new Map<string, Record<TicketPriority, number>>();
    for (const t of tickets) {
      const g = t.group || "Uncategorized";
      if (!map.has(g)) map.set(g, { "P1-Critical": 0, "P2-High": 0, "P3-Medium": 0, "P4-Low": 0 });
      map.get(g)![t.ticketPriority]++;
    }
    const total = tickets.length;
    const groups: GroupData[] = Array.from(map.entries())
      .map(([name, byPriority]) => {
        const count = Object.values(byPriority).reduce((s, v) => s + v, 0);
        return { name, count, pct: total > 0 ? Math.round(count / total * 100) : 0, byPriority };
      })
      .sort((a, b) => b.count - a.count);
    return { groups, total };
  }, [tickets]);

  const pieData = groups.map((g, i) => ({
    name: g.name,
    value: g.count,
    color: GROUP_COLORS[i % GROUP_COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold">{d.name}</p>
        <p className="text-muted-foreground">{d.value} tickets ({total > 0 ? Math.round(d.value / total * 100) : 0}%)</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" /> Group / Category Breakdown
        </CardTitle>
        {activeGroupFilter && (
          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={onClear}>
            <X className="h-3 w-3" /> Clear filter
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Donut Chart */}
          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 260, height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  cursor="pointer"
                  onClick={(entry: any) => onFilter(entry.name)}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Group × Priority Matrix */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Group</th>
                  {PRIORITY_KEYS.map(p => (
                    <th key={p} className="text-center py-1.5 px-1.5 font-semibold" style={{ color: PRIORITY_COLORS[p] }}>
                      {p.split("-")[0]}
                    </th>
                  ))}
                  <th className="text-center py-1.5 px-2 font-semibold text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => (
                  <tr
                    key={g.name}
                    className={`border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors ${
                      activeGroupFilter === g.name ? "bg-primary/10" : ""
                    }`}
                    onClick={() => onFilter(g.name)}
                  >
                    <td className="py-1.5 px-2 font-medium truncate max-w-[200px] flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length] }} />
                      <span className="truncate">{g.name}</span>
                    </td>
                    {PRIORITY_KEYS.map(p => (
                      <td
                        key={p}
                        className={`text-center py-1.5 px-1.5 ${
                          p === "P1-Critical" && g.byPriority[p] > 0 ? "bg-critical/10 font-semibold text-critical" : ""
                        }`}
                      >
                        {g.byPriority[p] > 0 ? g.byPriority[p] : "—"}
                      </td>
                    ))}
                    <td className="text-center py-1.5 px-2 font-semibold">{g.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
