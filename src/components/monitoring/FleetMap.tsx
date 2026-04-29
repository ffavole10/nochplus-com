import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { CHARGERS, ROW_A, ROW_B, STATUS_COLORS, ENV_BADGES } from "./monitoringData";
import { cn } from "@/lib/utils";
import { Plus, Minus } from "lucide-react";

// US map simplified outline path
const US_OUTLINE = "M60,180 L80,170 L100,160 L130,155 L145,140 L160,130 L175,125 L200,120 L220,115 L240,110 L260,108 L285,110 L310,108 L335,112 L360,118 L380,125 L395,135 L405,142 L420,150 L430,148 L445,155 L455,160 L460,175 L455,185 L445,195 L440,210 L435,225 L430,240 L420,255 L410,265 L400,275 L385,285 L370,295 L355,300 L340,308 L320,312 L300,318 L280,322 L260,328 L240,335 L220,340 L200,338 L185,332 L170,325 L155,318 L140,312 L125,305 L110,298 L95,290 L80,278 L70,265 L62,250 L58,235 L55,220 L55,200 L60,180 Z";

// Placeholder cities
const PLACEHOLDER_CITIES = [
  { name: "Seattle", cx: 95, cy: 155, label: "No sites yet" },
  { name: "Chicago", cx: 340, cy: 175, label: "No sites yet" },
  { name: "Miami", cx: 420, cy: 320, label: "No sites yet" },
  { name: "New York", cx: 435, cy: 170, label: "No sites yet" },
];

// SVG internal coordinates for charger icons (site view)
const CHARGER_POS: Record<string, { x: number; y: number }> = {};
ROW_A.forEach((id, i) => { CHARGER_POS[id] = { x: 260 + i * 100, y: 195 }; });
ROW_B.forEach((id, i) => { CHARGER_POS[id] = { x: 260 + i * 100, y: 335 }; });
const JUNCTION = { x: 510, y: 265 };

interface FleetMapProps {
  filter: string;
  onSelectCharger: (id: string) => void;
}

