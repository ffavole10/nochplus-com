import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getComponentBreakdown, getIssuesBreakdown, Charger } from "@/data/chargerData";
import { PieChartIcon, BarChart3, Lightbulb, DollarSign, Clock, MapPin } from "lucide-react";

interface ComponentAnalysisProps {
  chargers: Charger[];
  onComponentClick: (component: string) => void;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

export function ComponentAnalysis({ chargers, onComponentClick }: ComponentAnalysisProps) {
  const componentData = getComponentBreakdown(chargers);
  const issueData = getIssuesBreakdown(chargers).slice(0, 8);

  // Calculate insights
  const topComponent = componentData[0];
  const affectedByTop = chargers.filter(c => 
    c.issues?.some(i => i.toLowerCase().includes(topComponent?.name.toLowerCase().split('/')[0] || ''))
  );
  const topCities = [...new Set(affectedByTop.map(c => c.city))].slice(0, 3);

  const insights = [
    {
      title: `${topComponent?.name} issues are #1 failure (${topComponent?.percentage}% of issues)`,
      details: `Affects ${affectedByTop.length} chargers across ${topCities.length} cities`,
      recommendation: `Bulk ${topComponent?.name.split('/')[0]} replacement program`,
      cost: "$8,400",
      timeline: "2 weeks",
    },
    {
      title: "Screen damage concentrated in San Diego",
      details: "Vandalism suspected based on damage patterns",
      recommendation: "Install protective shields on high-risk units",
      cost: "$2,100",
      timeline: "1 week",
    },
    {
      title: "Cable wear in high-traffic locations",
      details: "8 of 10 cable issues at airport/parking locations",
      recommendation: "Upgrade to heavy-duty cables at airports",
      cost: "$4,800",
      timeline: "3 weeks",
    },
  ];

  return (
    <div className="dashboard-section">
      <h2 className="dashboard-section-title mb-6">
        <PieChartIcon className="w-5 h-5" />
        Component Failure Analysis
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Donut Chart */}
        <div className="metric-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-muted-foreground" />
            Repairs by Component
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={componentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(data) => onComponentClick(data.name)}
                  className="cursor-pointer"
                >
                  {componentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.value} issues ({data.percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  formatter={(value, entry: any) => (
                    <span className="text-sm">
                      {value} ({entry.payload.percentage}%)
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Click a segment to filter map
          </p>
        </div>

        {/* Bar Chart */}
        <div className="metric-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Issue Frequency
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issueData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                          <p className="font-medium">{payload[0].payload.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {payload[0].value} occurrences
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--secondary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pattern Insights */}
      <div className="metric-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-degraded" />
          Key Findings & Recommendations
        </h3>
        <div className="space-y-4">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="p-4 bg-muted/30 rounded-lg border border-border/50"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    → {insight.details}
                  </p>
                  <p className="text-sm font-medium text-secondary mb-3">
                    Recommendation: {insight.recommendation}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Est. Cost: {insight.cost}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Timeline: {insight.timeline}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
