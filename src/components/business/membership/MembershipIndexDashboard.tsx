import { useMemo, useState } from "react";
import { Diamond, Users, DollarSign, FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { TIER_LABELS, TIER_BADGE_CLASSES, type TierName } from "@/constants/nochPlusTiers";
import { MembershipMemberMap, type MapMember } from "./MembershipMemberMap";

type AccountMember = {
  id: string;
  company: string;
  membership_tier: TierName | null;
  membership_status: string;
  enrolled_at: string | null;
  chargers_enrolled_count: number;
  monthly_revenue: number;
  negotiated_monthly_revenue: number;
  list_monthly_revenue: number;
  discount_pct: number;
  billing_cycle: "monthly" | "annual_prepay";
  annual_period_end: string | null;
  is_demo_membership: boolean;
  address: string | null;
  hq_city: string | null;
  hq_region: string | null;
  geocoded_lat?: number | null;
  geocoded_lng?: number | null;
  location_override_lat?: number | null;
  location_override_lng?: number | null;
};

export function MembershipIndexDashboard() {
  const navigate = useNavigate();
  const [includeDemo, setIncludeDemo] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["noch_plus_members_combined", includeDemo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, company, membership_tier, membership_status, enrolled_at, chargers_enrolled_count, monthly_revenue, negotiated_monthly_revenue, list_monthly_revenue, discount_pct, billing_cycle, annual_period_end, is_demo_membership, address, hq_city, hq_region, geocoded_lat, geocoded_lng, location_override_lat, location_override_lng"
        )
        .in("membership_status", ["active", "demo", "paused"])
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AccountMember[];
    },
  });

  const { data: chargerLines = [] } = useQuery({
    queryKey: ["noch_plus_charger_lines_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_charger_lines")
        .select("account_id, charger_type, connector_count");
      if (error) throw error;
      return (data || []) as { account_id: string; charger_type: string; connector_count: number }[];
    },
  });

  const typeMix = useMemo(() => {
    const activeIds = new Set(
      members
        .filter((m) => m.membership_status === "active" && !m.is_demo_membership)
        .map((m) => m.id)
    );
    const counts: Record<string, number> = { ac_level_2: 0, dc_level_3: 0, ac_level_1: 0 };
    let total = 0;
    chargerLines.forEach((l) => {
      if (!activeIds.has(l.account_id)) return;
      counts[l.charger_type] = (counts[l.charger_type] || 0) + Number(l.connector_count || 0);
      total += Number(l.connector_count || 0);
    });
    return { counts, total };
  }, [chargerLines, members]);

  const stats = useMemo(() => {
    const activeOnly = members.filter(
      (m) => m.membership_status === "active" && !m.is_demo_membership
    );
    const negotiated = (m: AccountMember) =>
      Number(m.negotiated_monthly_revenue || m.monthly_revenue || 0);
    const list = (m: AccountMember) =>
      Number(m.list_monthly_revenue || m.negotiated_monthly_revenue || m.monthly_revenue || 0);
    const totalListAcrossActive = activeOnly.reduce((s, m) => s + list(m), 0);
    const totalNegotiatedAcrossActive = activeOnly.reduce((s, m) => s + negotiated(m), 0);
    const weightedDiscountPct =
      totalListAcrossActive > 0
        ? ((totalListAcrossActive - totalNegotiatedAcrossActive) / totalListAcrossActive) * 100
        : 0;
    return {
      activeCount: activeOnly.length,
      enrolledChargers: activeOnly.reduce(
        (s, m) => s + (m.chargers_enrolled_count || 0),
        0
      ),
      monthlyRevenue: totalNegotiatedAcrossActive,
      annualContractCount: activeOnly.filter((m) => m.billing_cycle === "annual_prepay").length,
      avgDiscountPct: weightedDiscountPct,
      demoCount: members.filter((m) => m.is_demo_membership).length,
    };
  }, [members]);

  const filtered = useMemo(() => {
    let list = [...members];
    if (!includeDemo) list = list.filter((m) => !m.is_demo_membership);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.company?.toLowerCase().includes(q));
    }
    return list;
  }, [members, includeDemo, search]);

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Active Members
            </p>
            <p className="text-2xl font-bold text-foreground">{stats.activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Diamond className="h-3.5 w-3.5" />
              Enrolled Connectors
            </p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.enrolledChargers}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-optimal">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Monthly Revenue
            </p>
            <p className="text-2xl font-bold text-optimal">
              ${Math.round(stats.monthlyRevenue).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Annual Contracts</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.annualContractCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Avg Discount %</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.avgDiscountPct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-medium">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <FlaskConical className="h-3.5 w-3.5" />
              Demo Enrollments
            </p>
            <p className="text-2xl font-bold text-medium">{stats.demoCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-500 col-span-2 md:col-span-3 xl:col-span-2">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center mb-2">Charger Type Mix</p>
            {typeMix.total === 0 ? (
              <p className="text-xs text-muted-foreground text-center">No connectors enrolled</p>
            ) : (
              <div className="space-y-1 text-xs">
                {(["ac_level_2", "dc_level_3", "ac_level_1"] as const).map((t) => {
                  const c = typeMix.counts[t] || 0;
                  const pct = typeMix.total > 0 ? (c / typeMix.total) * 100 : 0;
                  const label = t === "ac_level_2" ? "AC L2" : t === "dc_level_3" ? "DC L3" : "AC L1";
                  return (
                    <div key={t} className="flex items-center gap-2">
                      <span className="w-12 text-muted-foreground">{label}</span>
                      <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-12 text-right font-bold">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Member Locations Map */}
      <MembershipMemberMap
        members={(includeDemo ? members : members.filter((m) => !m.is_demo_membership)).map<MapMember>((m) => ({
          id: m.id,
          company: m.company,
          tier: m.membership_tier,
          monthly_revenue: Number(m.negotiated_monthly_revenue || m.monthly_revenue || 0),
          enrolled_at: m.enrolled_at,
          is_demo: m.is_demo_membership,
          address: m.address,
          hq_city: m.hq_city,
          hq_region: m.hq_region,
          override_lat: m.location_override_lat ?? null,
          override_lng: m.location_override_lng ?? null,
          geocoded_lat: m.geocoded_lat ?? null,
          geocoded_lng: m.geocoded_lng ?? null,
          lines: chargerLines
            .filter((l) => l.account_id === m.id)
            .map((l) => ({ charger_type: l.charger_type, connector_count: l.connector_count })),
        }))}
        searchHighlight={search}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={includeDemo}
            onChange={(e) => setIncludeDemo(e.target.checked)}
          />
          Include demo enrollments
        </label>
      </div>

      {/* List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No members yet. Enroll an account from its Membership tab.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((m) => {
            const tier = (m.membership_tier as TierName) || "essential";
            return (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{m.company}</span>
                      <Badge variant="outline" className={TIER_BADGE_CLASSES[tier]}>
                        {TIER_LABELS[tier]}
                      </Badge>
                      {m.is_demo_membership && (
                        <Badge className="bg-medium/15 text-medium border-medium/30">
                          Demo
                        </Badge>
                      )}
                      {m.membership_status === "paused" && (
                        <Badge variant="outline">Paused</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                      <span>
                        <strong className="text-foreground">
                          {m.chargers_enrolled_count}
                        </strong>{" "}
                        chargers
                      </span>
                      <span>
                        ${Number(m.monthly_revenue || 0).toLocaleString()} / mo
                      </span>
                      {m.enrolled_at && (
                        <span>
                          Since {format(new Date(m.enrolled_at), "MMM yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(`/business/accounts/${m.id}?tab=membership`)
                    }
                  >
                    View
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
