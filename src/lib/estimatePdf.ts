import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EstimateRecord } from "@/hooks/useEstimates";
import { format } from "date-fns";

/* ── Company Info (centralised config) ───────── */
const COMPANY = {
  name: "Noch Power, Inc",
  address: "30211 Avenida de las Banderas Ste 200",
  cityStateZip: "Rancho Santa Margarita, CA 92688-2159",
  email: "info@nochpower.com",
  phone: "(949) 825-4511",
  website: "www.nochpower.com",
};

/* brand colour in RGB */
const BRAND: [number, number, number] = [37, 179, 165]; // #25b3a5
const DARK: [number, number, number] = [30, 41, 59]; // slate-800
const GRAY: [number, number, number] = [100, 116, 139]; // slate-500
const LIGHT_BG: [number, number, number] = [248, 250, 252]; // slate-50

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safeDate(d: string | null | undefined, fallback = "—") {
  if (!d) return fallback;
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return fallback; }
}

/* ── Logo loader ─────────────────────────────── */
let cachedLogo: string | null = null;

async function loadLogo(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const res = await fetch("/images/noch-power-logo.png");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogo = reader.result as string;
        resolve(cachedLogo);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ── Main Generator ──────────────────────────── */
export async function generateEstimatePDF(estimate: EstimateRecord, _partnerName?: string): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pw = doc.internal.pageSize.getWidth(); // ~215.9mm
  const ph = doc.internal.pageSize.getHeight(); // ~279.4mm
  const mx = 14; // left margin
  const mr = pw - 14; // right edge
  let y = 14;

  const logo = await loadLogo();

  /* ── HEADER ROW ────────────────────────────── */
  // Document title
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND);
  doc.text("ESTIMATE", mx, y + 9);

  // Logo right-aligned
  if (logo) {
    try { doc.addImage(logo, "PNG", mr - 45, y - 2, 45, 14); } catch { /* skip */ }
  }
  y += 18;

  // Company info
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(COMPANY.name, mx, y);
  doc.text(COMPANY.address, mx, y + 4);
  doc.text(COMPANY.cityStateZip, mx, y + 8);
  doc.text(`${COMPANY.email}  |  ${COMPANY.phone}  |  ${COMPANY.website}`, mx, y + 12);
  y += 20;

  // Divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.4);
  doc.line(mx, y, mr, y);
  y += 6;

  /* ── BILL TO + ESTIMATE DETAILS ────────────── */
  const colMid = pw / 2 + 10;

  // Bill To
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("BILL TO", mx, y);
  y += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(estimate.customer_name || estimate.site_name || "—", mx, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  if (estimate.customer_address) {
    const addrLines = doc.splitTextToSize(estimate.customer_address, 85);
    doc.text(addrLines, mx, y);
    y += addrLines.length * 4;
  }
  if (estimate.customer_email) {
    doc.text(estimate.customer_email, mx, y);
    y += 4;
  }

  // Estimate details box (right column)
  const detailsStartY = y - 18;
  const detailRows: [string, string][] = [
    ["Estimate No.", estimate.estimate_number || estimate.id.slice(0, 8).toUpperCase()],
    ["Terms", estimate.terms || "Net 30"],
    ["Estimate Date", safeDate(estimate.created_at)],
    ["Valid Until", safeDate(estimate.valid_until)],
  ];
  if (estimate.po_number) detailRows.push(["PO Number", estimate.po_number]);
  if (estimate.ticket_id) detailRows.push(["Ref. Ticket", `#${estimate.ticket_id}`]);
  if (estimate.service_date_range) detailRows.push(["Service Dates", estimate.service_date_range]);

  let dy = detailsStartY;
  // Background box
  const boxH = detailRows.length * 5.5 + 6;
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(colMid - 4, dy - 4, mr - colMid + 8, boxH, 2, 2, "F");

  doc.setFontSize(8.5);
  detailRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(label, colMid, dy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(value, mr, dy, { align: "right" });
    dy += 5.5;
  });

  y = Math.max(y, dy) + 8;

  /* ── LINE ITEMS TABLE ──────────────────────── */
  const lineItems = (estimate.line_items || []) as any[];

  autoTable(doc, {
    startY: y,
    head: [["#", "Product or Service", "Description", "Qty", "Rate", "Amount"]],
    body: lineItems.map((item: any, idx: number) => [
      String(idx + 1),
      item.product_or_service || item.description || "",
      item.sku ? `SKU: ${item.sku}\n${item.detail_description || ""}` : (item.detail_description || ""),
      String(item.qty ?? 0),
      fmt(Number(item.rate ?? 0)),
      fmt(Number(item.amount ?? 0)),
    ]),
    headStyles: {
      fillColor: BRAND,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: DARK,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 50 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 16, halign: "right" },
      4: { cellWidth: 24, halign: "right" },
      5: { cellWidth: 28, halign: "right", fontStyle: "bold" },
    },
    styles: { overflow: "linebreak", lineWidth: 0.15, lineColor: [230, 230, 230] },
    margin: { left: mx, right: 14 },
    showHead: "everyPage",
    didDrawPage: (data) => {
      // Footer on every page
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(`${COMPANY.name}  •  ${COMPANY.website}`, mx, ph - 8);
      doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, mr, ph - 8, { align: "right" });
    },
  });

  const tableEndY = (doc as any).lastAutoTable?.finalY || y + 30;
  y = tableEndY + 6;

  /* ── TOTALS BOX ────────────────────────────── */
  // Check if we need a new page
  if (y + 40 > ph - 20) {
    doc.addPage();
    y = 20;
  }

  const totalsX = pw - 80;
  const totalsW = 66;

  const totalsRows: [string, string, boolean][] = [
    ["Subtotal", fmt(Number(estimate.subtotal)), false],
  ];
  if (Number(estimate.tax) > 0) {
    totalsRows.push([`Tax (${Math.round(Number(estimate.tax_rate) * 100)}%)`, fmt(Number(estimate.tax)), false]);
  }
  totalsRows.push(["Total", fmt(Number(estimate.total)), true]);

  // Box background
  const totBoxH = totalsRows.length * 7 + 6;
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(totalsX - 4, y - 2, totalsW + 8, totBoxH, 2, 2, "F");

  totalsRows.forEach(([label, value, isBold]) => {
    doc.setFontSize(isBold ? 11 : 9);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(isBold ? BRAND[0] : GRAY[0], isBold ? BRAND[1] : GRAY[1], isBold ? BRAND[2] : GRAY[2]);
    doc.text(label, totalsX, y + 3);
    doc.setTextColor(isBold ? BRAND[0] : DARK[0], isBold ? BRAND[1] : DARK[1], isBold ? BRAND[2] : DARK[2]);
    doc.text(value, totalsX + totalsW, y + 3, { align: "right" });
    if (isBold && totalsRows.length > 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(totalsX, y - 1, totalsX + totalsW, y - 1);
    }
    y += 7;
  });

  y += 6;

  /* ── NOTES ─────────────────────────────────── */
  if (estimate.notes) {
    if (y + 20 > ph - 20) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Note to customer", mx, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    const noteLines = doc.splitTextToSize(estimate.notes, pw - 28);
    doc.text(noteLines, mx, y);
    y += noteLines.length * 4 + 4;
  }

  /* ── FOOTER ────────────────────────────────── */
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(`${COMPANY.name}  •  ${COMPANY.website}`, mx, ph - 8);
  doc.text(`Generated ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}`, mr, ph - 8, { align: "right" });

  return doc;
}

/* ── Download helpers ────────────────────────── */
export async function downloadEstimatePDF(estimate: EstimateRecord, partnerName?: string) {
  const doc = await generateEstimatePDF(estimate, partnerName);
  const estNum = (estimate.estimate_number || estimate.id.slice(0, 8)).replace(/[^a-zA-Z0-9-_]/g, "_");
  const custName = (estimate.customer_name || estimate.site_name || "Customer").replace(/[^a-zA-Z0-9-_]/g, "_");
  const filename = `Noch_Estimate_${estNum}_${custName}.pdf`;
  doc.save(filename);
}

export async function downloadMultipleEstimatePDFs(estimates: EstimateRecord[], partnerName?: string) {
  for (const est of estimates) {
    await downloadEstimatePDF(est, partnerName);
  }
}
