import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// ── Types (preserved from previous implementation) ──
export type ReportSnapshot = {
  totalChargers: number;
  serviced: number;
  healthScore: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  ticketStats?: {
    open: number;
    solved: number;
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    slaBreached: number;
    over90Days: number;
  };
  topRiskSites?: { site_name: string; city: string; state: string; count: number }[];
  topPriorityChargers?: {
    station_id: string;
    site_name: string;
    type: string;
    priority: string;
    location: string;
  }[];
  geoDistribution?: { state: string; count: number }[];
  customerName: string;
  campaignName: string;
};

export type ReportProps = {
  reportName: string;
  introNote: string | null;
  sectionsIncluded: string[];
  snapshot: ReportSnapshot;
  aiSummary: string;
  preparedBy: { name: string; email: string };
  generatedAt: Date;
};

// ── Brand palette ──
const BRAND: [number, number, number] = [37, 179, 165]; // #25b3a5
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const SOFT: [number, number, number] = [241, 245, 249];
const BORDER: [number, number, number] = [226, 232, 240];
const CRITICAL: [number, number, number] = [239, 68, 68];
const HIGH: [number, number, number] = [249, 115, 22];
const MEDIUM: [number, number, number] = [234, 179, 8];
const LOW: [number, number, number] = [34, 197, 94];

const PAGE_W = 210; // A4 mm width
const PAGE_H = 297;
const MARGIN = 18;

// ── Helpers ──
function sanitize(s: string): string {
  if (!s) return "";
  return s
    .replace(/[—–]/g, "-")
    .replace(/[•●·]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[≥]/g, ">=")
    .replace(/[≤]/g, "<=")
    .normalize("NFKD")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function setFill(doc: jsPDF, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function setDraw(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN + 6;
  }
  return y;
}

function sectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(doc, INK);
  doc.text(sanitize(title), MARGIN, y);
  setDraw(doc, BRAND);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 1.5, PAGE_W - MARGIN, y + 1.5);
  return y + 8;
}

function statCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accent: [number, number, number] = BRAND
) {
  setFill(doc, SOFT);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");
  // Accent bar
  setFill(doc, accent);
  doc.rect(x, y, 1.5, h, "F");
  // Value
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setText(doc, INK);
  doc.text(sanitize(value), x + 5, y + h / 2 + 1);
  // Label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setText(doc, MUTED);
  doc.text(sanitize(label.toUpperCase()), x + 5, y + h - 3);
}

function priorityColor(p: string): [number, number, number] {
  const k = (p || "").toLowerCase();
  if (k.includes("critical") || k === "p1") return CRITICAL;
  if (k.includes("high") || k === "p2") return HIGH;
  if (k.includes("medium") || k === "p3") return MEDIUM;
  return LOW;
}

// ── Cover Page ──
function renderCover(doc: jsPDF, props: ReportProps) {
  // Brand bar at top
  setFill(doc, BRAND);
  doc.rect(0, 0, PAGE_W, 6, "F");

  // Brand mark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, BRAND);
  doc.text("NOCH+", MARGIN, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, MUTED);
  doc.text("CAMPAIGN REPORT", MARGIN, 27);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  setText(doc, INK);
  const titleLines = doc.splitTextToSize(sanitize(props.reportName), PAGE_W - MARGIN * 2);
  doc.text(titleLines, MARGIN, 70);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  setText(doc, MUTED);
  doc.text(sanitize(props.snapshot.customerName), MARGIN, 70 + titleLines.length * 10 + 4);

  // Divider
  setDraw(doc, BRAND);
  doc.setLineWidth(1.2);
  doc.line(MARGIN, 140, MARGIN + 30, 140);

  // Meta block
  let y = 152;
  const metaRows: [string, string][] = [
    ["CAMPAIGN", props.snapshot.campaignName],
    ["PREPARED FOR", props.snapshot.customerName],
    ["PREPARED BY", `${props.preparedBy.name}${props.preparedBy.email ? `  ·  ${props.preparedBy.email}` : ""}`],
    ["DATE", format(props.generatedAt, "MMMM d, yyyy")],
  ];
  metaRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(doc, MUTED);
    doc.text(label, MARGIN, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(doc, INK);
    const lines = doc.splitTextToSize(sanitize(value), PAGE_W - MARGIN * 2);
    doc.text(lines, MARGIN, y + 5);
    y += 5 + lines.length * 5 + 6;
  });

  if (props.introNote) {
    y += 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    setText(doc, MUTED);
    const note = doc.splitTextToSize(sanitize(props.introNote), PAGE_W - MARGIN * 2);
    doc.text(note, MARGIN, y);
  }

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, MUTED);
  doc.text("Confidential  ·  Generated by the Noch+ platform", MARGIN, PAGE_H - 12);
  doc.text("nochplus.com", PAGE_W - MARGIN, PAGE_H - 12, { align: "right" });
}

