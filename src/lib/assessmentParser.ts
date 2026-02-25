import * as XLSX from "xlsx";
import { AssessmentCharger, ChargerType, PriorityLevel, Phase } from "@/types/assessment";

function parseDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
  }
  return null;
}

function normalizeType(value: string): ChargerType {
  const v = value?.toUpperCase().trim() || "";
  if (v.includes("DCFC") || v.includes("DC FAST") || v.includes("HPCD") || v.includes("HIGH POWER") || v.includes("DC") || v.includes("L3") || v.includes("LEVEL 3")) return "DC | Level 3";
  return "AC | Level 2";
}

export function calculatePriorityScore(charger: {
  assetRecordType: ChargerType;
  inServiceDate: string | null;
  partsWarrantyEndDate: string | null;
  serviceContractEndDate: string | null;
  status: string;
}): number {
  let score = 0;
  const now = new Date();

  // Charger Type
  if (charger.assetRecordType === "DC | Level 3") score += 50;
  else score += 10;

  // Age
  if (charger.inServiceDate) {
    const inService = new Date(charger.inServiceDate);
    const years = (now.getTime() - inService.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    score += Math.floor(years) * 20;
  }

  // Warranty
  if (charger.partsWarrantyEndDate) {
    const warrantyEnd = new Date(charger.partsWarrantyEndDate);
    if (warrantyEnd < now) score += 30;
  }

  // Service Contract
  if (charger.serviceContractEndDate) {
    const contractEnd = new Date(charger.serviceContractEndDate);
    if (contractEnd < now) score += 20;
  }

  // Status
  const statusLower = charger.status?.toLowerCase() || "";
  if (!statusLower.includes("commission") || statusLower.includes("not")) {
    score += 15;
  }

  return score;
}

export function getPriorityLevel(score: number): PriorityLevel {
  if (score >= 100) return "Critical";
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function getPriorityColor(level: PriorityLevel): string {
  switch (level) {
    case "Critical": return "hsl(0 84% 60%)";
    case "High": return "hsl(25 95% 53%)";
    case "Medium": return "hsl(48 96% 53%)";
    case "Low": return "hsl(142 71% 45%)";
  }
}

// Try to extract city, state, zip from a full address string
// e.g. "5868 Approach Rd, Jacksonville, FL 32221"
function parseAddressParts(address: string): { city: string; state: string; zip: string } {
  const result = { city: "", state: "", zip: "" };
  if (!address) return result;
  const parts = address.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    // Last part usually contains state and zip, e.g. "FL 32221"
    const lastPart = parts[parts.length - 1].trim();
    const stateZipMatch = lastPart.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/);
    if (stateZipMatch) {
      result.state = stateZipMatch[1];
      result.zip = stateZipMatch[2];
      result.city = parts[parts.length - 2]?.trim() || "";
    } else if (/^[A-Z]{2}$/.test(lastPart)) {
      result.state = lastPart;
      result.city = parts[parts.length - 2]?.trim() || "";
    } else {
      // Maybe "City, State ZIP" as last two parts
      result.city = parts.length >= 3 ? parts[parts.length - 2]?.trim() : "";
    }
  }
  return result;
}

// Column name mapping (flexible matching)
const COLUMN_MAP: Record<string, string> = {
  "asset name": "assetName",
  "asset record type": "assetRecordType",
  "address": "address",
  "address line 1": "address",
  "full address": "address",
  "city": "city",
  "state": "state",
  "state/province": "state",
  "zip": "zip",
  "zip/postal code": "zip",
  "postal code": "zip",
  "status": "status",
  "online status": "status",
  "in-service date": "inServiceDate",
  "in service date": "inServiceDate",
  "parts warranty end date": "partsWarrantyEndDate",
  "labor warranty": "partsWarrantyEndDate",
  "service contract end date": "serviceContractEndDate",
  "account name": "accountName",
  "organization name": "accountName",
  "organization": "accountName",
  "evse id": "evseId",
  "charge box identity": "evseId",
  "cbid": "evseId",
  "latitude": "latitude",
  "longitude": "longitude",
  // Ticket mappings
  "ticket id": "ticketId",
  "pst ticket created date": "ticketCreatedDate",
  "ticket created date": "ticketCreatedDate",
  "ticket solved date": "ticketSolvedDate",
  "ticket group": "ticketGroup",
  "ticket subject": "ticketSubject",
  "ticket reporting source": "ticketReportingSource",
};

