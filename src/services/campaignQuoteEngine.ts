/**
 * Campaign Quote Engine — Phase 3
 *
 * Reads campaign_plan_schedule rows and a rate card/rate sheet to produce
 * a fully-priced campaign quote with per-technician line items.
 */

import { supabase } from "@/integrations/supabase/client";
import { GeneratedScheduleDay, TravelSegment } from "@/lib/routeOptimizer";
import { PlanTechnician } from "@/hooks/useCampaignPlan";
import type { Json } from "@/integrations/supabase/types";

// ─── Rate Defaults ──────────────────────────────────────────────────────────

export interface CampaignRates {
  base_labor_rate: number;
  overtime_rate: number;
  portal_to_portal_rate: number;
  hotel_nightly_rate: number;
  hotel_tax_pct: number;
  meal_per_diem: number;
  ev_rental_daily: number;
  luggage_per_flight: number;
  airfare_buffer_pct: number;
}

export const DEFAULT_CAMPAIGN_RATES: CampaignRates = {
  base_labor_rate: 145,
  overtime_rate: 175,
  portal_to_portal_rate: 145,
  hotel_nightly_rate: 175,
  hotel_tax_pct: 13,
  meal_per_diem: 50,
  ev_rental_daily: 150,
  luggage_per_flight: 50,
  airfare_buffer_pct: 25,
};

// ─── Line Item Categories (ordered) ────────────────────────────────────────

export type QuoteLineCategory =
  | "labor_base"
  | "labor_overtime"
  | "travel_driving"
  | "travel_flight_time"
  | "airfare"
  | "ev_rental"
  | "hotel"
  | "hotel_tax"
  | "per_diem"
  | "luggage"
  | "misc_supplies";

const CATEGORY_ORDER: QuoteLineCategory[] = [
  "labor_base",
  "labor_overtime",
  "travel_driving",
  "travel_flight_time",
  "airfare",
  "ev_rental",
  "hotel",
  "hotel_tax",
  "per_diem",
  "luggage",
  "misc_supplies",
];

export interface QuoteLineItem {
  technician_id: string | null;
  category: QuoteLineCategory;
  description: string;
  quantity: number;
  unit_rate: number;
  amount: number;
  sort_order: number;
}

export interface TechQuoteSummary {
  technician_id: string;
  technician_name: string;
  items: QuoteLineItem[];
  subtotal: number;
}

