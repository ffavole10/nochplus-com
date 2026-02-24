import { ServiceTicket } from "@/types/serviceTicket";
import { SWI_CATALOG } from "@/data/swiCatalog";
import { format } from "date-fns";

export interface AssessmentReportData {
  assessmentId: string;
  ticketId: string;
  generatedAt: string;

  riskLevel: "Critical" | "High" | "Medium" | "Low";
  statusBadge: string;
  confidence: number;
  summary: string;

  charger: {
    brand: string;
    model: string;
    serialNumber: string;
    type: string;
    installationDate: string;
    ageYears: number;
    warrantyStatus: "active" | "expired" | "unknown";
    warrantyExpiration?: string;
    lastServiceDate?: string;
    previousRepairs: number;
    knownIssues: string[];
  };

  customer: {
    name: string;
    company: string;
    location: string;
    address: string;
  };

  detailedAssessment: string;
  recommendation: string;
  expectedOutcome: string[];

  swi: {
    code: string;
    title: string;
    confidence: number;
    estimatedHours: string;
    skillLevel: string;
  };

  parts: Array<{
    partNumber: string;
    description: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    availability: string;
  }>;

  costs: {
    partsTotal: number;
    laborBreakdown: Array<{
      description: string;
      hours: number;
      rate: number;
      amount: number;
    }>;
    laborTotal: number;
    travelMileage: number;
    travelMileageCost: number;
    travelTimeHours: number;
    travelTimeRate: number;
    travelTimeCost: number;
    travelTotal: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  };

  technician: {
    name: string;
    level: string;
    location: string;
    distanceMiles: number;
    travelTimeHours: number;
    roundTripDistance: number;
    roundTripTime: number;
    availability: string;
    alternatives?: Array<{
      name: string;
      distance: number;
      note: string;
    }>;
  };

  safetyWarnings: string[];
  warrantyNotes: string[];
  dataSources: string[];
  generatedBy: string;
  aiModel: string;
}

const STATUS_BADGE_MAP: Record<string, string> = {
  Critical: "Critical — Immediate Action Required",
  High: "Needs Attention",
  Medium: "Moderate Risk",
  Low: "Ready for Service",
};

function extractExpectedOutcome(assessment: string, recommendation: string): string[] {
  const outcomes: string[] = [];
  if (recommendation.toLowerCase().includes("replace")) outcomes.push("Replace faulty component(s)");
  if (recommendation.toLowerCase().includes("repair")) outcomes.push("Restore full charging functionality");
  if (recommendation.toLowerCase().includes("diagnos")) outcomes.push("Complete diagnostic analysis");
  if (outcomes.length === 0) {
    outcomes.push("Restore operational status");
    outcomes.push("Prevent future service interruptions");
  }
  outcomes.push("Extend operational lifespan");
  return outcomes;
}

