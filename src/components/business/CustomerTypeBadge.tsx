import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CustomerType = "cpo" | "cms" | "oem" | "site_host" | "fleet_operator" | "other";

export const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string; full: string }[] = [
  { value: "cpo", label: "CPO", full: "CPO (Charge Point Operator)" },
  { value: "cms", label: "CMS", full: "CMS (Charging Management Software)" },
  { value: "oem", label: "OEM", full: "OEM (Original Equipment Manufacturer)" },
  { value: "site_host", label: "Site Host", full: "Site Host" },
  { value: "fleet_operator", label: "Fleet Operator", full: "Fleet Operator" },
  { value: "other", label: "Other", full: "Other" },
];

const COLOR: Record<CustomerType, string> = {
  cpo: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
  cms: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  oem: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  site_host: "bg-green-100 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
  fleet_operator: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  other: "bg-muted text-muted-foreground border-border",
};

const LABEL: Record<CustomerType, string> = {
  cpo: "CPO",
  cms: "CMS",
  oem: "OEM",
  site_host: "Site Host",
  fleet_operator: "Fleet",
  other: "Other",
};

interface Props {
  type?: CustomerType | string | null;
  typeOther?: string | null;
  className?: string;
}

export function CustomerTypeBadge({ type, typeOther, className }: Props) {
  if (!type) return null;
  const t = type as CustomerType;
  const label = t === "other" && typeOther ? typeOther : LABEL[t] ?? type;
  const color = COLOR[t] ?? COLOR.other;
  return (
    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium", color, className)}>
      {label}
    </Badge>
  );
}
