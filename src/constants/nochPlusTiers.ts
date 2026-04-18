// NOCH+ Tier pricing and feature data — single source of truth

export type TierName = "essential" | "priority" | "elite";

export const TIER_LABELS: Record<TierName, string> = {
  essential: "Essential",
  priority: "Priority",
  elite: "Elite",
};

export const TIER_COLORS: Record<TierName, string> = {
  essential: "hsl(var(--muted-foreground))",
  priority: "hsl(var(--primary))",
  elite: "hsl(45 93% 47%)",
};

export const TIER_BORDER_COLORS: Record<TierName, string> = {
  essential: "border-muted-foreground",
  priority: "border-primary",
  elite: "border-amber-500",
};

export const TIER_BG_COLORS: Record<TierName, string> = {
  essential: "bg-muted",
  priority: "bg-primary/10",
  elite: "bg-amber-500/10",
};

export const TIER_BADGE_CLASSES: Record<TierName, string> = {
  essential: "bg-muted text-muted-foreground",
  priority: "bg-primary/10 text-primary",
  elite: "bg-amber-500/10 text-amber-700",
};

// Pricing per charger per month
export const TIER_PRICING: Record<TierName, { l2: number; dc: number }> = {
  essential: { l2: 10, dc: 25 },
  priority: { l2: 15, dc: 30 },
  elite: { l2: 20, dc: 35 },
};

export function calcSiteMonthlyCost(l2: number, dc: number, tier: TierName): number {
  const p = TIER_PRICING[tier];
  return l2 * p.l2 + dc * p.dc;
}

export interface FeatureRow {
  feature: string;
  essential: string;
  priority: string;
  elite: string;
}

export const FEATURE_MATRIX: FeatureRow[] = [
  { feature: "Onsite Response SLA", essential: "72 hours", priority: "48 hours", elite: "24 hours" },
  { feature: "Credit-Back Guarantee", essential: "—", priority: "10% credit on monthly fee", elite: "20% credit on monthly fee" },
  { feature: "Priority Dispatch Queue", essential: "—", priority: "Ahead of non-members", elite: "Top of queue" },
  { feature: "Coverage Hours", essential: "M–F, 8a–5p", priority: "M–F, 7a–9p", elite: "7 days, 7a–9p" },
  { feature: "Dedicated Support", essential: "Shared ticket queue", priority: "Named support rep", elite: "Dedicated Account Manager" },
  { feature: "Labor Rate Discount", essential: "10% off", priority: "15% off", elite: "20% off" },
  { feature: "Parts Discount", essential: "5% off", priority: "10% off", elite: "15% off" },
  { feature: "Travel Fee Waivers", essential: "1 per year", priority: "4 per year", elite: "Unlimited (within service areas)" },
  { feature: "Emergency Parts Priority", essential: "—", priority: "Yes", elite: "Yes, first access to inventory" },
  { feature: "Preventative Maintenance", essential: "Add-on pricing", priority: "50% off PM visits", elite: "1 PM visit per year included" },
  { feature: "Annual Site Health Report", essential: "—", priority: "One-page reliability scorecard", elite: "Detailed scorecard + recommendations" },
  { feature: "Onboarding Site Assessment", essential: "One-time", priority: "One-time", elite: "One-time + unlimited for new/replacement chargers" },
  { feature: "Direct Ticket Submission", essential: "Yes", priority: "Yes", elite: "Yes" },
  { feature: "After-Hours Emergency Line", essential: "—", priority: "—", elite: "Yes" },
  { feature: "Quarterly Business Review", essential: "—", priority: "—", elite: "Yes" },
  { feature: "L2 AC Pricing", essential: "$10/charger/mo", priority: "$15/charger/mo", elite: "$20/charger/mo" },
  { feature: "L3 DCFC Pricing", essential: "$25/charger/mo", priority: "$30/charger/mo", elite: "$35/charger/mo" },
];

export const LABOR_DISCOUNT: Record<TierName, number> = {
  essential: 0.10,
  priority: 0.15,
  elite: 0.20,
};

