import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoreHorizontal, Trash2, GitMerge, PowerOff, Power } from "lucide-react";
import { useDeleteCustomer, useUpdateCustomer, getAccountLinkCounts, type Customer } from "@/hooks/useCustomers";
import { logAccountActivity } from "@/lib/accountActivity";
import { MergeAccountModal } from "./MergeAccountModal";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  account: Customer;
}

export function AccountActionsMenu({ account }: Props) {
  const navigate = useNavigate();
  const deleteCustomer = useDeleteCustomer();
  const updateCustomer = useUpdateCustomer();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<{ open: boolean; next: "active" | "inactive" }>({ open: false, next: "inactive" });
  const [mergeOpen, setMergeOpen] = useState(false);
  const [linkCounts, setLinkCounts] = useState<Awaited<ReturnType<typeof getAccountLinkCounts>> | null>(null);
  const [checking, setChecking] = useState(false);

  const onDeleteClick = async () => {
    setChecking(true);
    try {
      const counts = await getAccountLinkCounts(account.id, account.company);
      setLinkCounts(counts);
      setConfirmDelete(true);
    } finally {
      setChecking(false);
    }
  };

  const doDelete = async () => {
    if (!linkCounts) return;
    const mode = linkCounts.total === 0 ? "hard" : "soft";
    await deleteCustomer.mutateAsync({ id: account.id, mode, company: account.company });
    setConfirmDelete(false);
    navigate("/business/accounts");
  };

  const doToggleStatus = async () => {
    const before = account.status;
    const next = confirmStatus.next;
    await updateCustomer.mutateAsync({ id: account.id, status: next });
    await logAccountActivity({
      customer_id: account.id,
      action: "status_changed",
      field_changed: "status",
      old_value: before,
      new_value: next,
    });
    toast.success(`Account marked ${next}`);
    setConfirmStatus({ open: false, next });
  };

  const isInactive = account.status === "inactive";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" aria-label="Account actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[2100] w-56">
          <DropdownMenuItem onClick={() => setConfirmStatus({ open: true, next: isInactive ? "active" : "inactive" })}>
            {isInactive ? (
              <><Power className="h-4 w-4 mr-2" /> Mark as Active</>
            ) : (
              <><PowerOff className="h-4 w-4 mr-2" /> Mark as Inactive</>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMergeOpen(true)}>
            <GitMerge className="h-4 w-4 mr-2" /> Merge with another account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDeleteClick}
            disabled={checking}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete account?"
        description={
          linkCounts
            ? linkCounts.total === 0
              ? `Delete '${account.company}'? This account has no linked records and will be permanently removed.`
              : `'${account.company}' has active records:\n• ${linkCounts.tickets} tickets\n• ${linkCounts.workOrders} work orders\n• ${linkCounts.deals} open deals\n• ${linkCounts.estimates} estimates\n\nIt will be archived (soft-deleted) and hidden from default views. Use Merge to combine it with another account first if you want to preserve history under a different name.`
            : ""
        }
        confirmLabel={linkCounts?.total === 0 ? "Permanently delete" : "Archive account"}
        variant="destructive"
        isPending={deleteCustomer.isPending}
        onConfirm={doDelete}
      />

      <ConfirmDialog
        open={confirmStatus.open}
        onOpenChange={(o) => setConfirmStatus((s) => ({ ...s, open: o }))}
        title={confirmStatus.next === "inactive" ? "Mark as Inactive?" : "Mark as Active?"}
        description={
          confirmStatus.next === "inactive"
            ? `${account.company} will be hidden from the default Accounts view. Historical data is preserved and you can restore it any time.`
            : `${account.company} will appear in the default Accounts view again.`
        }
        confirmLabel={confirmStatus.next === "inactive" ? "Mark Inactive" : "Mark Active"}
        variant={confirmStatus.next === "inactive" ? "destructive" : "default"}
        isPending={updateCustomer.isPending}
        onConfirm={doToggleStatus}
      />

      {mergeOpen && (
        <MergeAccountModal open={mergeOpen} onOpenChange={setMergeOpen} source={account} />
      )}
    </>
  );
}