export function buildReportDataFromTicket(ticket: ServiceTicket): AssessmentReportData {
  const btc = ticket.btcDatabaseData;
  const swiMatch = ticket.swiMatchData;
  const swiDoc = swiMatch?.matched_swi_id
    ? SWI_CATALOG.find((s) => s.id === swiMatch.matched_swi_id)
    : undefined;

  const riskLevel = ticket.assessmentData?.riskLevel || ticket.priority;
  const assessmentText = ticket.assessmentData?.assessmentText || ticket.issue.description;
  const recommendation = ticket.assessmentData?.recommendation || "Schedule on-site diagnostic and repair.";

  // Build labor breakdown
  const estHours = swiMatch?.estimated_service_time
    ? parseFloat(swiMatch.estimated_service_time) || 3
    : 3;
  const hourlyRate = 150;
  const travelRate = 75;

  const laborBreakdown = [
    { description: "On-site diagnostic & repair", hours: estHours, rate: hourlyRate, amount: estHours * hourlyRate },
  ];
  const laborTotal = laborBreakdown.reduce((s, l) => s + l.amount, 0);

  // Travel estimate (default)
  const travelMileage = 94;
  const travelMileageCost = travelMileage * 0.67;
  const travelTimeHours = 2.4;
  const travelTimeCost = travelTimeHours * travelRate;
  const travelTotal = travelMileageCost + travelTimeCost;

  // Parts from SWI
  const parts = (swiMatch?.required_parts || []).map((p, i) => ({
    partNumber: `P-${String(1000 + i).padStart(4, "0")}`,
    description: p,
    quantity: 1,
    unitCost: 85 + i * 35,
    totalCost: 85 + i * 35,
    availability: "In Stock",
  }));
  const partsTotal = parts.reduce((s, p) => s + p.totalCost, 0);

  const subtotal = partsTotal + laborTotal + travelTotal;
  const taxRate = 0.08;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  return {
    assessmentId: `AH-${format(new Date(), "yyyy")}-${ticket.ticketId.replace(/[^A-Za-z0-9]/g, "")}`,
    ticketId: ticket.ticketId,
    generatedAt: ticket.assessmentData?.timestamp || ticket.updatedAt,
    riskLevel,
    statusBadge: STATUS_BADGE_MAP[riskLevel] || "Needs Review",
    confidence: swiMatch?.confidence || 0,
    summary: assessmentText.substring(0, 150) + (assessmentText.length > 150 ? "..." : ""),
    charger: {
      brand: ticket.charger.brand || btc?.brand || "Unknown",
      model: btc?.model || "Unknown",
      serialNumber: ticket.charger.serialNumber || btc?.serialNumber || "—",
      type: ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2",
      installationDate: btc?.installationDate || "Unknown",
      ageYears: btc?.ageInYears || 0,
      warrantyStatus: btc?.warrantyStatus || "unknown",
      warrantyExpiration: btc?.warrantyExpirationDate,
      lastServiceDate: btc?.lastServiceDate,
      previousRepairs: btc?.serviceCount || 0,
      knownIssues: btc?.knownIssues || [],
    },
    customer: {
      name: ticket.customer.name,
      company: ticket.customer.company || ticket.customer.name,
      location: ticket.charger.location || ticket.customer.address,
      address: ticket.customer.address,
    },
    detailedAssessment: assessmentText,
    recommendation,
    expectedOutcome: extractExpectedOutcome(assessmentText, recommendation),
    swi: {
      code: swiDoc?.id || swiMatch?.matched_swi_id || "—",
      title: swiDoc?.title || "No SWI matched",
      confidence: swiMatch?.confidence || 0,
      estimatedHours: swiMatch?.estimated_service_time || swiDoc?.estimatedTime || "2-4 hrs",
      skillLevel: "Level 1 — Field Tech",
    },
    parts,
    costs: {
      partsTotal,
      laborBreakdown,
      laborTotal,
      travelMileage,
      travelMileageCost,
      travelTimeHours,
      travelTimeRate: travelRate,
      travelTimeCost,
      travelTotal,
      subtotal,
      taxRate,
      taxAmount,
      total,
    },
    technician: {
      name: ticket.assignedTo || "Tyler Canzoneri",
      level: "Level 1 — Field Tech",
      location: "San Diego, CA",
      distanceMiles: 47,
      travelTimeHours: 1.2,
      roundTripDistance: travelMileage,
      roundTripTime: travelTimeHours,
      availability: "Available (0/3 jobs)",
      alternatives: [
        { name: "Soren Sheffer", distance: 52, note: "Level 2 — Senior Field Tech" },
        { name: "Liam Stever", distance: 48, note: "Currently on 1/3 jobs" },
      ],
    },
    safetyWarnings: swiMatch?.warnings || [],
    warrantyNotes: ticket.assessmentData?.warrantyNotes || [],
    dataSources: ticket.assessmentData?.dataSources || [
      "Customer submission",
      "AutoHeal™ AI analysis",
    ],
    generatedBy: "AutoHeal™ AI Engine v2.1",
    aiModel: "Claude Sonnet 4",
  };
}
