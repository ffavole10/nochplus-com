/**
 * Campaign Proposal PDF Generator — Phase 4
 *
 * Generates a professional, multi-section PDF proposal from plan,
 * schedule, and quote data using jsPDF + jspdf-autotable.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { CampaignPlan, PlanTechnician } from "@/hooks/useCampaignPlan";
import { GeneratedScheduleDay } from "@/lib/routeOptimizer";
import { SavedCampaignQuote, QuoteLineItem, CampaignRates, DEFAULT_CAMPAIGN_RATES } from "@/services/campaignQuoteEngine";
import { loadLogoBase64 } from "@/constants/brandAssets";

// ─── Color palette ──────────────────────────────────────────────────────────
const NOCH_GREEN: [number, number, number] = [10, 158, 138]; // #0A9E8A
const DARK: [number, number, number] = [26, 26, 26];
const MUTED: [number, number, number] = [107, 114, 128];
const TABLE_HEADER_BG: [number, number, number] = [245, 245, 245];
const WHITE: [number, number, number] = [255, 255, 255];
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN = 25.4; // 1 inch
const CONTENT_W = PAGE_W - 2 * MARGIN;

// ─── Category labels for pricing ────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  labor_base: "Labor — Base",
  labor_overtime: "Labor — Overtime",
  travel_driving: "Travel — Driving",
  travel_flight_time: "Travel — Flight Time",
  airfare: "Airfare",
  ev_rental: "EV Rental",
  hotel: "Hotel",
  hotel_tax: "Hotel Tax (est.)",
  per_diem: "Per Diem",
  luggage: "Luggage",
  misc_supplies: "Misc Supplies",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt$(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

function fmtShortDate(d: string): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[dt.getMonth()]} ${dt.getDate()}`;
}

function fmtDateRange(start: string, end: string): string {
  if (!start || !end) return "";
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${months[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

function addFooter(doc: jsPDF, customerName: string) {
  const y = PAGE_H - 10;
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("NOCH Power  |  www.nochpower.com  |  info@nochpower.com  |  Confidential", PAGE_W / 2, y, { align: "center" });
  if (customerName) {
    doc.text(`Prepared for ${customerName}`, PAGE_W / 2, y + 3.5, { align: "center" });
  }
}

function addSectionHeader(doc: jsPDF, sectionNum: string, title: string, y: number): number {
  doc.setFontSize(22);
  doc.setTextColor(...NOCH_GREEN);
  doc.setFont("helvetica", "bold");
  doc.text(sectionNum, MARGIN, y);
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text(title, MARGIN + 14, y);
  doc.setDrawColor(...NOCH_GREEN);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y + 3, PAGE_W - MARGIN, y + 3);
  return y + 10;
}

function checkPage(doc: jsPDF, y: number, needed: number, customerName: string): number {
  if (y + needed > PAGE_H - 20) {
    addFooter(doc, customerName);
    doc.addPage();
    return MARGIN + 5;
  }
  return y;
}

// ─── Data Assembly ──────────────────────────────────────────────────────────

export interface ProposalData {
  plan: CampaignPlan;
  techs: PlanTechnician[];
  scheduleDays: GeneratedScheduleDay[];
  quote: SavedCampaignQuote;
  customerName: string;
  rates: CampaignRates;
  // Derived
  siteList: SiteRow[];
  stateDistribution: StateDistRow[];
  allStates: string[];
  totalUnits: number;
  totalSites: number;
}

interface SiteRow {
  state: string;
  siteName: string;
  address: string;
  model: string;
  operator: string;
  units: number;
}

interface StateDistRow {
  state: string;
  sites: number;
  units: number;
  tech: string;
}

export async function assembleProposalData(
  plan: CampaignPlan,
  techs: PlanTechnician[],
  scheduleDays: GeneratedScheduleDay[],
  quote: SavedCampaignQuote,
): Promise<ProposalData> {
  // Load customer name
  let customerName = "Customer";
  if (plan.customer_id) {
    const { data } = await supabase.from("customers").select("company").eq("id", plan.customer_id).single();
    if (data) customerName = data.company;
  }

  // Build site list from schedule days
  const siteMap = new Map<string, SiteRow>();
  const stateMap = new Map<string, { sites: Set<string>; units: number; techs: Set<string> }>();

  for (const day of scheduleDays) {
    const techName = techs.find(t => t.technician_id === day.technician_id)?.home_base_city || "Tech";
    for (const site of day.sites) {
      const parts = site.address.split(",").map(s => s.trim());
      const stateRaw = parts.length >= 2 ? parts[parts.length - 1].split(" ")[0] : "";
      const state = stateRaw.toUpperCase().substring(0, 2);

      if (!siteMap.has(site.site_name)) {
        siteMap.set(site.site_name, {
          state,
          siteName: site.site_name,
          address: site.address,
          model: "",
          operator: "",
          units: 1,
        });
      } else {
        siteMap.get(site.site_name)!.units++;
      }

      if (!stateMap.has(state)) {
        stateMap.set(state, { sites: new Set(), units: 0, techs: new Set() });
      }
      stateMap.get(state)!.sites.add(site.site_name);
      stateMap.get(state)!.units++;
      stateMap.get(state)!.techs.add(techName);
    }
  }

  const siteList = Array.from(siteMap.values()).sort((a, b) => a.state.localeCompare(b.state) || a.siteName.localeCompare(b.siteName));
  const stateDistribution = Array.from(stateMap.entries())
    .map(([state, info]) => ({
      state,
      sites: info.sites.size,
      units: info.units,
      tech: Array.from(info.techs).join(", "),
    }))
    .sort((a, b) => a.state.localeCompare(b.state));

  const allStates = stateDistribution.map(s => s.state);
  const totalUnits = stateDistribution.reduce((s, r) => s + r.units, 0);
  const totalSites = siteList.length;

  return {
    plan,
    techs,
    scheduleDays,
    quote,
    customerName,
    rates: DEFAULT_CAMPAIGN_RATES,
    siteList,
    stateDistribution,
    allStates,
    totalUnits,
    totalSites,
  };
}

// ─── PDF Generation ─────────────────────────────────────────────────────────

export async function generateProposalPdf(data: ProposalData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const { plan, techs, scheduleDays, quote, customerName, rates, siteList, stateDistribution, allStates, totalUnits, totalSites } = data;

  const logoBase64 = await loadLogoBase64();
  const dates = scheduleDays.map(d => d.schedule_date).sort();
  const startDate = dates[0] || plan.start_date || "";
  const endDate = dates[dates.length - 1] || plan.end_date || "";
  const dateRange = fmtDateRange(startDate, endDate);

  // ═══════════════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ═══════════════════════════════════════════════════════════════════════════

  // Dark background header
  doc.setFillColor(8, 122, 107); // tealDark
  doc.rect(0, 0, PAGE_W, 80, "F");

  // Logo
  try {
    doc.addImage(logoBase64, "PNG", MARGIN, 12, 50, 15);
  } catch { /* fallback: text */ }

  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.text("SERVICE PROPOSAL", MARGIN, 38);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const planTitle = plan.name || "Preventative Maintenance Campaign";
  doc.text(planTitle, MARGIN, 50);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Charger-Level Inspection  ·  Parts Maintenance  ·  Retrofit Upgrades  ·  ${allStates.length} States`, MARGIN, 60);

  // Key metrics row
  const metrics = [
    { label: "Sites", value: String(totalSites) },
    { label: "Charger Units", value: String(totalUnits) },
    { label: "Technicians", value: String(techs.length) },
    { label: "Est. Total", value: fmt$(quote.total_amount) },
  ];
  const metricW = CONTENT_W / 4;
  let mx = MARGIN;
  doc.setFillColor(5, 107, 94); // slightly darker
  doc.rect(MARGIN, 66, CONTENT_W, 12, "F");
  for (const m of metrics) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.text(m.value, mx + metricW / 2, 72, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(m.label, mx + metricW / 2, 76, { align: "center" });
    mx += metricW;
  }

  // Info section below header
  let cy = 92;
  const infoFont = (label: string, value: string, yPos: number): number => {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "bold");
    doc.text(label, MARGIN, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(value, MARGIN + 45, yPos);
    return yPos + 5.5;
  };

  cy = infoFont("Submitted to:", customerName, cy);
  cy = infoFont("Submitted by:", "NOCH Power — EV Charging Infrastructure Services", cy);
  cy = infoFont("Technicians:", `${techs.length} W2 Technician(s) — ${techs.map(t => t.home_base_city || "Tech").join(", ")}`, cy);
  cy = infoFont("Project Period:", dateRange, cy);
  if (plan.deadline) cy = infoFont("Deadline:", fmtDate(plan.deadline), cy);
  cy = infoFont("Coverage:", allStates.join(", "), cy);
  cy = infoFont("Payment Terms:", "Net 30 | Invoices submitted within 7 days post work week", cy);

  addFooter(doc, customerName);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 01: SCOPE OF WORK
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  let y = MARGIN;
  y = addSectionHeader(doc, "01", "SCOPE OF WORK — CAMPAIGN OVERVIEW", y);

  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  const scopeNarrative = `This proposal covers a comprehensive preventative maintenance campaign for ${customerName}, spanning ${totalSites} sites and ${totalUnits} charger units across ${allStates.length} states. NOCH Power will deploy ${techs.length} W2 technician(s) to perform charger-level inspections, parts maintenance, retrofit upgrades, operator configuration review, and full photo documentation at each location.`;
  const scopeLines = doc.splitTextToSize(scopeNarrative, CONTENT_W);
  doc.text(scopeLines, MARGIN, y);
  y += scopeLines.length * 4.5 + 5;

  // Scope items table
  const scopeItems = [
    ["PM — Electrical & Panel Review", "Electrical panel inspection, breaker torque verification, grounding check"],
    ["PM — Charger-Level Inspection", "Full visual, functional, and connectivity inspection per unit"],
    ["Parts Maintenance & Retrofit", "Cable management, connector replacement, firmware verification"],
    ["Operator Config Review", "Network connectivity, payment terminal, RFID/app configuration"],
    ["Photo Documentation", "Before/after photos for every unit with tagged metadata"],
    ["Work Order Close-Out", "Same-day digital close-out with findings report per site"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Scope Item", "Description"]],
    body: scopeItems,
    margin: { left: MARGIN, right: MARGIN },
    headStyles: { fillColor: TABLE_HEADER_BG, textColor: DARK, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    styles: { cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.3 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // State distribution table
  y = checkPage(doc, y, 30, customerName);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Unit Distribution by State", MARGIN, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["State", "Sites", "Units", "Assigned Tech"]],
    body: stateDistribution.map(r => [r.state, String(r.sites), String(r.units), r.tech]),
    margin: { left: MARGIN, right: MARGIN },
    headStyles: { fillColor: TABLE_HEADER_BG, textColor: DARK, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    styles: { cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.3 },
  });

  addFooter(doc, customerName);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 02: FULL SITE LIST
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = MARGIN;
  y = addSectionHeader(doc, "02", `FULL SITE LIST — ALL ${totalSites} LOCATIONS · ${totalUnits} UNITS`, y);

  autoTable(doc, {
    startY: y,
    head: [["State", "Branch / Location", "Address", "Units"]],
    body: siteList.map(s => [s.state, s.siteName, s.address, String(s.units)]),
    margin: { left: MARGIN, right: MARGIN },
    headStyles: { fillColor: TABLE_HEADER_BG, textColor: DARK, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: DARK },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    styles: { cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.3 },
    columnStyles: { 0: { cellWidth: 15 }, 3: { cellWidth: 15, halign: "center" } },
    didDrawPage: () => addFooter(doc, customerName),
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 03: DEPLOYMENT & TIMELINE
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = MARGIN;
  y = addSectionHeader(doc, "03", "HOW WE EXECUTE — DEPLOYMENT & TIMELINE", y);

  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  const deployNarrative = `NOCH Power deploys W2 technicians in parallel across all regions. There are no subcontractors — every technician is NOCH-trained and carries full insurance. Work orders are closed out same-day with digital documentation delivered within 24 hours. The itinerary below is route-optimized to minimize travel costs and maximize daily throughput.`;
  const deployLines = doc.splitTextToSize(deployNarrative, CONTENT_W);
  doc.text(deployLines, MARGIN, y);
  y += deployLines.length * 4.5 + 5;

  // Per-tech itinerary
  for (let ti = 0; ti < techs.length; ti++) {
    const tech = techs[ti];
    const techDays = scheduleDays
      .filter(d => d.technician_id === tech.technician_id)
      .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date));
    if (techDays.length === 0) continue;

    const techStates = new Set<string>();
    techDays.forEach(d => d.sites.forEach(s => {
      const parts = s.address.split(",").map(p => p.trim());
      if (parts.length >= 2) techStates.add(parts[parts.length - 1].split(" ")[0]);
    }));

    y = checkPage(doc, y, 20, customerName);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NOCH_GREEN);
    doc.text(`Tech ${ti + 1} (${tech.home_base_city || "Technician"}) — ${Array.from(techStates).join(", ")} | ${fmtShortDate(techDays[0].schedule_date)} – ${fmtShortDate(techDays[techDays.length - 1].schedule_date)}`, MARGIN, y);
    y += 5;

    const itineraryRows = techDays.map(day => {
      const dateStr = fmtShortDate(day.schedule_date);
      let activity = "";
      if (day.day_type === "rest" || day.day_type === "off") {
        activity = "OFF — Rest Day";
      } else if (day.day_type === "travel") {
        const flights = day.travel_segments.filter(s => s.mode === "flight");
        activity = flights.length > 0
          ? `Flight ${flights.map(f => `${f.from_site}→${f.to_site}`).join(", ")}`
          : "Travel Day";
      } else {
        activity = day.sites.map(s => s.site_name).join(", ") || "Work Day";
      }
      const workHours = day.total_work_hours > 0 ? `${day.total_work_hours.toFixed(1)}h` : "—";
      const notes = day.overnight_city ? `Overnight ${day.overnight_city}` : "";
      return [dateStr, activity, workHours, notes];
    });

    autoTable(doc, {
      startY: y,
      head: [["Date", "Activity", "Work Hours", "Notes"]],
      body: itineraryRows,
      margin: { left: MARGIN, right: MARGIN },
      headStyles: { fillColor: TABLE_HEADER_BG, textColor: DARK, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: DARK },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.3 },
      columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 20, halign: "center" }, 3: { cellWidth: 40 } },
      didDrawPage: () => addFooter(doc, customerName),
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 04: PRICING
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = MARGIN;
  y = addSectionHeader(doc, "04", `PRICING — ${customerName.toUpperCase()} CAMPAIGN RATE SHEET`, y);

  // Rate card summary
  const rateRows = [
    ["Base Labor Rate", `${fmt$(rates.base_labor_rate)}/hr`],
    ["Overtime Rate", `${fmt$(rates.overtime_rate)}/hr`],
    ["Portal-to-Portal Rate", `${fmt$(rates.portal_to_portal_rate)}/hr`],
    ["Hotel Nightly Rate", `${fmt$(rates.hotel_nightly_rate)}/night`],
    ["Hotel Tax (est.)", `${rates.hotel_tax_pct}%`],
    ["Meal Per Diem", `${fmt$(rates.meal_per_diem)}/day`],
    ["EV Rental", `${fmt$(rates.ev_rental_daily)}/day`],
    ["Luggage", `${fmt$(rates.luggage_per_flight)}/flight`],
    ["Airfare Buffer", `${rates.airfare_buffer_pct}%`],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Rate", "Value"]],
    body: rateRows,
    margin: { left: MARGIN, right: MARGIN },
    headStyles: { fillColor: TABLE_HEADER_BG, textColor: DARK, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    styles: { cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.3 },
    columnStyles: { 0: { cellWidth: 60 } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Per-tech cost tables
  const techIds = [...new Set(quote.lineItems.map(i => i.technician_id).filter(Boolean))] as string[];
  const techNameLookup = new Map<string, string>();
  techs.forEach(t => techNameLookup.set(t.technician_id, t.home_base_city || "Technician"));

  for (let ti = 0; ti < techIds.length; ti++) {
    const techId = techIds[ti];
    const techItems = quote.lineItems.filter(i => i.technician_id === techId);
    const techSubtotal = techItems.reduce((s, it) => s + it.amount, 0);
    const techName = techNameLookup.get(techId) || "Technician";

    y = checkPage(doc, y, 30, customerName);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NOCH_GREEN);
    doc.text(`Tech ${ti + 1} (${techName}) — Detailed Cost Estimate`, MARGIN, y);
    y += 5;

    const costRows = techItems.map(item => [
      CATEGORY_LABELS[item.category] || item.category,
      item.description,
      fmt$(item.amount),
    ]);
    costRows.push([{ content: `TECH ${ti + 1} SUBTOTAL`, styles: { fontStyle: "bold" } } as any, "", { content: fmt$(techSubtotal), styles: { fontStyle: "bold" } } as any]);

    autoTable(doc, {
      startY: y,
      head: [["Item", "Detail", "Amount"]],
      body: costRows,
      margin: { left: MARGIN, right: MARGIN },
      headStyles: { fillColor: TABLE_HEADER_BG, textColor: DARK, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: DARK },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.3 },
      columnStyles: { 2: { halign: "right", cellWidth: 30 } },
      didDrawPage: () => addFooter(doc, customerName),
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Grand total
  y = checkPage(doc, y, 15, customerName);
  doc.setFillColor(...NOCH_GREEN);
  doc.rect(MARGIN, y - 2, CONTENT_W, 12, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  const totalLabel = techIds.length > 1
    ? `TOTAL — ${techIds.map((id, i) => `TECH ${i + 1}`).join(" + ")}`
    : "CAMPAIGN TOTAL";
  doc.text(totalLabel, MARGIN + 4, y + 5);
  doc.text(fmt$(quote.total_amount), PAGE_W - MARGIN - 4, y + 5, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${totalSites} Sites · ${totalUnits} Units · ${allStates.length} States · ${dateRange}`, MARGIN + 4, y + 9);
  y += 18;

  addFooter(doc, customerName);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 05: ITEMS NEEDED
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = MARGIN;
  y = addSectionHeader(doc, "05", `TO GET STARTED — ITEMS NEEDED FROM ${customerName.toUpperCase()}`, y);

  const items = [
    { label: "Site Access Contacts", desc: "Provide a point of contact for each site or region, including phone number and availability for scheduling." },
    { label: "Operator Credentials", desc: "If applicable, provide network operator credentials for configuration review and firmware verification." },
    { label: "Parts & Tools Confirmation", desc: "Confirm any customer-provided parts or tools required at specific sites." },
    { label: "Special Protocol Confirmation", desc: "For any charger models requiring OEM authorization or special protocols, confirm access and credentials." },
    { label: "Certificate of Insurance", desc: "NOCH Power will provide its Certificate of Insurance upon request." },
    { label: "Executed Proposal / NDA", desc: "Sign and return this proposal to initiate mobilization. NDA available upon request." },
  ];

  for (const item of items) {
    y = checkPage(doc, y, 14, customerName);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(item.label, MARGIN, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(item.desc, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 3.5 + 4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 06: CONDITIONS
  // ═══════════════════════════════════════════════════════════════════════════
  y = checkPage(doc, y, 80, customerName);
  y += 5;
  y = addSectionHeader(doc, "06", "CAMPAIGN CONDITIONS & INVOICE REQUIREMENTS", y);

  const conditions = [
    "State-specific electrical licenses are maintained by NOCH Power for all operating regions.",
    "All technicians adhere to site conduct policies and customer-specific protocols.",
    "Invoices will include: detailed labor hours, travel breakdowns, receipts for all expenses, and work order references.",
    "Payment terms: Net 30 from invoice date.",
    "NOCH Power liability is limited to the contract value for the specific scope of work.",
    "A dedicated account manager will be available for real-time communication throughout the campaign.",
    "All work orders are closed out same-day with digital documentation delivered within 24 hours.",
  ];

  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  for (const cond of conditions) {
    y = checkPage(doc, y, 8, customerName);
    doc.text("•", MARGIN, y);
    const lines = doc.splitTextToSize(cond, CONTENT_W - 6);
    doc.text(lines, MARGIN + 4, y);
    y += lines.length * 3.5 + 3;
  }

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NOCH_GREEN);
  doc.text("NOCH Power can mobilize within 3 business days of proposal acceptance.", MARGIN, y);
  y += 6;
  doc.setTextColor(...DARK);
  doc.text(`Estimated Total: ${fmt$(quote.total_amount)}  |  Deadline: ${plan.deadline ? fmtDate(plan.deadline) : "TBD"}`, MARGIN, y);

  addFooter(doc, customerName);

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNATURE PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = PAGE_H / 2 - 40;

  const colW = (CONTENT_W - 15) / 2;

  // Left column: NOCH Power
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("NOCH Power", MARGIN, y);
  y += 20;

  const sigFields = ["Signature", "Name / Title", "Date"];
  let ly = y;
  for (const field of sigFields) {
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, ly, MARGIN + colW - 5, ly);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(field, MARGIN, ly + 4);
    ly += 18;
  }

  // Right column: Customer
  const rx = MARGIN + colW + 15;
  let ry = y - 20;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(customerName, rx, ry);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("Accepted & Authorized", rx, ry + 5);
  ry += 20;

  for (const field of sigFields) {
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.3);
    doc.line(rx, ry, rx + colW - 5, ry);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(field, rx, ry + 4);
    ry += 18;
  }

  // Footer
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const now = new Date();
  const monthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    `NOCH Power · EV Charging Infrastructure Services · info@nochpower.com · www.nochpower.com  |  Confidential — Prepared exclusively for ${customerName} · ${monthYear}`,
    PAGE_W / 2, PAGE_H - 10, { align: "center", maxWidth: CONTENT_W }
  );

  return doc;
}

// ─── Upload to Storage ──────────────────────────────────────────────────────

export async function uploadProposalToStorage(pdfBlob: Blob, planName: string, version: number): Promise<string | null> {
  const safeName = planName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const versionSuffix = version > 1 ? `_v${version}` : "";
  const fileName = `${safeName}${versionSuffix}_${new Date().toISOString().split("T")[0]}.pdf`;
  const path = `proposals/${fileName}`;

  const { error } = await supabase.storage
    .from("campaign-proposals")
    .upload(path, pdfBlob, { contentType: "application/pdf", upsert: true });

  if (error) {
    console.error("Failed to upload proposal PDF:", error);
    return null;
  }

  return path;
}
