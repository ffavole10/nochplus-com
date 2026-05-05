import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Target, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { QbrFinancial, QbrFocusAccount, QbrSection } from "@/hooks/useQbr";

interface Props {
  financial: QbrFinancial | null;
  opMetrics?: QbrSection;
  focusAccounts: QbrFocusAccount[];
}

export function QbrHeadlineBanner({ financial, opMetrics, focusAccounts }: Props) {
  const revenue = financial?.quarterly_revenue ?? null;
  const netIncome = financial?.net_income ?? null;
  const op = (opMetrics?.content || {}) as Record<string, any>;
  const connectors = op.connectors_engaged ?? op.connectors ?? null;
  const customers = op.active_customers_end ?? op.customers ?? null;
  const anchor = focusAccounts[0]?.account_name;

  const positive = (netIncome ?? 0) >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4">
      <Tile label="REVENUE">
        <div className="text-2xl font-bold tracking-tight">
          {revenue == null ? "—" : formatCurrency(Number(revenue))}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">Quarterly total</div>
      </Tile>

      <Tile label="NET INCOME">
        <div className={`text-2xl font-bold tracking-tight flex items-center gap-1 ${
          netIncome == null ? "" : positive ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"
        }`}>
          {netIncome != null && (positive ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />)}
          {netIncome == null ? "—" : formatCurrency(Number(netIncome))}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">{positive ? "Profitable quarter" : "Loss for quarter"}</div>
      </Tile>

      <Tile label="OPERATIONS" icon={<Zap className="h-3 w-3" />}>
        <div className="space-y-0.5 mt-1">
          <div className="text-sm">
            <span className="font-semibold text-base">{connectors ?? "—"}</span>
            <span className="text-xs text-muted-foreground ml-1">connectors</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-base">{customers ?? "—"}</span>
            <span className="text-xs text-muted-foreground ml-1">customers</span>
          </div>
        </div>
      </Tile>

      <Tile label="FOCUS ACCOUNTS" icon={<Target className="h-3 w-3" />}>
        <div className="text-2xl font-bold tracking-tight">{focusAccounts.length}</div>
        <div className="text-[11px] text-muted-foreground mt-1 truncate">
          {anchor ? `${anchor} anchor` : "No anchor set"}
        </div>
      </Tile>
    </div>
  );
}

function Tile({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-4 border-l-4 border-l-teal-500/70 bg-card print:break-inside-avoid">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {icon}{label}
      </div>
      <div className="mt-2">{children}</div>
    </Card>
  );
}
