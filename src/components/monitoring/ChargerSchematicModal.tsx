import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CHARGERS, STATUS_COLORS, FAULT_COMPONENT_MAP, COMPONENT_LIST, getComponentStatus, type ChargerData } from "./monitoringData";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface Props {
  chargerId: string | null;
  onClose: () => void;
}

const TABS = ['Isometric Cutaway', 'Front View', 'Side Profile', 'Top (Heli) View'] as const;

function CvsArc({ cvs, status, size = 120 }: { cvs: number; status: string; size?: number }) {
  const color = STATUS_COLORS[status] || '#9E9E9E';
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(cvs, 100) / 100;
  const dashLen = circ * 0.75;
  const filled = dashLen * pct;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8}
        strokeDasharray={`${dashLen} ${circ - dashLen}`} strokeDashoffset={-circ * 0.125} strokeLinecap="round" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={-circ * 0.125} strokeLinecap="round">
        <animate attributeName="stroke-dasharray" from={`0 ${circ}`} to={`${filled} ${circ - filled}`} dur="1s" fill="freeze" />
      </circle>
      <text x={size / 2} y={size / 2 + 2} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.28} fontWeight="bold" fill={color}>{cvs}</text>
      <text x={size / 2} y={size / 2 + size * 0.18} textAnchor="middle" fontSize={size * 0.1} fill="#6b7280">CVS</text>
    </svg>
  );
}

function Sparkline({ data, color, width = 140, height = 40 }: { data: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="overflow-visible">
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between w-full text-[9px] text-muted-foreground mt-0.5">
        <span>D-6</span><span>NOW</span>
      </div>
    </div>
  );
}

function HeartbeatOverlay({ error }: { error: string }) {
  const fault = FAULT_COMPONENT_MAP[error];
  if (!fault) return null;
  const { cx, cy, label } = fault;
  const labelW = label.length * 10 + 50;
  const labelX = Math.max(0, cx - labelW / 2);
  const labelY = cy - 112;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1186 974" preserveAspectRatio="xMidYMid meet">
      <style>{`@keyframes crosshairBlink { 50% { opacity: 1; } 0%, 100% { opacity: 0.35; } }`}</style>
      <g transform={`translate(${cx}, ${cy})`}>
        <ellipse cx="0" cy="0" rx="64" ry="50" fill="rgba(217,48,37,.12)">
          <animate attributeName="opacity" values="0;.2;0;.15;0" dur="1.3s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="0" cy="0" rx="64" ry="50" fill="none" stroke="#D93025" strokeWidth="2.8">
          <animate attributeName="opacity" values="0;1;.5;.85;.15;0" dur="1.3s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="0" cy="0" rx="84" ry="66" fill="none" stroke="rgba(217,48,37,.5)" strokeWidth="1.8">
          <animate attributeName="opacity" values="0;0;.7;.3;.6;0" dur="1.3s" repeatCount="indefinite" begin=".1s" />
        </ellipse>
        <ellipse cx="0" cy="0" rx="108" ry="86" fill="none" stroke="rgba(217,48,37,.22)" strokeWidth="1.2">
          <animate attributeName="opacity" values="0;0;0;.45;.1;0" dur="1.3s" repeatCount="indefinite" begin=".2s" />
        </ellipse>
        <g opacity="0.5" style={{ animation: 'crosshairBlink 1.3s infinite' }}>
          <line x1="-82" y1="0" x2="-70" y2="0" stroke="rgba(217,48,37,.7)" strokeWidth="1.8" />
          <line x1="70" y1="0" x2="82" y2="0" stroke="rgba(217,48,37,.7)" strokeWidth="1.8" />
          <line x1="0" y1="-64" x2="0" y2="-52" stroke="rgba(217,48,37,.7)" strokeWidth="1.8" />
          <line x1="0" y1="52" x2="0" y2="64" stroke="rgba(217,48,37,.7)" strokeWidth="1.8" />
          <path d="M-64,-50 L-64,-34 M-64,-50 L-48,-50" stroke="rgba(217,48,37,.55)" strokeWidth="1.4" fill="none" />
          <path d="M64,-50 L64,-34 M64,-50 L48,-50" stroke="rgba(217,48,37,.55)" strokeWidth="1.4" fill="none" />
          <path d="M-64,50 L-64,34 M-64,50 L-48,50" stroke="rgba(217,48,37,.55)" strokeWidth="1.4" fill="none" />
          <path d="M64,50 L64,34 M64,50 L48,50" stroke="rgba(217,48,37,.55)" strokeWidth="1.4" fill="none" />
        </g>
        <g opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0;0" dur="1.3s" repeatCount="indefinite" begin=".1s" />
          <rect x="-62" y="60" width="124" height="32" rx="6" fill="rgba(8,18,16,.85)" stroke="rgba(217,48,37,.35)" strokeWidth="1" />
          <polyline points="-54,76 -43,76 -37,64 -31,88 -25,62 -17,76 -5,76 5,67 15,76 32,76"
            fill="none" stroke="#D93025" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray="240" strokeDashoffset="240">
            <animate attributeName="stroke-dashoffset" values="240;0;0;240" dur="1.3s" repeatCount="indefinite" />
          </polyline>
        </g>
      </g>
      <line x1={cx} y1={labelY + 40} x2={cx} y2={cy - 50} stroke="rgba(217,48,37,.65)" strokeWidth="1.8" strokeDasharray="6,4" />
      <g transform={`translate(${labelX}, ${labelY})`}>
        <rect x="0" y="0" width={labelW} height="40" rx="8" fill="#C62828">
          <animate attributeName="opacity" values="1;.88;1;.9;1" dur="1.3s" repeatCount="indefinite" />
        </rect>
        <rect x="0" y="0" width={labelW} height="20" rx="8" fill="rgba(255,255,255,.06)" />
        <circle cx="20" cy="20" r="7" fill="white">
          <animate attributeName="opacity" values="1;.1;1;.25;1" dur="1s" repeatCount="indefinite" />
        </circle>
        <text x="38" y="26" fill="white" fontSize="14" fontFamily="monospace" fontWeight="700" letterSpacing="0.6">{label}</text>
      </g>
    </svg>
  );
}