// ── Executive Summary ──
function renderExecutiveSummary(doc: jsPDF, props: ReportProps) {
  doc.addPage();
  let y = MARGIN + 6;
  y = sectionHeader(doc, "Executive Summary", y);

  // Headline stats
  const s = props.snapshot;
  const cardW = (PAGE_W - MARGIN * 2 - 6 * 3) / 4;
  const cardH = 22;
  const stats: { label: string; value: string; color: [number, number, number] }[] = [
    { label: "Total Chargers", value: s.totalChargers.toLocaleString(), color: BRAND },
    { label: "Health Score", value: `${s.healthScore}`, color: BRAND },
    { label: "Critical", value: `${s.critical}`, color: CRITICAL },
    { label: "Serviced", value: `${s.serviced}`, color: LOW },
  ];
  stats.forEach((st, i) => {
    statCard(doc, MARGIN + i * (cardW + 6), y, cardW, cardH, st.label, st.value, st.color);
  });
  y += cardH + 10;

  // AI summary text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText(doc, INK);
  const summary = sanitize(props.aiSummary || "");
  const paragraphs = summary.split(/\n+/).filter(Boolean);
  paragraphs.forEach((p) => {
    const lines = doc.splitTextToSize(p, PAGE_W - MARGIN * 2);
    y = ensureSpace(doc, y, lines.length * 5 + 4);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 4;
  });
}