export const DEFAULT_Q_AND_A = [
  { question: "What happens if you miss the SLA?", answer: "Priority members get a 10% credit on their monthly membership fee. Elite members get 20%. We put skin in the game so you know we're accountable." },
  { question: "Do you cover all charger brands?", answer: "Yes. Our technicians are trained on all major L2 and DCFC brands including ChargePoint, BTC Power, Chaevi, EV Connect, AmpUp, and more. We confirm specific models during your onboarding assessment." },
  { question: "What states do you cover?", answer: "NOCH Power operates across multiple states with our own W2 in-house technicians and a vetted partner network for broader coverage. We'll confirm your specific locations during discovery." },
  { question: "Is there a contract or lock-in?", answer: "NOCH+ is month-to-month with 30 days notice to cancel. If you pre-pay annually, you get one month free. No long-term lock-in. We want you to stay because we earn it." },
  { question: "We already have a service provider.", answer: "Great. Most of our partners start by putting NOCH+ on one or two of their most problematic sites. You keep your current vendor for the rest and compare response times and service quality directly. If we're not better in 90 days, you walk away." },
  { question: "It's too expensive.", answer: "One emergency service call without a membership averages $450 to $800 in labor plus trip fees. A Priority membership on 10 chargers is $150 a month. If you avoid even one emergency call per quarter, the subscription has already paid for itself, plus you lock in 15% off labor and 10% off parts on every other call." },
  { question: "Can we just pay per service call?", answer: "Absolutely, we offer break-fix pricing too. But without a membership, you're in the general queue, paying standard rates and full trip fees on every visit. NOCH+ members skip the queue, save 10 to 20% on labor, and get trip fees waived. Most operators save money within the first two service calls." },
  { question: "What's included in preventative maintenance?", answer: "PM visits include a full charger inspection, cleaning, connector testing, firmware check, safety inspection, and a written report with findings and recommendations. Priority members get 50% off PM visits. Elite members get 1 PM visit per year included." },
  { question: "How fast can we get onboarded?", answer: "Typically 5 business days from signed agreement to active coverage. That includes the onboarding site assessment, account setup, and first dispatch readiness." },
  { question: "Can we mix tiers across sites?", answer: "Yes, and we recommend it. Put Elite on your flagship or mission-critical sites, Priority on your main fleet, and Essential on lower-traffic locations. One contract, one invoice." },
  { question: "Do we still pay for service calls?", answer: "Yes, but at a discounted rate. 10 to 20% off labor and 5 to 15% off parts depending on your tier. Trip fees are waived up to your tier limit, and PM visits are included or discounted on Priority and Elite." },
  { question: "What's the credit-back guarantee?", answer: "If we miss your guaranteed response SLA, you get a credit applied to your next monthly invoice. 10% for Priority members, 20% for Elite. It's our way of putting money where our mouth is." },
  { question: "Who are your technicians?", answer: "We have our own W2 in-house technicians, not 1099 contractors. That means we control dispatch, quality, and training directly. Our team includes EVITP-certified techs covering multiple states." },
  { question: "What about OEM warranty?", answer: "NOCH+ covers field service response, not OEM warranty parts. Warranty covers defects; we cover the person who physically gets to the site, diagnoses, and installs. Think of NOCH+ plus warranty as the complete reliability package." },
  { question: "Can I upgrade or downgrade my tier?", answer: "Yes, anytime. Upgrades take effect immediately. Downgrades take effect at the next billing cycle. No penalties." },
  { question: "What's the Annual Site Health Report?", answer: "A reliability scorecard showing uptime trends, service history, recurring issues, parts usage, and actionable recommendations. Priority gets a one-page version. Elite gets a detailed report with capital planning guidance." },
  { question: "Can you offer a trial?", answer: "Yes. We can set you up with a 30-day free trial on one or two sites. Full coverage at your selected tier, no payment required upfront. If we don't prove the value by day 30, you walk." },
  { question: "Where can I find the terms of service?", answer: "You can view the full NOCH+ Membership Terms of Service at any time from the Plan Tiers page or the Partner Plan page. A copy is also included in your welcome email when you activate your membership. The terms cover services, pricing, SLA guarantees, billing, cancellation, and liability." },
];
