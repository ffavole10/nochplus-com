import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { CHARGERS, ROW_A, ROW_B, STATUS_COLORS, SORTED_BY_CVS, KPI_CHIPS, ENV_BADGES, ERROR_FEED, ML_PATTERNS, MAX_MESSAGES, type ChargerData } from "./monitoringData";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Props {
  filter: string;
  onSelectCharger: (id: string) => void;
}

// Charger icon positions on the SVG map
const CHARGER_POS: Record<string, { x: number; y: number }> = {};
ROW_A.forEach((id, i) => { CHARGER_POS[id] = { x: 260 + i * 100, y: 195 }; });
ROW_B.forEach((id, i) => { CHARGER_POS[id] = { x: 260 + i * 100, y: 335 }; });

const JUNCTION = { x: 510, y: 265 };

function severityColor(s: string) {
  if (s === 'CRIT') return '#D93025';
  if (s === 'WARN') return '#E8760A';
  return '#1B8A7A';
}

export function MonitoringMapView({ filter, onSelectCharger }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [maxMsgIdx, setMaxMsgIdx] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [envPopover, setEnvPopover] = useState<number | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(50, Math.min(200, z + (e.deltaY > 0 ? -10 : 10))));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setMaxMsgIdx(i => (i + 1) % MAX_MESSAGES.length), 4000);
    return () => clearInterval(iv);
  }, []);

  const filteredIds = useMemo(() => {
    const all = Object.keys(CHARGERS);
    if (filter === 'All') return all;
    return all.filter(id => {
      const c = CHARGERS[id];
      if (filter === 'Critical') return c.status === 'critical';
      if (filter === 'Warning') return c.status === 'warning';
      if (filter === 'Healthy') return c.status === 'healthy';
      if (filter === 'Offline') return c.status === 'offline';
      return true;
    });
  }, [filter]);

  const dimmed = (id: string) => filter !== 'All' && filter !== 'Env. Risks' && !filteredIds.includes(id);

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}>
      {/* SVG Map */}
      <div
        ref={containerRef}
        className={cn("absolute inset-0 overflow-hidden rounded-lg border border-border bg-[#F1F5F4]", dragging ? "cursor-grabbing" : "cursor-grab")}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <svg
          width="100%" height="100%"
          viewBox={`${500 - 500 * (100 / zoom) - pan.x * (100 / zoom) / 100} ${250 - 250 * (100 / zoom) - pan.y * (100 / zoom) / 100} ${1000 * (100 / zoom)} ${500 * (100 / zoom)}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full select-none"
        >
          {/* Background */}
          <rect width="2000" height="1000" fill="#F1F5F4" />

          {/* Las Vegas Blvd */}
          <rect x="880" y="0" width="60" height="500" fill="#d4d8d7" rx="4" />
          <text x="910" y="490" fill="#9ca3af" fontSize="8" textAnchor="middle" transform="rotate(-90, 910, 490)">Las Vegas Blvd</text>
          <line x1="910" y1="0" x2="910" y2="500" stroke="#c0c4c3" strokeWidth="1" strokeDasharray="12,8" />

          {/* Hotel block */}
          <rect x="100" y="30" width="750" height="430" rx="8" fill="#e8eeed" stroke="#c5cccb" strokeWidth="1.5" />
          <text x="475" y="55" fill="#6b7280" fontSize="11" fontWeight="600" textAnchor="middle">FONTAINEBLEAU LAS VEGAS — EV CHARGING LOT</text>

          {/* Parking stall grid */}
          {ROW_A.map((_, i) => (
            <rect key={`sa${i}`} x={230 + i * 100} y="165" width="60" height="60" fill="none" stroke="#d1d5db" strokeWidth="0.5" rx="2" />
          ))}
          {ROW_B.map((_, i) => (
            <rect key={`sb${i}`} x={230 + i * 100} y="305" width="60" height="60" fill="none" stroke="#d1d5db" strokeWidth="0.5" rx="2" />
          ))}

          {/* Row labels */}
          <text x="210" y="200" fill="#9ca3af" fontSize="10" fontWeight="600" textAnchor="end">ROW A</text>
          <text x="210" y="340" fill="#9ca3af" fontSize="10" fontWeight="600" textAnchor="end">ROW B</text>

          {/* Junction box */}
          <rect x={JUNCTION.x - 20} y={JUNCTION.y - 15} width="40" height="30" rx="4" fill="#374151" stroke="#4b5563" strokeWidth="1" />
          <text x={JUNCTION.x} y={JUNCTION.y + 3} fill="#9ca3af" fontSize="6" textAnchor="middle">JUNCTION</text>

          {/* Power cables + session flow */}
          {Object.entries(CHARGER_POS).map(([id, pos]) => {
            const charger = CHARGERS[id];
            const color = STATUS_COLORS[charger.status];
            const isActive = charger.status !== 'offline';
            return (
              <g key={`cable-${id}`}>
                <line x1={pos.x} y1={pos.y} x2={JUNCTION.x} y2={JUNCTION.y} stroke="#9ca3af" strokeWidth="1" opacity="0.3" />
                {isActive && (
                  <line x1={pos.x} y1={pos.y} x2={JUNCTION.x} y2={JUNCTION.y}
                    stroke={color} strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6">
                    <animate attributeName="stroke-dashoffset" from="20" to="0" dur={charger.status === 'critical' ? '3s' : '1.2s'} repeatCount="indefinite" />
                  </line>
                )}
              </g>
            );
          })}

          {/* Charger icons */}
          {Object.entries(CHARGER_POS).map(([id, pos]) => {
            const charger = CHARGERS[id];
            const color = STATUS_COLORS[charger.status];
            const isDimmed = dimmed(id);
            const isHovered = hovered === id;
            const shortId = id.replace('NAS-', '');
            return (
              <g key={id} opacity={isDimmed ? 0.2 : 1}
                className="cursor-pointer"
                onClick={() => onSelectCharger(id)}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Pulse for critical */}
                {charger.status === 'critical' && (
                  <circle cx={pos.x} cy={pos.y} r="28" fill={`${color}15`} stroke={color} strokeWidth="1">
                    <animate attributeName="r" values="24;32;24" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                {charger.status === 'warning' && (
                  <circle cx={pos.x} cy={pos.y} r="26" fill="none" stroke={color} strokeWidth="0.8" opacity="0.3">
                    <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Icon body */}
                <rect x={pos.x - 18} y={pos.y - 18} width="36" height="36" rx="6"
                  fill={`${color}15`} stroke={color} strokeWidth={isHovered ? 2.5 : 1.5}
                  transform={isHovered ? `scale(1.15)` : ''} style={{ transformOrigin: `${pos.x}px ${pos.y}px`, transition: 'transform 0.15s' }}
                />
                {/* Lightning bolt */}
                <path d={`M${pos.x - 4},${pos.y - 8} L${pos.x + 2},${pos.y - 1} L${pos.x - 2},${pos.y - 1} L${pos.x + 4},${pos.y + 8}`}
                  fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* CVS */}
                <text x={pos.x} y={pos.y + 28} fill={color} fontSize="9" fontWeight="700" textAnchor="middle">{charger.cvs}</text>
                {/* ID label */}
                <text x={pos.x} y={pos.y + 38} fill="#6b7280" fontSize="7" textAnchor="middle">{shortId}</text>
                {/* Status pin dot */}
                {(charger.status === 'critical' || charger.status === 'warning') && (
                  <circle cx={pos.x + 14} cy={pos.y - 14} r="4" fill={color} stroke="white" strokeWidth="1.5">
                    {charger.status === 'critical' && <animate attributeName="r" values="4;5;4" dur="1s" repeatCount="indefinite" />}
                  </circle>
                )}
                {/* Hover tooltip */}
                {isHovered && (
                  <g>
                    <rect x={pos.x - 65} y={pos.y - 55} width="130" height="30" rx="4" fill="rgba(0,0,0,.85)" />
                    <text x={pos.x} y={pos.y - 43} fill="white" fontSize="8" textAnchor="middle" fontWeight="600">
                      {id} · CVS {charger.cvs}{charger.error ? ` · ${charger.error.substring(0, 18)}` : ''}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Environmental badges */}
          {ENV_BADGES.map((b, i) => {
            const isOpen = envPopover === i;
            return (
              <g key={i} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setEnvPopover(isOpen ? null : i); }}>
                <rect x={b.x - 55} y={b.y - 10} width="110" height="22" rx="11" fill="rgba(255,255,255,.9)" stroke="#d1d5db" strokeWidth="0.5" />
                <text x={b.x} y={b.y + 5} fill="#374151" fontSize="8" textAnchor="middle">{b.emoji} {b.type} · {b.risk}</text>
                {isOpen && (
                  <g>
                    <rect x={b.x - 80} y={b.y + 15} width="160" height="50" rx="6" fill="white" stroke="#d1d5db" strokeWidth="1" />
                    <text x={b.x} y={b.y + 32} fill="#374151" fontSize="9" fontWeight="600" textAnchor="middle">{b.type}</text>
                    <text x={b.x} y={b.y + 44} fill="#6b7280" fontSize="8" textAnchor="middle">{b.value}</text>
                    <text x={b.x} y={b.y + 56} fill="#E8760A" fontSize="8" fontWeight="600" textAnchor="middle">Risk: {b.risk}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* LEFT OVERLAYS */}
      <div className="absolute left-3 top-3 flex flex-col gap-2 w-[200px] z-10">
        {/* Location Stats */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs shadow-sm">
          <div className="font-bold text-foreground text-sm">Fontainebleau</div>
          <div className="text-muted-foreground">3600 Las Vegas Blvd S</div>
          <div className="flex gap-3 mt-1.5 text-[10px]">
            <span className="font-medium">12 Chargers</span>
            <span className="text-[#1B8A7A] font-medium">11 Online</span>
          </div>
        </div>

        {/* Predictive Threat Ring */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs shadow-sm flex flex-col items-center">
          <div className="text-[10px] text-muted-foreground font-medium mb-1">Predictive Threat Index</div>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="30" fill="none" stroke="#e5e7eb" strokeWidth="6" strokeDasharray="141.4 47.1" strokeDashoffset="-23.6" strokeLinecap="round" />
            <circle cx="40" cy="40" r="30" fill="none" stroke="#E8760A" strokeWidth="6"
              strokeDasharray={`${141.4 * 0.42} ${188.5 - 141.4 * 0.42}`} strokeDashoffset="-23.6" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 40 40" to="360 40 40" dur="60s" repeatCount="indefinite" />
            </circle>
            <text x="40" y="42" textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="bold" fill="#E8760A">42</text>
          </svg>
        </div>

        {/* Health Matrix */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-border p-2 text-xs shadow-sm">
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
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs shadow-sm">
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
      <div className="absolute right-3 top-3 flex flex-col gap-2 w-[220px] z-10">
        {/* Live Error Feed */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-border p-2 text-xs shadow-sm">
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
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-border p-3 text-xs shadow-sm">
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
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-2 bg-[hsl(var(--foreground))]/90 backdrop-blur-sm text-white rounded-full px-4 py-2 shadow-lg min-w-[400px]">
          {/* Animated waveform */}
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

      {/* Map Controls */}
      <div className="absolute bottom-3 right-3 flex flex-col items-center gap-1 z-10">
        <button onClick={() => setZoom(z => Math.min(200, z + 20))} className="w-7 h-7 rounded bg-white/90 border border-border text-sm font-bold shadow-sm hover:bg-muted">+</button>
        <span className="text-[9px] text-muted-foreground bg-white/80 px-1.5 rounded">{zoom}%</span>
        <button onClick={() => setZoom(z => Math.max(50, z - 20))} className="w-7 h-7 rounded bg-white/90 border border-border text-sm font-bold shadow-sm hover:bg-muted">−</button>
        <button onClick={() => { setZoom(100); setPan({ x: 0, y: 0 }); }} className="w-7 h-7 rounded bg-white/90 border border-border text-[9px] font-medium shadow-sm hover:bg-muted mt-1">↺</button>
      </div>
    </div>
  );
}
