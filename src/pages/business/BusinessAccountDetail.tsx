import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, Ticket, Wrench, HardDrive, DollarSign, Receipt, BadgeCheck, GitBranch, Users, FolderOpen, History, Pencil, Compass } from "lucide-react";
import { StrategyTab } from "@/components/business/strategy/StrategyTab";
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
import { ReliabilityKpiRow } from "@/components/reliability/ReliabilityKpiRow";
import { PinButton } from "@/components/command-palette/PinButton";
import { CreateAccountModal } from "@/components/business/CreateAccountModal";
import { AccountActionsMenu } from "@/components/business/AccountActionsMenu";
import { StatusBadgeMenu } from "@/components/business/StatusBadgeMenu";
import {
  TicketsTab,
  WorkOrdersTab,
  ChargersTab,
  EstimatesTab,
  InvoicesTab,
  MembershipTab,
  PipelineTab,
  ContactsTab,
  FilesTab,
} from "@/components/business/account360/Tabs";
import { ActivityTab } from "@/components/business/account360/ActivityTab";

function ChargersEmptyReliability({ accountName, onLink }: { accountName: string; onLink: () => void }) {
  return (
    <Card>
      <CardContent className="py-6 px-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">Reliability for {accountName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect chargers to this account to see RCD, FTCSR, MTTR, and TRR.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onLink}>+ Link chargers</Button>
      </CardContent>
    </Card>
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

  // Soft "has chargers" signal — any ticket means there's a fleet behind it.
  const hasChargers = accountTickets.length > 0;

  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const focusedContactId = searchParams.get("contact");
  const [tab, setTab] = useState(initialTab);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && t !== tab) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate("/business/accounts")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Accounts
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <PinButton type="account" id={account.id} label={account.company} />
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit Account
          </Button>
          <AccountActionsMenu account={account} />
        </div>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6 flex items-start gap-4">
          <CustomerLogo logoUrl={account.logo_url} companyName={account.company} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{account.company}</h1>
              <StatusBadgeMenu account={account} />
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
          <TabsTrigger value="strategy" className="gap-1.5"><Compass className="h-3.5 w-3.5" />Strategy</TabsTrigger>
          <TabsTrigger value="tickets" className="gap-1.5"><Ticket className="h-3.5 w-3.5" />Tickets <Badge variant="secondary" className="ml-1 text-[10px] h-4">{accountTickets.length}</Badge></TabsTrigger>
          <TabsTrigger value="work-orders" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Work Orders</TabsTrigger>
          <TabsTrigger value="chargers" className="gap-1.5"><HardDrive className="h-3.5 w-3.5" />Chargers</TabsTrigger>
          <TabsTrigger value="estimates" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" />Estimates <Badge variant="secondary" className="ml-1 text-[10px] h-4">{accountEstimates.length}</Badge></TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="h-3.5 w-3.5" />Invoices</TabsTrigger>
          <TabsTrigger value="membership" className="gap-1.5"><BadgeCheck className="h-3.5 w-3.5" />Membership</TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" />Pipeline <Badge variant="secondary" className="ml-1 text-[10px] h-4">{accountDeals.length}</Badge></TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="h-3.5 w-3.5" />Contacts <Badge variant="secondary" className="ml-1 text-[10px] h-4">{contacts.length}</Badge></TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5"><FolderOpen className="h-3.5 w-3.5" />Files</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><History className="h-3.5 w-3.5" />Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Reliability for {account.company}</h2>
              <p className="text-xs text-muted-foreground">How this account's fleet is performing.</p>
            </div>
            {hasChargers ? (
              <ReliabilityKpiRow
                scopedTickets={accountTickets}
                scope="account"
                size="compact"
                neviAlert={
                  /nevi|federal/i.test(account.notes || "") ||
                  /nevi|federal/i.test(account.company || "")
                }
              />
            ) : (
              <ChargersEmptyReliability accountName={account.company} onLink={() => setTab("chargers")} />
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardContent className="p-4 text-sm space-y-2">
              <p className="font-semibold">Primary Contact</p>
              <p>{account.contact_name || "—"}</p>
              <p className="text-muted-foreground">{account.email}</p>
              <p className="text-muted-foreground">{account.phone || "—"}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-sm space-y-2">
              <p className="font-semibold">Relationship</p>
              {account.relationship_type && (
                <p className="capitalize">Type: {account.relationship_type}</p>
              )}
              {meta?.motion && <p>Motion: {meta.motion}</p>}
              {meta?.nochplus_timing && <p>NOCH+ timing: {meta.nochplus_timing}</p>}
              {!account.relationship_type && !meta?.motion && !meta?.nochplus_timing && (
                <p className="text-muted-foreground text-xs">No relationship details set yet — use Edit Account to add.</p>
              )}
            </CardContent></Card>
            {account.internal_notes && (
              <Card className="md:col-span-2"><CardContent className="p-4 text-sm">
                <p className="font-semibold mb-1">Internal Notes</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{account.internal_notes}</p>
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="strategy" className="mt-6">
          <StrategyTab account={account} />
        </TabsContent>

        <TabsContent value="tickets" className="mt-6">
          <TicketsTab account={account} tickets={accountTickets} />
        </TabsContent>

        <TabsContent value="work-orders" className="mt-6">
          <WorkOrdersTab account={account} />
        </TabsContent>

        <TabsContent value="chargers" className="mt-6">
          <ChargersTab account={account} />
        </TabsContent>

        <TabsContent value="estimates" className="mt-6">
          <EstimatesTab account={account} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <InvoicesTab account={account} tickets={accountTickets} />
        </TabsContent>

        <TabsContent value="membership" className="mt-6">
          <MembershipTab account={account} />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6">
          <PipelineTab account={account} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <ContactsTab account={account} focusedContactId={focusedContactId} />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <FilesTab account={account} tickets={accountTickets} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityTab account={account} />
        </TabsContent>
      </Tabs>

      <CreateAccountModal
        open={editOpen}
        onOpenChange={setEditOpen}
        account={account}
      />
    </div>
  );
}
