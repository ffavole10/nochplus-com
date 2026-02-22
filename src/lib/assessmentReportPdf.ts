import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ServiceTicket } from "@/types/serviceTicket";
import { SWI_CATALOG } from "@/data/swiCatalog";
import { format } from "date-fns";

const BRAND_COLOR: [number, number, number] = [37, 179, 165]; // #25b3a5
const DARK_COLOR: [number, number, number] = [30, 41, 59]; // #1e293b
const MUTED_COLOR: [number, number, number] = [100, 116, 139];

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_COLOR);
  doc.text(title, 14, y);
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 196, y + 2);
  return y + 8;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > doc.internal.pageSize.height - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function generateAssessmentReportPDF(ticket: ServiceTicket): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // ── Header ──
  autoTable(doc, {
    body: [
      [
        {
          content: "NOCH Power",
          styles: { halign: "left", fontSize: 20, textColor: "#1e293b", fontStyle: "bold" },
        },
        {
          content: "ASSESSMENT REPORT",
          styles: { halign: "right", fontSize: 16, textColor: "#25b3a5", fontStyle: "bold" },
        },
      ],
    ],
    theme: "plain",
    styles: { cellPadding: { top: 8, bottom: 4, left: 10, right: 10 } },
  });

  // ── Ticket & Date Info ──
  autoTable(doc, {
    body: [
      [
        { content: `Ticket: ${ticket.ticketId}`, styles: { fontSize: 10, fontStyle: "bold" } },
        { content: `Date: ${format(new Date(), "MMMM d, yyyy")}`, styles: { fontSize: 10, halign: "right" } },
      ],
      [
        { content: `Priority: ${ticket.priority}`, styles: { fontSize: 10 } },
        { content: `Status: ${ticket.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`, styles: { fontSize: 10, halign: "right" } },
      ],
    ],
    theme: "plain",
    styles: { cellPadding: { top: 1, bottom: 1, left: 10, right: 10 } },
  });

  let curY = (doc as any).lastAutoTable?.finalY || 50;
  curY += 5;

  // ── Customer Information ──
  curY = addSectionTitle(doc, "Customer Information", curY);
  autoTable(doc, {
    startY: curY,
    body: [
      ["Name", ticket.customer.name, "Company", ticket.customer.company],
      ["Email", ticket.customer.email, "Phone", ticket.customer.phone],
      ["Address", ticket.customer.address, "", ""],
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 10, right: 5 } },
    columnStyles: {
      0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 30 },
      1: { cellWidth: 65 },
      2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 30 },
      3: { cellWidth: 55 },
    },
  });

  curY = (doc as any).lastAutoTable?.finalY + 5;

  // ── Charger Information ──
  curY = checkPageBreak(doc, curY, 40);
  curY = addSectionTitle(doc, "Charger Information", curY);
  const chargerTypeLabel = ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2";
  autoTable(doc, {
    startY: curY,
    body: [
      ["Brand", ticket.charger.brand || "—", "Type", chargerTypeLabel],
      ["Serial Number", ticket.charger.serialNumber, "Location", ticket.charger.location],
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 10, right: 5 } },
    columnStyles: {
      0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 30 },
      1: { cellWidth: 65 },
      2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 30 },
      3: { cellWidth: 55 },
    },
  });

  curY = (doc as any).lastAutoTable?.finalY + 5;

  // ── BTC Database Record ──
  if (ticket.btcDatabaseData) {
    const btc = ticket.btcDatabaseData;
    curY = checkPageBreak(doc, curY, 50);
    curY = addSectionTitle(doc, "BTC Database Record", curY);
    autoTable(doc, {
      startY: curY,
      body: [
        ["Model", `${btc.brand} ${btc.model}`, "Age", `${btc.ageInYears} years`],
        ["Installed", btc.installationDate, "Last Service", btc.lastServiceDate || "—"],
        ["Warranty", `${btc.warrantyStatus}${btc.warrantyExpirationDate ? ` (exp. ${btc.warrantyExpirationDate})` : ""}`, "Service Count", String(btc.serviceCount)],
        ["SLA Tier", btc.slaTier || "—", "Warranty Provider", btc.warrantyProvider || "—"],
      ],
      theme: "plain",
      styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 10, right: 5 } },
      columnStyles: {
        0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 30 },
        1: { cellWidth: 65 },
        2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 30 },
        3: { cellWidth: 55 },
      },
    });
    curY = (doc as any).lastAutoTable?.finalY + 3;

    // Known issues
    if (btc.knownIssues.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Known Issues:", 14, curY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK_COLOR);
      const issues = btc.knownIssues.join("; ");
      const split = doc.splitTextToSize(issues, 170);
      doc.text(split, 50, curY);
      curY += split.length * 5 + 3;
    }

    // Service history
    if (btc.serviceHistory.length > 0) {
      curY = checkPageBreak(doc, curY, 30);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Service History:", 14, curY);
      curY += 3;
      autoTable(doc, {
        startY: curY,
        head: [["Date", "Work Performed", "Cost", "Parts Replaced"]],
        body: btc.serviceHistory.slice(0, 5).map(h => [
          h.date,
          h.workPerformed,
          `$${h.cost.toFixed(2)}`,
          h.partsReplaced.join(", ") || "—",
        ]),
        headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        styles: { cellPadding: { top: 2, bottom: 2, left: 5, right: 5 } },
      });
      curY = (doc as any).lastAutoTable?.finalY + 5;
    }
  }

  // ── Issue Description ──
  curY = checkPageBreak(doc, curY, 30);
  curY = addSectionTitle(doc, "Reported Issue", curY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK_COLOR);
  const issueSplit = doc.splitTextToSize(ticket.issue.description, 180);
  doc.text(issueSplit, 14, curY);
  curY += issueSplit.length * 5 + 5;

  // ── AI Assessment ──
  if (ticket.assessmentData) {
    curY = checkPageBreak(doc, curY, 50);
    curY = addSectionTitle(doc, "AI Assessment", curY);

    // Risk level badge
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const riskColors: Record<string, [number, number, number]> = {
      Critical: [220, 38, 38],
      High: [234, 88, 12],
      Medium: [202, 138, 4],
      Low: [22, 163, 74],
    };
    doc.setTextColor(...(riskColors[ticket.assessmentData.riskLevel] || DARK_COLOR));
    doc.text(`Risk Level: ${ticket.assessmentData.riskLevel}`, 14, curY);
    curY += 6;

    // Assessment text
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK_COLOR);
    const assessSplit = doc.splitTextToSize(ticket.assessmentData.assessmentText, 180);
    doc.text(assessSplit, 14, curY);
    curY += assessSplit.length * 4.5 + 4;

    // Recommendation
    curY = checkPageBreak(doc, curY, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_COLOR);
    doc.text("Recommendation:", 14, curY);
    curY += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK_COLOR);
    const recSplit = doc.splitTextToSize(ticket.assessmentData.recommendation, 180);
    doc.text(recSplit, 14, curY);
    curY += recSplit.length * 4.5 + 4;

    // Warranty notes
    if (ticket.assessmentData.warrantyNotes.length > 0) {
      curY = checkPageBreak(doc, curY, 20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Warranty & Compliance Notes:", 14, curY);
      curY += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK_COLOR);
      ticket.assessmentData.warrantyNotes.forEach(note => {
        curY = checkPageBreak(doc, curY, 8);
        const noteSplit = doc.splitTextToSize(`• ${note}`, 178);
        doc.text(noteSplit, 16, curY);
        curY += noteSplit.length * 4.5 + 2;
      });
      curY += 2;
    }

    // Data sources
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Data sources: ${ticket.assessmentData.dataSources.join(", ")}`, 14, curY);
    curY += 6;
  }

  // ── SWI Match ──
  if (ticket.swiMatchData) {
    curY = checkPageBreak(doc, curY, 40);
    curY = addSectionTitle(doc, "Service Work Instruction (SWI) Match", curY);

    const swiDoc = ticket.swiMatchData.matched_swi_id
      ? SWI_CATALOG.find(s => s.id === ticket.swiMatchData!.matched_swi_id)
      : undefined;

    autoTable(doc, {
      startY: curY,
      body: [
        ["SWI ID", ticket.swiMatchData.matched_swi_id || "No match", "Confidence", `${ticket.swiMatchData.confidence}%`],
        ["Title", swiDoc?.title || "—", "Est. Time", ticket.swiMatchData.estimated_service_time || "—"],
      ],
      theme: "plain",
      styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 10, right: 5 } },
      columnStyles: {
        0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 30 },
        1: { cellWidth: 65 },
        2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 30 },
        3: { cellWidth: 55 },
      },
    });
    curY = (doc as any).lastAutoTable?.finalY + 3;

    // Reasoning
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED_COLOR);
    doc.text("Reasoning:", 14, curY);
    curY += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK_COLOR);
    const reasonSplit = doc.splitTextToSize(ticket.swiMatchData.reasoning, 180);
    doc.text(reasonSplit, 14, curY);
    curY += reasonSplit.length * 4.5 + 4;

    // Key factors
    if (ticket.swiMatchData.key_factors.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Key Factors:", 14, curY);
      curY += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK_COLOR);
      ticket.swiMatchData.key_factors.forEach(f => {
        curY = checkPageBreak(doc, curY, 6);
        doc.text(`• ${f}`, 16, curY);
        curY += 4.5;
      });
      curY += 2;
    }

    // Required parts
    if (ticket.swiMatchData.required_parts.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Required Parts:", 14, curY);
      curY += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK_COLOR);
      doc.text(ticket.swiMatchData.required_parts.join(", "), 14, curY);
      curY += 6;
    }

    // Warnings
    if (ticket.swiMatchData.warnings.length > 0) {
      curY = checkPageBreak(doc, curY, 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("Warnings:", 14, curY);
      curY += 4;
      doc.setFont("helvetica", "normal");
      ticket.swiMatchData.warnings.forEach(w => {
        curY = checkPageBreak(doc, curY, 6);
        doc.text(`⚠ ${w}`, 16, curY);
        curY += 4.5;
      });
    }
  }

  // ── Footer on each page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by NOCH Power Platform — Confidential", 14, pageH - 8);
    doc.text(`${format(new Date(), "MMM d, yyyy h:mm a")}  •  Page ${i} of ${totalPages}`, pageWidth - 14, pageH - 8, { align: "right" });
  }

  return doc;
}

export function downloadAssessmentReport(ticket: ServiceTicket) {
  const doc = generateAssessmentReportPDF(ticket);
  const filename = `${ticket.ticketId.replace(/[^a-zA-Z0-9-_]/g, "_")}-assessment-report.pdf`;
  doc.save(filename);
}

export function getAssessmentReportBlob(ticket: ServiceTicket): Blob {
  const doc = generateAssessmentReportPDF(ticket);
  return doc.output("blob");
}