// Known internal fields (not stored in extraFields)
const KNOWN_FIELDS = new Set(Object.values(COLUMN_MAP));

export function parseAssessmentExcel(file: File): Promise<AssessmentCharger[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const chargers: AssessmentCharger[] = jsonData.map((row: any, idx: number) => {
          // Flexible column matching
          const mapped: Record<string, any> = {};
          const extraFields: Record<string, string | number | boolean | null> = {};

          for (const [key, value] of Object.entries(row)) {
            const normalizedKey = key.toLowerCase().trim();
            const mappedKey = COLUMN_MAP[normalizedKey];
            if (mappedKey) {
              mapped[mappedKey] = value;
            } else {
              // Store unmapped columns in extraFields with original column name
              extraFields[key.trim()] = value === "" ? null : (value as string | number | boolean);
            }
          }

          const assetRecordType = normalizeType(String(mapped.assetRecordType || "AC | Level 2"));
          const inServiceDate = parseDate(mapped.inServiceDate);
          const partsWarrantyEndDate = parseDate(mapped.partsWarrantyEndDate);
          const serviceContractEndDate = parseDate(mapped.serviceContractEndDate);
          const status = String(mapped.status || "Unknown");

          const ticketCreatedDate = parseDate(mapped.ticketCreatedDate);
          const ticketSolvedDate = parseDate(mapped.ticketSolvedDate);
          const hasOpenTicket = !!ticketCreatedDate && !ticketSolvedDate;

          const priorityScore = calculatePriorityScore({
            assetRecordType,
            inServiceDate,
            partsWarrantyEndDate,
            serviceContractEndDate,
            status,
          });

          // Parse lat/lng if provided
          const lat = mapped.latitude ? parseFloat(String(mapped.latitude)) : null;
          const lng = mapped.longitude ? parseFloat(String(mapped.longitude)) : null;

          const rawAddress = String(mapped.address || "");
          const rawCity = String(mapped.city || "");
          const rawState = String(mapped.state || "");
          const rawZip = String(mapped.zip || "");

          // If city/state are missing, try to parse from address
          let city = rawCity;
          let state = rawState;
          let zip = rawZip;
          if (!city || !state) {
            const parsed = parseAddressParts(rawAddress);
            if (!city) city = parsed.city;
            if (!state) state = parsed.state;
            if (!zip) zip = parsed.zip;
          }

          return {
            id: `charger-${idx + 1}`,
            assetName: String(mapped.assetName || mapped.evseId || `Charger-${idx + 1}`),
            assetRecordType,
            address: rawAddress,
            city,
            state,
            zip,
            status,
            inServiceDate,
            partsWarrantyEndDate,
            serviceContractEndDate,
            accountName: String(mapped.accountName || ""),
            evseId: String(mapped.evseId || ""),
            priorityScore,
            priorityLevel: getPriorityLevel(priorityScore),
            phase: "Needs Assessment" as Phase,
            assignedTo: "",
            scheduledDate: null,
            notes: "",
            lastUpdated: new Date().toISOString(),
            latitude: (lat && !isNaN(lat)) ? lat : null,
            longitude: (lng && !isNaN(lng)) ? lng : null,
            ticketId: mapped.ticketId ? String(mapped.ticketId) : null,
            ticketCreatedDate,
            ticketSolvedDate,
            ticketGroup: mapped.ticketGroup ? String(mapped.ticketGroup) : null,
            ticketSubject: mapped.ticketSubject ? String(mapped.ticketSubject) : null,
            ticketReportingSource: mapped.ticketReportingSource ? String(mapped.ticketReportingSource) : null,
            hasOpenTicket,
            extraFields,
          };
        });

        // Default sort: DC Level 3 first, then by oldest in-service date
        const typeOrder: Record<ChargerType, number> = { "DC | Level 3": 0, "AC | Level 2": 1 };
        chargers.sort((a, b) => {
          const typeDiff = typeOrder[a.assetRecordType] - typeOrder[b.assetRecordType];
          if (typeDiff !== 0) return typeDiff;
          const dateA = a.inServiceDate ? new Date(a.inServiceDate).getTime() : Infinity;
          const dateB = b.inServiceDate ? new Date(b.inServiceDate).getTime() : Infinity;
          return dateA - dateB;
        });

        resolve(chargers);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

export function getAssessmentStats(chargers: AssessmentCharger[]) {
  const completed = chargers.filter(c => c.phase === "Completed").length;
  return {
    total: chargers.length,
    critical: chargers.filter(c => c.priorityLevel === "Critical").length,
    high: chargers.filter(c => c.priorityLevel === "High").length,
    medium: chargers.filter(c => c.priorityLevel === "Medium").length,
    low: chargers.filter(c => c.priorityLevel === "Low").length,
    inProgress: chargers.filter(c => c.phase === "In Progress").length,
    completed,
    completionPercent: chargers.length > 0 ? Math.round((completed / chargers.length) * 100) : 0,
    acL2Count: chargers.filter(c => c.assetRecordType === "AC | Level 2").length,
    dcL3Count: chargers.filter(c => c.assetRecordType === "DC | Level 3").length,
  };
}

export function getTicketStats(chargers: AssessmentCharger[]) {
  const withTickets = chargers.filter(c => c.ticketId || c.ticketCreatedDate);
  return {
    totalWithTickets: withTickets.length,
    openTickets: chargers.filter(c => c.hasOpenTicket).length,
    solvedTickets: withTickets.filter(c => c.ticketSolvedDate).length,
  };
}

/** Map a DB ChargerRecord to AssessmentCharger for the Dataset view */
export function chargerRecordToAssessment(r: {
  id: string;
  station_id: string;
  station_name: string | null;
  model: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  site_name: string | null;
  status: string | null;
  start_date: string | null;
  service_date: string | null;
  max_power: number | null;
  latitude: number | null;
  longitude: number | null;
  serviced_qty: number | null;
  service_required: number | null;
  summary: string | null;
  created_at: string;
  ticket_id?: string | null;
  ticket_created_date?: string | null;
  ticket_solved_date?: string | null;
  ticket_group?: string | null;
  ticket_subject?: string | null;
  ticket_reporting_source?: string | null;
}): AssessmentCharger {
  const assetRecordType = normalizeType(r.model || "");

  // Map DB status to priority using offline-duration logic
  // Critical: offline 1+ year, 2+ years, 3+ years, or no comms history
  // High: offline 3-6 months or 6 months-1 year
  // Medium: offline 1-3 months or 1-29 days or < 1 day
  // Low: online or null
  let priorityLevel: PriorityLevel = "Low";
  const status = (r.status || "").toLowerCase();
  if (status.includes("3+ year") || status.includes("2+ year") || status.includes("1+ year") || status.includes("no comms")) {
    priorityLevel = "Critical";
  } else if (status.includes("6 month") || status.includes("3–6") || status.includes("3-6")) {
    priorityLevel = "High";
  } else if (status.includes("1–3 month") || status.includes("1-3 month") || status.includes("1–29") || status.includes("1-29") || status.includes("< 1 day")) {
    priorityLevel = "Medium";
  } else if (status === "critical") {
    priorityLevel = "Critical";
  } else if (status === "degraded" || status === "high") {
    priorityLevel = "High";
  } else if (status === "medium") {
    priorityLevel = "Medium";
  }

  // Determine phase from serviced_qty
  let phase: Phase = "Needs Assessment";
  if ((r.serviced_qty ?? 0) > 0) phase = "Completed";
  else if (r.service_date) phase = "Scheduled";

  // Extract charger name, account, and address from ticket_subject when DB fields are missing
  // Patterns seen:
  //   "BTC0329 - Connectors Issue - Baxalta Los Angeles"
  //   "BTC2018 - Station Offline ... - Boeing (5868 Approach RD)"
  //   "EV0141 - Station Offline - Pure Power Contractors - (Pure Power Contractors)"
  let derivedName = r.station_name || "";
  let derivedAccount = r.site_name || "";
  let derivedAddress = r.address || "";

  if (r.ticket_subject) {
    const parts = r.ticket_subject.split(" - ").map(p => p.trim());
    // First part is typically the charger ID (e.g., "BTC0329", "EVC1076")
    if (!derivedName && parts.length >= 1) {
      derivedName = parts[0];
    }

    // Look through remaining parts for account and address
    // Account often contains address in parentheses: "Boeing (5868 Approach RD)"
    // Or the last part is a standalone parenthesized location: "(Pure Power Contractors)"
    if (parts.length >= 3) {
      for (let i = 2; i < parts.length; i++) {
        const part = parts[i];
        // Check for "Account (Address)" pattern
        const parenMatch = part.match(/^(.+?)\s*\((.+?)\)\s*$/);
        if (parenMatch) {
          if (!derivedAccount) derivedAccount = parenMatch[1].trim();
          if (!derivedAddress) derivedAddress = parenMatch[2].trim();
        } else if (part.startsWith("(") && part.endsWith(")")) {
          // Standalone parenthesized part — could be location or account
          const inner = part.slice(1, -1).trim();
          if (!derivedAddress && inner.length > 3) derivedAddress = inner;
        } else if (!derivedAccount && i === 2) {
          // Third part without parens is usually the account
          derivedAccount = part;
        }
      }
    }
  }

  // Fall back to station_id if still no name
  if (!derivedName) derivedName = r.station_id;

  // Try to parse city/state from derived address
  let city = r.city || "";
  let state = r.state || "";
  let zip = r.zip || "";
  if (derivedAddress && (!city || !state)) {
    const parsed = parseAddressParts(derivedAddress);
    if (!city) city = parsed.city;
    if (!state) state = parsed.state;
    if (!zip) zip = parsed.zip;
  }

  const charger: AssessmentCharger = {
    id: r.id,
    assetName: derivedName,
    assetRecordType,
    address: derivedAddress,
    city,
    state,
    zip,
    status: r.status || "Unknown",
    inServiceDate: r.start_date,
    partsWarrantyEndDate: null,
    serviceContractEndDate: null,
    accountName: derivedAccount,
    evseId: r.station_id,
    priorityScore: 0,
    priorityLevel,
    phase,
    assignedTo: "",
    scheduledDate: r.service_date,
    notes: r.summary || "",
    lastUpdated: r.created_at,
    latitude: r.latitude ? Number(r.latitude) : null,
    longitude: r.longitude ? Number(r.longitude) : null,
    ticketId: r.ticket_id || null,
    ticketCreatedDate: r.ticket_created_date || null,
    ticketSolvedDate: r.ticket_solved_date || null,
    ticketGroup: r.ticket_group || null,
    ticketSubject: r.ticket_subject || null,
    ticketReportingSource: r.ticket_reporting_source || null,
    hasOpenTicket: !!(r.ticket_created_date && !r.ticket_solved_date),
    extraFields: {},
  };

  charger.priorityScore = calculatePriorityScore(charger);
  return charger;
}
