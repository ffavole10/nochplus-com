import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FEATURE_MATRIX, TIER_PRICING, TierName, ALL_TIERS } from "@/constants/nochPlusTiers";
import { Crown, Check, Minus, Users, Award, MapPin, ShieldCheck, ChevronDown, ChevronUp, Receipt, Sparkles, Building2 } from "lucide-react";
import invoiceEssential from "@/assets/noch-plus-invoice-essential.png";
import invoicePriority from "@/assets/noch-plus-invoice-priority.png";
import invoiceElite from "@/assets/noch-plus-invoice-elite.png";
import { NOCH_PLUS_TOS_URL } from "@/constants/termsOfService";
import { EnterpriseContactModal } from "./EnterpriseContactModal";

const INVOICE_IMAGES: Record<"essential" | "priority" | "elite", string> = {
  essential: invoiceEssential,
  priority: invoicePriority,
  elite: invoiceElite,
};

interface PlanTiersTabProps {
  onNavigate?: (tab: string) => void;
}

type ChargerToggle = "ac" | "dc";

const TIER_HIGHLIGHTS: Record<TierName, string[]> = {
  starter: [
    "Unlimited chargers",
    "Direct ticket submission",
    "1 free site assessment",
    "Partner portal access",
    "Standard rates (no discounts)",
  ],
  essential: [
    "72-hour onsite response SLA",
    "Business hours coverage (M–F, 8a–5p)",
    "10% off labor rates",
    "5% off parts",
    "1 travel fee waiver per year",
  ],
  priority: [
    "48-hour onsite response SLA",
    "Extended hours coverage (M–F, 7a–9p)",
    "15% off labor rates",
    "10% off parts",
    "50% off preventative maintenance visits",
  ],
  elite: [
    "24-hour onsite response SLA",
    "7-day coverage (7a–9p)",
    "20% off labor rates",
    "15% off parts",
    "1 PM visit per year included",
  ],
  enterprise: [
    "Custom SLA (as fast as needed)",
    "Dedicated NOCH team",
    "Volume pricing on labor & parts",
    "Unlimited PM visits & assessments",
    "24/7 coverage available",
  ],
};

const TRUST_SIGNALS = [
  { icon: Users, title: "22 W2 In-House Technicians", desc: "Our own certified team, not contractors" },
  { icon: Award, title: "EVITP Certified", desc: "Industry-standard EV infrastructure training" },
  { icon: MapPin, title: "Multi-State Coverage", desc: "Nationwide reach with local expertise" },
  { icon: ShieldCheck, title: "SLA Credit-Back Guarantee", desc: "We credit your account if we miss our response window" },
];

function isBooleanNo(val: string) {
  return val.trim() === "—" || val.trim() === "-" || val.trim() === "";
}

