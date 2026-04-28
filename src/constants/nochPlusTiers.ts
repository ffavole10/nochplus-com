// NOCH+ Tier pricing and feature data — single source of truth

export type TierName = "starter" | "essential" | "priority" | "elite" | "enterprise";

// Paid core tiers (used in pricing math, ROI, dominant-tier calc)
export type CoreTierName = "essential" | "priority" | "elite";
export const CORE_TIERS: CoreTierName[] = ["essential", "priority", "elite"];
export const ALL_TIERS: TierName[] = ["starter", "essential", "priority", "elite", "enterprise"];

export const TIER_LABELS: Record<TierName, string> = {
  starter: "Starter",
  essential: "Essential",
  priority: "Priority",
  elite: "Elite",
  enterprise: "Enterprise",
};

export const TIER_COLORS: Record<TierName, string> = {
  starter: "hsl(var(--muted-foreground))",
  essential: "hsl(var(--muted-foreground))",
  priority: "hsl(var(--primary))",
  elite: "hsl(45 93% 47%)",
  enterprise: "hsl(220 13% 18%)",
};

export const TIER_BORDER_COLORS: Record<TierName, string> = {
  starter: "border-muted",
  essential: "border-muted-foreground",
  priority: "border-primary",
  elite: "border-amber-500",
  enterprise: "border-slate-800",
};

export const TIER_BG_COLORS: Record<TierName, string> = {
  starter: "bg-muted/50",
  essential: "bg-muted",
  priority: "bg-primary/10",
  elite: "bg-amber-500/10",
  enterprise: "bg-slate-900",
};

export const TIER_BADGE_CLASSES: Record<TierName, string> = {
  starter: "bg-muted text-muted-foreground border border-border",
  essential: "bg-muted text-muted-foreground",
  priority: "bg-primary/10 text-primary",
  elite: "bg-amber-500/10 text-amber-700",
  enterprise: "bg-slate-900 text-amber-400 border border-amber-500/30",
};

// Pricing per charger per month (Starter = free, Enterprise = custom/null)
export const TIER_PRICING: Record<CoreTierName, { l2: number; dc: number }> = {
  essential: { l2: 10, dc: 25 },
  priority: { l2: 15, dc: 30 },
  elite: { l2: 20, dc: 35 },
};

export function calcSiteMonthlyCost(l2: number, dc: number, tier: TierName): number {
  if (tier === "starter") return 0;
  if (tier === "enterprise") return 0; // Custom — not calculated
  const p = TIER_PRICING[tier];
  return l2 * p.l2 + dc * p.dc;
}

export function isCustomPricedTier(tier: TierName): boolean {
  return tier === "enterprise";
}

export function isFreeTier(tier: TierName): boolean {
  return tier === "starter";
}

export interface FeatureRow {
  feature: string;
  starter: string;
  essential: string;
  priority: string;
  elite: string;
  enterprise: string;
}

export const FEATURE_MATRIX: FeatureRow[] = [
  { feature: "Guaranteed Response Time", starter: "Best effort", essential: "72 hours", priority: "48 hours", elite: "24 hours", enterprise: "Custom (negotiated)" },
  { feature: "Response Credit-Back Guarantee", starter: "—", essential: "—", priority: "10% credit on monthly fee", elite: "20% credit on monthly fee", enterprise: "Custom" },
  { feature: "Priority Dispatch Queue", starter: "—", essential: "—", priority: "Ahead of non-members", elite: "Top of queue", enterprise: "Top of queue" },
  { feature: "Coverage Hours", starter: "M–F, 8a–5p", essential: "M–F, 8a–5p", priority: "M–F, 7a–9p", elite: "7 days, 7a–9p", enterprise: "Custom (up to 24/7)" },
  { feature: "Dedicated Support", starter: "Shared ticket queue", essential: "Shared ticket queue", priority: "Named support rep", elite: "Dedicated Account Manager", enterprise: "Dedicated NOCH team" },
  { feature: "Labor Rate Discount", starter: "—", essential: "10% off", priority: "15% off", elite: "20% off", enterprise: "Custom volume pricing" },
  { feature: "Parts Discount", starter: "—", essential: "5% off", priority: "10% off", elite: "15% off", enterprise: "Custom volume pricing" },
  { feature: "Travel Fee Waivers", starter: "—", essential: "1 per year", priority: "4 per year", elite: "Unlimited (within service areas)", enterprise: "Unlimited" },
  { feature: "Emergency Parts Priority", starter: "—", essential: "—", priority: "Yes", elite: "Yes, first access to inventory", enterprise: "Yes, with inventory reservation" },
  { feature: "Preventative Maintenance", starter: "—", essential: "Add-on pricing", priority: "50% off PM visits", elite: "1 PM visit per year included", enterprise: "Unlimited visits included" },
  { feature: "Annual Site Health Report", starter: "—", essential: "—", priority: "One-page reliability scorecard", elite: "Detailed scorecard + recommendations", enterprise: "Custom reporting dashboard" },
  { feature: "Onboarding Site Assessment", starter: "1 free assessment", essential: "One-time", priority: "One-time", elite: "One-time + unlimited for new/replacement chargers", enterprise: "Unlimited" },
  { feature: "Direct Ticket Submission", starter: "Yes", essential: "Yes", priority: "Yes", elite: "Yes", enterprise: "Yes" },
  { feature: "After-Hours Emergency Line", starter: "—", essential: "—", priority: "—", elite: "Yes", enterprise: "Yes" },
  { feature: "Quarterly Business Review", starter: "—", essential: "—", priority: "—", elite: "Yes", enterprise: "Yes" },
  { feature: "L2 AC Pricing", starter: "Free", essential: "$10/charger/mo", priority: "$15/charger/mo", elite: "$20/charger/mo", enterprise: "Custom" },
  { feature: "L3 DCFC Pricing", starter: "Free", essential: "$25/charger/mo", priority: "$30/charger/mo", elite: "$35/charger/mo", enterprise: "Custom" },
];

