import { useNavigate } from "react-router-dom";
import { useCustomers } from "@/hooks/useCustomers";
import { usePrimaryContactsByCustomer } from "@/hooks/usePrimaryContacts";
import { useAllPartnerMeta } from "@/hooks/usePartnerMeta";
import { useDeals } from "@/hooks/useDeals";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CustomerLogo } from "@/components/CustomerLogo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIER_COLORS, MOTION_LABELS, type GrowthMotion } from "@/types/growth";
import { Eye, Building2, TrendingUp } from "lucide-react";
import { useMemo } from "react";

export default function GrowthAccounts() {
  usePageTitle("Growth Accounts");
  const navigate = useNavigate();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: allMeta = [] } = useAllPartnerMeta();
  const { data: allDeals = [] } = useDeals();
  const { data: primaryByCustomer = {} } = usePrimaryContactsByCustomer(customers.map(c => c.id));

  const metaMap = useMemo(() => {
    const m: Record<string, typeof allMeta[number]> = {};
    allMeta.forEach(x => { m[x.partner_id] = x; });
    return m;
  }, [allMeta]);

  const dealsByPartner = useMemo(() => {
    const m: Record<string, { count: number; value: number }> = {};
    allDeals.forEach(d => {
      if (!m[d.partner_id]) m[d.partner_id] = { count: 0, value: 0 };
      m[d.partner_id].count++;
      m[d.partner_id].value += Number(d.value || 0);
    });
    return m;
  }, [allDeals]);

  if (isLoading) return <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" /></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Accounts</h1>
      </div>
      <p className="text-sm text-muted-foreground">Growth-enriched view of all partner accounts.</p>

      {customers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No accounts yet.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 px-4 font-medium">Account</th>
                  <th className="py-2 px-4 font-medium">Tier</th>
                  <th className="py-2 px-4 font-medium">Motion</th>
                  <th className="py-2 px-4 font-medium text-center">Open Deals</th>
                  <th className="py-2 px-4 font-medium text-right">Pipeline Value</th>
                  <th className="py-2 px-4 font-medium">NOCH+ Timing</th>
                  <th className="py-2 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const meta = metaMap[c.id];
                  const stats = dealsByPartner[c.id] || { count: 0, value: 0 };
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/partners/${c.id}?tab=account-map`)}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <CustomerLogo logoUrl={c.logo_url} companyName={c.company} size="sm" />
                          <div>
                            <p className="font-medium">{c.company}</p>
                            <p className="text-xs text-muted-foreground">{c.contact_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {meta?.tier ? <Badge className={`text-xs ${TIER_COLORS[meta.tier]}`}>Tier {meta.tier}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-4 text-xs">{meta?.motion ? MOTION_LABELS[meta.motion as GrowthMotion] : "—"}</td>
                      <td className="py-3 px-4 text-center font-medium">{stats.count}</td>
                      <td className="py-3 px-4 text-right font-medium">${stats.value.toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs">{meta?.nochplus_timing || "—"}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/partners/${c.id}?tab=account-map`); }}>
                          <Eye className="h-3.5 w-3.5" />View
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
    </div>
  );
}