export interface CampaignQuoteResult {
  techSummaries: TechQuoteSummary[];
  grandTotal: number;
  lineItems: QuoteLineItem[];
  summaryLine: string; // e.g. "22 Sites · 28 Units · 9 States · April 7–20, 2026"
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getWeekKey(dateStr: string): string {
  // ISO week: get Monday of the week
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${months[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

// ─── Build Rate Card Rates ──────────────────────────────────────────────────

export async function loadRatesFromRateCard(rateCardId: string): Promise<CampaignRates> {
  const rates = { ...DEFAULT_CAMPAIGN_RATES };

  const { data: items } = await supabase
    .from("rate_card_items" as any)
    .select("*")
    .eq("rate_card_id", rateCardId);

  if (!items) return rates;

  for (const item of items as any[]) {
    const label = (item.label || "").toLowerCase();
    const rate = item.rate as number;

    if (label.includes("level 3") && item.unit === "/hr") {
      rates.base_labor_rate = rate;
      rates.portal_to_portal_rate = rate;
    }
    if (label.includes("overtime")) rates.overtime_rate = rate;
    if (label.includes("travel time") && item.unit === "/hr") rates.portal_to_portal_rate = rate;
  }

  return rates;
}

// ─── Core Pricing Calculation ───────────────────────────────────────────────

export function calculateTechQuote(
  techId: string,
  techName: string,
  days: GeneratedScheduleDay[],
  rates: CampaignRates,
  hrsPerDay: number,
): TechQuoteSummary {
  const items: QuoteLineItem[] = [];
  let sortOrder = 0;

  // ── Labor: track weekly hours for overtime detection ──
  const weeklyHours = new Map<string, number>(); // weekKey → total work hours
  let totalBaseHours = 0;
  let totalOvertimeHours = 0;

  for (const day of days) {
    if (day.day_type !== "work" || day.total_work_hours === 0) continue;

    const weekKey = getWeekKey(day.schedule_date);
    const prevWeekHours = weeklyHours.get(weekKey) || 0;

    // Daily overtime: hours exceeding hrsPerDay
    const dailyBase = Math.min(day.total_work_hours, hrsPerDay);
    const dailyOT = Math.max(0, day.total_work_hours - hrsPerDay);

    // Weekly overtime: hours exceeding 40 in this week
    const newWeekTotal = prevWeekHours + dailyBase;
    let weeklyOT = 0;
    if (newWeekTotal > 40) {
      weeklyOT = Math.min(dailyBase, newWeekTotal - 40);
    }

    totalBaseHours += dailyBase - weeklyOT;
    totalOvertimeHours += dailyOT + weeklyOT;

    weeklyHours.set(weekKey, prevWeekHours + day.total_work_hours);
  }

  // Labor — Base
  if (totalBaseHours > 0) {
    items.push({
      technician_id: techId,
      category: "labor_base",
      description: `${round2(totalBaseHours)} hrs × $${rates.base_labor_rate}`,
      quantity: round2(totalBaseHours),
      unit_rate: rates.base_labor_rate,
      amount: round2(totalBaseHours * rates.base_labor_rate),
      sort_order: sortOrder++,
    });
  }

  // Labor — Overtime
  if (totalOvertimeHours > 0) {
    items.push({
      technician_id: techId,
      category: "labor_overtime",
      description: `${round2(totalOvertimeHours)} hrs × $${rates.overtime_rate}`,
      quantity: round2(totalOvertimeHours),
      unit_rate: rates.overtime_rate,
      amount: round2(totalOvertimeHours * rates.overtime_rate),
      sort_order: sortOrder++,
    });
  }

  // ── Travel — Driving ──
  const totalDriveHours = days.reduce((s, d) => {
    const driveSegs = d.travel_segments.filter((seg: any) => seg.mode === "drive");
    return s + driveSegs.reduce((ss: number, seg: any) => ss + (seg.duration_hours || 0), 0);
  }, 0);

  if (totalDriveHours > 0) {
    items.push({
      technician_id: techId,
      category: "travel_driving",
      description: `${round2(totalDriveHours)} hrs × $${rates.portal_to_portal_rate}`,
      quantity: round2(totalDriveHours),
      unit_rate: rates.portal_to_portal_rate,
      amount: round2(totalDriveHours * rates.portal_to_portal_rate),
      sort_order: sortOrder++,
    });
  }

  // ── Travel — Flight Time ──
  const flightSegments: TravelSegment[] = [];
  for (const day of days) {
    for (const seg of day.travel_segments) {
      if (seg.mode === "flight") {
        flightSegments.push(seg);
      }
    }
  }

  const totalFlightPortalHours = flightSegments.reduce((s, seg) => {
    // Portal-to-portal: 1hr pre + flight + 1hr post
    const flightHrs = seg.duration_hours || 0;
    return s + flightHrs;
  }, 0);

  if (totalFlightPortalHours > 0) {
    items.push({
      technician_id: techId,
      category: "travel_flight_time",
      description: `${round2(totalFlightPortalHours)} billed hrs × $${rates.portal_to_portal_rate}`,
      quantity: round2(totalFlightPortalHours),
      unit_rate: rates.portal_to_portal_rate,
      amount: round2(totalFlightPortalHours * rates.portal_to_portal_rate),
      sort_order: sortOrder++,
    });
  }

  // ── Airfare (one line per flight) ──
  for (const seg of flightSegments) {
    const buffered = round2(seg.cost_estimate * (1 + rates.airfare_buffer_pct / 100));
    items.push({
      technician_id: techId,
      category: "airfare",
      description: `${seg.from_site} → ${seg.to_site} Est. + ${rates.airfare_buffer_pct}% buffer`,
      quantity: 1,
      unit_rate: buffered,
      amount: buffered,
      sort_order: sortOrder++,
    });
  }

  // ── EV Rental — per cluster/city grouping ──
  // Group consecutive work days by overnight_city for rental periods
  const rentalPeriods: { city: string; days: number; start: string; end: string }[] = [];
  let currentRental: typeof rentalPeriods[0] | null = null;

  const workDays = days.filter(d => d.day_type === "work").sort((a, b) => a.schedule_date.localeCompare(b.schedule_date));
  for (const day of workDays) {
    const city = day.overnight_city || "On-site";
    if (currentRental && currentRental.city === city) {
      currentRental.days++;
      currentRental.end = day.schedule_date;
    } else {
      if (currentRental) rentalPeriods.push(currentRental);
      currentRental = { city, days: 1, start: day.schedule_date, end: day.schedule_date };
    }
  }
  if (currentRental) rentalPeriods.push(currentRental);

  for (const rental of rentalPeriods) {
    const startD = new Date(rental.start + "T00:00:00");
    const endD = new Date(rental.end + "T00:00:00");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const rangeStr = `${months[startD.getMonth()]} ${startD.getDate()}–${endD.getDate()}`;
    items.push({
      technician_id: techId,
      category: "ev_rental",
      description: `EV Rental — ${rental.city} (${rental.days} days, ${rangeStr})`,
      quantity: rental.days,
      unit_rate: rates.ev_rental_daily,
      amount: round2(rental.days * rates.ev_rental_daily),
      sort_order: sortOrder++,
    });
  }

  // ── Hotel ──
  // Count nights away from home — any day where tech stays away
  const overnightDays = days.filter(d =>
    (d.day_type === "work" || d.day_type === "travel") && d.overnight_city
  );
  // Don't count the last day if no overnight needed (tech returns home)
  const hotelNights = Math.max(0, overnightDays.length - 1);

  if (hotelNights > 0) {
    const firstNight = overnightDays[0]?.schedule_date || "";
    const lastNight = overnightDays[overnightDays.length - 2]?.schedule_date || "";
    const fD = new Date(firstNight + "T00:00:00");
    const lD = new Date(lastNight + "T00:00:00");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const rangeStr = firstNight && lastNight
      ? `${months[fD.getMonth()]} ${fD.getDate()}–${lD.getDate()}`
      : "";

    items.push({
      technician_id: techId,
      category: "hotel",
      description: `${hotelNights} nights × $${rates.hotel_nightly_rate}${rangeStr ? ` (${rangeStr})` : ""}`,
      quantity: hotelNights,
      unit_rate: rates.hotel_nightly_rate,
      amount: round2(hotelNights * rates.hotel_nightly_rate),
      sort_order: sortOrder++,
    });

    // Hotel Tax
    const hotelTotal = hotelNights * rates.hotel_nightly_rate;
    const hotelTax = round2(hotelTotal * (rates.hotel_tax_pct / 100));
    items.push({
      technician_id: techId,
      category: "hotel_tax",
      description: `~${rates.hotel_tax_pct}% on $${round2(hotelTotal).toLocaleString()}`,
      quantity: 1,
      unit_rate: hotelTax,
      amount: hotelTax,
      sort_order: sortOrder++,
    });

    // Per Diem
    items.push({
      technician_id: techId,
      category: "per_diem",
      description: `${hotelNights} nights × $${rates.meal_per_diem}`,
      quantity: hotelNights,
      unit_rate: rates.meal_per_diem,
      amount: round2(hotelNights * rates.meal_per_diem),
      sort_order: sortOrder++,
    });
  }

  // ── Luggage ──
  const flightCount = flightSegments.length;
  if (flightCount > 0) {
    items.push({
      technician_id: techId,
      category: "luggage",
      description: `${flightCount} flights × $${rates.luggage_per_flight}`,
      quantity: flightCount,
      unit_rate: rates.luggage_per_flight,
      amount: round2(flightCount * rates.luggage_per_flight),
      sort_order: sortOrder++,
    });
  }

  const subtotal = round2(items.reduce((s, it) => s + it.amount, 0));

  return {
    technician_id: techId,
    technician_name: techName,
    items,
    subtotal,
  };
}

// ─── Main Entry: Generate Full Campaign Quote ───────────────────────────────

export async function generateCampaignQuote(
  planId: string,
  planName: string,
  scheduleDays: GeneratedScheduleDay[],
  techs: PlanTechnician[],
  rates: CampaignRates,
  hrsPerDay: number,
  customerId: string | null,
  rateCardId: string | null,
  validUntil: string | null,
): Promise<CampaignQuoteResult & { quoteId: string }> {
  // Group schedule days by tech
  const daysByTech = new Map<string, GeneratedScheduleDay[]>();
  for (const day of scheduleDays) {
    const arr = daysByTech.get(day.technician_id) || [];
    arr.push(day);
    daysByTech.set(day.technician_id, arr);
  }

  const techSummaries: TechQuoteSummary[] = [];
  const allItems: QuoteLineItem[] = [];

  for (const tech of techs) {
    const techDays = daysByTech.get(tech.technician_id) || [];
    if (techDays.length === 0) continue;

    const summary = calculateTechQuote(
      tech.technician_id,
      tech.home_base_city || "Technician",
      techDays,
      rates,
      hrsPerDay,
    );
    techSummaries.push(summary);
    allItems.push(...summary.items);
  }

  const grandTotal = round2(techSummaries.reduce((s, t) => s + t.subtotal, 0));

  // Build summary line
  const allSites = new Set<string>();
  const allStates = new Set<string>();
  let totalUnits = 0;
  for (const day of scheduleDays) {
    for (const site of day.sites) {
      allSites.add(site.site_name);
      totalUnits++;
      const parts = site.address.split(",").map(s => s.trim());
      if (parts.length >= 2) allStates.add(parts[parts.length - 1].split(" ")[0]);
    }
  }

  const dates = scheduleDays.map(d => d.schedule_date).sort();
  const dateRange = dates.length > 0 ? formatDateRange(dates[0], dates[dates.length - 1]) : "";
  const summaryLine = `${allSites.size} Sites · ${totalUnits} Units · ${allStates.size} States · ${dateRange}`;

  // ── Persist to database ──

  // Generate quote number
  const { data: maxQuote } = await supabase
    .from("campaign_quotes")
    .select("quote_number")
    .order("created_at", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (maxQuote && maxQuote.length > 0) {
    const match = (maxQuote[0].quote_number || "").match(/Q-\d+-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const quoteNumber = `Q-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;

  // Insert quote
  const { data: quoteRow, error: quoteErr } = await supabase
    .from("campaign_quotes")
    .insert({
      plan_id: planId,
      customer_id: customerId,
      quote_number: quoteNumber,
      status: "draft",
      total_amount: grandTotal,
      valid_until: validUntil,
      rate_card_id: rateCardId,
      notes: summaryLine,
    })
    .select()
    .single();

  if (quoteErr) throw quoteErr;
  const quoteId = quoteRow.id;

  // Insert line items
  if (allItems.length > 0) {
    const rows = allItems.map((item, idx) => ({
      quote_id: quoteId,
      technician_id: item.technician_id,
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      amount: item.amount,
      sort_order: idx,
    }));

    const { error: itemsErr } = await supabase
      .from("campaign_quote_line_items")
      .insert(rows);
    if (itemsErr) throw itemsErr;
  }

  // Update plan status
  await supabase.from("campaign_plans").update({ status: "quoted" }).eq("id", planId);

  return {
    quoteId,
    techSummaries,
    grandTotal,
    lineItems: allItems,
    summaryLine,
  };
}

// ─── Load Existing Quote ────────────────────────────────────────────────────

export interface SavedCampaignQuote {
  id: string;
  plan_id: string;
  customer_id: string | null;
  quote_number: string;
  status: string;
  total_amount: number;
  valid_until: string | null;
  rate_card_id: string | null;
  notes: string | null;
  created_at: string;
  lineItems: QuoteLineItem[];
}

export async function loadCampaignQuote(planId: string): Promise<SavedCampaignQuote | null> {
  const { data: quotes } = await supabase
    .from("campaign_quotes")
    .select("*")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!quotes || quotes.length === 0) return null;
  const q = quotes[0];

  const { data: items } = await supabase
    .from("campaign_quote_line_items")
    .select("*")
    .eq("quote_id", q.id)
    .order("sort_order");

  return {
    id: q.id,
    plan_id: q.plan_id,
    customer_id: q.customer_id,
    quote_number: q.quote_number || "",
    status: q.status,
    total_amount: q.total_amount,
    valid_until: q.valid_until,
    rate_card_id: q.rate_card_id,
    notes: q.notes,
    created_at: q.created_at,
    lineItems: (items || []).map((it: any) => ({
      technician_id: it.technician_id,
      category: it.category as QuoteLineCategory,
      description: it.description,
      quantity: it.quantity,
      unit_rate: it.unit_rate,
      amount: it.amount,
      sort_order: it.sort_order,
    })),
  };
}

export async function updateQuoteStatus(quoteId: string, status: string): Promise<void> {
  await supabase.from("campaign_quotes").update({ status }).eq("id", quoteId);
}
