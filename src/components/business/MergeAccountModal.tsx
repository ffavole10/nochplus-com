import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomerPicker } from "@/components/business/CustomerPicker";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import { supabase } from "@/integrations/supabase/client";
import { logAccountActivity } from "@/lib/accountActivity";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { CustomerLogo } from "@/components/CustomerLogo";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  source: Customer;
}

export function MergeAccountModal({ open, onOpenChange, source }: Props) {
  const { data: customers = [] } = useCustomers();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const target = customers.find((c) => c.id === targetId) || null;
  const candidates = customers.filter((c) => c.id !== source.id);

  const doMerge = async () => {
    if (!target) return;
    setWorking(true);
    try {
      // Re-point references from source to target
      await (supabase.from("contacts") as any).update({ customer_id: target.id }).eq("customer_id", source.id);
      await (supabase.from("service_tickets") as any).update({ company_id: target.id }).eq("company_id", source.id);
      await (supabase.from("noch_plus_submissions") as any).update({ company_id: target.id }).eq("company_id", source.id);
      await (supabase.from("estimates") as any).update({ company_id: target.id }).eq("company_id", source.id);
      await (supabase.from("deals" as any) as any).update({ partner_id: target.id }).eq("partner_id", source.id);
      await (supabase.from("work_orders") as any).update({ partner_id: target.id }).eq("partner_id", source.id);
      await (supabase.from("locations") as any).update({ customer_id: target.id }).eq("customer_id", source.id);
      // Soft-delete the source
      await (supabase.from("customers" as any) as any)
        .update({ deleted_at: new Date().toISOString(), status: "inactive" })
        .eq("id", source.id);

      await logAccountActivity({
        customer_id: target.id,
        action: "merge_target",
        new_value: source.company,
        metadata: { merged_from_id: source.id },
      });
      await logAccountActivity({
        customer_id: source.id,
        action: "merged",
        new_value: target.company,
        metadata: { merged_into_id: target.id },
      });

      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["account-activity"] });
      toast.success(`Merged ${source.company} into ${target.company}`);
      onOpenChange(false);
      navigate(`/business/accounts/${target.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Merge failed");
    } finally {
      setWorking(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Merge {source.company} into…</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <CustomerPicker
              value={targetId}
              onChange={(id) => setTargetId(id)}
              placeholder="Search for the account to merge into…"
            />
            {target && (
              <div className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CustomerLogo logoUrl={source.logo_url} companyName={source.company} size="sm" />
                  <span className="font-semibold truncate">{source.company}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <CustomerLogo logoUrl={target.logo_url} companyName={target.company} size="sm" />
                  <span className="font-semibold truncate">{target.company}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  All tickets, deals, work orders, contacts, and estimates from <strong>{source.company}</strong> will move to <strong>{target.company}</strong>. <strong>{source.company}</strong> will be removed.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={!target || working} className="gap-1.5">
              {working && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Merge accounts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Merge accounts?"
        description={target ? `All linked records from ${source.company} will move to ${target.company}, and ${source.company} will be removed. This cannot be undone.` : ""}
        confirmLabel="Merge"
        variant="destructive"
        isPending={working}
        onConfirm={doMerge}
      />
    </>
  );
}
