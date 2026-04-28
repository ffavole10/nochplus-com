import { Check, Crown, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * LOCKED tier names + pricing per the Neural Deck Briefing.
 * These prices are DISPLAY-ONLY for the Membership > Plan Tiers tab and
 * intentionally diverge from src/constants/nochPlusTiers.ts (which still
 * powers the legacy Plan Builder math). The constants file remains the
 * source of truth for ROI calculations until a follow-up batch reconciles
 * the two.
 */
const LOCKED_TIERS = [
  {
    key: "starter",
    name: "Starter",
    ac: "Free",
    dc: "Free",
    bestFor: "Top-of-funnel acquisition",
    highlights: [
      "Unlimited chargers",
      "Direct ticket submission",
      "1 free site assessment",
      "Standard rates (no discounts)",
    ],
    accent: "border-muted",
  },
  {
    key: "essential",
    name: "Essential",
    ac: "$5",
    dc: "$15",
    bestFor: "Reactive service membership",
    highlights: [
      "72-hour guaranteed response",
      "10% off labor",
      "5% off parts",
      "1 travel fee waiver / year",
    ],
    accent: "border-muted-foreground",
  },
  {
    key: "priority",
    name: "Priority",
    ac: "$7.50",
    dc: "$25",
    bestFor: "Most CMS-channel and direct CPO",
    highlights: [
      "48-hour guaranteed response",
      "15% off labor",
      "10% off parts",
      "50% off PM visits",
      "Named support rep",
    ],
    accent: "border-primary ring-2 ring-primary/30",
    recommended: true,
  },
  {
    key: "elite",
    name: "Elite",
    ac: "$10",
    dc: "$40",
    bestFor: "Mature CPOs optimizing reliability",
    highlights: [
      "24-hour guaranteed response",
      "20% off labor",
      "15% off parts",
      "Unlimited travel waivers",
      "Dedicated Account Manager",
    ],
    accent: "border-amber-500",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    ac: "Custom",
    dc: "Custom",
    bestFor: "500+ connectors, NEVI, large fleets",
    highlights: [
      "Custom response SLAs",
      "Dedicated NOCH team",
      "Volume pricing on labor + parts",
      "Custom reporting dashboard",
    ],
    accent: "border-slate-800",
  },
];

export function LockedPlanTiersTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            NOCH+ Membership Tiers
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Pricing is per connector / month. AC L2 and DC Fast prices listed below.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Outcome fees launch CY 2027 for Priority+ tiers
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {LOCKED_TIERS.map((t) => (
          <Card key={t.key} className={cn("border-2 relative", t.accent)}>
            {t.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" /> Recommended
                </Badge>
              </div>
            )}
            <CardContent className="p-5 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.bestFor}</p>
                <h3 className="text-xl font-bold mt-1">{t.name}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-border">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">AC L2</p>
                  <p className="font-bold text-base">{t.ac}{t.ac !== "Free" && t.ac !== "Custom" && <span className="text-xs font-normal text-muted-foreground">/mo</span>}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">DC Fast</p>
                  <p className="font-bold text-base">{t.dc}{t.dc !== "Free" && t.dc !== "Custom" && <span className="text-xs font-normal text-muted-foreground">/mo</span>}</p>
                </div>
              </div>
              <ul className="space-y-1.5 pt-2 border-t border-border">
                {t.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Pricing shown is the locked NOCH+ rate card. The Plan Builder, Demo Invoices, and Partner
        Plan tabs continue to use the existing interactive ROI engine — the locked rate card here
        represents the public-facing reference.
      </p>
    </div>
  );
}
