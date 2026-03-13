import { useState, useEffect } from "react";
import { CHARGERS, SORTED_BY_CVS, STATUS_COLORS, ERROR_FEED, ML_PATTERNS, MAX_MESSAGES } from "./monitoringData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FleetMap } from "./FleetMap";

interface Props {
  filter: string;
  onSelectCharger: (id: string) => void;
}

function severityColor(s: string) {
  if (s === 'CRIT') return '#D93025';
  if (s === 'WARN') return '#E8760A';
  return '#1B8A7A';
}

export function MonitoringMapView({ filter, onSelectCharger }: Props) {
  const [maxMsgIdx, setMaxMsgIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setMaxMsgIdx(i => (i + 1) % MAX_MESSAGES.length), 4000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}>
      {/* Fleet Map */}
      <div className="absolute inset-0 rounded-lg border border-border overflow-hidden">
        <FleetMap filter={filter} onSelectCharger={onSelectCharger} />
      </div>

      {/* LEFT OVERLAYS */}
      <div className="absolute left-3 top-3 flex flex-col gap-2 w-[200px] z-[1000]">
        {/* Location Stats */}
        <div className="bg-card/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs shadow-sm">
          <div className="font-bold text-foreground text-sm">Fontainebleau</div>
          <div className="text-muted-foreground">3600 Las Vegas Blvd S</div>
          <div className="flex gap-3 mt-1.5 text-[10px]">
            <span className="font-medium">12 Chargers</span>
            <span className="text-[#1B8A7A] font-medium">11 Online</span>
          </div>
        </div>

        {/* Predictive Threat Ring */}
        <div className="bg-card/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs shadow-sm flex flex-col items-center">
          <div className="text-[10px] text-muted-foreground font-medium mb-1">Predictive Threat Index</div>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="30" fill="none" stroke="hsl(var(--border))" strokeWidth="6" strokeDasharray="141.4 47.1" strokeDashoffset="-23.6" strokeLinecap="round" />
            <circle cx="40" cy="40" r="30" fill="none" stroke="#E8760A" strokeWidth="6"
              strokeDasharray={`${141.4 * 0.42} ${188.5 - 141.4 * 0.42}`} strokeDashoffset="-23.6" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 40 40" to="360 40 40" dur="60s" repeatCount="indefinite" />
            </circle>
            <text x="40" y="42" textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="bold" fill="#E8760A">42</text>
          </svg>
        </div>

        {/* Health Matrix */}
        <div className="bg-card/90 backdrop-blur-sm rounded-lg border border-border p-2 text-xs shadow-sm">
          <div className="text-[10px] text-muted-foreground font-medium mb-1 px-1">Health Matrix</div>
          <ScrollArea className="h-[200px]">
            <div className="space-y-0.5">
              {SORTED_BY_CVS.map(id => {
                const c = CHARGERS[id];
                const color = STATUS_COLORS[c.status];
                return (
                  <div key={id} className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-muted/50 cursor-pointer" onClick={() => onSelectCharger(id)}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[10px] font-mono w-8 flex-shrink-0">{id.replace('NAS-', '')}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${c.cvs}%`, background: color }} />
                    </div>
                    <span className="text-[10px] font-bold w-5 text-right" style={{ color }}>{c.cvs}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Cascade Watch */}
        <div className="bg-card/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs shadow-sm">
          <div className="text-[10px] text-muted-foreground font-medium mb-1">Cascade Watch</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D93025] animate-pulse" />
            <span className="font-bold text-[#D93025]">NAS-B04</span>
          </div>
          <div className="text-muted-foreground mt-0.5">Step 2/4 · ~8 days to full failure</div>
          <div className="flex gap-1 mt-1.5">
            {[1, 2, 3, 4].map(step => (
              <div key={step} className={cn("flex-1 h-1.5 rounded-full", step <= 2 ? "bg-[#D93025]" : "bg-muted")} />
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT OVERLAYS */}
      <div className="absolute right-3 top-3 flex flex-col gap-2 w-[220px] z-[1000]">
        {/* Live Error Feed */}
        <div className="bg-card/90 backdrop-blur-sm rounded-lg border border-border p-2 text-xs shadow-sm">
          <div className="text-[10px] text-muted-foreground font-medium mb-1 px-1">Live Error Feed</div>
          <ScrollArea className="h-[180px]">
            <div className="space-y-1">
              {ERROR_FEED.map((e, i) => (
                <div key={i} className="flex items-start gap-1.5 px-1 py-1 rounded border border-border/30">
                  <span className="text-[9px] text-muted-foreground w-10 flex-shrink-0 mt-0.5">{e.time}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] truncate">{e.charger}</div>
                    <div className="text-muted-foreground text-[9px] truncate">{e.error}</div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ color: severityColor(e.severity), background: `${severityColor(e.severity)}15` }}>{e.severity}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Pattern Intelligence */}
        <div className="bg-card/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs shadow-sm">
          <div className="text-[10px] text-muted-foreground font-medium mb-1.5">Pattern Intelligence</div>
          <div className="space-y-1.5">
            {ML_PATTERNS.map((p, i) => (
              <div key={i} className="text-[10px]">
                <div className="text-foreground">{p.text}</div>
                <div className="text-muted-foreground">{p.unit ? `${p.confidence} ${p.unit}` : `${p.confidence}% confidence`}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Pulse Ribbon */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000]">
        <div className="flex items-center gap-2 bg-foreground/90 backdrop-blur-sm text-background rounded-full px-4 py-2 shadow-lg min-w-[400px]">
          <svg width="24" height="16" viewBox="0 0 24 16">
            {[3, 7, 11, 15, 19].map((x, i) => (
              <rect key={i} x={x} width="2" rx="1" fill="#1B8A7A">
                <animate attributeName="y" values={`${6 - i};${2};${6 - i}`} dur={`${0.6 + i * 0.1}s`} repeatCount="indefinite" />
                <animate attributeName="height" values={`${4 + i * 2};${12};${4 + i * 2}`} dur={`${0.6 + i * 0.1}s`} repeatCount="indefinite" />
              </rect>
            ))}
          </svg>
          <span className="text-xs font-medium truncate animate-fade-in" key={maxMsgIdx}>{MAX_MESSAGES[maxMsgIdx]}</span>
        </div>
      </div>
    </div>
  );
}
