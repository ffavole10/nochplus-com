import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Ticket, Wrench, HardDrive, DollarSign, Receipt, BadgeCheck, GitBranch, Users, FolderOpen } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useContacts } from "@/hooks/useContacts";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useEstimates } from "@/hooks/useEstimates";
import { useDeals } from "@/hooks/useDeals";
import { useAllPartnerMeta } from "@/hooks/usePartnerMeta";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerLogo } from "@/components/CustomerLogo";
import { usePageTitle } from "@/hooks/usePageTitle";
import { format } from "date-fns";

function Empty({ label }: { label: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground text-sm">{label}</div>
  );
}

export default function BusinessAccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: contacts = [] } = useContacts(accountId || "");
  const { data: campaigns = [] } = useCampaigns();
  const { data: estimates = [] } = useEstimates(null);
  const { data: deals = [] } = useDeals();
  const { data: allMeta = [] } = useAllPartnerMeta();
  const allTickets = useServiceTicketsStore((s) => s.tickets);

  const account = useMemo(() => customers.find((c) => c.id === accountId), [customers, accountId]);
  usePageTitle(account?.company || "Account");

  const meta = useMemo(() => allMeta.find((m) => m.partner_id === accountId), [allMeta, accountId]);
  const accountCampaigns = useMemo(
    () => campaigns.filter((c) => (c as any).customer_id === accountId || c.customer === account?.company),
    [campaigns, accountId, account]
  );
  const accountEstimates = useMemo(
    () => (estimates as any[]).filter((e) => e.company_id === accountId),
    [estimates, accountId]
  );
  const accountDeals = useMemo(() => deals.filter((d) => d.partner_id === accountId), [deals, accountId]);
  const accountTickets = useMemo(
    () => allTickets.filter((t) => !t.isParent && t.customer?.company === account?.company),
    [allTickets, account]
  );

  const [tab, setTab] = useState("overview");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/business/accounts")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Accounts
        </Button>
        <div className="text-center py-16 text-muted-foreground">Account not found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate("/business/accounts")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Accounts
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/partners/${accountId}`)} className="text-xs text-muted-foreground">
          Open in legacy Partner Profile →
        </Button>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6 flex items-start gap-4">
          <CustomerLogo logoUrl={account.logo_url} companyName={account.company} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{account.company}</h1>
              <Badge variant={account.status === "active" ? "default" : "secondary"}>{account.status}</Badge>
              {meta?.tier && <Badge variant="outline">Tier {meta.tier}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {account.contact_name} · {account.email} · {account.phone || "—"}
            </p>
            {account.headquarters_address && (
              <p className="text-xs text-muted-foreground mt-1">{account.headquarters_address}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div><p className="text-muted-foreground">Tickets</p><p className="font-bold text-base">{accountTickets.length}</p></div>
            <div><p className="text-muted-foreground">Campaigns</p><p className="font-bold text-base">{accountCampaigns.length}</p></div>
            <div><p className="text-muted-foreground">Open Deals</p><p className="font-bold text-base">{accountDeals.length}</p></div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="tickets" className="gap-1.5"><Ticket className="h-3.5 w-3.5" />Tickets <Badge variant="secondary" className="ml-1 text-[10px] h-4">{accountTickets.length}</Badge></TabsTrigger>
          <TabsTrigger value="work-orders" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Work Orders</TabsTrigger>
          <TabsTrigger value="chargers" className="gap-1.5"><HardDrive className="h-3.5 w-3.5" />Chargers</TabsTrigger>
          <TabsTrigger value="estimates" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" />Estimates <Badge variant="secondary" className="ml-1 text-[10px] h-4">{accountEstimates.length}</Badge></TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="h-3.5 w-3.5" />Invoices</TabsTrigger>
          <TabsTrigger value="membership" className="gap-1.5"><BadgeCheck className="h-3.5 w-3.5" />Membership</TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" />Pipeline <Badge variant="secondary" className="ml-1 text-[10px] h-4">{accountDeals.length}</Badge></TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="h-3.5 w-3.5" />Contacts <Badge variant="secondary" className="ml-1 text-[10px] h-4">{contacts.length}</Badge></TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5"><FolderOpen className="h-3.5 w-3.5" />Files</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardContent className="p-4 text-sm space-y-2">
              <p className="font-semibold">Contact</p>
              <p>{account.contact_name || "—"}</p>
              <p className="text-muted-foreground">{account.email}</p>
              <p className="text-muted-foreground">{account.phone || "—"}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-sm space-y-2">
              <p className="font-semibold">Relationship</p>
              <p>Pricing type: <span className="font-mono text-xs">{account.pricing_type || "rate_card"}</span></p>
              {meta?.motion && <p>Motion: {meta.motion}</p>}
              {meta?.nochplus_timing && <p>NOCH+ timing: {meta.nochplus_timing}</p>}
            </CardContent></Card>
            {account.notes && (
              <Card className="md:col-span-2"><CardContent className="p-4 text-sm">
                <p className="font-semibold mb-1">Notes</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{account.notes}</p>
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="mt-6">
          {accountTickets.length === 0 ? <Empty label="No tickets for this account." /> : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3">ID</th><th className="py-2 px-3">Issue</th>
                  <th className="py-2 px-3">Status</th><th className="py-2 px-3">Created</th>
                </tr></thead>
                <tbody>
                  {accountTickets.slice(0, 50).map((t) => (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="py-2 px-3 font-mono text-xs">{t.ticketId}</td>
                      <td className="py-2 px-3">{t.issue?.description || "—"}</td>
                      <td className="py-2 px-3"><Badge variant="outline">{t.status}</Badge></td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">{t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="work-orders" className="mt-6"><Empty label="Work orders for this account will appear here." /></TabsContent>

        <TabsContent value="chargers" className="mt-6"><Empty label="Charger fleet inventory will appear here." /></TabsContent>

        <TabsContent value="estimates" className="mt-6">
          {accountEstimates.length === 0 ? <Empty label="No estimates for this account." /> : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3">Estimate</th><th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr></thead>
                <tbody>
                  {accountEstimates.slice(0, 50).map((e: any) => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="py-2 px-3 font-mono text-xs">{e.estimate_number}</td>
                      <td className="py-2 px-3"><Badge variant="outline">{e.status}</Badge></td>
                      <td className="py-2 px-3 text-right">${Number(e.total || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-6"><Empty label="No data available yet." /></TabsContent>

        <TabsContent value="membership" className="mt-6">
          {meta?.tier ? (
            <Card><CardContent className="p-6 space-y-2 text-sm">
              <p>Current tier: <Badge>{meta.tier}</Badge></p>
              {meta.motion && <p>Motion: {meta.motion}</p>}
              <p className="text-muted-foreground text-xs">ROI metrics and TRR/MTTR savings will appear here once member activity is tracked.</p>
            </CardContent></Card>
          ) : <Empty label="This account is not a NOCH+ member yet." />}
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6">
          {accountDeals.length === 0 ? <Empty label="No open deals for this account." /> : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3">Deal</th><th className="py-2 px-3">Stage</th>
                  <th className="py-2 px-3 text-right">Value</th>
                </tr></thead>
                <tbody>
                  {accountDeals.map((d) => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/growth/deals/${d.id}`)}>
                      <td className="py-2 px-3">{d.deal_name}</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">{d.stage}</Badge></td>
                      <td className="py-2 px-3 text-right">${Number(d.value || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          {contacts.length === 0 ? <Empty label="No contacts on file." /> : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3">Name</th><th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Email</th><th className="py-2 px-3">Phone</th>
                </tr></thead>
                <tbody>
                  {contacts.map((c: any) => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-2 px-3 font-medium">{c.name}{c.is_primary && <Badge variant="outline" className="ml-2 text-[9px]">primary</Badge>}</td>
                      <td className="py-2 px-3 text-muted-foreground">{c.role || "—"}</td>
                      <td className="py-2 px-3">{c.email || "—"}</td>
                      <td className="py-2 px-3">{c.phone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="files" className="mt-6"><Empty label="No data available yet." /></TabsContent>
      </Tabs>
    </div>
  );
}
