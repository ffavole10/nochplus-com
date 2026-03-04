import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RateSheetPricingResult {
  pricingType: "rate_card" | "rate_sheet";
  rateSheetId?: string;
  rateSheetName?: string;
  matchedScope?: {
    scopeCode: string;
    scopeName: string;
    hours: number;
    price: number;
    slaTier: string;
    travelNote: string;
    requiresEvRental: boolean;
  };
  travelFees: {
    label: string;
    rate: number;
    unit: string;
    threshold: number | null;
    notes: string;
  }[];
  volumeDiscount: {
    discountPercent: number;
    discountType: string;
    tierLabel: string;
  } | null;
}

export interface EstimateLineItemSeed {
  description: string;
  qty: number;
  unit: "hours" | "each" | "flat";
  rate: number;
  amount: number;
  category: "labor" | "parts" | "travel" | "other";
}

/* ------------------------------------------------------------------ */
/*  Priority → SLA tier mapping                                        */
/* ------------------------------------------------------------------ */

const PRIORITY_TO_SLA: Record<string, string> = {
  Critical: "24hr",
  High: "48hr",
  Medium: "72hr",
  Low: "96hr",
};

function getSlaColumn(priority: string): string {
  return PRIORITY_TO_SLA[priority] || "72hr";
}

function getPriceForTier(
  scope: Record<string, unknown>,
  slaTier: string
): number | null {
  const col = `price_${slaTier}` as string;
  const val = scope[col];
  return typeof val === "number" ? val : null;
}

/* ------------------------------------------------------------------ */
/*  Scope matching heuristic                                           */
/* ------------------------------------------------------------------ */

/**
 * Extract scope code patterns like "Scope 7A", "Scope 7-Dual-A", "7A Single"
 * from free-text descriptions.
 */
function extractScopeCode(text: string): string | null {
  // Match "Scope 7A", "Scope 7-Dual-A", "scope 12B", etc.
  const scopeMatch = text.match(/scope\s+(\d+[A-Za-z]?(?:\s*-?\s*\w+)*)/i);
  if (scopeMatch) return scopeMatch[1].trim();
  // Match standalone codes like "7A Single", "12B"
  const codeMatch = text.match(/\b(\d+[A-Za-z])\b/);
  if (codeMatch) return codeMatch[1];
  return null;
}

