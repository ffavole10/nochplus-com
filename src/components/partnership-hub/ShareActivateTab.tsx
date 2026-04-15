import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Share2, CreditCard, Gift, Mail, Check } from "lucide-react";
import { toast } from "sonner";
import {
  TierName, TIER_LABELS, TIER_BADGE_CLASSES,
  calcSiteMonthlyCost,
} from "@/constants/nochPlusTiers";
import type { PartnerInfo, SiteConfig } from "@/hooks/usePartnershipHub";
import { usePartnershipPlans, useCreatePartnershipPlan, type PartnershipPlan } from "@/hooks/usePartnershipPlans";

interface ShareActivateTabProps {
  partnerInfo: PartnerInfo;
  sites: SiteConfig[];
  summary: {
    totalChargers: number; monthlyTotal: number; annualTotal: number;
    annualPrePay: number; estimatedSavings: number;
  };
}

type Mode = "share" | "activate" | "trial";

const STATUS_COLORS: Record<string, string> = {
  shared: "bg-amber-500/10 text-amber-600",
  viewed: "bg-blue-500/10 text-blue-600",
  activated: "bg-emerald-500/10 text-emerald-600",
  trial: "bg-purple-500/10 text-purple-600",
  expired: "bg-muted text-muted-foreground",
};

