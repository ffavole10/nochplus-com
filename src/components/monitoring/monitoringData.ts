export interface ChargerData {
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  cvs: number;
  sessions: string;
  since: string;
  thermal: string;
  fw: string;
  error: string | null;
  errorDesc: string | null;
  maxNote: string;
  trend: number[];
}

export const CHARGERS: Record<string, ChargerData> = {
  'NAS-A01': { status: 'healthy',  cvs: 94, sessions: '96.1%', since: '—',      thermal: 'Normal ✓',   fw: 'v2.4.1', error: null,                  errorDesc: null,                                              maxNote: 'All systems nominal. CVS stable.',                                             trend: [88,90,91,93,93,94,94] },
  'NAS-A02': { status: 'healthy',  cvs: 88, sessions: '91.2%', since: '—',      thermal: 'Normal ✓',   fw: 'v2.4.1', error: null,                  errorDesc: null,                                              maxNote: 'Firmware current. Stable performance.',                                        trend: [85,86,87,87,88,88,88] },
  'NAS-A03': { status: 'warning',  cvs: 62, sessions: '71.4%', since: '2d ago', thermal: 'Elevated ⚠', fw: 'v2.4.1', error: 'EVCommunicationError', errorDesc: 'Intermittent comm failures. Signal degrading.',     maxNote: 'Signal degradation. Monitor retry cycles. Dispatch if >6h.',                   trend: [74,72,70,68,65,63,62] },
  'NAS-A04': { status: 'healthy',  cvs: 91, sessions: '93.8%', since: '—',      thermal: 'Normal ✓',   fw: 'v2.4.1', error: null,                  errorDesc: null,                                              maxNote: 'Performance nominal. Thermal sensors stable.',                                 trend: [89,90,90,91,91,91,91] },
  'NAS-A05': { status: 'healthy',  cvs: 86, sessions: '88.5%', since: '—',      thermal: 'Normal ✓',   fw: 'v2.4.1', error: null,                  errorDesc: null,                                              maxNote: 'Auto-healed minor timeout 3d ago.',                                            trend: [83,84,85,86,86,86,86] },
  'NAS-A06': { status: 'healthy',  cvs: 79, sessions: '82.0%', since: '—',      thermal: 'Normal ✓',   fw: 'v2.3.9', error: null,                  errorDesc: null,                                              maxNote: 'CVS below fleet avg. Flag for PM.',                                            trend: [81,80,80,79,79,79,79] },
  'NAS-B01': { status: 'healthy',  cvs: 90, sessions: '94.2%', since: '—',      thermal: 'Normal ✓',   fw: 'v2.4.1', error: null,                  errorDesc: null,                                              maxNote: 'All nominal. High session rate.',                                              trend: [88,89,90,90,90,90,90] },
  'NAS-B02': { status: 'healthy',  cvs: 85, sessions: '87.7%', since: '—',      thermal: 'Normal ✓',   fw: 'v2.4.1', error: null,                  errorDesc: null,                                              maxNote: 'Stable. FW updated 4d ago.',                                                   trend: [83,84,84,85,85,85,85] },
  'NAS-B03': { status: 'healthy',  cvs: 77, sessions: '79.9%', since: '—',      thermal: 'Normal ✓',   fw: 'v2.3.9', error: null,                  errorDesc: null,                                              maxNote: 'Minor wear. Flag for 60-day PM.',                                              trend: [80,79,79,78,78,77,77] },
  'NAS-B04': { status: 'critical', cvs: 33, sessions: '52.3%', since: '8h 14m', thermal: 'High 🌡',    fw: 'v2.3.9', error: 'PowerModuleFailure',  errorDesc: 'Power module degraded. Output dropping below threshold.',    maxNote: 'Power module failing. Dispatch for replacement. Module assembly $340.',             trend: [71,65,58,50,44,38,33] },
  'NAS-B05': { status: 'warning',  cvs: 58, sessions: '64.1%', since: '1d ago', thermal: 'Elevated ⚠', fw: 'v2.4.1', error: 'HighTemperature',      errorDesc: '87°C vs 65°C threshold. Heat-driven.',            maxNote: 'Heat stress. Throttle applied. Consider shade shield.',                        trend: [68,66,64,62,60,59,58] },
  'NAS-B06': { status: 'offline',  cvs: 0,  sessions: '—',     since: '14h',    thermal: '—',          fw: 'v2.3.8', error: 'NetworkDisconnected',   errorDesc: 'No OCPP heartbeat 14h. Likely powered off.',      maxNote: 'Cannot reach unit. Physical visit required.',                                  trend: [72,68,60,40,18,5,0]  },
};

export const STATUS_COLORS: Record<string, string> = {
  critical: '#D93025',
  warning: '#E8760A',
  healthy: '#1B8A7A',
  offline: '#9E9E9E',
};

export const CHARGER_IDS = Object.keys(CHARGERS);
export const ROW_A = CHARGER_IDS.filter(id => id.includes('-A'));
export const ROW_B = CHARGER_IDS.filter(id => id.includes('-B'));

