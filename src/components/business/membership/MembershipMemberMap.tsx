import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { lookupCityCoords } from "@/components/flagged/cityLookup";
import { normalizeUSCoords } from "@/lib/coordsValidator";
import { TIER_LABELS, TIER_BADGE_CLASSES, type TierName } from "@/constants/nochPlusTiers";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export interface MapMember {
  id: string;
  company: string;
  tier: TierName | null;
  monthly_revenue: number;
  enrolled_at: string | null;
  is_demo: boolean;
  address: string | null;
  hq_city?: string | null;
  hq_region?: string | null;
  lines: { charger_type: string; connector_count: number }[];
}

interface ClusterPoint {
  key: string;
  lat: number;
  lng: number;
  members: MapMember[];
  totalConnectors: number;
  dominant: "ac_l2" | "dc_l3" | "ac_l1" | "mixed";
}

const TYPE_COLOR: Record<ClusterPoint["dominant"], string> = {
  ac_l2: "#10b981",
  dc_l3: "#8b5cf6",
  mixed: "#f59e0b",
  ac_l1: "#6b7280",
};

// Full state name → 2-letter abbreviation (cityLookup is keyed by abbrev)
const STATE_ABBR: Record<string, string> = {
  alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca",
  colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga",
  hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia", kansas: "ks",
  kentucky: "ky", louisiana: "la", maine: "me", maryland: "md", massachusetts: "ma",
  michigan: "mi", minnesota: "mn", mississippi: "ms", missouri: "mo", montana: "mt",
  nebraska: "ne", nevada: "nv", "new hampshire": "nh", "new jersey": "nj",
  "new mexico": "nm", "new york": "ny", "north carolina": "nc", "north dakota": "nd",
  ohio: "oh", oklahoma: "ok", oregon: "or", pennsylvania: "pa", "rhode island": "ri",
  "south carolina": "sc", "south dakota": "sd", tennessee: "tn", texas: "tx",
  utah: "ut", vermont: "vt", virginia: "va", washington: "wa", "west virginia": "wv",
  wisconsin: "wi", wyoming: "wy", "district of columbia": "dc",
};

function normalizeState(s: string): string {
  const v = s.trim().toLowerCase();
  if (v.length === 2) return v;
  return STATE_ABBR[v] || v;
}

function candidateCityStates(m: MapMember): { city: string; state: string }[] {
  const out: { city: string; state: string }[] = [];
  if (m.hq_city && m.hq_region) out.push({ city: m.hq_city, state: normalizeState(m.hq_region) });
  if (m.address) {
    const parts = m.address.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const stateZip = parts[parts.length - 1].split(/\s+/);
      const state = stateZip[0];
      const city = parts[parts.length - 2];
      if (state && city) out.push({ city, state: normalizeState(state) });
    }
  }
  return out;
}

function dominantType(lines: MapMember["lines"]): ClusterPoint["dominant"] {
  const totals: Record<string, number> = {};
  let total = 0;
  lines.forEach((l) => {
    totals[l.charger_type] = (totals[l.charger_type] || 0) + Number(l.connector_count || 0);
    total += Number(l.connector_count || 0);
  });
  if (total === 0) return "ac_l1";
  let topKey = "";
  let topCount = 0;
  for (const k in totals) {
    if (totals[k] > topCount) { topCount = totals[k]; topKey = k; }
  }
  if (topCount / total < 0.6) return "mixed";
  if (topKey === "dc_level_3") return "dc_l3";
  if (topKey === "ac_level_2") return "ac_l2";
  return "ac_l1";
}

function markerSize(connectorCount: number): number {
  if (connectorCount >= 50) return 14;
  if (connectorCount >= 10) return 10;
  return 7;
}

interface Props {
  members: MapMember[];
  searchHighlight?: string;
}

