import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FEATURE_MATRIX, TIER_PRICING, TierName } from "@/constants/nochPlusTiers";
import { Crown, Check, Minus, Users, Award, MapPin, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

interface PlanTiersTabProps {
  onNavigate?: (tab: string) => void;
}

type ChargerToggle = "ac" | "dc";

const TIER_HIGHLIGHTS: Record<TierName, string[]> = {
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

  const price = (tier: TierName) =>
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

  const tiers: TierName[] = ["essential", "priority", "elite"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">NOCH+ Membership Tiers</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Compare benefits and pricing across Essential, Priority, and Elite
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

      {/* Collapse button at top when expanded */}
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

      {/* Pricing Cards + Trust Signals */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Three pricing cards */}
        {tiers.map((tier) => {
          const isPriority = tier === "priority";
          return (
            <Card
              key={tier}
              className={`relative flex flex-col ${
                isPriority
                  ? "border-primary shadow-lg ring-1 ring-primary/20 scale-[1.02] z-10"
                  : "border-border shadow-sm"
              }`}
            >
              {isPriority && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-3 py-0.5">
                    <Crown className="h-3 w-3 mr-1" /> Recommended
                  </Badge>
                </div>
              )}
              <CardContent className="flex flex-col flex-1 p-5 pt-6">
                <p className={`text-sm font-semibold tracking-wide uppercase ${
                  tier === "elite" ? "text-amber-600" : isPriority ? "text-primary" : "text-muted-foreground"
                }`}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </p>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${price(tier)}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground">per charger / month</p>

                <Button
                  variant={isPriority ? "default" : "outline"}
                  className="mt-4 w-full"
                  onClick={() => onNavigate?.("plan-builder")}
                >
                  Build a Plan
                </Button>

                <ul className="mt-5 space-y-2.5 flex-1">
                  {TIER_HIGHLIGHTS[tier].map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{h}</span>
                    </li>
                  ))}
                </ul>

                {/* Expanded feature list */}
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-0">
                    {featureRows.map((row, i) => {
                      const value = row[tier];
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-2 text-xs py-2 px-1 rounded ${
                            i % 2 === 1 ? "bg-muted/30" : ""
                          }`}
                        >
                          <div className="w-full">
                            <p className="text-[10px] text-muted-foreground/60 mb-0.5">{row.feature}</p>
                            <div className="text-foreground">{renderFeatureValue(value)}</div>
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

        {/* Trust Signals */}
        <div className="flex flex-col gap-4 justify-center">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Why NOCH+?</h3>
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

      {/* Expand / Collapse toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" /> Collapse Features
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> Expand All Features
            </>
          )}
        </button>
      </div>
    </div>
  );
}
