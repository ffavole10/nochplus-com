import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { BRAND, NOCH_ADDRESS, NOCH_WEBSITE, NOCH_COMPANY, loadLogoBase64 } from "@/constants/brandAssets";

// ── Helpers ──────────────────────────────────────────────

const PW = 612; // points – letter width
const PH = 792; // points – letter height
const IN = 72;  // 1 inch in points

function hex(doc: jsPDF, color: string) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return [r, g, b] as [number, number, number];
}

function setFill(doc: jsPDF, color: string) {
  doc.setFillColor(...hex(doc, color));
}
function setDraw(doc: jsPDF, color: string) {
  doc.setDrawColor(...hex(doc, color));
}
function setTextC(doc: jsPDF, color: string) {
  doc.setTextColor(...hex(doc, color));
}

/** Convert mm-based jsPDF coordinates. jsPDF default unit is mm, page = 215.9 x 279.4 mm */
const MM_PER_IN = 25.4;
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const M = 0.5 * MM_PER_IN; // 0.5 inch margin in mm

interface ChargerData {
  id: string;
  brand: string;
  charger_type: string;
  serial_number: string | null;
  installation_location: string | null;
  known_issues: string | null;
  status: string;
  service_needed: boolean | null;
  photo_urls: string[] | null;
}

interface SubmissionData {
  id: string;
  submission_id: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  created_at: string;
  customer_notes: string | null;
  service_urgency: string | null;
}

// ── Status & Priority Logic ──────────────────────────────

function getChargerStatus(ch: ChargerData): { label: string; color: string; bgColor: string } {
  // service_needed is the primary indicator set by staff in the platform
  if (ch.service_needed === true) {
    const issues = (ch.known_issues || "").toLowerCase();
    if (issues.includes("critical")) {
      return { label: "Critical", color: BRAND.red, bgColor: "#FEE2E2" };
    }
    if (issues.includes("minor")) {
      return { label: "Minor Issue", color: BRAND.blue, bgColor: "#DBEAFE" };
    }
    return { label: "Needs Repair", color: BRAND.amber, bgColor: "#FEF3C7" };
  }
  // service_needed is false or null → charger is functional
  return { label: "Functional", color: BRAND.green, bgColor: "#D1FAE5" };
}

function getChargerPriority(ch: ChargerData): { label: string; color: string } {
  if (ch.service_needed !== true) return { label: "NONE", color: BRAND.green };
  const issues = (ch.known_issues || "").toLowerCase();
  if (issues.includes("critical")) return { label: "CRITICAL", color: BRAND.red };
  if (issues.includes("high")) return { label: "HIGH", color: BRAND.amber };
  if (issues.includes("low") || issues.includes("minor")) return { label: "LOW", color: BRAND.blue };
  return { label: "HIGH", color: BRAND.amber };
}

function getOverallRisk(chargers: ChargerData[]): { level: string; color: string; bgColor: string } {
  const total = chargers.length || 1;
  const hasCritical = chargers.some(c => getChargerStatus(c).label === "Critical");
  const needsRepairCount = chargers.filter(c => getChargerStatus(c).label !== "Functional").length;
  const ratio = needsRepairCount / total;

  if (hasCritical) return { level: "HIGH", color: BRAND.red, bgColor: "#FEE2E2" };
  if (ratio >= 0.3) return { level: "MODERATE–HIGH", color: BRAND.amber, bgColor: "#FEF3C7" };
  if (ratio > 0) return { level: "LOW–MODERATE", color: BRAND.amber, bgColor: "#FEF3C7" };
  return { level: "LOW", color: BRAND.green, bgColor: "#D1FAE5" };
}

// ── Image loading helper ─────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getPublicPhotoUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/submission-photos/${path}`;
}

async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Interior header/footer ───────────────────────────────

