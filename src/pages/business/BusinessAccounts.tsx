import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Eye, Plus, Search, AlertTriangle, Star } from "lucide-react";
import { useFocus5CustomerIds } from "@/hooks/useFocus5";
import { useAllStrategies } from "@/hooks/useStrategy";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCustomers } from "@/hooks/useCustomers";
import { useAllPartnerMeta } from "@/hooks/usePartnerMeta";
import { useDeals } from "@/hooks/useDeals";
import { useCampaigns } from "@/hooks/useCampaigns";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerLogo } from "@/components/CustomerLogo";
import { CustomerTypeBadge } from "@/components/business/CustomerTypeBadge";
import { BusinessPageHeader } from "@/components/business/BusinessPageHeader";
import { CreateAccountModal } from "@/components/business/CreateAccountModal";
import { TIER_COLORS, MOTION_LABELS, type GrowthMotion } from "@/types/growth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = ["OEM", "CSMS", "CPO", "Site Host", "Other"] as const;

type RelationshipFilter = "all" | "customer" | "partner" | "both";
type StatusFilter = "all" | "active" | "inactive";
type View = "operations" | "growth";

export default function BusinessAccounts() {
  usePageTitle("Accounts");
  const navigate = useNavigate();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: allMeta = [] } = useAllPartnerMeta();
  const { data: allDeals = [] } = useDeals();
  const { data: campaigns = [] } = useCampaigns();

  const [search, setSearch] = useState("");
  const [relationship, setRelationship] = useState<RelationshipFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [view, setView] = useState<View>("operations");
  const [createOpen, setCreateOpen] = useState(false);
  const [focusOnly, setFocusOnly] = useState(false);
  const [focusFirst, setFocusFirst] = useState(false);
  const { data: focusCustomerIds = new Set<string>() } = useFocus5CustomerIds();
  const { data: allStrategies = [] } = useAllStrategies();
  const focusMetaByCustomer = useMemo(() => {
    const m: Record<string, { quarter: string | null; reason: string | null }> = {};
    allStrategies.forEach((s: any) => {
      if (s.is_focus) m[s.customer_id] = { quarter: s.focus_quarter, reason: s.focus_reason };
    });
    return m;
  }, [allStrategies]);

  const metaMap = useMemo(() => {
    const m: Record<string, typeof allMeta[number]> = {};
    allMeta.forEach((x) => { m[x.partner_id] = x; });
    return m;
  }, [allMeta]);

  const dealsByPartner = useMemo(() => {
    const m: Record<string, { count: number; value: number }> = {};
    allDeals.forEach((d) => {
      if (!m[d.partner_id]) m[d.partner_id] = { count: 0, value: 0 };
      m[d.partner_id].count++;
      m[d.partner_id].value += Number(d.value || 0);
    });
    return m;
  }, [allDeals]);

  const campaignCountsByPartner = useMemo(() => {
    const m: Record<string, number> = {};
    campaigns.forEach((c) => {
      const id = (c as any).customer_id;
      if (id) m[id] = (m[id] || 0) + 1;
    });
    return m;
  }, [campaigns]);

  /**
   * Determine relationship type for an account.
   * - "customer": has tickets, campaigns, or revenue
   * - "partner": has growth metadata (tier/motion) or is purely categorized
   * - "both": both signals present
   */
  const accountTypes = useMemo(() => {
    const m: Record<string, ("customer" | "partner")[]> = {};
    customers.forEach((c) => {
      const types: ("customer" | "partner")[] = [];
      const isCustomer =
        (c.ticket_count || 0) > 0 ||
        (campaignCountsByPartner[c.id] || 0) > 0 ||
        Number(c.total_revenue || 0) > 0;
      const meta = metaMap[c.id];
      const isPartner = !!meta?.tier || !!meta?.motion || (dealsByPartner[c.id]?.count || 0) > 0;
      if (isCustomer) types.push("customer");
      if (isPartner) types.push("partner");
      // Fallback: every account in the table is at minimum a partner record
      if (types.length === 0) types.push("partner");
      m[c.id] = types;
    });
    return m;
  }, [customers, metaMap, dealsByPartner, campaignCountsByPartner]);

  const stats = useMemo(() => {
    const thirty = new Date();
    thirty.setDate(thirty.getDate() - 30);
    let activeCustomers = 0;
    let activePartners = 0;
    let newThisMonth = 0;
    customers.forEach((c) => {
      const types = accountTypes[c.id] || [];
      if (c.status === "active" && types.includes("customer")) activeCustomers++;
      if (c.status === "active" && types.includes("partner")) activePartners++;
      if (new Date(c.created_at) > thirty) newThisMonth++;
    });
    return { total: customers.length, activeCustomers, activePartners, newThisMonth };
  }, [customers, accountTypes]);

  const filtered = useMemo(() => {
    let list = customers.filter((c) => {
      const types = accountTypes[c.id] || [];
      if (relationship !== "all") {
        if (relationship === "both" && types.length < 2) return false;
        if (relationship === "customer" && !types.includes("customer")) return false;
        if (relationship === "partner" && !types.includes("partner")) return false;
      }
      if (status !== "all" && c.status !== status) return false;
      if (selectedCats.length > 0) {
        const cats = ((c as any).categories as string[]) || [];
        if (!selectedCats.some((sc) => cats.includes(sc))) return false;
      }
      if (focusOnly && !focusCustomerIds.has(c.id)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !c.company.toLowerCase().includes(q) &&
          !c.contact_name?.toLowerCase().includes(q) &&
          !c.email?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
    if (focusFirst) {
      list = [...list].sort((a, b) => {
        const aF = focusCustomerIds.has(a.id) ? 1 : 0;
        const bF = focusCustomerIds.has(b.id) ? 1 : 0;
        return bF - aF;
      });
    }
    return list;
  }, [customers, accountTypes, relationship, status, selectedCats, search, focusOnly, focusFirst, focusCustomerIds]);

  const toggleCat = (cat: string) =>
    setSelectedCats((p) => (p.includes(cat) ? p.filter((x) => x !== cat) : [...p, cat]));

  const goToDetail = (id: string) => navigate(`/business/accounts/${id}`);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <BusinessPageHeader
        title="Accounts"
        subtitle="Every customer, partner, and prospect in the NOCH ecosystem."
        icon={Building2}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/business/accounts/duplicates")} className="gap-2">
              <AlertTriangle className="h-4 w-4" /> Review Duplicates
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Accounts</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-optimal">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Active Customers</p>
            <p className="text-2xl font-bold text-optimal">{stats.activeCustomers}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-secondary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Active Partners</p>
            <p className="text-2xl font-bold text-secondary">{stats.activePartners}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-medium">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">New This Month</p>
            <p className="text-2xl font-bold text-medium">{stats.newThisMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter row */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search account, contact, email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Relationship type pill tabs */}
          <Tabs value={relationship} onValueChange={(v) => setRelationship(v as RelationshipFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="customer">Customers</TabsTrigger>
              <TabsTrigger value="partner">Partners</TabsTrigger>
              <TabsTrigger value="both">Both</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="ml-auto">
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="operations">Operations</TabsTrigger>
                <TabsTrigger value="growth">Growth</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Category chips + Focus chip + sort */}
        <div className="flex flex-wrap gap-2 items-center">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCats.includes(cat) ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => toggleCat(cat)}
            >
              {cat}
            </Badge>
          ))}
          {selectedCats.length > 0 && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCats([])}>
              Clear
            </Badge>
          )}
          <button
            type="button"
            onClick={() => setFocusOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
              focusOnly
                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-400"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <Star className={cn("h-3 w-3", focusOnly && "fill-amber-400 text-amber-600")} />
            Focus 5
          </button>
          <button
            type="button"
            onClick={() => setFocusFirst((v) => !v)}
            className={cn(
              "ml-auto text-xs px-2.5 py-0.5 rounded-full border transition-colors",
              focusFirst
                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-400"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
            title="Sort Focus 5 accounts to the top"
          >
            {focusFirst ? "★ Focus first" : "Sort: Focus first"}
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No accounts match the current filters.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 px-4 font-medium">Account</th>
                  {view === "operations" ? (
                    <>
                      <th className="py-2 px-4 font-medium">Categories</th>
                      <th className="py-2 px-4 font-medium">Status</th>
                      <th className="py-2 px-4 font-medium text-center">Campaigns</th>
                      <th className="py-2 px-4 font-medium text-center">Tickets</th>
                      <th className="py-2 px-4 font-medium">Contact</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 px-4 font-medium">Tier</th>
                      <th className="py-2 px-4 font-medium">Motion</th>
                      <th className="py-2 px-4 font-medium text-center">Open Deals</th>
                      <th className="py-2 px-4 font-medium text-right">Pipeline Value</th>
                      <th className="py-2 px-4 font-medium">NOCH+ Timing</th>
                    </>
                  )}
                  <th className="py-2 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const types = accountTypes[c.id] || [];
                  const cats = ((c as any).categories as string[]) || [];
                  const meta = metaMap[c.id];
                  const stats = dealsByPartner[c.id] || { count: 0, value: 0 };
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => goToDetail(c.id)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <CustomerLogo logoUrl={c.logo_url} companyName={c.company} size="sm" />
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                              {c.company}
                              <CustomerTypeBadge type={(c as any).customer_type} typeOther={(c as any).customer_type_other} />
                              <span className="flex gap-1">
                                {types.includes("customer") && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-secondary/40 text-secondary">customer</Badge>
                                )}
                                {types.includes("partner") && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/40 text-primary">partner</Badge>
                                )}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">{c.contact_name || "—"}</p>
                          </div>
                        </div>
                      </td>
                      {view === "operations" ? (
                        <>
                          <td className="py-3 px-4">
                            <div className="flex gap-1 flex-wrap">
                              {cats.map((cat) => (
                                <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0">{cat}</Badge>
                              ))}
                              {cats.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-center font-medium">{campaignCountsByPartner[c.id] || 0}</td>
                          <td className="py-3 px-4 text-center font-medium">{c.ticket_count || 0}</td>
                          <td className="py-3 px-4">
                            <div className="text-xs">
                              <p>{c.email}</p>
                              <p className="text-muted-foreground">{c.phone}</p>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4">
                            {meta?.tier ? (
                              <Badge className={cn("text-xs", TIER_COLORS[meta.tier])}>Tier {meta.tier}</Badge>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {meta?.motion ? MOTION_LABELS[meta.motion as GrowthMotion] : "—"}
                          </td>
                          <td className="py-3 px-4 text-center font-medium">{stats.count}</td>
                          <td className="py-3 px-4 text-right font-medium">${stats.value.toLocaleString()}</td>
                          <td className="py-3 px-4 text-xs">{meta?.nochplus_timing || "—"}</td>
                        </>
                      )}
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={(e) => { e.stopPropagation(); goToDetail(c.id); }}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <CreateAccountModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(c) => {
          toast.success(`Account "${c.company}" created`);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