export const LABOR_DISCOUNT: Record<TierName, number> = {
  starter: 0,
  essential: 0.10,
  priority: 0.15,
  elite: 0.20,
  enterprise: 0.20, // Used as estimate for ROI calc on enterprise
};

export type KBCategory = "Commercial" | "Technical" | "Operational" | "Competitive" | "Company";
export const KB_CATEGORIES: KBCategory[] = ["Commercial", "Technical", "Operational", "Competitive", "Company"];

export const KB_CATEGORY_BADGE_CLASSES: Record<KBCategory, string> = {
  Commercial: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  Technical: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  Operational: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  Competitive: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  Company: "bg-slate-500/10 text-slate-700 border-slate-500/30",
};

export const DEFAULT_Q_AND_A: { question: string; answer: string; category: KBCategory }[] = [
  // COMMERCIAL
  { category: "Commercial", question: "How much does NOCH+ cost?", answer: "NOCH+ starts at $10 per charger per month for L2 AC chargers on the Essential plan, and $25 per charger per month for L3 DC fast chargers. Priority is $15/$30 and Elite is $20/$35. We also have a free Starter plan and custom Enterprise pricing for large-scale operations. All pricing is per charger, not per connector." },
  { category: "Commercial", question: "Is there a free option?", answer: "Yes. Our Starter plan is completely free with no charger limit and no credit card required. You get direct ticket submission, one free site assessment, and partner portal access. Service calls are billed at standard rates with no discounts. It's the easiest way to get started with NOCH." },
  { category: "Commercial", question: "What's the difference between the tiers?", answer: "Each tier builds on the one below it. Starter is free with standard rates. Essential adds a 72-hour guaranteed response, 10% off labor, 5% off parts, and 1 travel fee waiver per year. Priority adds a 48-hour guarantee, 15% off labor, 10% off parts, 4 travel fee waivers, and 50% off PM visits. Elite adds a 24-hour guarantee, 20% off labor, 15% off parts, unlimited travel fee waivers, 1 PM visit per year, a dedicated Account Manager, and 7-day coverage." },
  { category: "Commercial", question: "Which plan do you recommend?", answer: "Priority is the right fit for most operators. It hits the sweet spot between cost and coverage: 48-hour guaranteed response, meaningful discounts on labor and parts, and 50% off preventative maintenance. If you have mission-critical or high-traffic DCFC sites, Elite gives you 24-hour response and a dedicated Account Manager. Essential works well for lower-traffic L2 sites." },
  { category: "Commercial", question: "Is there a contract or lock-in?", answer: "NOCH+ is month-to-month with 30 days notice to cancel. If you pre-pay annually, you get one month free. No long-term lock-in. We want you to stay because we earn it, not because we trap you." },
  { category: "Commercial", question: "Can we cancel anytime?", answer: "Yes. Send us 30 days written notice and cancellation takes effect at the end of your current billing cycle. No penalties, no fees. Annual pre-pay customers receive a prorated refund of unused months." },
  { category: "Commercial", question: "It's too expensive.", answer: "One emergency service call without a membership averages $450 to $800 in labor plus trip fees. A Priority membership on 10 chargers is $150 a month. If you avoid even one emergency call per quarter, the subscription has already paid for itself. Plus you lock in 15% off labor and 10% off parts on every service call for the year." },
  { category: "Commercial", question: "Can we just pay per service call?", answer: "Absolutely, we offer break-fix pricing too. But without a membership, you're in the general queue, paying standard rates and full trip fees on every visit. NOCH+ members skip the queue, save 10 to 20% on labor, and get trip fees waived. Most operators save money within the first two service calls." },
  { category: "Commercial", question: "Do we still pay for service calls with a membership?", answer: "Yes, but at a discounted rate. 10 to 20% off labor and 5 to 15% off parts depending on your tier. Trip fees are waived up to your tier limit, and PM visits are included or discounted on Priority and Elite. The membership fee covers your guaranteed response time, priority dispatch, and access to all tier benefits." },
  { category: "Commercial", question: "Is the membership fee tax-deductible?", answer: "NOCH+ membership fees are a standard business operating expense and are generally 100% tax-deductible, just like any other maintenance or service contract. At a typical 25% tax rate, a $15 per charger monthly fee effectively costs about $11.25 per charger after the deduction. Consult your tax advisor for your specific situation." },
  { category: "Commercial", question: "Do you offer volume discounts?", answer: "For operators with 50 or more chargers, we can discuss volume pricing adjustments. For 200 or more chargers, we offer custom Enterprise pricing with dedicated teams, negotiated rates, and tailored service plans. Contact us and we'll build something that fits your scale." },
  { category: "Commercial", question: "Can we mix tiers across sites?", answer: "Yes, and we recommend it. Put Elite on your flagship or mission-critical sites, Priority on your main fleet, and Essential on lower-traffic locations. One contract, one invoice. This optimizes your spend by matching the service level to each site's importance." },
  { category: "Commercial", question: "Can I upgrade or downgrade my tier?", answer: "Yes, anytime. Upgrades take effect immediately. Downgrades take effect at the next billing cycle. No penalties. You can also change tiers on individual sites without affecting the rest of your portfolio." },
  { category: "Commercial", question: "What's the annual pre-pay discount?", answer: "Pay for 11 months upfront and get the 12th month free. That's roughly an 8.3% discount compared to monthly billing. You can still cancel and receive a prorated refund of unused months." },
  { category: "Commercial", question: "What's the credit-back guarantee?", answer: "If we miss your guaranteed response window, you get a credit applied to your next monthly invoice. 10% for Priority members, 20% for Elite. It's our way of putting money where our mouth is. We don't just promise fast response, we back it financially." },
  { category: "Commercial", question: "How much can we actually save with NOCH+?", answer: "Savings come from three places: discounted labor and parts on every service call (10 to 20% off), reduced downtime costs (faster response means less revenue lost), and brand protection (fewer drivers encountering broken chargers means fewer negative reviews). For a typical 6-charger site on Priority, total annual savings range from $2,000 to $12,000 depending on service frequency and charger type." },
  { category: "Commercial", question: "Do you work with large CPOs or fleet operators?", answer: "Absolutely. Our Enterprise tier is designed for large-scale operations. We build a custom reliability program with negotiated response guarantees, dedicated technician teams, volume pricing, unlimited PM visits, and custom reporting. Contact us and we'll put together a tailored plan." },
  { category: "Commercial", question: "What payment methods do you accept?", answer: "Credit card, debit card, Apple Pay, Google Pay (all via Stripe), and ACH bank transfer for larger accounts. All payment processing is secured by Stripe. Card data never touches NOCH servers." },
  { category: "Commercial", question: "Do you offer financing or payment plans?", answer: "NOCH+ is already structured as an affordable monthly subscription starting at $10 per charger. For large Enterprise deployments, we can discuss custom billing arrangements including quarterly invoicing or net-30 terms. Contact us to discuss." },

  // TECHNICAL
  { category: "Technical", question: "Do you cover all charger brands?", answer: "Yes. Our technicians are trained on all major L2 and DCFC brands including ChargePoint, BTC Power, Chaevi, EV Connect, AmpUp, ABB, Tritium, Blink, SemaConnect, and more. We confirm specific models during your onboarding site assessment." },
  { category: "Technical", question: "Do you work on both L2 and DC fast chargers?", answer: "Yes. We service all Level 2 AC chargers and Level 3 DC fast chargers across all major manufacturers. Our technicians are trained on both power levels and carry parts for the most common failure modes." },
  { category: "Technical", question: "What types of repairs do you handle?", answer: "We handle the full range of field service: connector and cable replacements, board-level diagnostics and repairs, power module replacements, screen and UI repairs, payment terminal issues, communication and networking troubleshooting, pedestal and mounting repairs, and electrical infrastructure issues. If it's a charger problem in the field, we fix it." },
  { category: "Technical", question: "Do you handle software or firmware updates?", answer: "No. NOCH+ covers field service response for hardware issues. Software support, firmware updates, OCPP configuration, and network management are handled by your charger OEM or network provider. We focus exclusively on getting a technician on-site to diagnose and repair physical hardware issues." },
  { category: "Technical", question: "Do you provide remote diagnostics?", answer: "Our current NOCH+ membership is focused on field service response, not remote monitoring or diagnostics. We dispatch technicians to physically diagnose and repair chargers. However, our Neural OS technology platform is in development and will add intelligent remote diagnostics capabilities in the future." },
  { category: "Technical", question: "What's included in a preventative maintenance visit?", answer: "PM visits include a full charger inspection, connector and cable condition check, cleaning of all components, connector testing under load, firmware version check (reported but not updated), safety inspection (ground fault, overcurrent protection), environmental assessment, and a written report with findings and recommendations. Priority members get 50% off PM visits. Elite members get 1 PM visit per year included." },
  { category: "Technical", question: "Can you install new chargers?", answer: "NOCH+ is a service and reliability program, not an installation service. However, for Elite and Enterprise members, we provide unlimited site assessments for new or replacement charger installations. We can evaluate the site, recommend placement and electrical requirements, and ensure the installation meets standards. For the actual installation work, we can coordinate with qualified electrical contractors or your preferred installer." },
  { category: "Technical", question: "Do your technicians carry parts?", answer: "Our technicians carry common consumable parts and connectors. For larger components like power modules, control boards, or specialty cables, we source parts through our supply chain with priority access for NOCH+ members. Priority and Elite members get emergency parts priority with first access to our inventory." },
  { category: "Technical", question: "What certifications do your technicians have?", answer: "Our team includes EVITP-certified technicians (Electric Vehicle Infrastructure Training Program), which is the industry standard for EV charging infrastructure. All technicians receive ongoing training on new charger models and technologies." },
  { category: "Technical", question: "Can you work on chargers still under OEM warranty?", answer: "NOCH+ covers field service response, not OEM warranty claims. Warranty covers manufacturing defects and parts replacement by the OEM. We cover the person who physically gets to the site, diagnoses the issue, and performs the work. Think of NOCH+ plus OEM warranty as the complete reliability package. We can help coordinate warranty claims with your OEM as part of our service." },
  { category: "Technical", question: "What about NEVI-funded chargers? Do you service those?", answer: "Yes. We service NEVI-funded charging stations and our technicians are experienced with the compliance requirements for federally funded infrastructure. We have active experience with NEVI commissioning work across multiple states." },
  { category: "Technical", question: "Do you provide electrical infrastructure work?", answer: "Our primary focus is on the charger equipment itself. For upstream electrical work (transformers, switchgear, utility connections), we can assess the situation and coordinate with qualified electrical contractors. Our EVITP-certified technicians can evaluate whether an issue is charger-side or infrastructure-side and guide the resolution path." },

  // OPERATIONAL
  { category: "Operational", question: "What's your guaranteed response time?", answer: "It depends on your tier. Essential guarantees a technician on-site within 72 hours. Priority guarantees 48 hours. Elite guarantees 24 hours. Starter plans receive best-effort response with no guarantee. Response times apply within NOCH Power's primary service areas during your tier's coverage hours." },
  { category: "Operational", question: "What states do you cover?", answer: "NOCH Power operates across multiple states with our own W2 in-house technicians and a vetted partner network for broader coverage. We're strongest in California and expanding rapidly. We'll confirm your specific locations during discovery and let you know exactly what coverage looks like for your sites." },
  { category: "Operational", question: "What are your coverage hours?", answer: "Starter and Essential: Monday through Friday, 8am to 5pm. Priority: Monday through Friday, 7am to 9pm. Elite: 7 days a week, 7am to 9pm. All times are local to the service area." },
  { category: "Operational", question: "How fast can we get onboarded?", answer: "Typically 5 business days from activation to full coverage. That includes the onboarding site assessment, account setup, technician assignment, and first dispatch readiness. For Starter plans, you're active immediately." },
  { category: "Operational", question: "What happens when we submit a service ticket?", answer: "You submit a ticket through our direct ticket system. Our dispatch team reviews it, assigns the nearest qualified technician, and schedules the visit within your guaranteed response window. You receive updates throughout the process. After the visit, you get a same-day closure report with photos, parts used, labor time, and a summary of the fix." },
  { category: "Operational", question: "What happens after a service call?", answer: "You receive a same-day closure report with photos of the work performed, parts used, labor hours, and a written summary of the diagnosis and fix. Your Account Manager (Elite) or support rep (Priority) follows up within 24 hours to confirm resolution. All service history is tracked and available through your partner portal." },
  { category: "Operational", question: "What if a charger goes down outside your coverage hours?", answer: "For Essential and Priority, after-hours issues are logged and dispatched first thing the next business day within your coverage window. Elite members have access to the after-hours emergency line for critical situations. The guaranteed response clock starts when coverage hours begin." },
  { category: "Operational", question: "What if you miss the response guarantee?", answer: "Priority members get a 10% credit on their monthly membership fee. Elite members get 20%. The credit is automatically applied to your next invoice. We track every response time against the guarantee, and our operations team reviews every miss to prevent recurrence." },
  { category: "Operational", question: "Who dispatches the technicians?", answer: "Our in-house operations team handles all dispatch. We control the scheduling, routing, and technician assignment directly because we use W2 employees, not 1099 contractors. This means faster response, better quality control, and direct accountability." },
  { category: "Operational", question: "Can we see our service history?", answer: "Yes. Through your NOCH+ partner portal, you can view all service tickets, closure reports, response times, parts used, and costs. Elite members also receive an Annual Site Health Report with uptime trends, recurring issues, and recommendations." },
  { category: "Operational", question: "What's the Annual Site Health Report?", answer: "A reliability scorecard showing uptime trends, service history, recurring issues, parts usage, and actionable recommendations. Priority gets a one-page version. Elite gets a detailed report with capital planning guidance. It's a valuable tool for budgeting and identifying chargers that may need replacement." },
  { category: "Operational", question: "How do you prioritize service calls?", answer: "NOCH+ members jump ahead of non-members in the dispatch queue. Within members, Elite is top of queue, then Priority, then Essential. Starter plans are in the general queue. This means when you're a member, you're always ahead of operators who don't have NOCH+." },
  { category: "Operational", question: "Can you handle multiple sites in different states?", answer: "Yes. We operate across multiple states with W2 technicians and a vetted partner network. For multi-state deployments, we bundle everything into a single membership. One contract, one invoice, one point of contact. Your Account Manager coordinates service across all locations." },
  { category: "Operational", question: "What if I have an emergency at a site?", answer: "Submit a ticket through our system and flag it as urgent. NOCH+ members with Priority and Elite plans get priority dispatch. Elite members also have access to the after-hours emergency line. We'll get a technician moving toward your site as fast as possible within your guaranteed response window." },
  { category: "Operational", question: "Do you subcontract work?", answer: "We primarily use our own W2 in-house technicians, which is how we control quality and response times. In areas where we don't have technicians on the ground, we use a vetted partner network of qualified service providers. All partners meet our quality standards and follow our service protocols." },
  { category: "Operational", question: "What's the onboarding site assessment?", answer: "A complimentary on-site evaluation where our technician inspects every charger, documents the condition, tests functionality, and identifies any existing issues or potential failure points. You receive a written report with findings and recommendations. This gives us a baseline for your equipment and helps us prepare for future service needs. All tiers get one free assessment. Elite gets unlimited assessments for new or replacement chargers." },

  // COMPETITIVE
  { category: "Competitive", question: "We already have a service provider.", answer: "Great. Most of our partners start by putting NOCH+ on one or two of their most problematic sites. You keep your current vendor for the rest and compare response times and service quality directly. If we're not better in 90 days, you walk away. We're confident enough to let our work speak for itself." },
  { category: "Competitive", question: "How are you different from ChargePoint's service program?", answer: "ChargePoint's programs are tied to their own hardware ecosystem. NOCH+ is brand-agnostic. We service ChargePoint, BTC Power, Chaevi, ABB, Tritium, and every other major brand. We also use W2 in-house technicians (not subcontracted networks), which gives us direct control over response times and quality. And our response credit-back guarantee means we put money behind our promises." },
  { category: "Competitive", question: "How are you different from ChargerHelp?", answer: "ChargerHelp focuses on workforce development and their EMPWR platform for O&M management. NOCH+ is a membership program that combines guaranteed response times, discounted labor and parts, and direct field service with our own W2 technicians. We're a reliability partner, not a staffing or platform company. Our focus is on getting a qualified tech to your site fast and fixing the problem." },
  { category: "Competitive", question: "Why should I pay for a membership when I can just call someone when something breaks?", answer: "Three reasons. First, without a membership, you're in the general queue and you'll wait longer. Second, you pay full price on labor, parts, and travel fees. One emergency call can cost $700 to $1,000+. Third, every hour your charger is down, you lose revenue and risk negative reviews from frustrated drivers. NOCH+ members get guaranteed response times, skip the queue, and save 10 to 20% on every call. The membership usually pays for itself within the first service call." },
  { category: "Competitive", question: "What makes NOCH+ different from a standard maintenance contract?", answer: "Standard maintenance contracts are reactive. They tell you what happens AFTER something breaks. NOCH+ is proactive: you get a guaranteed response time with a financial credit-back if we miss it, priority dispatch so you're always ahead of the queue, preventative maintenance to catch problems before they cause downtime, and an annual site health report to guide your reliability strategy. It's AAA for your chargers, not a vendor contract." },
  { category: "Competitive", question: "Do you have references or case studies?", answer: "We work with CPOs, fleet operators, and property owners across multiple states. We can share specific references once we're further along in the conversation. More importantly, let us prove it: start with our Starter plan for free or put NOCH+ Priority on one or two of your most problematic sites and see the difference firsthand." },
  { category: "Competitive", question: "Why W2 technicians instead of 1099 contractors?", answer: "W2 employees give us direct control over training, quality, scheduling, and accountability. We don't have to negotiate with a subcontractor's availability. When we say 48-hour response, we can deliver it because we control the team. Contractors introduce unpredictability, and unpredictability is the enemy of reliability." },

  // COMPANY
  { category: "Company", question: "Who is NOCH Power?", answer: "NOCH Power Inc. is an EV charging infrastructure service and reliability company headquartered in Lake Forest, California. We're a team of W2 field technicians, EVITP-certified engineers, and operations specialists dedicated to keeping EV chargers running. We position ourselves as a reliability partner, not a vendor." },
  { category: "Company", question: "Who are your technicians?", answer: "We have our own W2 in-house technicians, not 1099 contractors. That means we control dispatch, quality, and training directly. Our team includes EVITP-certified techs covering multiple states. Our Field Master Engineer, Randy Sheffer, is EVITP-certified and leads our technical training program." },
  { category: "Company", question: "How many technicians do you have?", answer: "We currently have 22 W2 in-house technicians across multiple states, with a vetted partner network for broader coverage. Our team is growing as we expand into new regions." },
  { category: "Company", question: "What's Neural OS?", answer: "Neural OS is our AI-powered reliability technology platform currently in development. It will provide intelligent diagnostics, predictive maintenance alerts, and automated issue detection for EV chargers. Neural OS represents the future of proactive charger reliability, moving from reactive fix-it service to predictive prevention." },
  { category: "Company", question: "Where are you headquartered?", answer: "NOCH Power is headquartered in Lake Forest, California, with technicians deployed across multiple states. Our operations center coordinates dispatch and service nationwide." },
  { category: "Company", question: "Are you hiring?", answer: "We're always looking for skilled EV charging technicians, especially those with EVITP certification or electrical experience. Visit our careers page or contact us to learn about open positions in your area." },
  { category: "Company", question: "What brands do you partner with?", answer: "We work with all major charger manufacturers and network operators including ChargePoint, BTC Power, Chaevi, EV Connect, AmpUp, ABB, Tritium, Blink, and others. NOCH+ is brand-agnostic, meaning we service whatever equipment our partners have deployed." },
  { category: "Company", question: "What's your mission?", answer: "Our mission is simple: keep every EV charger running. We believe reliable charging infrastructure is the foundation of EV adoption. Every charger we repair, every downtime hour we prevent, and every frustrated driver we save is a step toward making electric transportation the norm. We're building the reliability layer that the EV charging industry needs." },
  { category: "Company", question: "Do you have insurance and proper licensing?", answer: "Yes. NOCH Power carries full commercial general liability insurance, workers' compensation coverage for all W2 employees, and maintains all required state contractor licenses. We can provide certificates of insurance upon request, which is standard for site access at commercial and fleet locations." },
];