function HealthyOverlay() {
  const components = [
    { label: '✓ Connector OK', cx: 285, cy: 670 },
    { label: '✓ Controller OK', cx: 820, cy: 700 },
    { label: '✓ Cooling OK', cx: 820, cy: 480 },
    { label: '✓ LED/Comms OK', cx: 700, cy: 90 },
  ];
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1186 974" preserveAspectRatio="xMidYMid meet">
      {components.map((c, i) => (
        <g key={i} transform={`translate(${c.cx - 50}, ${c.cy - 12})`}>
          <rect width="100" height="24" rx="6" fill="rgba(27,138,122,.15)" stroke="#1B8A7A" strokeWidth="1" />
          <text x="50" y="16" textAnchor="middle" fill="#1B8A7A" fontSize="11" fontWeight="600">{c.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function ChargerSchematicModal({ chargerId, onClose }: Props) {
  const [tab, setTab] = useState<typeof TABS[number]>('Isometric Cutaway');

  if (!chargerId) return null;
  const charger = CHARGERS[chargerId];
  if (!charger) return null;

  const color = STATUS_COLORS[charger.status];
  const shortId = chargerId.replace('NAS-', '');
  const statusLabel = charger.status === 'critical' ? 'CRITICAL FAULT' : charger.status === 'warning' ? 'WARNING' : charger.status === 'offline' ? 'OFFLINE' : 'OPERATIONAL';

  const compStatusColor = (s: 'ok' | 'warn' | 'fail') => s === 'fail' ? '#D93025' : s === 'warn' ? '#E8760A' : '#1B8A7A';
  const compStatusLabel = (s: 'ok' | 'warn' | 'fail') => s === 'fail' ? 'FAIL' : s === 'warn' ? 'WARN' : 'OK';

  return (
    <Dialog open={!!chargerId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[1100px] w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden border-0 bg-card">
        <DialogTitle className="sr-only">Charger {chargerId} Details</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ background: 'linear-gradient(135deg, #07100E, #142220)' }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-white" style={{ background: color }}>
              {charger.status === 'critical' && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              {statusLabel}
            </span>
            <div>
              <div className="text-white font-bold text-sm">{chargerId}</div>
              <div className="text-white/60 text-xs">Fontainebleau Las Vegas · Stall {shortId}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/30">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-2 text-xs font-medium transition-colors border-b-2",
                tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>{t}</button>
          ))}
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row overflow-hidden" style={{ height: 'calc(92vh - 100px)', maxHeight: '680px' }}>
          {/* LEFT — Schematic */}
          <div className="flex-1 relative bg-[#f8fafa] overflow-hidden flex items-center justify-center min-h-[300px]">
            {tab === 'Isometric Cutaway' && (
              <>
                <img src="/assets/charger-schematic-iso.jpg" alt="Charger isometric cutaway" className="w-full h-full object-contain" />
                {charger.error ? <HeartbeatOverlay error={charger.error} /> : <HealthyOverlay />}
              </>
            )}
            {tab === 'Front View' && (
              <div className="w-full h-full overflow-hidden relative">
                <img src="/assets/charger-schematic-multi.jpg" alt="Front view" className="absolute" style={{ top: 0, left: '-50%', width: '200%', height: '50%', objectFit: 'cover', objectPosition: 'right top' }} />
              </div>
            )}
            {tab === 'Side Profile' && (
              <div className="w-full h-full overflow-hidden relative">
                <img src="/assets/charger-schematic-multi.jpg" alt="Side profile" className="absolute" style={{ top: '-50%', left: 0, width: '50%', height: '200%', objectFit: 'cover', objectPosition: 'left bottom' }} />
              </div>
            )}
            {tab === 'Top (Heli) View' && (
              <div className="w-full h-full overflow-hidden relative">
                <img src="/assets/charger-schematic-multi.jpg" alt="Top view" className="absolute" style={{ top: 0, left: 0, width: '50%', height: '50%', objectFit: 'cover', objectPosition: 'left top' }} />
              </div>
            )}
          </div>

          {/* RIGHT — Info Panel */}
          <div className="w-full md:w-[340px] border-l border-border overflow-y-auto p-4 space-y-4">
            {/* CVS Arc */}
            <div className="flex flex-col items-center">
              <CvsArc cvs={charger.cvs} status={charger.status} />
              <div className="font-bold text-sm mt-1">{chargerId}</div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color, background: `${color}18` }}>{statusLabel}</span>
            </div>

            {/* Sparkline */}
            <div className="flex flex-col items-center">
              <div className="text-[10px] text-muted-foreground mb-1 font-medium">7-Day CVS Trend</div>
              <Sparkline data={charger.trend} color={color} />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-border p-2">
                <div className="text-muted-foreground text-[10px]">Session Rate</div>
                <div className="font-bold">{charger.sessions}</div>
              </div>
              <div className="rounded-md border border-border p-2">
                <div className="text-muted-foreground text-[10px]">Error Duration</div>
                <div className="font-bold">{charger.since}</div>
              </div>
              <div className="rounded-md border border-border p-2">
                <div className="text-muted-foreground text-[10px]">Thermal</div>
                <div className="font-bold">{charger.thermal}</div>
              </div>
              <div className="rounded-md border border-border p-2">
                <div className="text-muted-foreground text-[10px]">Failure ETA</div>
                <div className="font-bold">{charger.status === 'critical' ? '~8 days' : charger.status === 'warning' ? '~3 weeks' : '—'}</div>
              </div>
            </div>

            {/* Error Box */}
            {charger.error && (
              <div className="rounded-md border-l-4 p-3 text-xs" style={{ borderColor: color, background: `${color}08` }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
                  <span className="font-mono font-bold" style={{ color }}>{charger.error}</span>
                </div>
                <div className="text-muted-foreground mt-1">{charger.errorDesc}</div>
              </div>
            )}

            {/* Component Status */}
            <div>
              <div className="text-[10px] text-muted-foreground font-medium mb-1.5">Component Status</div>
              <div className="space-y-1">
                {COMPONENT_LIST.map(comp => {
                  const s = getComponentStatus(charger, comp);
                  return (
                    <div key={comp} className="flex items-center justify-between text-xs py-1 px-2 rounded border border-border/50">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full", s === 'fail' && "animate-pulse")} style={{ background: compStatusColor(s) }} />
                        <span>{comp}</span>
                      </div>
                      <span className="font-bold text-[10px]" style={{ color: compStatusColor(s) }}>{compStatusLabel(s)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Max AI Assessment */}
            <div className="rounded-md p-3 text-xs" style={{ background: '#1B8A7A12', border: '1px solid #1B8A7A30' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span>🤖</span>
                <span className="font-bold text-[#1B8A7A]">Max AI Assessment</span>
              </div>
              <div className="text-muted-foreground">{charger.maxNote}</div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 text-xs font-medium py-2 rounded-md text-white transition-colors" style={{ background: charger.status === 'critical' ? '#D93025' : 'hsl(var(--primary))' }}>
                Open Ticket
              </button>
              <button className="flex-1 text-xs font-medium py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors">
                Create Estimate
              </button>
              <button className="flex-1 text-xs font-medium py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors">
                View History
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
