import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIER_PRICING, TierName, ALL_TIERS, TIER_LABELS } from "@/constants/nochPlusTiers";
import { Crown, Check, Minus, Users, Award, Shield, TrendingUp, DollarSign, Sparkles } from "lucide-react";
import { NOCH_PLUS_TOS_URL } from "@/constants/termsOfService";
import { EnterpriseContactModal } from "./EnterpriseContactModal";

export interface PlanBuilderPreset {
  tier: TierName;
  chargerType: "ac" | "dc";
}

interface PlanTiersTabProps {
  onNavigate?: (tab: string, preset?: PlanBuilderPreset) => void;
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
    "72-hour guaranteed response",
    "Business hours coverage (M–F, 8a–5p)",
    "10% off labor rates",
    "5% off parts",
    "1 travel fee waiver per year",
  ],
  priority: [
    "48-hour guaranteed response",
    "Extended hours coverage (M–F, 7a–9p)",
    "15% off labor rates",
    "10% off parts",
    "50% off preventative maintenance visits",
  ],
  elite: [
    "24-hour guaranteed response",
    "7-day coverage (7a–9p)",
    "20% off labor rates",
    "15% off parts",
    "1 PM visit per year included",
  ],
  enterprise: [
    "Custom response guarantee",
    "Dedicated NOCH team",
    "Volume pricing on labor & parts",
    "Unlimited PM visits & assessments",
    "24/7 coverage available",
  ],
};

const TRUST_SIGNALS = [
  { icon: Shield, title: "Brand Protection", desc: "Keep chargers online and drivers happy. Protect your brand from downtime and frustration." },
  { icon: TrendingUp, title: "Increase Revenue", desc: "More uptime means more sessions. Turn every charger into a consistent revenue driver." },
  { icon: DollarSign, title: "Reduce Costs", desc: "Lower service costs with faster fixes and built-in discounts on labor and parts." },
  { icon: Award, title: "EVITP Certified", desc: "Trained experts in EV infrastructure. No guesswork, just reliable execution." },
  { icon: Users, title: "In-House Technicians", desc: "Our own team, not contractors. Better quality, faster response, full accountability." },
];

// Progressive feature comparison sections
type Cell = string | boolean;
interface FeatureRow {
  name: string;
  values: [Cell, Cell, Cell, Cell, Cell]; // starter, essential, priority, elite, enterprise
}
interface FeatureSection {
  title: string;
  rows: FeatureRow[];
}

const FEATURE_SECTIONS: FeatureSection[] = [
  {
    title: "Included in all tiers",
    rows: [
      { name: "Direct ticket submission", values: [true, true, true, true, true] },
      { name: "Partner portal access", values: [true, true, true, true, true] },
      { name: "Onboarding site assessment", values: [true, true, true, true, true] },
      { name: "Coverage hours", values: ["M–F 8a–5p", "M–F 8a–5p", "M–F 7a–9p", "7 days 7a–9p", "Custom (24/7)"] },
    ],
  },
  {
    title: "Essential adds",
    rows: [
      { name: "Guaranteed response time", values: [false, "72 hrs", "48 hrs", "24 hrs", "Custom"] },
      { name: "Labor rate discount", values: [false, "10% off", "15% off", "20% off", "Custom"] },
      { name: "Parts discount", values: [false, "5% off", "10% off", "15% off", "Custom"] },
      { name: "Travel fee waivers", values: [false, "1 / year", "4 / year", "Unlimited", "Unlimited"] },
    ],
  },
  {
    title: "Priority adds",
    rows: [
      { name: "Priority dispatch queue", values: [false, false, "Ahead of queue", "Top of queue", "Top of queue"] },
      { name: "Preventative maintenance", values: [false, "Add-on", "50% off", "1 visit / yr", "Unlimited"] },
      { name: "Emergency parts priority", values: [false, false, true, true, true] },
      { name: "Annual site health report", values: [false, false, "1-page scorecard", "Detailed + recs", "Custom dashboard"] },
    ],
  },
  {
    title: "Elite adds",
    rows: [
      { name: "Dedicated Account Manager", values: [false, false, false, true, true] },
      { name: "After-hours emergency line", values: [false, false, false, true, true] },
      { name: "Quarterly business review", values: [false, false, false, true, true] },
      { name: "Unlimited site assessments (new/replacement)", values: [false, false, false, true, true] },
    ],
  },
  {
    title: "Enterprise adds",
    rows: [
      { name: "Dedicated NOCH team", values: [false, false, false, false, true] },
      { name: "Custom volume pricing", values: [false, false, false, false, true] },
      { name: "Inventory reservation", values: [false, false, false, false, true] },
      { name: "Custom reporting dashboard", values: [false, false, false, false, true] },
    ],
  },
];

const TIER_ORDER: TierName[] = ["starter", "essential", "priority", "elite", "enterprise"];

function renderCell(value: Cell) {
  if (value === true) {
    return <Check className="h-4 w-4 text-primary mx-auto" />;
  }
  if (value === false) {
    return <Minus className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />;
  }
  return <span className="text-xs text-foreground">{value}</span>;
}

const TOGGLE_STORAGE_KEY = "nochplus.planTiers.chargerToggle";

