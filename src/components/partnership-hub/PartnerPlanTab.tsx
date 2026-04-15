import { useState, useEffect } from "react";
import nochPlusIcon from "@/assets/noch-plus-icon.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Clock, Shield, Wrench, Package, CalendarCheck, Car, HeadphonesIcon,
  FileText, ClipboardCheck, AlertTriangle, Ticket, BarChart3,
  Phone, DollarSign, Users, MapPin, Search, MessageSquare,
  Share2, CreditCard, Gift, Mail, Check, ShieldCheck, Loader2,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  TierName, TIER_LABELS, TIER_BADGE_CLASSES, TIER_BORDER_COLORS,
  calcSiteMonthlyCost,
} from "@/constants/nochPlusTiers";
import type { PartnerInfo, SiteConfig } from "@/hooks/usePartnershipHub";
import { useKnowledgeBase, type KBItem } from "@/hooks/useKnowledgeBase";
import { usePartnershipPlans, useCreatePartnershipPlan } from "@/hooks/usePartnershipPlans";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

interface PartnerPlanTabProps {
  partnerInfo: PartnerInfo;
  sites: SiteConfig[];
  summary: {
    totalL2: number; totalDC: number; totalChargers: number;
    monthlyTotal: number; annualTotal: number; annualPrePay: number;
    estimatedSavings: number;
  };
}

type Mode = "share" | "activate" | "trial";

const TIER_RANK: Record<TierName, number> = { essential: 0, priority: 1, elite: 2 };

// Benefits with tier availability
const BENEFITS: { icon: any; title: string; desc: string; minTier: TierName }[] = [
  { icon: Clock, title: "Guaranteed Response SLA", desc: "24 to 72 hour onsite response with credit-back if we miss it", minTier: "essential" },
  { icon: Shield, title: "Priority Dispatch Queue", desc: "NOCH+ members jump ahead of non-members in the service queue", minTier: "priority" },
  { icon: DollarSign, title: "Labor Rate Discounts", desc: "10% to 20% off standard labor rates on every service call", minTier: "essential" },
  { icon: Package, title: "Parts Discounts", desc: "5% to 15% off parts pricing with expedited sourcing", minTier: "essential" },
  { icon: CalendarCheck, title: "Preventative Maintenance", desc: "50% off PM visits (Priority) or 1 visit/yr included (Elite)", minTier: "priority" },
  { icon: Car, title: "Travel Fee Waivers", desc: "1 to unlimited waivers per year within NOCH service areas", minTier: "essential" },
  { icon: HeadphonesIcon, title: "Dedicated Support", desc: "From shared ticket queue up to a dedicated Account Manager", minTier: "essential" },
  { icon: FileText, title: "Annual Site Health Report", desc: "Reliability scorecard with uptime data and recommendations", minTier: "priority" },
  { icon: ClipboardCheck, title: "Onboarding Site Assessment", desc: "Complimentary evaluation at signup; unlimited for new installs on Elite", minTier: "essential" },
  { icon: AlertTriangle, title: "Emergency Parts Priority", desc: "Priority and Elite members get first access to our parts inventory", minTier: "priority" },
  { icon: Ticket, title: "Direct Ticket Submission", desc: "Open service tickets directly in our system for fast response", minTier: "essential" },
  { icon: BarChart3, title: "Quarterly Business Review", desc: "Strategic review of service performance and recommendations", minTier: "elite" },
  { icon: Phone, title: "After-Hours Emergency Line", desc: "Direct emergency contact outside coverage hours", minTier: "elite" },
  { icon: DollarSign, title: "SLA Credit-Back Guarantee", desc: "10% to 20% credit on monthly fee if we miss the response window", minTier: "priority" },
  { icon: Users, title: "W2 In-House Technicians", desc: "Our own certified technicians, not contractors. We control quality.", minTier: "essential" },
  { icon: MapPin, title: "Multi-State Coverage", desc: "In-house technicians plus vetted partners for nationwide reach", minTier: "essential" },
];

const QUICK_QUESTIONS = [
  "What if you're late?", "Too expensive", "Already have a partner", "What states?",
  "Can we try it free?", "Who are your techs?", "OEM warranty?", "How fast to onboard?",
];

const STATUS_COLORS: Record<string, string> = {
  shared: "bg-amber-500/10 text-amber-600",
  viewed: "bg-blue-500/10 text-blue-600",
  activated: "bg-emerald-500/10 text-emerald-600",
  trial: "bg-purple-500/10 text-purple-600",
  expired: "bg-muted text-muted-foreground",
};

