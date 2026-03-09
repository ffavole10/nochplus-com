import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { BRAND, NOCH_ADDRESS, NOCH_WEBSITE, NOCH_COMPANY, loadLogoBase64 } from "@/constants/brandAssets";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

async function loadCoverAsImage(): Promise<string | null> {
  try {
    const response = await fetch("/assets/report-cover.pdf");
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch (e) {
    console.warn("Failed to load cover PDF as image:", e);
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────

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

const MM_PER_IN = 25.4;
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const M = 0.5 * MM_PER_IN; // 0.5 inch margin in mm

const MAX_PHOTOS_PER_CHARGER = 3;

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

// ── Image compression helper ─────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getPublicPhotoUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/submission-photos/${path}`;
}

async function compressImage(
  url: string,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.55
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();

    const bitmap = await createImageBitmap(blob);
    let w = bitmap.width;
    let h = bitmap.height;

    // Scale down proportionally
    if (w > maxWidth || h > maxHeight) {
      const ratio = Math.min(maxWidth / w, maxHeight / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const compressedBlob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(compressedBlob);
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

  try {
    const logoW = 0.9 * MM_PER_IN;
    const logoH = 0.43 * MM_PER_IN;
    const logoX = 0.35 * MM_PER_IN;
    const logoY = (barH - logoH) / 2;
    doc.addImage(logoB64, "PNG", logoX, logoY, logoW, logoH);
  } catch { /* logo failed */ }

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

  setDraw(doc, BRAND.tealPrimary);
  doc.setLineWidth(0.7);
  doc.line(0, footerY, PAGE_W, footerY);

  setFill(doc, BRAND.grayLight);
  doc.rect(0, footerY, PAGE_W, footerH, "F");

  setTextC(doc, BRAND.gray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${NOCH_COMPANY}  |  ${NOCH_ADDRESS}  |  ${NOCH_WEBSITE}`, M, footerY + footerH / 2 + 1);

  setTextC(doc, BRAND.tealPrimary);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Page ${pageNum}`, PAGE_W - M, footerY + footerH / 2 + 1, { align: "right" });
}

// ── Section header helper ────────────────────────────────

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  const h = 8;
  setFill(doc, BRAND.tealLight);
  doc.rect(M, y, PAGE_W - 2 * M, h, "F");
  setFill(doc, BRAND.tealPrimary);
  doc.rect(M, y, 1.4, h, "F");
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

  // ── Load logo + compress all photos in parallel ──
  const logoB64Promise = loadLogoBase64();

  // Build list of all photos to compress (max 3 per charger)
  const photoJobs: { chargerIdx: number; photoIdx: number; url: string }[] = [];
  chargerList.forEach((ch, ci) => {
    if (ch.photo_urls && ch.photo_urls.length > 0) {
      const limited = ch.photo_urls.slice(0, MAX_PHOTOS_PER_CHARGER);
      limited.forEach((url, pi) => {
        photoJobs.push({ chargerIdx: ci, photoIdx: pi, url: getPublicPhotoUrl(url) });
      });
    }
  });

  const [logoB64, ...compressedPhotos] = await Promise.all([
    logoB64Promise,
    ...photoJobs.map(job => compressImage(job.url, 400, 300, 0.5)),
  ]);

  // Map compressed photos back to chargers
  const photoMap: Map<string, string | null> = new Map();
  photoJobs.forEach((job, i) => {
    photoMap.set(`${job.chargerIdx}-${job.photoIdx}`, compressedPhotos[i]);
  });

  const dateStr = format(new Date(sub.created_at), "MMMM d, yyyy");
  const dateShort = format(new Date(), "yyyy-MM-dd");

  // FIX 3: Enable compression
  const doc = new jsPDF({ unit: "mm", format: "letter", compress: true });
  const pageCounter = { n: 1 };

  // ════════════════════════════════════════════════════════
  // COVER PAGE — static PDF background + text overlay
  // ════════════════════════════════════════════════════════

  const coverImage = await loadCoverAsImage();
  if (coverImage) {
    doc.addImage(coverImage, "JPEG", 0, 0, PAGE_W, PAGE_H);
  } else {
    // Fallback: simple teal cover if PDF load fails
    setFill(doc, BRAND.tealPrimary);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    setTextC(doc, BRAND.white);
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text("EVSE Assessment Report", PAGE_W / 2, PAGE_H / 2, { align: "center" });
  }

  // Overlay Report Information — text floats on open teal area, no box
  // Coordinates in pt, converted to mm (1pt = 0.3528mm)
  const PT = 0.3528;
  const COVER_INFO_X = 342 * PT;
  const COVER_INFO_Y = 532 * PT;
  const COVER_ROW_HEIGHT = 32 * PT;

  const truncate = (s: string, max = 28) => s.length > max ? s.slice(0, max - 1) + "…" : s;

  // Title
  setTextC(doc, BRAND.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Report Information", COVER_INFO_X, COVER_INFO_Y);

  // Divider line (white at 25% opacity)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5 * PT);
  const gState = new (doc as any).GState({ "stroke-opacity": 0.25 });
  (doc as any).setGState(gState);
  doc.line(338 * PT, (COVER_INFO_Y / PT + 12) * PT, 577 * PT, (COVER_INFO_Y / PT + 12) * PT);
  const gStateReset = new (doc as any).GState({ "stroke-opacity": 1 });
  (doc as any).setGState(gStateReset);

  // Data rows
  const coverLabels = ["Customer", "Prepared by", "Date", "Submission ID"];
  const coverValues = [truncate(sub.company_name), truncate(NOCH_COMPANY), truncate(dateStr), truncate(sub.submission_id)];
  const rowOffsets = [32, 64, 96, 128];
  const valGap = 11;

  for (let i = 0; i < coverLabels.length; i++) {
    const labelY = (COVER_INFO_Y / PT + rowOffsets[i]) * PT;
    const valueY = (COVER_INFO_Y / PT + rowOffsets[i] + valGap) * PT;
    setTextC(doc, "#9ED8D3");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(coverLabels[i], COVER_INFO_X, labelY);
    setTextC(doc, BRAND.white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(coverValues[i], COVER_INFO_X, valueY);
  }

  // ════════════════════════════════════════════════════════
  // PAGE 2: Customer Info + Executive Summary
  // ════════════════════════════════════════════════════════
  doc.addPage();
  pageCounter.n++;
  drawInteriorHeader(doc, logoB64, sub.submission_id);
  let y = 0.5 * MM_PER_IN + 8;

  y = drawSectionHeader(doc, "Customer & Submission Information", y);

  const address = [sub.street_address, sub.city, sub.state, sub.zip_code].filter(Boolean).join(", ");
  const gridHeaders1 = ["CUSTOMER", "COMPANY", "SUBMISSION ID", "DATE"];
  const gridValues1 = [sub.full_name, sub.company_name, sub.submission_id, dateStr];
  const gridHeaders2 = ["EMAIL", "PHONE", "SITE ADDRESS", "PREPARED BY"];
  const gridValues2 = [sub.email, sub.phone, address, NOCH_COMPANY];

  const colW = (PAGE_W - 2 * M) / 4;

  function drawInfoGrid(headers: string[], vals: string[], startY: number, highlightCol?: number): number {
    const hH = 6;
    const vH = 7;

    setFill(doc, BRAND.grayLight);
    doc.rect(M, startY, PAGE_W - 2 * M, hH, "F");
    setTextC(doc, BRAND.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], M + i * colW + 3, startY + 4);
    }

    setFill(doc, BRAND.white);
    doc.rect(M, startY + hH, PAGE_W - 2 * M, vH, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    for (let i = 0; i < vals.length; i++) {
      if (i === highlightCol) {
        setTextC(doc, BRAND.tealPrimary);
      } else {
        setTextC(doc, BRAND.darkText);
      }
      const maxW = colW - 6;
      const lines = doc.splitTextToSize(vals[i] || "—", maxW);
      doc.text(lines[0] || "—", M + i * colW + 3, startY + hH + 4.5);
    }

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

  const totalChargers = chargerList.length;
  const functional = chargerList.filter(c => getChargerStatus(c).label === "Functional").length;
  const critical = chargerList.filter(c => getChargerStatus(c).label === "Critical").length;
  const needsRepair = chargerList.filter(c => getChargerStatus(c).label === "Needs Repair").length;
  const minorIssue = chargerList.filter(c => getChargerStatus(c).label === "Minor Issue").length;

  const statsBarH = 18;
  setFill(doc, BRAND.tealLight);
  doc.rect(M, y, PAGE_W - 2 * M, statsBarH, "F");
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
      const { ch, idx, priority } = priorityChargers[i];
      const issue = ch.known_issues || "Issue identified during assessment";
      const recLine = `Charger ${idx + 1}: Recommend immediate ${priority.label === "CRITICAL" ? "critical" : "priority"} service.`;
      const maxTextW = PAGE_W - 2 * M - 12;

      // Split issue into paragraphs then wrap — must set bold before measuring
      const issueParagraphs = issue.split(/\n+/).filter(p => p.trim());
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const allIssueText = issueParagraphs.join(" ") + ` — ${ch.serial_number || ch.brand}`;
      const wrappedIssue = doc.splitTextToSize(allIssueText, maxTextW);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const recLines = doc.splitTextToSize(recLine, maxTextW);

      const LINE_H = 4;
      const maxY = PAGE_H - 0.4 * MM_PER_IN - 10;

      // Number
      y = needsNewPage(doc, y, 10, logoB64, sub.submission_id, pageCounter);
      setTextC(doc, priority.color);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}.`, M + 2, y + 4);

      // Issue text line by line
      setTextC(doc, BRAND.darkText);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      let lineY = y + 4;
      for (const line of wrappedIssue) {
        if (lineY + LINE_H > maxY) {
          drawInteriorFooter(doc, pageCounter.n);
          doc.addPage();
          pageCounter.n++;
          drawInteriorHeader(doc, logoB64, sub.submission_id);
          lineY = 0.5 * MM_PER_IN + 8;
        }
        doc.text(line, M + 10, lineY);
        lineY += LINE_H;
      }

      // Rec text line by line
      setTextC(doc, BRAND.gray);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      for (const line of recLines) {
        if (lineY + 3.5 > maxY) {
          drawInteriorFooter(doc, pageCounter.n);
          doc.addPage();
          pageCounter.n++;
          drawInteriorHeader(doc, logoB64, sub.submission_id);
          lineY = 0.5 * MM_PER_IN + 8;
        }
        doc.text(line, M + 10, lineY);
        lineY += 3.5;
      }
      lineY += 2;

      if (i < priorityChargers.length - 1) {
        setDraw(doc, "#E5E7EB");
        doc.setLineWidth(0.1);
        doc.line(M + 2, lineY, PAGE_W - M - 2, lineY);
      }
      y = lineY + 2;
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

    const contentW = PAGE_W - 2 * M;
    const issueColW = contentW - 8;

    // Split issue into paragraphs, then wrap each paragraph (measure with bold font)
    const issueParagraphs = issue.split(/\n+/).filter(p => p.trim());
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const allIssueLines: string[] = [];
    for (const para of issueParagraphs) {
      const wrapped = doc.splitTextToSize(para.trim(), issueColW);
      allIssueLines.push(...wrapped);
    }

    const recText = ch.service_needed
      ? "Schedule professional service to address identified issues. Prioritize based on severity rating."
      : "No immediate action required. Continue regular maintenance schedule.";
    doc.setFontSize(8.5);
    const recLines = doc.splitTextToSize(recText, contentW - 12);

    const cardHeaderH = 9;
    const LINE_H_ISSUE = 3.8;
    const LINE_H_REC = 4;

    // Issue text can be very long - render it as a separate block below status/priority
    // Status row: just status + priority labels (fixed height)
    const statusRowH = 12;
    // Issue block: label + all issue lines
    const issueBlockH = 6 + allIssueLines.length * LINE_H_ISSUE + 2;
    const recH = 8 + recLines.length * LINE_H_REC;
    const photoCount = ch.photo_urls ? Math.min(ch.photo_urls.length, MAX_PHOTOS_PER_CHARGER) : 0;
    const photoH = photoCount > 0 ? 38 : 10;

    // Check if card header + status fits; if not, new page
    y = needsNewPage(doc, y, cardHeaderH + statusRowH + 10, logoB64, sub.submission_id, pageCounter);

    // Card header (teal)
    setFill(doc, BRAND.tealPrimary);
    doc.rect(M, y, contentW, cardHeaderH, "F");
    setTextC(doc, BRAND.white);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Charger ${i + 1} — ${ch.serial_number || "N/A"}`, M + 4, y + 6);
    setTextC(doc, BRAND.tealAccent);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${ch.brand} ${ch.charger_type}`, PAGE_W - M - 4, y + 6, { align: "right" });
    y += cardHeaderH;

    // Status + Priority row (compact, fixed height)
    setFill(doc, status.bgColor);
    doc.rect(M, y, contentW, statusRowH, "F");

    setTextC(doc, BRAND.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("STATUS", M + 4, y + 3.5);
    setTextC(doc, status.color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(status.label, M + 4, y + 8);

    setTextC(doc, BRAND.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("PRIORITY", M + contentW / 3 + 4, y + 3.5);
    setTextC(doc, priority.color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(priority.label, M + contentW / 3 + 4, y + 8);
    y += statusRowH;

    // Issue description block - renders line by line with page breaks
    y = needsNewPage(doc, y, 14, logoB64, sub.submission_id, pageCounter);
    setFill(doc, BRAND.white);
    setDraw(doc, "#E5E7EB");
    doc.setLineWidth(0.3);

    setTextC(doc, BRAND.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("ISSUE IDENTIFIED", M + 4, y + 4);
    y += 6;

    setTextC(doc, BRAND.darkText);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const maxY = PAGE_H - 0.4 * MM_PER_IN - 10;
    for (let li = 0; li < allIssueLines.length; li++) {
      if (y + LINE_H_ISSUE > maxY) {
        drawInteriorFooter(doc, pageCounter.n);
        doc.addPage();
        pageCounter.n++;
        drawInteriorHeader(doc, logoB64, sub.submission_id);
        y = 0.5 * MM_PER_IN + 5;
      }
      doc.text(allIssueLines[li], M + 4, y + 3);
      y += LINE_H_ISSUE;
    }
    y += 2;

    // Recommendation
    y = needsNewPage(doc, y, 14, logoB64, sub.submission_id, pageCounter);
    setDraw(doc, "#E5E7EB");
    doc.setLineWidth(0.3);
    setTextC(doc, BRAND.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("RECOMMENDATION", M + 4, y + 4);
    y += 6;

    setTextC(doc, BRAND.darkText);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    for (let li = 0; li < recLines.length; li++) {
      if (y + LINE_H_REC > maxY) {
        drawInteriorFooter(doc, pageCounter.n);
        doc.addPage();
        pageCounter.n++;
        drawInteriorHeader(doc, logoB64, sub.submission_id);
        y = 0.5 * MM_PER_IN + 5;
      }
      doc.text(recLines[li], M + 4, y + 3);
      y += LINE_H_REC;
    }
    y += 2;

    // Photo grid — using pre-compressed images from photoMap
    if (photoCount > 0) {
      setFill(doc, BRAND.grayLight);
      doc.rect(M, y, PAGE_W - 2 * M, photoH, "F");

      const photoCols = 3;
      const photoMargin = 3;
      const availW = PAGE_W - 2 * M - (photoCols + 1) * photoMargin;
      const thumbW = availW / photoCols;
      const thumbH = photoH - 10;

      for (let p = 0; p < photoCount; p++) {
        const col = p % photoCols;
        const px = M + photoMargin + col * (thumbW + photoMargin);
        const py = y + 3;

        const imgData = photoMap.get(`${i}-${p}`);
        if (imgData) {
          try {
            doc.addImage(imgData, "JPEG", px, py, thumbW, thumbH);
          } catch {
            setFill(doc, "#E5E7EB");
            doc.rect(px, py, thumbW, thumbH, "F");
            setTextC(doc, BRAND.gray);
            doc.setFontSize(7);
            doc.text("Photo unavailable", px + thumbW / 2, py + thumbH / 2, { align: "center" });
          }
        } else {
          setFill(doc, "#E5E7EB");
          doc.rect(px, py, thumbW, thumbH, "F");
          setTextC(doc, BRAND.gray);
          doc.setFontSize(7);
          doc.text("Photo unavailable", px + thumbW / 2, py + thumbH / 2, { align: "center" });
        }

        setTextC(doc, BRAND.gray);
        doc.setFontSize(6);
        doc.text(`Photo ${p + 1}`, px + thumbW / 2, py + thumbH + 3, { align: "center" });
      }

      // "more photos" note
      if (ch.photo_urls && ch.photo_urls.length > MAX_PHOTOS_PER_CHARGER) {
        const extra = ch.photo_urls.length - MAX_PHOTOS_PER_CHARGER;
        setTextC(doc, BRAND.gray);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "italic");
        doc.text(`+ ${extra} more photo${extra > 1 ? "s" : ""} available in platform`, PAGE_W - M - 4, y + photoH - 2, { align: "right" });
      }

      y += photoH;
    } else {
      setFill(doc, BRAND.grayLight);
      doc.rect(M, y, PAGE_W - 2 * M, 8, "F");
      setTextC(doc, BRAND.gray);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("No photos available", M + (PAGE_W - 2 * M) / 2, y + 5.5, { align: "center" });
      y += 10;
    }

    y += 6;
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

  const sigColW = (PAGE_W - 2 * M) / 3;
  const sigLabels = ["Prepared by:", "Authorized by:", "Date:"];
  const sigValues = [NOCH_COMPANY, NOCH_COMPANY, dateStr];

  for (let si = 0; si < 3; si++) {
    const sx = M + si * sigColW + 4;

    setTextC(doc, BRAND.gray);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(sigLabels[si], sx, y);

    setDraw(doc, BRAND.tealPrimary);
    doc.setLineWidth(0.5);
    doc.line(sx, y + 12, sx + sigColW - 12, y + 12);

    setTextC(doc, BRAND.darkText);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(sigValues[si], sx, y + 18);
  }
  y += 26;

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

  // ── FIX 6: Show file size before download ──────────────
  const pdfBlob = doc.output("blob");
  const fileSizeMB = (pdfBlob.size / 1024 / 1024).toFixed(1);

  const filename = `Noch_Assessment_${sub.submission_id}_${dateShort}.pdf`;
  // Save via blob URL for consistency
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  toast.success(`Report ready — ${fileSizeMB} MB`);
  if (parseFloat(fileSizeMB) > 10) {
    toast.warning("Large file — consider sharing via link instead of email");
  }
}