export function PlanTiersTab({ onNavigate }: PlanTiersTabProps) {
  const [toggle, setToggle] = useState<ChargerToggle>(() => {
    if (typeof window === "undefined") return "ac";
    const saved = window.sessionStorage.getItem(TOGGLE_STORAGE_KEY);
    return saved === "dc" ? "dc" : "ac";
  });
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(TOGGLE_STORAGE_KEY, toggle);
    }
  }, [toggle]);

  const corePrice = (tier: "essential" | "priority" | "elite") =>
    toggle === "ac" ? TIER_PRICING[tier].l2 : TIER_PRICING[tier].dc;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">NOCH+ Membership Tiers</h2>
        <p className="text-sm text-muted-foreground mt-1">
          From free to fully custom — five plans designed for every stage of growth
        </p>
      </div>

      {/* Outcome fees notice */}
      <div className="flex justify-end">
        <Badge variant="outline" className="text-xs">
          Outcome fees launch CY 2027 for Priority+ tiers
        </Badge>
      </div>

      {/* Controls row: AC/DC toggle + Show features toggle, left-aligned */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="inline-flex items-center rounded-full bg-muted p-1 gap-0.5">
          <button
            onClick={() => setToggle("ac")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              toggle === "ac"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            AC Chargers
          </button>
          <button
            onClick={() => setToggle("dc")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              toggle === "dc"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            DC Chargers
          </button>
        </div>
      </div>

      {/* Pricing Cards: Trust Signals sidebar (left) + 5 tiers (Enterprise = contact-only, no plan builder) */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(180px,1fr)_repeat(5,minmax(0,1fr))] gap-4">
        {/* Trust Signals — sidebar on xl (LEFT), strip above on smaller */}
        <div className="xl:order-1 flex flex-col gap-4 justify-start self-start">
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

        {/* 5 pricing cards span 5 columns on xl */}
        <div className="xl:col-span-5 xl:order-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {ALL_TIERS.map((tier) => {
            const isPriority = tier === "priority";
            const isStarter = tier === "starter";
            const isEnterprise = tier === "enterprise";

            // Card styling per tier
            const cardClass = isEnterprise
              ? "border-slate-700 shadow-lg bg-slate-900 text-slate-100"
              : isPriority
              ? "border-primary shadow-lg ring-1 ring-primary/20 lg:scale-[1.03] z-10 bg-card"
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
                    <Badge className="bg-amber-400 text-slate-900 text-[10px] px-3 py-0.5 border-0">
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
                      <p className="text-xs text-muted-foreground">
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
                      onClick={() => onNavigate?.("plan-builder", { tier: "starter", chargerType: toggle })}
                    >
                      Get Started
                    </Button>
                  ) : isEnterprise ? (
                    <Button
                      className="mt-4 w-full bg-teal-500 hover:bg-teal-400 text-slate-900 border-0"
                      onClick={() => setEnterpriseOpen(true)}
                    >
                      Contact Us
                    </Button>
                  ) : (
                    <Button
                      variant={isPriority ? "default" : "outline"}
                      className="mt-4 w-full"
                      onClick={() => onNavigate?.("plan-builder", { tier: tier as TierName, chargerType: toggle })}
                    >
                      Build a Plan
                    </Button>
                  )}

                  {/* Highlights */}
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {TIER_HIGHLIGHTS[tier].map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Check className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isEnterprise ? "text-amber-400" : "text-primary"}`} />
                        <span className={isEnterprise ? "text-slate-300" : "text-muted-foreground"}>{h}</span>
                      </li>
                    ))}
                  </ul>

                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Unified feature comparison — all 5 tiers including Enterprise */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {/* Header row */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(180px,1fr)_repeat(5,minmax(0,1fr))] gap-4 bg-muted/50 border-b border-border px-4 py-3">
          <div className="text-left font-semibold text-foreground text-sm">Feature</div>
          {ALL_TIERS.map((tier) => {
            const isPriority = tier === "priority";
            const isEnterprise = tier === "enterprise";
            return (
              <div
                key={tier}
                className={`text-center font-semibold text-sm flex items-center justify-center gap-1 ${
                  isPriority ? "text-primary" : isEnterprise ? "text-amber-600" : "text-foreground"
                }`}
              >
                {isPriority && <Crown className="h-3 w-3" />}
                {isEnterprise && <Sparkles className="h-3 w-3" />}
                {TIER_LABELS[tier]}
              </div>
            );
          })}
        </div>

        {/* Body */}
        {FEATURE_SECTIONS.map((section) => (
          <React.Fragment key={section.title}>
            <div className="bg-muted/30 border-b border-border px-4 py-2 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
              {section.title}
            </div>
            {section.rows.map((row, rIdx) => (
              <div
                key={`${section.title}-${row.name}`}
                className={`grid grid-cols-1 xl:grid-cols-[minmax(180px,1fr)_repeat(5,minmax(0,1fr))] gap-4 border-b border-border/50 px-4 py-2.5 items-center ${
                  rIdx % 2 === 1 ? "bg-muted/20" : ""
                }`}
              >
                <div className="text-sm text-foreground">{row.name}</div>
                {row.values.map((val, i) => {
                  const isPriorityCol = TIER_ORDER[i] === "priority";
                  const isEnterpriseCol = TIER_ORDER[i] === "enterprise";
                  return (
                    <div
                      key={i}
                      className={`text-center text-sm flex items-center justify-center min-h-[1.5rem] ${
                        isPriorityCol ? "bg-primary/5 -my-2.5 py-2.5" : isEnterpriseCol ? "bg-slate-900/5 dark:bg-slate-100/5 -my-2.5 py-2.5" : ""
                      }`}
                    >
                      {renderCell(val)}
                    </div>
                  );
                })}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <EnterpriseContactModal open={enterpriseOpen} onOpenChange={setEnterpriseOpen} />

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
    </div>
  );
}