export const SORTED_BY_CVS = [...CHARGER_IDS].sort((a, b) => CHARGERS[a].cvs - CHARGERS[b].cvs);

export const KPI_CHIPS: Array<{
  label: string;
  value: string;
  color: string;
  pillLayer?: "sensing" | "reasoning" | "resolution" | "dispatch" | "learning" | "governance";
}> = [
  { label: 'Connected', value: '11/12', color: '#1B8A7A' },
  { label: 'Fleet Health', value: 'CVS 78.2', color: '#1B8A7A' },
  { label: 'Critical', value: '1', color: '#D93025' },
  { label: 'Auto-Healed', value: '34 this week', color: '#1B8A7A', pillLayer: 'resolution' },
  { label: 'Tickets Prevented', value: '12', color: '#1B8A7A', pillLayer: 'reasoning' },
  { label: 'Revenue Protected', value: '$8,400', color: '#22C55E', pillLayer: 'learning' },
  { label: 'Env. Risk Zones', value: '3 Active', color: '#E8760A' },
  { label: 'Max Resolution', value: '78.3%', color: '#1B8A7A' },
  { label: 'Cascade Risks', value: '1 Active', color: '#D93025' },
];

export const ENV_BADGES = [
  { emoji: '🌡️', type: 'Heat Risk', value: '107°F · Excessive', risk: 'HIGH', x: 120, y: 80 },
  { emoji: '☀️', type: 'UV Exposure', value: 'Index 11 · Extreme', risk: '83%', x: 700, y: 60 },
  { emoji: '⚡', type: 'Grid Event', value: '4 sags · 48h', risk: '83%', x: 850, y: 150 },
  { emoji: '🌊', type: 'Coastal Risk', value: 'Salt air · 2.1mi', risk: '74%', x: 130, y: 350 },
  { emoji: '⛈️', type: 'Storm Pattern', value: 'Seattle · Rain', risk: '61%', x: 750, y: 380 },
  { emoji: '❄️', type: 'Freeze-Thaw', value: 'Chicago · +180%', risk: 'WINTER', x: 400, y: 420 },
  { emoji: '💨', type: 'Wind & Debris', value: '38 mph · Debris', risk: '32%', x: 600, y: 440 },
];

export const ERROR_FEED = [
  { time: '2m ago', charger: 'NAS-B04', error: 'PowerModuleFailure', severity: 'CRIT' },
  { time: '5m ago', charger: 'NAS-A03', error: 'EVCommunicationError', severity: 'WARN' },
  { time: '8m ago', charger: 'HLT-DC-003', error: 'PowerModuleFailure', severity: 'CRIT' },
  { time: '12m ago', charger: 'NAS-B05', error: 'HighTemperature', severity: 'WARN' },
  { time: '15m ago', charger: 'NAS-DC-042', error: 'HighTemp — auto-healed', severity: 'HEAL' },
  { time: '22m ago', charger: 'SEA-DC-011', error: 'InternalError — healed', severity: 'HEAL' },
];

export const ML_PATTERNS = [
  { text: 'Heat → Connector failure', confidence: 91 },
  { text: 'Comm degradation → lock failure', confidence: 78 },
  { text: 'Thermal spike → cascade', confidence: 3, unit: 'similar events' },
];

export const MAX_MESSAGES = [
  'Monitoring NAS-B04 · PowerModuleFailure · Dispatch recommended',
  '3 env. risk zones active · UV correlation 83%',
  'Auto-healing NAS-A03 comm retry · Attempt 4/6',
];

export const FAULT_COMPONENT_MAP: Record<string, { cx: number; cy: number; label: string }> = {
  PowerModuleFailure: { cx: 780, cy: 340, label: '⚠ POWER MODULE FAILURE' },
  EVCommunicationError: { cx: 820, cy: 700, label: '⚠ EV COMMUNICATION ERROR' },
  HighTemperature: { cx: 820, cy: 480, label: '⚠ HIGH TEMPERATURE — COOLING' },
  NetworkDisconnected: { cx: 700, cy: 90, label: '⚠ NETWORK DISCONNECTED' },
};

export const COMPONENT_LIST = [
  'Connector Lock',
  'Thermal Module',
  'DC Power Stack ×5',
  'Liquid Cooling System',
  'Internal Controller Stack',
  'HMI / Display',
];

export function getComponentStatus(charger: ChargerData, component: string): 'ok' | 'warn' | 'fail' {
  if (!charger.error) return 'ok';
  const map: Record<string, string[]> = {
    PowerModuleFailure: ['DC Power Stack ×5'],
    EVCommunicationError: ['Internal Controller Stack'],
    HighTemperature: ['Thermal Module', 'Liquid Cooling System'],
    NetworkDisconnected: ['Internal Controller Stack', 'HMI / Display'],
  };
  const failComps = map[charger.error] || [];
  if (failComps.includes(component)) return 'fail';
  if (charger.status === 'warning') return 'warn';
  return 'ok';
}