function drawInteriorHeader(doc: jsPDF, logoB64: string, submissionId: string) {
  const barH = 0.5 * MM_PER_IN;
  setFill(doc, BRAND.tealPrimary);
  doc.rect(0, 0, PAGE_W, barH, "F");

  // Logo
  try {
    const logoW = 0.9 * MM_PER_IN;
    const logoH = 0.43 * MM_PER_IN;
    const logoX = 0.35 * MM_PER_IN;
    const logoY = (barH - logoH) / 2;
    doc.addImage(logoB64, "PNG", logoX, logoY, logoW, logoH);
  } catch { /* logo failed */ }

  // Right text
  setTextC(doc, BRAND.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("EVSE Assessment Report", PAGE_W - M, barH / 2 - 1, { align: "right" });
  setTextC(doc, BRAND.tealAccent);
  doc.setFontSize(7);
  doc.text(submissionId, PAGE_W - M, barH / 2 + 3, { align: "right" });
}

function drawInteriorFooter(doc: jsPDF, pageNum: number) {
  const footerH = 0.4 * MM_PER_IN;
  const footerY = PAGE_H - footerH;

  // Top border
  setDraw(doc, BRAND.tealPrimary);
  doc.setLineWidth(0.7);
  doc.line(0, footerY, PAGE_W, footerY);

  // Background
  setFill(doc, BRAND.grayLight);
  doc.rect(0, footerY, PAGE_W, footerH, "F");

  // Left text
  setTextC(doc, BRAND.gray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${NOCH_COMPANY}  |  ${NOCH_ADDRESS}  |  ${NOCH_WEBSITE}`, M, footerY + footerH / 2 + 1);

  // Right text
  setTextC(doc, BRAND.tealPrimary);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Page ${pageNum}`, PAGE_W - M, footerY + footerH / 2 + 1, { align: "right" });
}

// ── Section header helper ────────────────────────────────

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  const h = 8;
  // Teal light bg
  setFill(doc, BRAND.tealLight);
  doc.rect(M, y, PAGE_W - 2 * M, h, "F");
  // Left teal bar
  setFill(doc, BRAND.tealPrimary);
  doc.rect(M, y, 1.4, h, "F");
  // Text
  setTextC(doc, BRAND.tealDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), M + 4, y + h / 2 + 1.5);
  return y + h + 3;
}

// ── Check page break ─────────────────────────────────────

function needsNewPage(doc: jsPDF, y: number, needed: number, logoB64: string, subId: string, pageCounter: { n: number }): number {
  const maxY = PAGE_H - 0.4 * MM_PER_IN - 5;
  if (y + needed > maxY) {
    drawInteriorFooter(doc, pageCounter.n);
    doc.addPage();
    pageCounter.n++;
    drawInteriorHeader(doc, logoB64, subId);
    return 0.5 * MM_PER_IN + 5;
  }
  return y;
}

// ══════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════

