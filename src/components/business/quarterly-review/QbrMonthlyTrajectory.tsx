import { Card, CardContent } from "@/components/ui/card";
import { Bar, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from "recharts";
import { Pencil, Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/formatters";
import { useUpdateMonthlyAnnotation, type QbrMonthlyBreakdown } from "@/hooks/useQbr";

export function QbrMonthlyTrajectory({ months }: { months: QbrMonthlyBreakdown[] }) {
  if (!months || months.length === 0) return null;

  const data = months.map((m) => ({
    id: m.id,
    month: m.month_label,
    revenue: Number(m.revenue ?? 0),
    netIncome: Number(m.net_income ?? 0),
    annotation: m.annotation || "",
    qbr_id: m.qbr_id,
  }));

  return (
    <Card className="print:break-inside-avoid">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Monthly P&L Trajectory</h3>
          <span className="text-xs text-muted-foreground">Bars: revenue · Line: net income</span>
        </div>

        <div className="w-full h-[280px] print:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 24, right: 50, left: 10, bottom: 10 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
              <ReferenceLine
                yAxisId="right"
                y={0}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{ value: "$0", position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name === "revenue" ? "Revenue" : "Net Income"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar yAxisId="left" dataKey="revenue" fill="hsl(174 70% 45%)" radius={[4, 4, 0, 0]} maxBarSize={80}>
                <LabelList dataKey="revenue" position="top" formatter={(v: number) => formatCurrency(v)} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="netIncome"
                stroke="hsl(220 50% 25%)"
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(220 50% 25%)" }}
                activeDot={{ r: 6 }}
              >
                <LabelList
                  dataKey="netIncome"
                  position="top"
                  content={(props: any) => {
                    const { x, y, value } = props;
                    if (value == null) return null;
                    const positive = value >= 0;
                    const sign = positive ? "+" : "-";
                    const label = `${sign}${formatCurrency(Math.abs(value))}`;
                    return (
                      <text
                        x={x}
                        y={y - 10}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fill={positive ? "hsl(174 70% 35%)" : "hsl(0 70% 50%)"}
                      >
                        {label}
                      </text>
                    );
                  }}
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
          {data.map((m) => (
            <AnnotationCell key={m.id} id={m.id} qbrId={m.qbr_id} month={m.month} annotation={m.annotation} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AnnotationCell({ id, qbrId, month, annotation }: { id: string; qbrId: string; month: string; annotation: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(annotation);
  const update = useUpdateMonthlyAnnotation();

  return (
    <div className="group rounded border p-2 text-xs flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground">{month}</div>
        {editing ? (
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="mt-1 h-7 text-xs"
            autoFocus
          />
        ) : (
          <div className="mt-1">{annotation || <span className="italic text-muted-foreground">No annotation</span>}</div>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { update.mutate({ id, qbr_id: qbrId, annotation: val }); setEditing(false); }}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setVal(annotation); setEditing(false); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 print:hidden" onClick={() => setEditing(true)}>
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
