import { CHARGERS, CHARGER_IDS, SORTED_BY_CVS, STATUS_COLORS, type ChargerData } from "./monitoringData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { Brain } from "lucide-react";

interface Props {
  onSelectCharger: (id: string) => void;
}

function CvsArcSmall({ cvs, status, delay, size = 90 }: { cvs: number; status: string; delay: number; size?: number }) {
  const color = STATUS_COLORS[status] || '#9E9E9E';
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(cvs, 100) / 100;
  const dashLen = circ * 0.75;
  const filled = dashLen * pct;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6}
        strokeDasharray={`${dashLen} ${circ - dashLen}`} strokeDashoffset={-circ * 0.125} strokeLinecap="round" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={-circ * 0.125} strokeLinecap="round">
        <animate attributeName="stroke-dasharray" from={`0 ${circ}`} to={`${filled} ${circ - filled}`} dur="0.8s" begin={`${delay}ms`} fill="freeze" />
      </circle>
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.26} fontWeight="bold" fill={color}>{cvs}</text>
    </svg>
  );
}

const FAILURE_TABLE = [
  { id: 'NAS-B04', cvs: 33, error: 'ConnectorLockFailure', confidence: 91, eta: '~8 days' },
  { id: 'NAS-B05', cvs: 58, error: 'HighTemperature', confidence: 78, eta: '~3 weeks' },
  { id: 'NAS-A03', cvs: 62, error: 'EVCommunicationError', confidence: 71, eta: '~5 weeks' },
  { id: 'NAS-B06', cvs: 0, error: 'NetworkDisconnected', confidence: 0, eta: 'Offline' },
];

const RADAR_DATA = [
  { axis: 'Thermal', value: 82 },
  { axis: 'Connector', value: 68 },
  { axis: 'Firmware', value: 91 },
  { axis: 'Comms', value: 77 },
  { axis: 'Sessions', value: 84 },
  { axis: 'Power', value: 88 },
];

const ENV_BARS = [
  { label: 'Heat Exposure', value: 91 },
  { label: 'UV Degradation', value: 83 },
  { label: 'Grid Events', value: 83 },
  { label: 'Coastal Corrosion', value: 74 },
  { label: 'Storm Impact', value: 61 },
  { label: 'Wind/Debris', value: 32 },
];

const MAX_KPIS = [
  { label: 'Diagnostic Accuracy', value: '94.2%' },
  { label: 'Auto-Heal Rate', value: '78.3%' },
  { label: 'False Positive Rate', value: '3.1%' },
  { label: 'Avg Resolution Time', value: '42s' },
  { label: 'Tickets Prevented', value: '12 this week' },
  { label: 'Revenue Protected', value: '$8,400' },
  { label: 'Patterns Learned', value: '847' },
  { label: 'Training Data Points', value: '124,392' },
  { label: 'Last Model Update', value: '2h ago' },
  { label: 'Uptime', value: '99.97%' },
];

// Generate random heatmap data
function generateHeatmap() {
  const rows = [];
  const labels = ['6AM','8AM','10AM','12PM','2PM','4PM','6PM','8PM','10PM','12AM','2AM','4AM'];
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  for (let d = 0; d < 7; d++) {
    const row = [];
    for (let h = 0; h < 12; h++) {
      // Peaks at 10AM-2PM (idx 2-4) and 6PM-9PM (idx 6-7)
      const isPeak = (h >= 2 && h <= 4) || (h >= 6 && h <= 7);
      const base = isPeak ? 60 + Math.random() * 40 : 10 + Math.random() * 40;
      row.push(Math.round(base));
    }
    rows.push(row);
  }
  return { rows, labels, days };
}

const heatmap = generateHeatmap();

function heatColor(v: number) {
  if (v > 80) return '#D93025';
  if (v > 60) return '#E8760A';
  if (v > 40) return '#F59E0B';
  if (v > 20) return '#FDE68A';
  return '#F3F4F6';
}

export function MonitoringAnalyticsView({ onSelectCharger }: Props) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* CVS Arc Gauge Grid */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fleet CVS Gauges</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-6 gap-3">
            {CHARGER_IDS.map((id, i) => {
              const c = CHARGERS[id];
              return (
                <div key={id} className="flex flex-col items-center cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors" onClick={() => onSelectCharger(id)}>
                  <CvsArcSmall cvs={c.cvs} status={c.status} delay={i * 80} />
                  <span className="text-[10px] font-mono font-medium mt-1">{id.replace('NAS-', '')}</span>
                  <div className="flex gap-0.5 mt-0.5">
                    {c.trend.slice(-3).map((v, j) => (
                      <span key={j} className="w-1 h-1 rounded-full" style={{ background: STATUS_COLORS[c.status] + (j === 2 ? 'ff' : '60') }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Predictive Failure Timeline */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Predictive Failure Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-5 text-[10px] text-muted-foreground font-medium border-b border-border pb-1">
                <span>Charger</span><span>CVS</span><span>Error</span><span>Confidence</span><span>ETA</span>
              </div>
              {FAILURE_TABLE.map(row => {
                const c = CHARGERS[row.id];
                const color = STATUS_COLORS[c.status];
                return (
                  <div key={row.id} className="grid grid-cols-5 text-xs items-center py-1 border-b border-border/30">
                    <span className="font-mono font-medium">{row.id.replace('NAS-', '')}</span>
                    <span className="font-bold" style={{ color }}>{row.cvs}</span>
                    <span className="text-muted-foreground text-[10px] truncate">{row.error}</span>
                    <div className="flex items-center gap-1">
                      {row.confidence > 0 ? (
                        <>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[50px]">
                            <div className="h-full rounded-full" style={{ width: `${row.confidence}%`, background: color }} />
                          </div>
                          <span className="text-[10px]" style={{ color }}>{row.confidence}%</span>
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </div>
                    <span className="font-medium" style={{ color }}>{row.eta}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Fleet Health Radar */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Fleet Health Radar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="#1B8A7A" fill="#1B8A7A" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Peak Stress Heatmap */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Peak Stress Heatmap</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `40px repeat(12, 1fr)` }}>
                <div />
                {heatmap.labels.map(l => <div key={l} className="text-[8px] text-muted-foreground text-center">{l}</div>)}
                {heatmap.days.map((day, d) => (
                  <>
                    <div key={`d${d}`} className="text-[9px] text-muted-foreground flex items-center">{day}</div>
                    {heatmap.rows[d].map((v, h) => (
                      <div key={`${d}${h}`} className="aspect-square rounded-sm flex items-center justify-center text-[7px]"
                        style={{ background: heatColor(v), color: v > 60 ? 'white' : '#9ca3af' }}
                        title={`${day} ${heatmap.labels[h]}: ${v}%`}>
                        {v}
                      </div>
                    ))}
                  </>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environmental Correlation */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Environmental Correlation</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ENV_BARS.map(bar => (
                <div key={bar.label}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">{bar.label}</span>
                    <span className="font-bold">{bar.value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${bar.value}%`,
                      background: bar.value > 80 ? '#D93025' : bar.value > 60 ? '#E8760A' : '#1B8A7A'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Neural OS Performance */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Brain className="h-4 w-4" /> Neural OS Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {MAX_KPIS.map(kpi => (
              <div key={kpi.label} className="rounded-md border border-border p-2.5">
                <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
                <div className="font-bold text-sm">{kpi.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
