import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Share2, CreditCard, Gift, Mail, Check, ShieldCheck, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  TierName, TIER_LABELS, TIER_BADGE_CLASSES,
  calcSiteMonthlyCost,
} from "@/constants/nochPlusTiers";
import type { PartnerInfo, SiteConfig } from "@/hooks/usePartnershipHub";
import { usePartnershipPlans, useCreatePartnershipPlan, type PartnershipPlan } from "@/hooks/usePartnershipPlans";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<"success" | "cancelled" | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: plans = [] } = usePartnershipPlans();
  const createPlan = useCreatePartnershipPlan();

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
  const displayAmount = billingCycle === "annual" ? summary.annualPrePay : summary.monthlyTotal;

  // Handle Stripe checkout return
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (checkout === "success" && sessionId) {
      setCheckoutResult("success");
      setMode("activate");
      // Verify payment and create membership
      verifyPayment(sessionId);
      // Clean URL params
      searchParams.delete("checkout");
      searchParams.delete("session_id");
      setSearchParams(searchParams, { replace: true });
    } else if (checkout === "cancelled") {
      setCheckoutResult("cancelled");
      setMode("activate");
      toast.error("Payment was cancelled. You can try again when ready.");
      searchParams.delete("checkout");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const verifyPayment = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-noch-payment", {
        body: { sessionId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.alreadyExists) {
        toast.info("This membership was already activated.");
      } else {
        toast.success(
          data?.status === "trial"
            ? "🎉 30-day free trial activated! Welcome to NOCH+."
            : "🎉 Partnership activated! Welcome to NOCH+."
        );
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      toast.error("Payment succeeded but membership setup had an issue. Our team will follow up.");
    }
  };

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

  const startCheckout = async (isTrial: boolean) => {
    if (!partnerInfo.companyName || !partnerInfo.email) {
      toast.error("Please fill in company name and email in the Plan Builder tab.");
      return;
    }
    if (summary.totalChargers === 0) {
      toast.error("Please add at least one site with chargers in the Plan Builder tab.");
      return;
    }

    setIsProcessing(true);
    try {
      // Determine the dominant tier across sites
      const dominantTier = sites.reduce(
        (best, site) => {
          const rank = { essential: 0, priority: 1, elite: 2 };
          return rank[site.tier] > rank[best] ? site.tier : best;
        },
        "essential" as TierName
      );

      const { data, error } = await supabase.functions.invoke("create-noch-checkout", {
        body: {
          companyName: partnerInfo.companyName,
          contactName: partnerInfo.contactName,
          email: partnerInfo.email,
          phone: partnerInfo.phone,
          monthlyAmount: summary.monthlyTotal,
          annualAmount: summary.annualPrePay,
          billingCycle,
          tier: dominantTier,
          sites: sites.map(s => ({
            name: s.name,
            l2Count: s.l2Count,
            dcCount: s.dcCount,
            tier: s.tier,
          })),
          isTrial,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      const msg = err?.message || "Something went wrong";
      if (msg.includes("card")) {
        toast.error("There was an issue with payment processing. Please try again.");
      } else {
        toast.error(`Failed to start checkout: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Success/Cancel banner */}
      {checkoutResult === "success" && (
        <Card className="border-emerald-500 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700">Partnership Activated!</p>
              <p className="text-sm text-muted-foreground">
                Payment processed successfully. The membership is now active.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {checkoutResult === "cancelled" && (
        <Card className="border-amber-500 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold text-amber-700">Checkout Cancelled</p>
              <p className="text-sm text-muted-foreground">
                No charge was made. You can try again when ready.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
          <CardContent className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">
                {billingCycle === "annual"
                  ? `${fmt(summary.annualPrePay)}/year`
                  : `${fmt(summary.monthlyTotal)}/month`}
              </p>
              <p className="text-sm text-muted-foreground">
                You'll be redirected to a secure Stripe Checkout page to enter payment details.
              </p>
            </div>

            <div className="text-center">
              <Button
                size="lg"
                onClick={() => startCheckout(false)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" /> Process Payment & Activate Partnership
                  </>
                )}
              </Button>
            </div>

            {/* Stripe trust badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Secured by Stripe — card data never touches NOCH servers</span>
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
              Full tier access for 30 days. Card on file is optional —
              you'll be taken to Stripe Checkout where you can choose to add a card or skip.
              Auto-converts at day 30 if card is on file.
            </p>
            <Button
              size="lg"
              onClick={() => startCheckout(true)}
              disabled={isProcessing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" /> Start 30-Day Free Trial
                </>
              )}
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Secured by Stripe — no charge during trial</span>
            </div>
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