export function PlanTiersTab({ onNavigate }: PlanTiersTabProps) {
  const [toggle, setToggle] = useState<ChargerToggle>("ac");
  const [expanded, setExpanded] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const corePrice = (tier: "essential" | "priority" | "elite") =>
    toggle === "ac" ? TIER_PRICING[tier].l2 : TIER_PRICING[tier].dc;

  const featureRows = FEATURE_MATRIX.filter(
    (r) => !r.feature.startsWith("L2 AC") && !r.feature.startsWith("L3 DCFC")
  );

  const renderFeatureValue = (value: string) => {
    if (isBooleanNo(value)) {
      return <Minus className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />;
    }
    return (
      <div className="flex items-start gap-1.5">
        <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
        <span>{value}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">NOCH+ Membership Tiers</h2>
        <p className="text-sm text-muted-foreground mt-1">
          From free to fully custom — five plans designed for every stage of growth
        </p>
      </div>

      {/* AC / DC Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-full bg-muted p-1 gap-0.5">
          <button
            onClick={() => setToggle("ac")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              toggle === "ac"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            L2 AC Chargers
          </button>
          <button
            onClick={() => setToggle("dc")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              toggle === "dc"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            L3 DC Fast Chargers
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex justify-center">
          <button
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronUp className="h-4 w-4" /> Collapse Features
          </button>
        </div>
      )}

      {/* Pricing Cards: 5 tiers + Trust Signals (sidebar on xl) */}
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-4">
        {/* 5 pricing cards span 5 columns on xl */}
        <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {ALL_TIERS.map((tier) => {
            const isPriority = tier === "priority";
            const isStarter = tier === "starter";
            const isEnterprise = tier === "enterprise";
            const isCore = !isStarter && !isEnterprise;

            // Card styling per tier
            const cardClass = isPriority
              ? "border-primary shadow-lg ring-1 ring-primary/20 lg:scale-[1.03] z-10 bg-card"
              : isEnterprise
              ? "border-amber-500/40 ring-1 ring-amber-500/20 bg-slate-900 text-slate-100 shadow-lg"
              : isStarter
              ? "border-border bg-muted/30 shadow-sm"
              : "border-border shadow-sm bg-card";

            const tierLabelClass = isEnterprise
              ? "text-amber-400"
              : tier === "elite"
              ? "text-amber-600"
              : isPriority
              ? "text-primary"
              : "text-muted-foreground";

            return (
              <Card key={tier} className={`relative flex flex-col ${cardClass}`}>
                {isPriority && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-3 py-0.5">
                      <Crown className="h-3 w-3 mr-1" /> Recommended
                    </Badge>
                  </div>
                )}
                {isEnterprise && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-slate-900 text-[10px] px-3 py-0.5 border-0">
                      <Sparkles className="h-3 w-3 mr-1" /> Custom
                    </Badge>
                  </div>
                )}

                <CardContent className="flex flex-col flex-1 p-5 pt-6">
                  <p className={`text-sm font-semibold tracking-wide uppercase ${tierLabelClass}`}>
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </p>

                  {/* Price block */}
                  {isStarter ? (
                    <>
                      <div className="mt-3">
                        <span className="text-3xl font-bold">Free</span>
                      </div>
                      <p className={`text-xs ${isEnterprise ? "text-slate-400" : "text-muted-foreground"}`}>
                        no credit card required
                      </p>
                    </>
                  ) : isEnterprise ? (
                    <>
                      <div className="mt-3">
                        <span className="text-2xl font-bold text-slate-100">Custom Pricing</span>
                      </div>
                      <p className="text-xs text-slate-400">for large-scale operations</p>
                    </>
                  ) : (
                    <>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-3xl font-bold">${corePrice(tier as "essential" | "priority" | "elite")}</span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </div>
                      <p className="text-xs text-muted-foreground">per charger / month</p>
                    </>
                  )}

                  {/* CTA */}
                  {isStarter ? (
                    <Button
                      variant="outline"
                      className="mt-4 w-full"
                      onClick={() => onNavigate?.("plan-builder")}
                    >
                      Get Started
                    </Button>
                  ) : isEnterprise ? (
                    <Button
                      className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-slate-900 border-0"
                      onClick={() => setContactOpen(true)}
                    >
                      <Building2 className="h-4 w-4 mr-1.5" /> Contact Us
                    </Button>
                  ) : (
                    <Button
                      variant={isPriority ? "default" : "outline"}
                      className="mt-4 w-full"
                      onClick={() => onNavigate?.("plan-builder")}
                    >
                      Build a Plan
                    </Button>
                  )}

                  {/* Highlights */}
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {TIER_HIGHLIGHTS[tier].map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Check
                          className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                            isEnterprise ? "text-amber-400" : "text-primary"
                          }`}
                        />
                        <span className={isEnterprise ? "text-slate-300" : "text-muted-foreground"}>
                          {h}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Expanded feature list */}
                  {expanded && (
                    <div
                      className={`mt-4 pt-4 border-t space-y-0 ${
                        isEnterprise ? "border-slate-700" : "border-border"
                      }`}
                    >
                      {featureRows.map((row, i) => {
                        const value = row[tier];
                        return (
                          <div
                            key={i}
                            className={`flex items-start gap-2 text-xs py-2 px-1 rounded ${
                              i % 2 === 1 ? (isEnterprise ? "bg-slate-800/40" : "bg-muted/30") : ""
                            }`}
                          >
                            <div className="w-full">
                              <p
                                className={`text-[10px] mb-0.5 ${
                                  isEnterprise ? "text-slate-500" : "text-muted-foreground/60"
                                }`}
                              >
                                {row.feature}
                              </p>
                              <div className={isEnterprise ? "text-slate-200" : "text-foreground"}>
                                {renderFeatureValue(value)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trust Signals — sidebar on xl, strip below on smaller */}
        <div className="xl:col-span-1 flex flex-col gap-4 justify-start xl:sticky xl:top-6 self-start">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Why NOCH+?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
            {TRUST_SIGNALS.map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <t.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight">{t.title}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle buttons row */}
      <div className="flex flex-wrap justify-center items-center gap-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-4 w-4" /> Collapse Features</>
          ) : (
            <><ChevronDown className="h-4 w-4" /> Expand All Features</>
          )}
        </button>
        <button
          onClick={() => setShowInvoices(!showInvoices)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Receipt className="h-4 w-4" />
          {showInvoices ? "Hide Demo Invoices" : "Show Demo Invoices"}
        </button>
      </div>

      {/* Demo Invoices Section */}
      {showInvoices && (
        <div className="space-y-6 pt-4">
          <div className="text-center">
            <h3 className="text-xl font-bold tracking-tight">Same Service Call. Different Savings.</h3>
            <p className="text-sm text-muted-foreground mt-1">
              See how NOCH+ membership discounts apply to a real CCS cable replacement on a DC fast charger.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(["essential", "priority", "elite"] as const).map((tier) => (
              <div key={tier} className="flex flex-col items-center gap-2">
                <div className="overflow-hidden rounded-lg border border-border shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 bg-background w-full">
                  <img
                    src={INVOICE_IMAGES[tier]}
                    alt={`NOCH+ ${tier} demo invoice showing member savings`}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Terms of Service link */}
      <div className="pt-4 text-center">
        <a
          href={NOCH_PLUS_TOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          View NOCH+ Terms of Service
        </a>
      </div>

      <EnterpriseContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