// ── Dashboard Section ──
function renderDashboard(doc: jsPDF, props: ReportProps) {
  doc.addPage();
  let y = MARGIN + 6;
  y = sectionHeader(doc, "Network Health Dashboard", y);
  const s = props.snapshot;

  // Health score callout
  setFill(doc, SOFT);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 30, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  setText(doc, BRAND);
  doc.text(`${s.healthScore}`, MARGIN + 8, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, MUTED);
  doc.text("OVERALL NETWORK HEALTH SCORE", MARGIN + 8, y + 27);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, INK);
  const rightX = MARGIN + 70;
  doc.text(`Total chargers: ${s.totalChargers.toLocaleString()}`, rightX, y + 10);
  doc.text(`Serviced this campaign: ${s.serviced.toLocaleString()}`, rightX, y + 16);
  doc.text(`Open priority items: ${s.critical + s.high}`, rightX, y + 22);
  y += 38;

  // Status breakdown table
  y = sectionHeader(doc, "Network Status Breakdown", y);
  autoTable(doc, {
    startY: y,
    head: [["Status", "Count", "% of Fleet"]],
    body: [
      ["Critical", `${s.critical}`, `${pct(s.critical, s.totalChargers)}%`],
      ["High", `${s.high}`, `${pct(s.high, s.totalChargers)}%`],
      ["Medium", `${s.medium}`, `${pct(s.medium, s.totalChargers)}%`],
      ["Optimal", `${s.low}`, `${pct(s.low, s.totalChargers)}%`],
    ],
    theme: "grid",
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: INK },
    styles: { cellPadding: 3, lineColor: BORDER, lineWidth: 0.2 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const label = String(data.cell.raw);
        const c = priorityColor(label);
        data.cell.styles.textColor = c;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Top high-risk areas
  if (s.topRiskSites && s.topRiskSites.length > 0) {
    y = ensureSpace(doc, y, 30);
    y = sectionHeader(doc, "Top High-Risk Sites", y);
    autoTable(doc, {
      startY: y,
      head: [["Site", "City", "State", "Open Issues"]],
      body: s.topRiskSites.slice(0, 10).map((r) => [
        sanitize(r.site_name || "-"),
        sanitize(r.city || "-"),
        sanitize(r.state || "-"),
        `${r.count}`,
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: INK },
      alternateRowStyles: { fillColor: SOFT },
      styles: { cellPadding: 3, lineColor: BORDER, lineWidth: 0.1 },
    });
  }
}

// ── Dataset Section ──
function renderDataset(doc: jsPDF, props: ReportProps) {
  doc.addPage();
  let y = MARGIN + 6;
  y = sectionHeader(doc, "Dataset Overview", y);
  const s = props.snapshot;

  // Totals
  const cardW = (PAGE_W - MARGIN * 2 - 6) / 2;
  statCard(doc, MARGIN, y, cardW, 22, "Total Chargers", s.totalChargers.toLocaleString(), BRAND);
  statCard(doc, MARGIN + cardW + 6, y, cardW, 22, "Serviced", s.serviced.toLocaleString(), LOW);
  y += 30;

  // Priority breakdown
  y = sectionHeader(doc, "Priority Breakdown", y);
  autoTable(doc, {
    startY: y,
    head: [["Priority", "Count"]],
    body: [
      ["Critical (P1)", `${s.critical}`],
      ["High (P2)", `${s.high}`],
      ["Medium (P3)", `${s.medium}`],
      ["Low (P4)", `${s.low}`],
    ],
    theme: "grid",
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: INK },
    styles: { cellPadding: 3, lineColor: BORDER, lineWidth: 0.2 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const c = priorityColor(String(data.cell.raw));
        data.cell.styles.textColor = c;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Top priority chargers
  if (s.topPriorityChargers && s.topPriorityChargers.length > 0) {
    y = ensureSpace(doc, y, 30);
    y = sectionHeader(doc, "Top Priority Chargers", y);
    autoTable(doc, {
      startY: y,
      head: [["Station ID", "Site", "Type", "Priority", "Location"]],
      body: s.topPriorityChargers.slice(0, 15).map((c) => [
        sanitize(c.station_id || "-"),
        sanitize(c.site_name || "-"),
        sanitize(c.type || "-"),
        sanitize(c.priority || "-"),
        sanitize(c.location || "-"),
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: INK },
      alternateRowStyles: { fillColor: SOFT },
      styles: { cellPadding: 2.5, lineColor: BORDER, lineWidth: 0.1 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const c = priorityColor(String(data.cell.raw));
          data.cell.styles.textColor = c;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
  }
}

// ── Flagged Section ──
function renderFlagged(doc: jsPDF, props: ReportProps) {
  doc.addPage();
  let y = MARGIN + 6;
  y = sectionHeader(doc, "Flagged Items & Tickets", y);
  const t = props.snapshot.ticketStats;

  if (!t) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    setText(doc, MUTED);
    doc.text("No ticket data available for this campaign.", MARGIN, y);
    return;
  }

  // Top stat cards
  const cardW = (PAGE_W - MARGIN * 2 - 6 * 2) / 3;
  statCard(doc, MARGIN, y, cardW, 22, "Open Tickets", `${t.open}`, HIGH);
  statCard(doc, MARGIN + cardW + 6, y, cardW, 22, "SLA Breached", `${t.slaBreached}`, CRITICAL);
  statCard(doc, MARGIN + (cardW + 6) * 2, y, cardW, 22, "Solved", `${t.solved}`, LOW);
  y += 30;

  // Priority breakdown
  y = sectionHeader(doc, "Open Tickets by Priority", y);
  autoTable(doc, {
    startY: y,
    head: [["Priority", "Count"]],
    body: [
      ["P1 - Critical", `${t.p1}`],
      ["P2 - High", `${t.p2}`],
      ["P3 - Medium", `${t.p3}`],
      ["P4 - Low", `${t.p4}`],
    ],
    theme: "grid",
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: INK },
    styles: { cellPadding: 3, lineColor: BORDER, lineWidth: 0.2 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const c = priorityColor(String(data.cell.raw));
        data.cell.styles.textColor = c;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Aging
  y = ensureSpace(doc, y, 30);
  y = sectionHeader(doc, "Aging Overview", y);
  autoTable(doc, {
    startY: y,
    head: [["Bucket", "Count"]],
    body: [
      ["Open tickets > 90 days", `${t.over90Days}`],
      ["SLA-breached tickets", `${t.slaBreached}`],
    ],
    theme: "grid",
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: INK },
    styles: { cellPadding: 3, lineColor: BORDER, lineWidth: 0.2 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Geo distribution
  if (props.snapshot.geoDistribution && props.snapshot.geoDistribution.length > 0) {
    y = ensureSpace(doc, y, 30);
    y = sectionHeader(doc, "Geographic Distribution", y);
    autoTable(doc, {
      startY: y,
      head: [["State", "Open Issues"]],
      body: props.snapshot.geoDistribution.slice(0, 12).map((g) => [
        sanitize(g.state || "-"),
        `${g.count}`,
      ]),
      theme: "striped",
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: INK },
      alternateRowStyles: { fillColor: SOFT },
      styles: { cellPadding: 3, lineColor: BORDER, lineWidth: 0.1 },
    });
  }
}

// ── Closing Page ──
function renderClosing(doc: jsPDF, props: ReportProps) {
  doc.addPage();
  let y = MARGIN + 6;
  y = sectionHeader(doc, "How Noch+ Helps", y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText(doc, INK);
  const blurb = sanitize(
    `Noch+ combines AI-driven prioritization, certified field technicians, and rapid-response dispatch to keep your charging network running. We continuously monitor charger health, predict failures before they cause downtime, and deploy resources where they're needed most. Our platform unifies your fleet, customers, and service history in one place so your team can act with full context.`
  );
  const lines = doc.splitTextToSize(blurb, PAGE_W - MARGIN * 2);
  doc.text(lines, MARGIN, y);
  y += lines.length * 5 + 8;

  // Highlights
  const highlights = [
    "AI-prioritized service queue across all campaigns",
    "Certified Level 1-4 technicians nationwide",
    "Real-time health scoring and failure prediction",
    "Unified dashboard for fleet, customers, and tickets",
  ];
  highlights.forEach((h) => {
    setFill(doc, BRAND);
    doc.circle(MARGIN + 1.5, y - 1.5, 1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setText(doc, INK);
    doc.text(sanitize(h), MARGIN + 6, y);
    y += 6;
  });
  y += 8;

  // Call to action box
  setFill(doc, BRAND);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 36, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setText(doc, [255, 255, 255]);
  doc.text("Ready to take the next step?", MARGIN + 8, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    "Reach out to your Noch+ account team to scope the next campaign or",
    MARGIN + 8,
    y + 20
  );
  doc.text("expand coverage to additional regions.", MARGIN + 8, y + 26);
  y += 44;

  // Contact
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, MUTED);
  doc.text("CONTACT", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.text("Joe Rose", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("jrose@nochpower.com", MARGIN, y);
  y += 5;
  doc.text("nochplus.com", MARGIN, y);
}

function pct(n: number, total: number): string {
  if (!total) return "0";
  return ((n / total) * 100).toFixed(1);
}

// ── Footer on every page ──
function renderFooters(doc: jsPDF, props: ReportProps) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(doc, MUTED);
    if (i > 1) {
      doc.text(
        `${sanitize(props.snapshot.customerName)}  ·  ${sanitize(props.snapshot.campaignName)}`,
        MARGIN,
        PAGE_H - 8
      );
      doc.text(`Page ${i} of ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
    }
  }
}

// ── Public entry point ──
export async function renderCampaignReportPdf(props: ReportProps): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  renderCover(doc, props);
  renderExecutiveSummary(doc, props);

  if (props.sectionsIncluded.includes("dashboard")) renderDashboard(doc, props);
  if (props.sectionsIncluded.includes("dataset")) renderDataset(doc, props);
  if (props.sectionsIncluded.includes("flagged")) renderFlagged(doc, props);

  renderClosing(doc, props);
  renderFooters(doc, props);

  return doc.output("blob");
}
