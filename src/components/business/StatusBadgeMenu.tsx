import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown } from "lucide-react";
import { useUpdateCustomer, type Customer } from "@/hooks/useCustomers";
import { logAccountActivity } from "@/lib/accountActivity";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const STATUSES: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "prospect", label: "Prospect" },
];

const variantFor = (status: string): "default" | "secondary" | "outline" => {
  if (status === "active") return "default";
  if (status === "prospect") return "outline";
  return "secondary";
};

export function StatusBadgeMenu({ account }: { account: Customer }) {
  const update = useUpdateCustomer();
  const qc = useQueryClient();

  const change = async (next: string) => {
    if (next === account.status) return;
    const before = account.status;
    await update.mutateAsync({ id: account.id, status: next });
    await logAccountActivity({
      customer_id: account.id,
      action: "status_changed",
      field_changed: "status",
      old_value: before,
      new_value: next,
    });
    qc.invalidateQueries({ queryKey: ["account-activity", account.id] });
    toast.success(`Status set to ${next}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 outline-none focus:ring-2 focus:ring-ring rounded"
          aria-label="Change status"
        >
          <Badge variant={variantFor(account.status)} className="cursor-pointer gap-1">
            {account.status} <ChevronDown className="h-3 w-3 opacity-70" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[2100]">
        {STATUSES.map((s) => (
          <DropdownMenuItem key={s.value} onClick={() => change(s.value)}>
            <span className="flex items-center gap-2">
              {account.status === s.value ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
              {s.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