export function MembershipMemberMap({ members, searchHighlight }: Props) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ClusterPoint | null>(null);

  const { clusters, totalConnectors, totalMembers } = useMemo(() => {
    const map = new Map<string, ClusterPoint>();
    let total = 0;
    let memberCount = 0;
    members.forEach((m) => {
      const conn = m.lines.reduce((s, l) => s + Number(l.connector_count || 0), 0);
      if (conn === 0) {
        console.warn(`[MembershipMap] Member ${m.company} has no charger lines`);
        return;
      }
      memberCount += 1;
      total += conn;

      const candidates = candidateCityStates(m);
      let placed: { lat: number; lng: number; key: string } | null = null;
      for (const cs of candidates) {
        const raw = lookupCityCoords(cs.city, cs.state);
        if (!raw) continue;
        const norm = normalizeUSCoords(raw.lat, raw.lng);
        if (!norm) continue;
        placed = { lat: norm[0], lng: norm[1], key: `${cs.city.toLowerCase()}|${cs.state.toLowerCase()}` };
        break;
      }
      if (!placed) {
        console.warn(`[MembershipMap] Could not geocode ${m.company} (address="${m.address}", hq="${m.hq_city}, ${m.hq_region}")`);
        return;
      }

      const existing = map.get(placed.key);
      if (existing) {
        existing.members.push(m);
        existing.totalConnectors += conn;
      } else {
        map.set(placed.key, {
          key: placed.key, lat: placed.lat, lng: placed.lng, members: [m],
          totalConnectors: conn, dominant: "ac_l1",
        });
      }
    });
    map.forEach((c) => {
      const allLines = c.members.flatMap((m) => m.lines);
      c.dominant = dominantType(allLines);
    });
    return { clusters: Array.from(map.values()), totalConnectors: total, totalMembers: memberCount };
  }, [members]);

  const highlightedKey = useMemo(() => {
    if (!searchHighlight) return null;
    const q = searchHighlight.toLowerCase();
    const c = clusters.find((cl) => cl.members.some((m) => m.company?.toLowerCase().includes(q)));
    return c?.key || null;
  }, [clusters, searchHighlight]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> Member Locations
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {totalMembers} member{totalMembers !== 1 ? "s" : ""} · {totalConnectors} connectors · marker size = connector count
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {members.length === 0 ? (
          <div className="h-[340px] flex items-center justify-center text-sm text-muted-foreground">
            Members will appear here once enrolled.
          </div>
        ) : (
          <div className="relative" style={{ height: 340 }}>
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 900 }}
              style={{ width: "100%", height: "100%" }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey || geo.properties?.name}
                      geography={geo}
                      fill="hsl(210, 20%, 93%)"
                      stroke="hsl(214, 32%, 85%)"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "hsl(210, 20%, 88%)", outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>
              {clusters.map((c) => {
                const isHighlighted = highlightedKey === c.key;
                return (
                  <Marker
                    key={c.key}
                    coordinates={[c.lng, c.lat]}
                    onClick={() => setSelected(c)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      r={markerSize(c.totalConnectors) + (isHighlighted ? 4 : 0)}
                      fill={TYPE_COLOR[c.dominant]}
                      fillOpacity={0.85}
                      stroke={isHighlighted ? "#fbbf24" : "white"}
                      strokeWidth={isHighlighted ? 3 : 1.5}
                    >
                      <title>
                        {c.members.length === 1
                          ? `${c.members[0].company} · ${c.totalConnectors} connectors`
                          : `${c.members.length} members · ${c.totalConnectors} connectors`}
                      </title>
                    </circle>
                    {c.members.length > 1 && (
                      <text
                        textAnchor="middle"
                        y={4}
                        style={{ fontSize: 9, fill: "white", fontWeight: 700, pointerEvents: "none" }}
                      >
                        {c.members.length}
                      </text>
                    )}
                  </Marker>
                );
              })}
            </ComposableMap>

            {/* Legend */}
            <div className="absolute bottom-2 left-2 bg-card/90 border border-border rounded-md px-3 py-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground z-10">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLOR.ac_l2 }} />AC L2</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLOR.dc_l3 }} />DC L3</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLOR.mixed }} />Mixed</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLOR.ac_l1 }} />AC L1 / Other</span>
            </div>

            {/* Selected popover */}
            {selected && (
              <div className="absolute top-2 right-2 w-[280px] bg-card border border-border rounded-lg shadow-lg p-3 z-20 text-xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm">
                    {selected.members.length === 1
                      ? selected.members[0].company
                      : `${selected.members.length} members in this area`}
                  </p>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setSelected(null)}
                  >
                    ×
                  </button>
                </div>
                {selected.members.map((m) => {
                  const tier = (m.tier as TierName) || "essential";
                  const breakdown = m.lines
                    .filter((l) => Number(l.connector_count) > 0)
                    .map((l) => {
                      const lbl = l.charger_type === "dc_level_3" ? "DC L3" : l.charger_type === "ac_level_2" ? "AC L2" : "AC L1";
                      return `${l.connector_count} ${lbl}`;
                    })
                    .join(", ");
                  return (
                    <div key={m.id} className="border-t border-border pt-2 first:border-t-0 first:pt-0 space-y-1">
                      {selected.members.length > 1 && (
                        <p className="font-medium">{m.company}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={TIER_BADGE_CLASSES[tier]}>
                          {TIER_LABELS[tier]}
                        </Badge>
                        {m.is_demo && (
                          <Badge className="bg-medium/15 text-medium border-medium/30">Demo</Badge>
                        )}
                      </div>
                      {breakdown && <p className="text-muted-foreground">{breakdown}</p>}
                      <p className="text-muted-foreground">
                        ${Number(m.monthly_revenue || 0).toLocaleString()} / mo
                        {m.enrolled_at && ` · Since ${format(new Date(m.enrolled_at), "MMM yyyy")}`}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-7 text-xs"
                        onClick={() => navigate(`/business/accounts/${m.id}?tab=membership`)}
                      >
                        View Member →
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
