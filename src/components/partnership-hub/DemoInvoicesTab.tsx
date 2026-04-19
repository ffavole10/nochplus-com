import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Crown } from "lucide-react";
import invoiceStarter from "@/assets/noch-plus-invoice-starter.png";
import invoiceEssential from "@/assets/noch-plus-invoice-essential.png";
import invoicePriority from "@/assets/noch-plus-invoice-priority.png";
import invoiceElite from "@/assets/noch-plus-invoice-elite.png";
import { NOCH_PLUS_TOS_URL } from "@/constants/termsOfService";

interface DemoInvoicesTabProps {
  onNavigate?: (tab: string) => void;
}

type TierKey = "starter" | "essential" | "priority" | "elite";

interface TierInvoice {
  key: TierKey;
  label: string;
  image: string;
  saved: number;
  pct: number;
  total: number;
  variant: "danger" | "savings";
  recommended?: boolean;
}

const INVOICES: TierInvoice[] = [
  { key: "starter",   label: "Starter Plan",   image: invoiceStarter,   saved: 0,      pct: 0,    total: 2760, variant: "danger" },
  { key: "essential", label: "Essential Plan", image: invoiceEssential, saved: 319.5,  pct: 11.6, total: 2760, variant: "savings" },
  { key: "priority",  label: "Priority Plan",  image: invoicePriority,  saved: 449.25, pct: 16.3, total: 2760, variant: "savings", recommended: true },
  { key: "elite",     label: "Elite Plan",     image: invoiceElite,     saved: 579.0,  pct: 21.0, total: 2760, variant: "savings" },
];

const TIER_LABEL_COLOR: Record<TierKey, string> = {
  starter: "text-muted-foreground",
  essential: "text-primary",
  priority: "text-primary",
  elite: "text-amber-600",
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 === 0 ? 0 : 2 });

export function DemoInvoicesTab({ onNavigate }: DemoInvoicesTabProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold tracking-tight">Same Service Call. Different Savings.</h2>
        <p className="text-sm text-muted-foreground mt-2">
          See how NOCH+ membership discounts apply to a real CCS cable replacement on a DC fast charger.
        </p>
      </div>

      {/* Savings summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {INVOICES.map((inv) => {
          const isDanger = inv.variant === "danger";
          const isRec = inv.recommended;
          const cardClass = isDanger
            ? "border-destructive/40 bg-destructive/5"
            : isRec
            ? "border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30 shadow-md"
            : "border-emerald-500/30 bg-emerald-500/5";
          const accentColor = isDanger ? "text-destructive" : "text-emerald-600 dark:text-emerald-500";
          const Icon = isDanger ? AlertTriangle : TrendingDown;

          return (
            <Card key={inv.key} className={`relative ${cardClass}`}>
              {isRec && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 border-0">
                    <Crown className="h-3 w-3 mr-1" /> Recommended
                  </Badge>
                </div>
              )}
              <CardContent className="p-4 pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wide uppercase text-foreground">{inv.key}</p>
                  <Icon className={`h-4 w-4 ${accentColor}`} />
                </div>
                {isDanger ? (
                  <>
                    <p className={`mt-2 text-2xl font-bold ${accentColor}`}>$0 saved</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Full price ({fmt(inv.total)})
                    </p>
                  </>
                ) : (
                  <>
                    <p className={`mt-2 text-2xl font-bold ${accentColor}`}>{fmt(inv.saved)} saved</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inv.pct}% off this service call
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 2x2 invoice grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INVOICES.map((inv) => (
          <div key={inv.key} className="flex flex-col gap-2">
            <p className={`text-xs font-semibold tracking-wide uppercase ${TIER_LABEL_COLOR[inv.key]}`}>
              {inv.label}
            </p>
            <div className="overflow-hidden rounded-lg border border-border shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-200 bg-background">
              <img
                src={inv.image}
                alt={`NOCH+ ${inv.label} demo invoice showing member savings`}
                className="w-full h-auto block"
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-lg border border-border bg-muted/30 p-8 text-center space-y-4">
        <h3 className="text-xl font-bold tracking-tight">Ready to start saving?</h3>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => onNavigate?.("plan-builder")}>Build a Plan</Button>
          <Button variant="outline" onClick={() => onNavigate?.("plan-tiers")}>
            Compare All Tiers
          </Button>
        </div>
      </div>

      {/* Footer ToS */}
      <div className="pt-2 text-center">
        <a
          href={NOCH_PLUS_TOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          View NOCH+ Terms of Service
        </a>
      </div>
    </div>
  );
}