export function ShareActivateTab({ partnerInfo, sites, summary }: ShareActivateTabProps) {
  const [mode, setMode] = useState<Mode>("share");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const { data: plans = [] } = usePartnershipPlans();
  const createPlan = useCreatePartnershipPlan();

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
  const displayAmount = billingCycle === "annual" ? summary.annualPrePay : summary.monthlyTotal;

  const handleShare = async () => {
    if (!partnerInfo.email) {
      toast.error("Please fill in the partner email in the Plan Builder tab.");
      return;
    }
    try {
      await createPlan.mutateAsync({
        company_name: partnerInfo.companyName,
        contact_email: partnerInfo.email,
        plan_data: { sites, partnerInfo },
        total_monthly: summary.monthlyTotal,
        total_annual: summary.annualTotal,
        billing_cycle: billingCycle,
        status: "shared",
      });
      toast.success("Partnership plan shared! Email would be sent in Phase 2.");
    } catch {
      toast.error("Failed to share plan.");
    }
  };

  const handleActivate = () => {
    toast.success("Payment processing will be available in Phase 2 with Stripe integration.");
  };

  const handleTrial = async () => {
    if (!partnerInfo.email) {
      toast.error("Please fill in the partner email.");
      return;
    }
    try {
      await createPlan.mutateAsync({
        company_name: partnerInfo.companyName,
        contact_email: partnerInfo.email,
        plan_data: { sites, partnerInfo },
        total_monthly: summary.monthlyTotal,
        total_annual: summary.annualTotal,
        billing_cycle: billingCycle,
        status: "trial",
      });
      toast.success("30-day free trial activated! Partner would receive welcome email in Phase 2.");
    } catch {
      toast.error("Failed to activate trial.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mode Selector */}
      <div className="flex gap-2">
        <Button variant={mode === "share" ? "default" : "outline"} onClick={() => setMode("share")} className="flex-1">
          <Share2 className="h-4 w-4 mr-2" /> Share Plan with Partner
        </Button>
        <Button variant={mode === "activate" ? "default" : "outline"} onClick={() => setMode("activate")} className="flex-1">
          <CreditCard className="h-4 w-4 mr-2" /> Activate Now
        </Button>
        <Button variant={mode === "trial" ? "default" : "outline"} onClick={() => setMode("trial")} className="flex-1">
          <Gift className="h-4 w-4 mr-2" /> Start 30-Day Free Trial
        </Button>
      </div>

      {/* Plan Summary */}
      <Card className="bg-sidebar text-sidebar-foreground border-sidebar-border">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-sidebar-foreground/50">Company</p>
              <p className="font-medium">{partnerInfo.companyName || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-sidebar-foreground/50">Email</p>
              <p className="font-medium">{partnerInfo.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-sidebar-foreground/50">Total Chargers</p>
              <p className="font-medium">{summary.totalChargers}</p>
            </div>
            <div>
              <p className="text-xs text-sidebar-foreground/50">Est. Savings</p>
              <p className="font-medium text-emerald-400">{fmt(summary.estimatedSavings)}/yr</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Toggle (not for trial) */}
      {mode !== "trial" && (
        <div className="flex gap-2 justify-center">
          <Button size="sm" variant={billingCycle === "monthly" ? "default" : "outline"} onClick={() => setBillingCycle("monthly")}>
            Monthly — {fmt(summary.monthlyTotal)}/mo
          </Button>
          <Button size="sm" variant={billingCycle === "annual" ? "default" : "outline"} onClick={() => setBillingCycle("annual")} className="flex items-center gap-2">
            Annual — {fmt(summary.annualPrePay)}/yr
            <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">1 MONTH FREE</Badge>
          </Button>
        </div>
      )}

      {/* Charger Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Charger Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sites.map((site) => {
            const monthly = calcSiteMonthlyCost(site.l2Count, site.dcCount, site.tier);
            return (
              <div key={site.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{site.name}</span>
                  <span className="text-sm text-muted-foreground">{site.l2Count} L2 · {site.dcCount} DC</span>
                  <Badge className={TIER_BADGE_CLASSES[site.tier]}>{TIER_LABELS[site.tier]}</Badge>
                </div>
                <span className="font-semibold">{fmt(monthly)}/mo</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Mode-specific action */}
      {mode === "share" && (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <Mail className="h-8 w-8 mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              Share this partnership plan with {partnerInfo.email || "the partner"}.
              They'll receive a custom link to review and activate.
            </p>
            <Button size="lg" onClick={handleShare} disabled={createPlan.isPending}>
              <Share2 className="h-4 w-4 mr-2" /> Share Partnership Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === "activate" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Payment processing via Stripe will be available in Phase 2. Card data will never touch NOCH servers.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Name on Card</Label>
                <Input placeholder="Full name" disabled />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Card Number</Label>
                <Input placeholder="•••• •••• •••• ••••" disabled />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expiry</Label>
                <Input placeholder="MM/YY" disabled />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CVC</Label>
                <Input placeholder="•••" disabled />
              </div>
            </div>
            <div className="text-center">
              <Button size="lg" onClick={handleActivate}>
                <CreditCard className="h-4 w-4 mr-2" /> Process Payment & Activate Partnership
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "trial" && (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <Gift className="h-8 w-8 mx-auto text-purple-500" />
            <p className="text-sm font-medium">30-Day Free Trial</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Full tier access for 30 days. No payment required upfront. Card on file is optional.
              Auto-converts at day 30 if card is on file, or prompts for payment.
            </p>
            <Button size="lg" onClick={handleTrial} disabled={createPlan.isPending} className="bg-purple-600 hover:bg-purple-700">
              <Gift className="h-4 w-4 mr-2" /> Activate 30-Day Free Trial
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Partnership Pipeline */}
      {plans.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Partnership Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Company</th>
                    <th className="text-left p-2 font-medium">Email</th>
                    <th className="text-left p-2 font-medium">Date</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-right p-2 font-medium">MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id} className="border-b last:border-0">
                      <td className="p-2 font-medium">{plan.company_name || "—"}</td>
                      <td className="p-2 text-muted-foreground">{plan.contact_email}</td>
                      <td className="p-2 text-muted-foreground">{new Date(plan.shared_at).toLocaleDateString()}</td>
                      <td className="p-2">
                        <Badge className={STATUS_COLORS[plan.status] || STATUS_COLORS.shared}>
                          {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-medium">{fmt(plan.total_monthly)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
