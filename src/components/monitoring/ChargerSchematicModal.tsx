import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CHARGERS, STATUS_COLORS, FAULT_COMPONENT_MAP, COMPONENT_LIST, getComponentStatus, type ChargerData } from "./monitoringData";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface Props {
  chargerId: string | null;
  onClose: () => void;
}



function CvsArc({ cvs, status, size = 100 }: { cvs: number; status: string; size?: number }) {
  const color = STATUS_COLORS[status] || '#9E9E9E';
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(cvs, 100) / 100;
  const dashLen = circ * 0.75;
  const filled = dashLen * pct;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={6}
        strokeDasharray={`${dashLen} ${circ - dashLen}`} strokeDashoffset={-circ * 0.125} strokeLinecap="round" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={-circ * 0.125} strokeLinecap="round">
        <animate attributeName="stroke-dasharray" from={`0 ${circ}`} to={`${filled} ${circ - filled}`} dur="1s" fill="freeze" />
      </circle>
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.26} fontWeight="bold" fill={color}>{cvs}</text>
      <text x={size / 2} y={size / 2 + size * 0.16} textAnchor="middle" fontSize={size * 0.1} fill="hsl(var(--muted-foreground))">CVS</text>
    </svg>
  );
}

function Sparkline({ data, color, width = 120, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="overflow-visible">
        <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between w-full text-[8px] text-muted-foreground mt-0.5">
        <span>D-6</span><span>NOW</span>
      </div>
    </div>
  );
}

