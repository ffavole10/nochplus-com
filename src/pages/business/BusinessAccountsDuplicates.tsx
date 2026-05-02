import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/formatters";
import { Building2, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerLogo } from "@/components/CustomerLogo";
import { CustomerTypeBadge } from "@/components/business/CustomerTypeBadge";
import { BusinessPageHeader } from "@/components/business/BusinessPageHeader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import { usePageTitle } from "@/hooks/usePageTitle";
import { nameSimilarity, extractDomain } from "@/lib/accountSimilarity";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type DuplicateGroup = {
  primary: Customer;
  duplicate: Customer;
  reasons: string[];
  score: number;
};

// Tables that reference customers — used during merge
const CUSTOMER_FK_TABLES: Array<{ table: string; column: string }> = [
  { table: "deals", column: "partner_id" },
  { table: "activities", column: "partner_id" },
  { table: "stakeholders", column: "partner_id" },
  { table: "work_orders", column: "partner_id" },
  { table: "contacts", column: "customer_id" },
  { table: "locations", column: "customer_id" },
  { table: "charger_customer_relationships", column: "customer_id" },
  { table: "estimates", column: "customer_id" },
  { table: "campaigns", column: "customer_id" },
  { table: "campaign_plans", column: "customer_id" },
  { table: "campaign_quotes", column: "customer_id" },
  { table: "campaign_reports", column: "customer_id" },
  { table: "customer_rate_overrides", column: "customer_id" },
  { table: "customer_rate_sheets", column: "customer_id" },
  { table: "rate_sheets", column: "customer_id" },
  { table: "site_contacts", column: "customer_id" },
  { table: "ocpp_events", column: "customer_id" },
  { table: "service_tickets", column: "company_id" },
  { table: "noch_plus_submissions", column: "company_id" },
];

function detectDuplicateGroups(customers: Customer[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < customers.length; i++) {
    const a = customers[i];
    for (let j = i + 1; j < customers.length; j++) {
      const b = customers[j];
      const pairKey = `${a.id}::${b.id}`;
      if (seen.has(pairKey)) continue;
      // Skip pairs already confirmed distinct
      const aDistinct = (a.duplicate_confirmed_distinct_of || []) as string[];
      const bDistinct = (b.duplicate_confirmed_distinct_of || []) as string[];
      if (aDistinct.includes(b.id) || bDistinct.includes(a.id)) continue;

      const sim = nameSimilarity(a.company, b.company);
      const aEmail = (a.email || "").toLowerCase().trim();
      const bEmail = (b.email || "").toLowerCase().trim();
      const aDom = (a.domain || extractDomain(a.email || "") || "").toLowerCase();
      const bDom = (b.domain || extractDomain(b.email || "") || "").toLowerCase();

      const reasons: string[] = [];
      if (sim >= 0.95) reasons.push(`Name similarity ${(sim * 100).toFixed(0)}%`);
      if (aEmail && aEmail === bEmail) reasons.push("Same primary email");
      if (sim >= 0.85 && aDom && aDom === bDom) reasons.push(`Same domain (${aDom})`);

      const isDuplicate = (sim >= 0.95 && aEmail && aEmail === bEmail) || sim >= 0.98;
      if (isDuplicate) {
        // Pick "primary" = the one with the deal/ticket history (more activity)
        const aWeight = (a.ticket_count || 0) + Number(a.total_revenue || 0);
        const bWeight = (b.ticket_count || 0) + Number(b.total_revenue || 0);
        const primary = aWeight >= bWeight ? a : b;
        const duplicate = primary === a ? b : a;
        groups.push({ primary, duplicate, reasons, score: sim });
        seen.add(pairKey);
      }
    }
  }
  return groups;
}

async function mergeCustomers(primaryId: string, duplicateId: string) {
  const sb = supabase as any;
  // Re-point all foreign keys
  for (const { table, column } of CUSTOMER_FK_TABLES) {
    const { error } = await sb.from(table).update({ [column]: primaryId }).eq(column, duplicateId);
    if (error && !/relation .* does not exist|no rows/i.test(error.message)) {
      console.warn(`Merge warning on ${table}.${column}:`, error.message);
    }
  }

  // partners_meta has a unique constraint on partner_id — handle separately
  await supabase.from("partners_meta" as any).delete().eq("partner_id", duplicateId);

  // Delete the duplicate
  const { error: delErr } = await supabase.from("customers" as any).delete().eq("id", duplicateId);
  if (delErr) throw delErr;
}