const UPGRADE_LABELS: Record<TierName, string> = {
  essential: "",
  priority: "Available on Priority & Elite",
  elite: "Available on Elite",
};

export function PartnerPlanTab({ partnerInfo, sites, summary }: PartnerPlanTabProps) {
  // Q&A state
  const { data: kbItems = [] } = useKnowledgeBase();
  const [query, setQuery] = useState("");
  const [matchedAnswer, setMatchedAnswer] = useState<KBItem | null>(null);
  const [history, setHistory] = useState<{ q: string; a: KBItem }[]>([]);

  // Benefits collapse
  const [benefitsExpanded, setBenefitsExpanded] = useState(false);
  const [qaExpanded, setQaExpanded] = useState(false);

  // Activation state
  const [mode, setMode] = useState<Mode>("share");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<"success" | "cancelled" | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: plans = [] } = usePartnershipPlans();
  const createPlan = useCreatePartnershipPlan();

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

  // Highest tier across all sites
  const highestTier: TierName = sites.reduce(
    (best, site) => (TIER_RANK[site.tier] > TIER_RANK[best] ? site.tier : best),
    "essential" as TierName
  );

  // Handle Stripe checkout return
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    if (checkout === "success" && sessionId) {
      setCheckoutResult("success");
      setMode("activate");
      verifyPayment(sessionId);
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
      const { data, error } = await supabase.functions.invoke("verify-noch-payment", { body: { sessionId } });
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

  const searchKB = (q: string) => {
    const lower = q.toLowerCase();
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    let best: KBItem | null = null;
    let bestScore = 0;
    for (const item of kbItems) {
      const combined = (item.question + " " + item.answer).toLowerCase();
      const score = words.filter((w) => combined.includes(w)).length;
      if (score > bestScore) { bestScore = score; best = item; }
    }
    if (best && bestScore > 0) {
      setMatchedAnswer(best);
      setHistory((prev) => [{ q, a: best! }, ...prev]);
    } else {
      setMatchedAnswer(null);
    }
  };

  const handleShare = async () => {
    if (!partnerInfo.email) { toast.error("Please fill in the partner email in the Plan Builder tab."); return; }
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
    } catch { toast.error("Failed to share plan."); }
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
      const dominantTier = sites.reduce(
        (best, site) => (TIER_RANK[site.tier] > TIER_RANK[best] ? site.tier : best),
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
          sites: sites.map(s => ({ name: s.name, l2Count: s.l2Count, dcCount: s.dcCount, tier: s.tier })),
          isTrial,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) { window.location.href = data.url; } else { throw new Error("No checkout URL returned"); }
    } catch (err: any) {
      console.error("Checkout error:", err);
      const msg = err?.message || "Something went wrong";
      toast.error(msg.includes("card") ? "There was an issue with payment processing. Please try again." : `Failed to start checkout: ${msg}`);
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Success/Cancel banner */}
      {checkoutResult === "success" && (
        <Card className="border-emerald-500 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700">Partnership Activated!</p>
              <p className="text-sm text-muted-foreground">Payment processed successfully. The membership is now active.</p>
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
              <p className="text-sm text-muted-foreground">No charge was made. You can try again when ready.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Section 1: Hero Banner ─── */}
      <div className="rounded-xl bg-gradient-to-r from-sidebar to-sidebar/80 p-8 text-sidebar-foreground">
        <div className="flex items-center gap-3 mb-4">
          <img src={nochPlusIcon} alt="NOCH+" className="w-10 h-10 rounded-lg" />
          <span className="text-sm font-medium text-sidebar-foreground/70 uppercase tracking-wider">NOCH+ Membership Program</span>
        </div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h2 className="text-2xl md:text-3xl font-bold">
            Custom Reliability Plan for {partnerInfo.companyName || "Your Organization"}
          </h2>
          <Badge className={TIER_BADGE_CLASSES[highestTier] + " text-sm px-3 py-1"}>
            {TIER_LABELS[highestTier]}
          </Badge>
        </div>
        <p className="text-sidebar-foreground/70 max-w-2xl">
          Fast response, priority dispatch, and discounted service, all for a flat monthly fee.
        </p>
      </div>

      {/* ─── Section 2: Stats Grid ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.totalChargers}</p>
            <p className="text-xs text-muted-foreground">{summary.totalL2} L2 + {summary.totalDC} DC</p>
            <p className="text-sm font-medium mt-1">Total Chargers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{fmt(summary.monthlyTotal)}</p>
            <p className="text-xs text-muted-foreground">per month</p>
            <p className="text-sm font-medium mt-1">Monthly Investment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{fmt(summary.annualTotal)}</p>
            <p className="text-xs text-muted-foreground">per year</p>
            <p className="text-sm font-medium mt-1">Annual Investment</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{fmt(summary.estimatedSavings)}</p>
            <p className="text-xs text-muted-foreground">estimated</p>
            <p className="text-sm font-medium mt-1">Annual Savings</p>
          </CardContent>
        </Card>
      </div>


      {/* ─── Section 4: What's Included (Collapsible) ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">What's Included in Your Plan</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setBenefitsExpanded(!benefitsExpanded)} className="text-xs gap-1.5">
              {benefitsExpanded ? <><ChevronUp className="h-3.5 w-3.5" /> Hide Plan Benefits</> : <><ChevronDown className="h-3.5 w-3.5" /> Show Plan Benefits</>}
            </Button>
          </div>
        </CardHeader>
        {benefitsExpanded && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BENEFITS.map(({ icon: Icon, title, desc, minTier }) => {
                const included = TIER_RANK[highestTier] >= TIER_RANK[minTier];
                return (
                  <div key={title} className={`flex gap-3 p-3 rounded-lg ${included ? "bg-muted/30" : "bg-muted/10 opacity-50"}`}>
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${included ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className={`text-sm font-medium ${included ? "" : "text-muted-foreground"}`}>{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                      {!included && (
                        <p className="text-[10px] text-primary/70 mt-0.5 font-medium">{UPGRADE_LABELS[minTier]}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─── Section 5: Q&A Assistant ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> NOCH+ Q&A Assistant
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setQaExpanded(!qaExpanded)} className="text-xs gap-1.5">
              {qaExpanded ? <><ChevronUp className="h-3.5 w-3.5" /> Hide Q&A</> : <><ChevronDown className="h-3.5 w-3.5" /> Show Q&A</>}
            </Button>
          </div>
        </CardHeader>
        {qaExpanded && (
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. What happens if you guys are late?"
                onKeyDown={(e) => e.key === "Enter" && searchKB(query)}
              />
              <Button onClick={() => searchKB(query)}>
                <Search className="h-4 w-4 mr-1" /> Get Answer
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q) => (
                <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => { setQuery(q); searchKB(q); }}>
                  {q}
                </Button>
              ))}
            </div>
            {matchedAnswer && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-semibold mb-1">Q: {matchedAnswer.question}</p>
                <p className="text-sm text-muted-foreground">{matchedAnswer.answer}</p>
              </div>
            )}
            {!matchedAnswer && query && (
              <p className="text-sm text-muted-foreground italic">
                I don't have a specific answer for that in our Knowledge Base yet. You can add it in the Knowledge Base tab.
              </p>
            )}
            {history.length > 1 && (
              <>
                <Separator />
                <p className="text-xs font-medium text-muted-foreground">Previous Questions</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {history.slice(1).map((h, i) => (
                    <button key={i} className="w-full text-left p-2 rounded hover:bg-muted/50 text-xs" onClick={() => setMatchedAnswer(h.a)}>
                      {h.q}
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* ─── Section 6: Activation ─── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <h3 className="text-lg font-semibold whitespace-nowrap">Ready to Activate?</h3>
          <Separator className="flex-1" />
        </div>

        {/* Mode selector */}
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

        {/* Partner summary */}
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

        {/* Billing toggle (not for trial) */}
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
                  {billingCycle === "annual" ? `${fmt(summary.annualPrePay)}/year` : `${fmt(summary.monthlyTotal)}/month`}
                </p>
                <p className="text-sm text-muted-foreground">
                  You'll be redirected to a secure Stripe Checkout page to enter payment details.
                </p>
              </div>
              <div className="text-center">
                <Button size="lg" onClick={() => startCheckout(false)} disabled={isProcessing}>
                  {isProcessing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
                  ) : (
                    <><CreditCard className="h-4 w-4 mr-2" /> Process Payment & Activate Partnership</>
                  )}
                </Button>
              </div>
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
              <Button size="lg" onClick={() => startCheckout(true)} disabled={isProcessing} className="bg-purple-600 hover:bg-purple-700">
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
                ) : (
                  <><Gift className="h-4 w-4 mr-2" /> Start 30-Day Free Trial</>
                )}
              </Button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Secured by Stripe — no charge during trial</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Section 7: Partnership Pipeline ─── */}
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