export function FleetMap({ filter, onSelectCharger }: FleetMapProps) {
  const [zoomLevel, setZoomLevel] = useState(15);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const isSiteView = zoomLevel >= 10;

  // Attach wheel listener as non-passive so we can preventDefault page scroll while zooming the map.
  // React's synthetic onWheel is passive by default and would log "Unable to preventDefault" warnings.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoomLevel(z => Math.max(1, Math.min(15, z + (e.deltaY < 0 ? 1 : -1))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isSiteView) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setPanOrigin({ x: panX, y: panY });
  }, [isSiteView, panX, panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanX(panOrigin.x + (e.clientX - panStart.x));
    setPanY(panOrigin.y + (e.clientY - panStart.y));
  }, [isPanning, panStart, panOrigin]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Reset pan when switching views
  useEffect(() => {
    if (!isSiteView) { setPanX(0); setPanY(0); }
  }, [isSiteView]);

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

  const isDimmed = (id: string) => filter !== 'All' && filter !== 'Env. Risks' && !filteredIds.includes(id);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={isSiteView ? "0 0 1000 500" : "0 0 520 420"}
        className={cn(
          "w-full h-full bg-card rounded-lg border border-border transition-all duration-500 ease-in-out",
          isPanning ? "cursor-grabbing" : isSiteView ? "cursor-grab" : "cursor-default"
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* National/City View */}
        {!isSiteView && (
          <g className="animate-fade-in">
            {/* Background */}
            <rect width="520" height="420" fill="hsl(var(--card))" rx="8" />

            {/* US outline */}
            <path d={US_OUTLINE} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" opacity="0.6" />

            {/* Placeholder cities */}
            {PLACEHOLDER_CITIES.map(city => (
              <g key={city.name}>
                <circle cx={city.cx} cy={city.cy} r="4" fill="hsl(var(--muted-foreground))" opacity="0.3" />
                <text x={city.cx} y={city.cy - 10} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" opacity="0.5" fontWeight="500">
                  {city.name}
                </text>
                <text x={city.cx} y={city.cy + 14} textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))" opacity="0.35">
                  {city.label}
                </text>
              </g>
            ))}

            {/* Fontainebleau marker — pulsing red */}
            <g>
              <circle cx="285" cy="310" r="18" fill="#D9302520" stroke="#D93025" strokeWidth="1">
                <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="285" cy="310" r="8" fill="#D93025" stroke="white" strokeWidth="2">
                <animate attributeName="r" values="7;9;7" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x="285" y="310" textAnchor="middle" dominantBaseline="middle" fontSize="6" fill="white" fontWeight="bold">12</text>

              {/* Label */}
              <rect x="195" y="272" width="180" height="28" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.95" />
              <text x="285" y="284" textAnchor="middle" fontSize="8" fontWeight="700" fill="hsl(var(--foreground))">
                Fontainebleau LV · 12 chargers
              </text>
              <text x="285" y="294" textAnchor="middle" fontSize="7" fontWeight="600" fill="#D93025">
                1 CRITICAL
              </text>
            </g>

            {/* Hint */}
            <text x="260" y="405" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" opacity="0.5">
              Scroll to zoom into site view
            </text>
          </g>
        )}

        {/* Site View — Parking Lot */}
        {isSiteView && (
          <g transform={`translate(${panX}, ${panY})`} className="animate-fade-in">
            {/* Background */}
            <rect width="1000" height="500" fill="hsl(var(--muted))" fillOpacity="0.4" />

            {/* Road */}
            <rect x="880" y="0" width="60" height="500" fill="hsl(var(--muted))" rx="4" />
            <text x="910" y="490" fill="hsl(var(--muted-foreground))" fontSize="8" textAnchor="middle" transform="rotate(-90, 910, 490)">Las Vegas Blvd</text>
            <line x1="910" y1="0" x2="910" y2="500" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="12,8" />

            {/* Parking lot border */}
            <rect x="100" y="30" width="750" height="430" rx="8" fill="hsl(var(--muted))" fillOpacity="0.5" stroke="hsl(var(--border))" strokeWidth="1.5" />
            <text x="475" y="55" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="600" textAnchor="middle">FONTAINEBLEAU LAS VEGAS — EV CHARGING LOT</text>

            {/* Parking spaces */}
            {ROW_A.map((_, i) => (
              <rect key={`spA${i}`} x={230 + i * 100} y="165" width="60" height="60" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" rx="2" />
            ))}
            {ROW_B.map((_, i) => (
              <rect key={`spB${i}`} x={230 + i * 100} y="305" width="60" height="60" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" rx="2" />
            ))}

            {/* Row labels */}
            <text x="210" y="200" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="600" textAnchor="end">ROW A</text>
            <text x="210" y="340" fill="hsl(var(--muted-foreground))" fontSize="10" fontWeight="600" textAnchor="end">ROW B</text>

            {/* Junction box */}
            <rect x={JUNCTION.x - 20} y={JUNCTION.y - 15} width="40" height="30" rx="4" fill="hsl(var(--foreground))" fillOpacity="0.85" stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
            <text x={JUNCTION.x} y={JUNCTION.y + 3} fill="hsl(var(--muted-foreground))" fontSize="6" textAnchor="middle">JUNCTION</text>

            {/* Chargers */}
            {Object.entries(CHARGER_POS).map(([id, pos]) => {
              const ch = CHARGERS[id];
              const col = STATUS_COLORS[ch.status];
              const op = isDimmed(id) ? 0.2 : 1;

              return (
                <g key={id} opacity={op} style={{ cursor: 'pointer' }} onClick={() => onSelectCharger(id)}>
                  {/* Cable to junction */}
                  <line x1={pos.x} y1={pos.y} x2={JUNCTION.x} y2={JUNCTION.y} stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.3" />
                  {ch.status !== 'offline' && (
                    <line x1={pos.x} y1={pos.y} x2={JUNCTION.x} y2={JUNCTION.y} stroke={col} strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6">
                      <animate attributeName="stroke-dashoffset" from="20" to="0" dur={ch.status === 'critical' ? '3s' : '1.2s'} repeatCount="indefinite" />
                    </line>
                  )}

                  {/* Pulse rings for critical/warning */}
                  {ch.status === 'critical' && (
                    <circle cx={pos.x} cy={pos.y} r="28" fill={`${col}15`} stroke={col} strokeWidth="1">
                      <animate attributeName="r" values="24;32;24" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {ch.status === 'warning' && (
                    <circle cx={pos.x} cy={pos.y} r="26" fill="none" stroke={col} strokeWidth="0.8" opacity="0.3">
                      <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Charger icon */}
                  <rect x={pos.x - 18} y={pos.y - 18} width="36" height="36" rx="6" fill={`${col}15`} stroke={col} strokeWidth="1.5" />
                  <path
                    d={`M${pos.x - 4},${pos.y - 8} L${pos.x + 2},${pos.y - 1} L${pos.x - 2},${pos.y - 1} L${pos.x + 4},${pos.y + 8}`}
                    fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />

                  {/* CVS score */}
                  <text x={pos.x} y={pos.y + 28} fill={col} fontSize="9" fontWeight="700" textAnchor="middle">{ch.cvs}</text>
                  <text x={pos.x} y={pos.y + 38} fill="hsl(var(--muted-foreground))" fontSize="7" textAnchor="middle">{id.replace('NAS-', '')}</text>

                  {/* Alert badge */}
                  {(ch.status === 'critical' || ch.status === 'warning') && (
                    <circle cx={pos.x + 14} cy={pos.y - 14} r="4" fill={col} stroke="white" strokeWidth="1.5">
                      {ch.status === 'critical' && <animate attributeName="r" values="4;5;4" dur="1s" repeatCount="indefinite" />}
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Environmental badges */}
            {ENV_BADGES.map((b, i) => (
              <g key={i}>
                <rect x={b.x - 55} y={b.y - 10} width="110" height="22" rx="11" fill="hsl(var(--card))" fillOpacity="0.9" stroke="hsl(var(--border))" strokeWidth="0.5" />
                <text x={b.x} y={b.y + 5} fill="hsl(var(--foreground))" fontSize="8" textAnchor="middle">
                  {b.emoji} {b.type} · {b.risk}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-[1000]">
        <button
          onClick={() => setZoomLevel(z => Math.min(15, z + 1))}
          className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-colors"
        >
          <Plus className="w-4 h-4 text-foreground" />
        </button>
        <div className="text-[9px] text-center text-muted-foreground font-mono">{zoomLevel}</div>
        <button
          onClick={() => setZoomLevel(z => Math.max(1, z - 1))}
          className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-colors"
        >
          <Minus className="w-4 h-4 text-foreground" />
        </button>
      </div>
    </div>
  );
}