export default function BusinessAccountsDuplicates() {
  usePageTitle("Duplicate Accounts");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: customers = [], isLoading } = useCustomers();
  const { confirm, dialogProps } = useConfirmDialog();
  const [working, setWorking] = useState<string | null>(null);

  const groups = useMemo(() => detectDuplicateGroups(customers), [customers]);

  const handleMerge = async (g: DuplicateGroup) => {
    const ok = await confirm({
      title: `Merge "${g.duplicate.company}" into "${g.primary.company}"?`,
      description: `All deals, tickets, contacts, and other links from the duplicate record will be re-assigned to "${g.primary.company}", and the duplicate record will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Merge accounts",
      variant: "destructive",
    });
    if (!ok) return;
    setWorking(g.duplicate.id);
    try {
      await mergeCustomers(g.primary.id, g.duplicate.id);
      toast.success(`Merged "${g.duplicate.company}" into "${g.primary.company}"`);
      qc.invalidateQueries({ queryKey: ["customers"] });
    } catch (e: any) {
      toast.error(e?.message || "Merge failed");
    } finally {
      setWorking(null);
    }
  };

  const handleMarkDistinct = async (g: DuplicateGroup) => {
    setWorking(g.duplicate.id);
    try {
      const aDistinct = new Set([...(g.primary.duplicate_confirmed_distinct_of || []), g.duplicate.id]);
      const bDistinct = new Set([...(g.duplicate.duplicate_confirmed_distinct_of || []), g.primary.id]);
      await supabase.from("customers" as any).update({ duplicate_confirmed_distinct_of: Array.from(aDistinct) } as any).eq("id", g.primary.id);
      await supabase.from("customers" as any).update({ duplicate_confirmed_distinct_of: Array.from(bDistinct) } as any).eq("id", g.duplicate.id);
      toast.success("Marked as distinct accounts");
      qc.invalidateQueries({ queryKey: ["customers"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <BusinessPageHeader
        title="Duplicate Accounts"
        subtitle="Review accounts that look like duplicates and merge them into a single record."
        icon={AlertTriangle}
        actions={
          <Button variant="outline" onClick={() => navigate("/business/accounts")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Accounts
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No likely duplicates detected. The accounts list is clean.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{groups.length} potential duplicate {groups.length === 1 ? "pair" : "pairs"} found.</p>
          {groups.map((g) => (
            <Card key={`${g.primary.id}-${g.duplicate.id}`} className="border-amber-200 dark:border-amber-900/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-xs font-semibold">{g.reasons.join(" · ")}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <AccountCard customer={g.primary} label="Primary (kept)" badgeClass="bg-emerald-50 text-emerald-700 border-emerald-200" />
                  <AccountCard customer={g.duplicate} label="Duplicate (will be merged)" badgeClass="bg-amber-50 text-amber-700 border-amber-200" />
                </div>
                <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border/50">
                  <Button variant="ghost" size="sm" onClick={() => handleMarkDistinct(g)} disabled={working === g.duplicate.id}>
                    These are different
                  </Button>
                  <Button variant="outline" size="sm" disabled={working === g.duplicate.id}>
                    Skip for now
                  </Button>
                  <Button size="sm" onClick={() => handleMerge(g)} disabled={working === g.duplicate.id} className="gap-1.5">
                    {working === g.duplicate.id && <Loader2 className="h-3 w-3 animate-spin" />}
                    Merge into "{g.primary.company}"
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

function AccountCard({ customer, label, badgeClass }: { customer: Customer; label: string; badgeClass: string }) {
  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>{label}</Badge>
      <div className="flex items-center gap-3">
        <CustomerLogo logoUrl={customer.logo_url} companyName={customer.company} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold">{customer.company}</span>
            <CustomerTypeBadge type={(customer as any).customer_type} typeOther={(customer as any).customer_type_other} />
          </div>
          <p className="text-xs text-muted-foreground truncate">{customer.contact_name} · {customer.email}</p>
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground grid grid-cols-2 gap-1">
        <span>Tickets: <strong className="text-foreground">{customer.ticket_count || 0}</strong></span>
        <span>Revenue: <strong className="text-foreground">{formatCurrency(Number(customer.total_revenue || 0))}</strong></span>
        <span>Status: <strong className="text-foreground">{customer.status}</strong></span>
        <span>Created: <strong className="text-foreground">{new Date(customer.created_at).toLocaleDateString()}</strong></span>
      </div>
    </div>
  );
}