function HeartbeatOverlay({ error }: { error: string }) {
  const fault = FAULT_COMPONENT_MAP[error];
  if (!fault) return null;
  const { cx, cy, label } = fault;
  const labelW = label.length * 9 + 44;
  const labelX = Math.max(0, cx - labelW / 2);
  const labelY = cy - 100;

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
      <line x1={cx} y1={labelY + 36} x2={cx} y2={cy - 50} stroke="rgba(217,48,37,.65)" strokeWidth="1.8" strokeDasharray="6,4" />
      <g transform={`translate(${labelX}, ${labelY})`}>
        <rect x="0" y="0" width={labelW} height="36" rx="8" fill="#C62828">
          <animate attributeName="opacity" values="1;.88;1;.9;1" dur="1.3s" repeatCount="indefinite" />
        </rect>
        <rect x="0" y="0" width={labelW} height="18" rx="8" fill="rgba(255,255,255,.06)" />
        <circle cx="18" cy="18" r="6" fill="white">
          <animate attributeName="opacity" values="1;.1;1;.25;1" dur="1s" repeatCount="indefinite" />
        </circle>
        <text x="34" y="23" fill="white" fontSize="12" fontFamily="monospace" fontWeight="700" letterSpacing="0.6">{label}</text>
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
  const navigate = useNavigate();
  const [_tab] = useState('Isometric Cutaway');

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
      <DialogContent className="hide-default-close max-w-[1100px] w-[95vw] h-[85vh] max-h-[700px] p-0 gap-0 overflow-hidden border border-white/10 rounded-xl shadow-2xl" style={{ background: '#1a1a1c', backdropFilter: 'blur(24px)' }}>
        <DialogTitle className="sr-only">Charger {chargerId} Details</DialogTitle>

        <div className="flex flex-col md:flex-row h-full">
          {/* LEFT — Schematic */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center min-w-0" style={{ background: '#1a1a1c' }}>
            <img src="/assets/charger-schematic-iso.png" alt="Charger isometric cutaway" className="object-contain" style={{ maxHeight: '60%', maxWidth: '85%' }} />
            {charger.error ? <HeartbeatOverlay error={charger.error} /> : <HealthyOverlay />}
          </div>

          {/* RIGHT — Info Panel */}
          <div className="w-full md:w-[280px] border-l border-white/10 p-2.5 flex flex-col gap-1.5 overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-white font-bold text-sm">{chargerId}</div>
                <div className="text-white/50 text-[11px]">Fontainebleau Las Vegas · Stall {shortId}</div>
                <span className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-white" style={{ background: color }}>
                  {charger.status === 'critical' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  {statusLabel}
                </span>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CVS Arc + Sparkline */}
            <div className="flex items-center gap-2 mt-1">
              <CvsArc cvs={charger.cvs} status={charger.status} size={64} />
              <div className="flex flex-col items-center">
                <div className="text-[9px] text-white/40 mb-0.5 font-medium">7-Day CVS</div>
                <Sparkline data={charger.trend} color={color} width={85} height={22} />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="rounded-md border border-white/10 p-1">
                <div className="text-white/40 text-[9px]">Session Rate</div>
                <div className="font-bold text-white">{charger.sessions}</div>
              </div>
              <div className="rounded-md border border-white/10 p-1">
                <div className="text-white/40 text-[9px]">Error Duration</div>
                <div className="font-bold text-white">{charger.since}</div>
              </div>
              <div className="rounded-md border border-white/10 p-1">
                <div className="text-white/40 text-[9px]">Thermal</div>
                <div className="font-bold text-white">{charger.thermal}</div>
              </div>
              <div className="rounded-md border border-white/10 p-1">
                <div className="text-white/40 text-[9px]">Failure ETA</div>
                <div className="font-bold text-white">{charger.status === 'critical' ? '~8 days' : charger.status === 'warning' ? '~3 weeks' : '—'}</div>
              </div>
            </div>

            {/* Error Box */}
            {charger.error && (
              <div className="rounded-md border-l-4 p-1.5 text-[10px]" style={{ borderColor: color, background: `${color}15` }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                  <span className="font-mono font-bold" style={{ color }}>{charger.error}</span>
                </div>
                <div className="text-white/50 mt-0.5 text-[9px]">{charger.errorDesc}</div>
              </div>
            )}

            {/* Component Status */}
            <div>
              <div className="text-[9px] text-white/40 font-medium mb-0.5">Component Status</div>
              <div className="space-y-0.5">
                {COMPONENT_LIST.map(comp => {
                  const s = getComponentStatus(charger, comp);
                  return (
                    <div key={comp} className="flex items-center justify-between text-[10px] py-0.5 px-1.5 rounded border border-white/10">
                      <div className="flex items-center gap-1">
                        <span className={cn("w-1.5 h-1.5 rounded-full", s === 'fail' && "animate-pulse")} style={{ background: compStatusColor(s) }} />
                        <span className="text-white/80">{comp}</span>
                      </div>
                      <span className="font-bold text-[9px]" style={{ color: compStatusColor(s) }}>{compStatusLabel(s)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Max AI Assessment */}
            <div className="rounded-md p-1.5 text-[10px]" style={{ background: 'rgba(27,138,122,0.12)', border: '1px solid rgba(27,138,122,0.25)' }}>
              <div className="flex items-center gap-1 mb-0.5">
                <span>🤖</span>
                <span className="font-bold text-[#1B8A7A] text-[9px]">Max AI Assessment</span>
              </div>
              <div className="text-white/50 text-[9px]">{charger.maxNote}</div>
            </div>

            {/* Actions */}
            <div className="flex gap-1.5 pt-1">
              <button onClick={() => { onClose(); navigate('/service-desk/tickets'); }} className="flex-1 text-[10px] font-medium py-1.5 rounded-md text-white transition-colors" style={{ background: charger.status === 'critical' ? '#D93025' : '#1B8A7A' }}>
                Open Ticket
              </button>
              <button onClick={() => { onClose(); navigate('/service-desk/tickets'); }} className="flex-1 text-[10px] font-medium py-1.5 rounded-md border border-white/20 text-white/80 hover:bg-white/10 transition-colors">
                Service Ticket
              </button>
              <button className="flex-1 text-[10px] font-medium py-1.5 rounded-md border border-white/20 text-white/80 hover:bg-white/10 transition-colors">
                History
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
