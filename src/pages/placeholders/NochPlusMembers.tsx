import { useState, useMemo } from "react";
import { Search, ArrowUpDown, Eye, Settings2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { TIER_LABELS, TIER_BADGE_CLASSES, type TierName } from "@/constants/nochPlusTiers";

interface MemberRow {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  status: string;
  tier: string;
  monthly_amount: number;
  billing_cycle: string;
  created_at: string;
}

interface SiteRow {
  member_id: string;
  l2_charger_count: number;
  dc_charger_count: number;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-optimal/10 text-optimal border-optimal/20",
  cancelled: "bg-critical/10 text-critical border-critical/20",
  expired: "bg-muted text-muted-foreground border-border",
  trial: "bg-medium/10 text-medium border-medium/20",
};

export default function NochPlusMembers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"company" | "revenue" | "chargers" | "recent">("company");

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["noch_plus_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noch_plus_members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MemberRow[];
    },
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["noch_plus_sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noch_plus_sites")
        .select("member_id, l2_charger_count, dc_charger_count");
      if (error) throw error;
      return (data || []) as SiteRow[];
    },
  });

  const chargerCountByMember = useMemo(() => {
    const map = new Map<string, number>();
    sites.forEach((s) => {
      map.set(s.member_id, (map.get(s.member_id) || 0) + (s.l2_charger_count || 0) + (s.dc_charger_count || 0));
    });
    return map;
  }, [sites]);

  const filtered = useMemo(() => {
    let result = [...members];
    if (statusFilter !== "all") result = result.filter((m) => m.status === statusFilter);
    if (tierFilter !== "all") result = result.filter((m) => m.tier === tierFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.company_name.toLowerCase().includes(q) ||
          m.contact_name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return Number(b.monthly_amount) - Number(a.monthly_amount);
        case "chargers":
          return (chargerCountByMember.get(b.id) || 0) - (chargerCountByMember.get(a.id) || 0);
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return a.company_name.localeCompare(b.company_name);
      }
    });
    return result;
  }, [members, search, statusFilter, tierFilter, sortBy, chargerCountByMember]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground">
            {membersLoading ? "Loading…" : `${members.length} total member${members.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="essential">Essential</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-36">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="chargers">Chargers</SelectItem>
            <SelectItem value="recent">Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Member List */}
      {membersLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((m) => {
            const tier = (m.tier as TierName) || "priority";
            const chargers = chargerCountByMember.get(m.id) || 0;
            return (
              <Card key={m.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">{m.company_name || "—"}</span>
                        <Badge variant="outline" className={TIER_BADGE_CLASSES[tier]}>
                          {TIER_LABELS[tier]}
                        </Badge>
                        <Badge variant="outline" className={STATUS_STYLES[m.status] || STATUS_STYLES.active}>
                          {m.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {m.contact_name && <span className="font-medium text-foreground">{m.contact_name}</span>}
                        {m.email && <span>{m.email}</span>}
                        {m.phone && <span>{m.phone}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>
                          <strong className="text-foreground">{chargers}</strong> chargers
                        </span>
                        <span>
                          ${Number(m.monthly_amount).toLocaleString()}/mo ({m.billing_cycle})
                        </span>
                        <span>Since {format(new Date(m.created_at), "MMM yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Settings2 className="h-3.5 w-3.5" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                {members.length === 0
                  ? "No members yet — activate a partnership plan from the Partnership Hub to add the first one."
                  : "No members match your filters."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