function findBestScope(
  scopes: Record<string, unknown>[],
  swiTitle: string | null,
  swiId: string | null,
  ticketDescription: string | null = null
): Record<string, unknown> | null {
  if (!scopes.length) return null;

  // Collect all text sources for matching
  const sources = [swiTitle, swiId, ticketDescription].filter(Boolean) as string[];
  if (!sources.length) return scopes[0];

  // 1. Try to extract a scope code from any source and match against scope_code
  for (const src of sources) {
    const extractedCode = extractScopeCode(src);
    if (extractedCode) {
      const codeLower = extractedCode.toLowerCase().replace(/[\s\-]+/g, "");
      const codeMatch = scopes.find((s) => {
        const sc = (s.scope_code as string).toLowerCase().replace(/[\s\-]+/g, "");
        return sc === codeLower || sc.includes(codeLower) || codeLower.includes(sc);
      });
      if (codeMatch) return codeMatch;
    }
  }

  const needle = sources.join(" ").toLowerCase();

  // 2. Try exact scope_name match
  const exact = scopes.find(
    (s) => (s.scope_name as string).toLowerCase() === needle
  );
  if (exact) return exact;

  // 3. Try substring match (either direction) on scope_name and scope_code
  const partial = scopes.find((s) => {
    const name = (s.scope_name as string).toLowerCase();
    const code = (s.scope_code as string).toLowerCase();
    return name.includes(needle) || needle.includes(name) ||
           code.includes(needle) || needle.includes(code);
  });
  if (partial) return partial;

  // 4. Keyword scoring across all sources
  const keywords = needle.split(/[\s,\-—]+/).filter((w) => w.length > 2);
  let best: Record<string, unknown> | null = null;
  let bestScore = 0;
  for (const s of scopes) {
    const name = (s.scope_name as string).toLowerCase();
    const code = (s.scope_code as string).toLowerCase();
    const combined = `${name} ${code}`;
    const score = keywords.filter((k) => combined.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  if (best && bestScore > 0) return best;

  // Fallback to first scope
  return scopes[0];
}

/* ------------------------------------------------------------------ */
/*  Main lookup                                                        */
/* ------------------------------------------------------------------ */

export async function lookupRateSheetPricing(
  customerCompany: string,
  priority: string,
  swiTitle: string | null,
  swiId: string | null,
  stationCount?: number,
  ticketDescription?: string | null
): Promise<RateSheetPricingResult | null> {
  // 1. Look up customer
  const { data: customers } = await supabase
    .from("customers")
    .select("id, company, pricing_type")
    .ilike("company", customerCompany)
    .limit(1);

  const customer = customers?.[0] as Record<string, unknown> | undefined;
  if (!customer || customer.pricing_type !== "rate_sheet") {
    return null; // Use default rate card pricing
  }

  // 2. Find active rate sheet for this customer
  const { data: sheets } = await supabase
    .from("customer_rate_sheets")
    .select("*")
    .eq("customer_name", customer.company as string)
    .eq("status", "active")
    .order("effective_date", { ascending: false })
    .limit(1);

  const sheet = (sheets as unknown as Record<string, unknown>[])?.[0];
  if (!sheet) return null;

  const sheetId = sheet.id as string;

  // 3. Fetch scopes, travel fees, volume discounts in parallel
  const [scopesRes, feesRes, discountsRes] = await Promise.all([
    supabase
      .from("rate_sheet_scopes")
      .select("*")
      .eq("rate_sheet_id", sheetId)
      .order("sort_order"),
    supabase
      .from("rate_sheet_travel_fees")
      .select("*")
      .eq("rate_sheet_id", sheetId)
      .order("sort_order"),
    supabase
      .from("rate_sheet_volume_discounts")
      .select("*")
      .eq("rate_sheet_id", sheetId)
      .order("min_stations"),
  ]);

  const scopes = (scopesRes.data || []) as unknown as Record<string, unknown>[];
  const fees = (feesRes.data || []) as unknown as Record<string, unknown>[];
  const discounts = (discountsRes.data || []) as unknown as Record<string, unknown>[];

  // 4. Match scope
  const slaTier = getSlaColumn(priority);
  const matchedScope = findBestScope(scopes, swiTitle, swiId);

  let scopeResult: RateSheetPricingResult["matchedScope"] = undefined;
  if (matchedScope) {
    let price = getPriceForTier(matchedScope, slaTier);
    // If price is null for this tier, try next slower tier
    if (price === null) {
      const tierOrder = ["24hr", "48hr", "72hr", "96hr", "192hr"];
      const startIdx = tierOrder.indexOf(slaTier);
      for (let i = startIdx + 1; i < tierOrder.length; i++) {
        price = getPriceForTier(matchedScope, tierOrder[i]);
        if (price !== null) break;
      }
    }

    scopeResult = {
      scopeCode: matchedScope.scope_code as string,
      scopeName: matchedScope.scope_name as string,
      hours: (matchedScope.hours_to_complete as number) || 1,
      price: price || 0,
      slaTier,
      travelNote: (matchedScope.travel_note as string) || "",
      requiresEvRental: (matchedScope.requires_ev_rental as boolean) || false,
    };
  }

  // 5. Travel fees
  const travelFees = fees.map((f) => ({
    label: f.label as string,
    rate: f.rate as number,
    unit: f.unit as string,
    threshold: f.threshold as number | null,
    notes: (f.notes as string) || "",
  }));

  // 6. Volume discount
  let volumeDiscount: RateSheetPricingResult["volumeDiscount"] = null;
  if (stationCount && stationCount > 0) {
    // Determine discount type based on scope exhibit
    const exhibit = matchedScope?.exhibit as string;
    const discountType = exhibit === "B" ? "installation" : "service";

    const applicable = discounts.find((d) => {
      if ((d.discount_type as string) !== discountType) return false;
      const min = d.min_stations as number;
      const max = d.max_stations as number | null;
      return stationCount >= min && (max === null || stationCount <= max);
    });

    if (applicable && (applicable.discount_percent as number) > 0) {
      const min = applicable.min_stations as number;
      const max = applicable.max_stations as number | null;
      volumeDiscount = {
        discountPercent: applicable.discount_percent as number,
        discountType,
        tierLabel: max ? `${min}–${max} stations` : `${min}+ stations`,
      };
    }
  }

  return {
    pricingType: "rate_sheet",
    rateSheetId: sheetId,
    rateSheetName: sheet.name as string,
    matchedScope: scopeResult,
    travelFees,
    volumeDiscount,
  };
}

/* ------------------------------------------------------------------ */
/*  Build estimate line items from rate sheet                          */
/* ------------------------------------------------------------------ */

export function buildRateSheetLineItems(
  pricing: RateSheetPricingResult,
  swiTitle: string,
  requiredParts: string[]
): EstimateLineItemSeed[] {
  const items: EstimateLineItemSeed[] = [];

  // 1. Scope-based labor line
  if (pricing.matchedScope) {
    const s = pricing.matchedScope;
    items.push({
      description: `${s.scopeCode} — ${s.scopeName} (${s.slaTier} SLA)`,
      qty: 1,
      unit: "flat",
      rate: s.price,
      amount: s.price,
      category: "labor",
    });
  }

  // 2. EV Rental if required
  if (pricing.matchedScope?.requiresEvRental) {
    const evFee = pricing.travelFees.find(
      (f) => f.label.toLowerCase().includes("ev rental")
    );
    items.push({
      description: "EV Rental",
      qty: 1,
      unit: "flat",
      rate: evFee?.rate || 85,
      amount: evFee?.rate || 85,
      category: "travel",
    });
  }

  // 3. Travel fees that aren't mileage/EV (those are conditional)
  // Add mileage as a placeholder the operator can fill in
  const mileageFee = pricing.travelFees.find(
    (f) => f.unit === "/mile"
  );
  if (mileageFee) {
    items.push({
      description: `Mileage (over ${mileageFee.threshold || 0} mi @ $${mileageFee.rate}/mi)`,
      qty: 0,
      unit: "each",
      rate: mileageFee.rate,
      amount: 0,
      category: "travel",
    });
  }

  // 4. Parts from SWI match
  requiredParts.forEach((p) => {
    if (p && p.toLowerCase() !== "none" && !p.toLowerCase().startsWith("none")) {
      items.push({
        description: p,
        qty: 1,
        unit: "each",
        rate: 0,
        amount: 0,
        category: "parts",
      });
    }
  });

  // 5. Volume discount line (negative amount)
  if (pricing.volumeDiscount && pricing.volumeDiscount.discountPercent > 0) {
    const laborTotal = items
      .filter((i) => i.category === "labor")
      .reduce((s, i) => s + i.amount, 0);
    const discountAmt = parseFloat(
      (laborTotal * (pricing.volumeDiscount.discountPercent / 100)).toFixed(2)
    );
    items.push({
      description: `Volume Discount — ${pricing.volumeDiscount.tierLabel} (${pricing.volumeDiscount.discountPercent}%)`,
      qty: 1,
      unit: "flat",
      rate: -discountAmt,
      amount: -discountAmt,
      category: "other",
    });
  }

  return items;
}