export async function generateAssessmentReport(submissionId: string): Promise<void> {
  // ── Fetch data ──
  const { data: submission, error: subErr } = await supabase
    .from("noch_plus_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (subErr || !submission) throw new Error("Failed to load submission data");

  const { data: chargers } = await supabase
    .from("assessment_chargers")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });

  const chargerList: ChargerData[] = (chargers || []).map((c: any) => ({
    id: c.id,
    brand: c.brand,
    charger_type: c.charger_type,
    serial_number: c.serial_number,
    installation_location: c.installation_location,
    known_issues: c.known_issues,
    status: c.status,
    service_needed: c.service_needed,
    photo_urls: c.photo_urls,
  }));

  const sub: SubmissionData = {
    id: submission.id,
    submission_id: submission.submission_id,
    full_name: submission.full_name,
    company_name: submission.company_name,
    email: submission.email,
    phone: submission.phone,
    street_address: submission.street_address,
    city: submission.city,
    state: submission.state,
    zip_code: submission.zip_code,
    created_at: submission.created_at,
    customer_notes: submission.customer_notes,
    service_urgency: submission.service_urgency,
  };

  const logoB64 = await loadLogoBase64();
  const dateStr = format(new Date(sub.created_at), "MMMM d, yyyy");
  const dateShort = format(new Date(), "yyyy-MM-dd");

  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageCounter = { n: 1 };

  // ════════════════════════════════════════════════════════
  // COVER PAGE
  // ════════════════════════════════════════════════════════

  // Full teal background
  setFill(doc, BRAND.tealPrimary);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Darker top overlay (top 55%)
  setFill(doc, BRAND.coverDark);
  doc.rect(0, 0, PAGE_W, PAGE_H * 0.55, "F");

  // White border rectangle (top 52%, inset 0.5in)
  setDraw(doc, BRAND.white);
  doc.setLineWidth(1);
  const boxX = M;
  const boxY = M;
  const boxW = PAGE_W - 2 * M;
  const boxH = PAGE_H * 0.52;
  doc.rect(boxX, boxY, boxW, boxH);

  // Title text inside box
  setTextC(doc, BRAND.white);
  doc.setFontSize(52);
  doc.setFont("helvetica", "bold");
  doc.text("EVSE", boxX + 8, boxY + 30);
  doc.setFontSize(48);
  doc.text("Assessment", boxX + 8, boxY + 48);
  doc.setFontSize(52);
  doc.text("Report", boxX + 8, boxY + 68);

  // Submission ID pill at bottom left inside box
  const pillY = boxY + boxH - 14;
  const pillText = sub.submission_id;
  doc.setFontSize(9);
  const pillW = doc.getTextWidth(pillText) + 10;
  setFill(doc, BRAND.tealDark);
  doc.roundedRect(boxX + 8, pillY, pillW, 7, 3, 3, "F");
  setTextC(doc, BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.text(pillText, boxX + 8 + pillW / 2, pillY + 5, { align: "center" });

  // Logo bottom left
  try {
    const logoW = 1.6 * MM_PER_IN;
    const logoH = 0.77 * MM_PER_IN;
    const logoX = 0.45 * MM_PER_IN;
    const logoY = PAGE_H - 0.55 * MM_PER_IN - logoH;
    doc.addImage(logoB64, "PNG", logoX, logoY, logoW, logoH);
  } catch { /* logo failed */ }

  // Report Information box (bottom right)
  const infoW = PAGE_W * 0.44;
  const infoH = 1.55 * MM_PER_IN;
  const infoX = PAGE_W - 0.45 * MM_PER_IN - infoW;
  const infoY = PAGE_H - 0.45 * MM_PER_IN - infoH;

  setFill(doc, BRAND.tealDark);
  doc.roundedRect(infoX, infoY, infoW, infoH, 3, 3, "F");

  setTextC(doc, BRAND.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Report Information", infoX + 6, infoY + 9);

  // Divider
  setDraw(doc, BRAND.tealPrimary);
  doc.setLineWidth(0.3);
  doc.line(infoX + 6, infoY + 12, infoX + infoW - 6, infoY + 12);

  // Info rows
  const labels = ["Customer", "Prepared by", "Date", "Submission ID"];
  const values = [sub.company_name, NOCH_COMPANY, dateStr, sub.submission_id];
  let iy = infoY + 17;
  for (let i = 0; i < labels.length; i++) {
    setTextC(doc, BRAND.tealAccent);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(labels[i], infoX + 6, iy);
    setTextC(doc, BRAND.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(values[i], infoX + 6, iy + 4);
    iy += 9;
  }

  // Footer strip
  const footStripH = 0.42 * MM_PER_IN;
  setFill(doc, BRAND.tealDark);
  doc.rect(0, PAGE_H - footStripH, PAGE_W, footStripH, "F");
  setTextC(doc, BRAND.tealAccent);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${NOCH_ADDRESS}  |  ${NOCH_WEBSITE}`, PAGE_W / 2, PAGE_H - footStripH / 2 + 1, { align: "center" });

  // ════════════════════════════════════════════════════════
  // PAGE 2: Customer Info + Executive Summary
  // ════════════════════════════════════════════════════════
  doc.addPage();
  pageCounter.n++;
  drawInteriorHeader(doc, logoB64, sub.submission_id);
  let y = 0.5 * MM_PER_IN + 8;

  // Section 1: Customer & Submission Information
  y = drawSectionHeader(doc, "Customer & Submission Information", y);

  const address = [sub.street_address, sub.city, sub.state, sub.zip_code].filter(Boolean).join(", ");
  const gridHeaders1 = ["CUSTOMER", "COMPANY", "SUBMISSION ID", "DATE"];
  const gridValues1 = [sub.full_name, sub.company_name, sub.submission_id, dateStr];
  const gridHeaders2 = ["EMAIL", "PHONE", "SITE ADDRESS", "PREPARED BY"];
  const gridValues2 = [sub.email, sub.phone, address, NOCH_COMPANY];

  const colW = (PAGE_W - 2 * M) / 4;

  function drawInfoGrid(headers: string[], values: string[], startY: number, highlightCol?: number): number {
    const hH = 6;
    const vH = 7;

    // Header row
    setFill(doc, BRAND.grayLight);
    doc.rect(M, startY, PAGE_W - 2 * M, hH, "F");
    setTextC(doc, BRAND.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], M + i * colW + 3, startY + 4);
    }

    // Value row
    setFill(doc, BRAND.white);
    doc.rect(M, startY + hH, PAGE_W - 2 * M, vH, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    for (let i = 0; i < values.length; i++) {
      if (i === highlightCol) {
        setTextC(doc, BRAND.tealPrimary);
      } else {
        setTextC(doc, BRAND.darkText);
      }
      const maxW = colW - 6;
      const lines = doc.splitTextToSize(values[i] || "—", maxW);
      doc.text(lines[0] || "—", M + i * colW + 3, startY + hH + 4.5);
    }

    // Grid borders
    setDraw(doc, "#D1D5DB");
    doc.setLineWidth(0.3);
    doc.rect(M, startY, PAGE_W - 2 * M, hH + vH);
    for (let i = 1; i < 4; i++) {
      doc.line(M + i * colW, startY, M + i * colW, startY + hH + vH);
    }
    doc.line(M, startY + hH, M + (PAGE_W - 2 * M), startY + hH);

    return startY + hH + vH + 2;
  }

  y = drawInfoGrid(gridHeaders1, gridValues1, y, 2);
  y = drawInfoGrid(gridHeaders2, gridValues2, y);
  y += 4;

  // Section 2: Executive Summary
  y = drawSectionHeader(doc, "Executive Summary", y);

  // Stats bar
  const totalChargers = chargerList.length;
  const functional = chargerList.filter(c => getChargerStatus(c).label === "Functional").length;
  const critical = chargerList.filter(c => getChargerStatus(c).label === "Critical").length;
  const needsRepair = chargerList.filter(c => getChargerStatus(c).label === "Needs Repair").length;
  const minorIssue = chargerList.filter(c => getChargerStatus(c).label === "Minor Issue").length;

  const statsBarH = 18;
  setFill(doc, BRAND.tealLight);
  doc.rect(M, y, PAGE_W - 2 * M, statsBarH, "F");
  // Top teal border
  setFill(doc, BRAND.tealPrimary);
  doc.rect(M, y, PAGE_W - 2 * M, 1, "F");

  const stats = [
    { label: "Total Chargers", value: String(totalChargers), color: BRAND.darkText },
    { label: "Fully Functional", value: String(functional), color: BRAND.green },
    { label: "Critical", value: String(critical), color: BRAND.red },
    { label: "Needs Repair", value: String(needsRepair), color: BRAND.amber },
    { label: "Minor Issue", value: String(minorIssue), color: BRAND.blue },
  ];

  const statW = (PAGE_W - 2 * M) / 5;
  for (let i = 0; i < stats.length; i++) {
    const sx = M + i * statW + statW / 2;
    setTextC(doc, stats[i].color);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(stats[i].value, sx, y + 9, { align: "center" });
    setTextC(doc, BRAND.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(stats[i].label, sx, y + 14, { align: "center" });
  }
  y += statsBarH + 4;

  // Overall risk callout
  const risk = getOverallRisk(chargerList);
  const riskH = 12;
  setFill(doc, risk.bgColor);
  doc.rect(M, y, PAGE_W - 2 * M, riskH, "F");
  // Left color bar
  setFill(doc, risk.color);
  doc.rect(M, y, 1.4, riskH, "F");

  setTextC(doc, BRAND.darkText);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Overall Risk Assessment: ", M + 5, y + 7);
  setTextC(doc, risk.color);
  doc.text(risk.level, M + 5 + doc.getTextWidth("Overall Risk Assessment: "), y + 7);
  y += riskH + 3;

  // Summary text
  const summaryText = `This assessment covers ${totalChargers} EV charger${totalChargers !== 1 ? "s" : ""} at ${sub.company_name}. ${functional} charger${functional !== 1 ? "s are" : " is"} fully functional, ${critical} critical, ${needsRepair} need${needsRepair === 1 ? "s" : ""} repair, and ${minorIssue} ha${minorIssue === 1 ? "s" : "ve"} minor issues.`;
  setTextC(doc, BRAND.darkText);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const summaryLines = doc.splitTextToSize(summaryText, PAGE_W - 2 * M - 4);
  doc.text(summaryLines, M + 2, y + 4);
  y += summaryLines.length * 4 + 6;

  // Section 3: Priority Actions
  const priorityChargers = chargerList
    .map((ch, idx) => ({ ch, idx, priority: getChargerPriority(ch) }))
    .filter(item => item.priority.label === "CRITICAL" || item.priority.label === "HIGH")
    .sort((a, b) => (a.priority.label === "CRITICAL" ? -1 : 1) - (b.priority.label === "CRITICAL" ? -1 : 1));

  if (priorityChargers.length > 0) {
    y = needsNewPage(doc, y, 20, logoB64, sub.submission_id, pageCounter);
    y = drawSectionHeader(doc, "Priority Actions", y);

    for (let i = 0; i < priorityChargers.length; i++) {
      y = needsNewPage(doc, y, 16, logoB64, sub.submission_id, pageCounter);
      const { ch, idx, priority } = priorityChargers[i];
      const issue = ch.known_issues || "Issue identified during assessment";

      setTextC(doc, priority.color);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}.`, M + 2, y + 4);

      setTextC(doc, BRAND.darkText);
      doc.setFontSize(9);
      doc.text(`${issue} — ${ch.serial_number || ch.brand}`, M + 10, y + 4);

      setTextC(doc, BRAND.gray);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Charger ${idx + 1}: Recommend immediate ${priority.label === "CRITICAL" ? "critical" : "priority"} service.`, M + 10, y + 9);

      if (i < priorityChargers.length - 1) {
        setDraw(doc, "#E5E7EB");
        doc.setLineWidth(0.1);
        doc.line(M + 2, y + 12, PAGE_W - M - 2, y + 12);
      }
      y += 14;
    }
    y += 2;
  }

  // ════════════════════════════════════════════════════════
  // CHARGER-BY-CHARGER ASSESSMENT
  // ════════════════════════════════════════════════════════
  doc.addPage();
  pageCounter.n++;
  drawInteriorHeader(doc, logoB64, sub.submission_id);
  y = 0.5 * MM_PER_IN + 8;

  y = drawSectionHeader(doc, "Charger-by-Charger Assessment", y);

  for (let i = 0; i < chargerList.length; i++) {
    const ch = chargerList[i];
    const status = getChargerStatus(ch);
    const priority = getChargerPriority(ch);
    const issue = ch.known_issues || "No issues reported";

    // Estimate card height
    const cardHeaderH = 9;
    const statusRowH = 10;
    const recH = 16;
    const photoH = ch.photo_urls && ch.photo_urls.length > 0 ? 38 : 10;
    const totalCardH = cardHeaderH + statusRowH + recH + photoH + 6;

    y = needsNewPage(doc, y, totalCardH, logoB64, sub.submission_id, pageCounter);

    // Card header (teal)
    setFill(doc, BRAND.tealPrimary);
    doc.rect(M, y, PAGE_W - 2 * M, cardHeaderH, "F");
    setTextC(doc, BRAND.white);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Charger ${i + 1} — ${ch.serial_number || "N/A"}`, M + 4, y + 6);
    setTextC(doc, BRAND.tealAccent);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${ch.brand} ${ch.charger_type}`, PAGE_W - M - 4, y + 6, { align: "right" });
    y += cardHeaderH;

    // Status row
    setFill(doc, status.bgColor);
    doc.rect(M, y, PAGE_W - 2 * M, statusRowH, "F");

    const col3W = (PAGE_W - 2 * M) / 3;

    // STATUS column
    setTextC(doc, BRAND.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("STATUS", M + 4, y + 3.5);
    setTextC(doc, status.color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(status.label, M + 4, y + 8);

    // PRIORITY column
    setTextC(doc, BRAND.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("PRIORITY", M + col3W + 4, y + 3.5);
    setTextC(doc, priority.color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(priority.label, M + col3W + 4, y + 8);

    // ISSUE column
    setTextC(doc, BRAND.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("ISSUE IDENTIFIED", M + 2 * col3W + 4, y + 3.5);
    setTextC(doc, BRAND.darkText);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const issueLines = doc.splitTextToSize(issue, col3W - 8);
    doc.text(issueLines[0] || "—", M + 2 * col3W + 4, y + 8);
    y += statusRowH;

    // Recommendation
    setDraw(doc, "#E5E7EB");
    doc.setLineWidth(0.3);
    setFill(doc, BRAND.white);
    doc.rect(M, y, PAGE_W - 2 * M, recH, "FD");
    setTextC(doc, BRAND.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("RECOMMENDATION", M + 4, y + 4);
    setTextC(doc, BRAND.darkText);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const recText = ch.service_needed
      ? "Schedule professional service to address identified issues. Prioritize based on severity rating."
      : "No immediate action required. Continue regular maintenance schedule.";
    const recLines = doc.splitTextToSize(recText, PAGE_W - 2 * M - 12);
    doc.text(recLines, M + 4, y + 8.5);
    y += recH;

    // Photo grid
    if (ch.photo_urls && ch.photo_urls.length > 0) {
      setFill(doc, BRAND.grayLight);
      doc.rect(M, y, PAGE_W - 2 * M, photoH, "F");

      const photoCols = 3;
      const photoMargin = 3;
      const availW = PAGE_W - 2 * M - (photoCols + 1) * photoMargin;
      const thumbW = availW / photoCols;
      const thumbH = photoH - 10;

      for (let p = 0; p < Math.min(ch.photo_urls.length, 6); p++) {
        const col = p % photoCols;
        const row = Math.floor(p / photoCols);

        if (row > 0) {
          y = needsNewPage(doc, y, thumbH + 10, logoB64, sub.submission_id, pageCounter);
        }

        const px = M + photoMargin + col * (thumbW + photoMargin);
        const py = y + 3 + row * (thumbH + 6);

        try {
          const imgData = await loadImage(getPublicPhotoUrl(ch.photo_urls[p]));
          if (imgData) {
            doc.addImage(imgData, "JPEG", px, py, thumbW, thumbH);
          } else {
            setFill(doc, "#E5E7EB");
            doc.rect(px, py, thumbW, thumbH, "F");
            setTextC(doc, BRAND.gray);
            doc.setFontSize(7);
            doc.text("Photo unavailable", px + thumbW / 2, py + thumbH / 2, { align: "center" });
          }
        } catch {
          setFill(doc, "#E5E7EB");
          doc.rect(px, py, thumbW, thumbH, "F");
        }

        // Photo label
        setTextC(doc, BRAND.gray);
        doc.setFontSize(6);
        doc.text(`Photo ${p + 1}`, px + thumbW / 2, py + thumbH + 3, { align: "center" });
      }

      y += photoH;
    } else {
      // No photos placeholder
      setFill(doc, BRAND.grayLight);
      doc.rect(M, y, PAGE_W - 2 * M, 8, "F");
      setTextC(doc, BRAND.gray);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("No photos available", M + (PAGE_W - 2 * M) / 2, y + 5.5, { align: "center" });
      y += 10;
    }

    y += 6; // spacing between cards
  }

  // ════════════════════════════════════════════════════════
  // FINAL PAGE: CERTIFICATION
  // ════════════════════════════════════════════════════════
  y = needsNewPage(doc, y, 80, logoB64, sub.submission_id, pageCounter);
  y += 4;
  y = drawSectionHeader(doc, "Assessment Certification", y);

  const certText = "This assessment report has been prepared by Noch Power Inc. based on a physical site inspection and review of the EV charging infrastructure at the above-mentioned property. All findings, recommendations, and risk assessments reflect the conditions observed at the time of inspection. Noch Power Inc. recommends addressing all critical and high-priority items as soon as possible to restore full charging network availability and prevent further revenue loss.";

  setTextC(doc, BRAND.darkText);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const certLines = doc.splitTextToSize(certText, PAGE_W - 2 * M - 8);
  doc.text(certLines, M + 4, y + 4);
  y += certLines.length * 4 + 10;

  // 3-column signature table
  const sigColW = (PAGE_W - 2 * M) / 3;
  const sigLabels = ["Prepared by:", "Authorized by:", "Date:"];
  const sigValues = [NOCH_COMPANY, NOCH_COMPANY, dateStr];

  for (let i = 0; i < 3; i++) {
    const sx = M + i * sigColW + 4;

    setTextC(doc, BRAND.gray);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(sigLabels[i], sx, y);

    // Underline
    setDraw(doc, BRAND.tealPrimary);
    doc.setLineWidth(0.5);
    doc.line(sx, y + 12, sx + sigColW - 12, y + 12);

    setTextC(doc, BRAND.darkText);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(sigValues[i], sx, y + 18);
  }
  y += 26;

  // Full-width teal closing bar
  const closingH = 12;
  y = needsNewPage(doc, y, closingH + 5, logoB64, sub.submission_id, pageCounter);
  setFill(doc, BRAND.tealPrimary);
  doc.rect(M, y, PAGE_W - 2 * M, closingH, "F");
  setTextC(doc, BRAND.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(NOCH_COMPANY, M + 4, y + 5);
  setTextC(doc, BRAND.tealAccent);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(NOCH_ADDRESS, M + 4, y + 9);

  // ── Add footer to all interior pages ───────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    drawInteriorFooter(doc, p - 1);
  }

  // ── Save ───────────────────────────────────────────────
  const filename = `Noch_Assessment_${sub.submission_id}_${dateShort}.pdf`;
  doc.save(filename);
}
