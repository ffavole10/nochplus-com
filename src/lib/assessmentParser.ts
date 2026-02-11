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
  if (v.includes("DCFC") || v.includes("DC FAST")) return "DCFC";
  if (v.includes("HPCD") || v.includes("HIGH POWER")) return "HPCD";
  return "L2";
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
  if (charger.assetRecordType === "DCFC") score += 50;
  else if (charger.assetRecordType === "HPCD") score += 30;
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

// Column name mapping (flexible matching)
const COLUMN_MAP: Record<string, string> = {
  "asset name": "assetName",
  "asset record type": "assetRecordType",
  "address": "address",
  "address line 1": "address",
  "city": "city",
  "state": "state",
  "zip": "zip",
  "zip/postal code": "zip",
  "status": "status",
  "in-service date": "inServiceDate",
  "in service date": "inServiceDate",
  "parts warranty end date": "partsWarrantyEndDate",
  "service contract end date": "serviceContractEndDate",
  "account name": "accountName",
  "evse id": "evseId",
};

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
          for (const [key, value] of Object.entries(row)) {
            const normalizedKey = key.toLowerCase().trim();
            const mappedKey = COLUMN_MAP[normalizedKey];
            if (mappedKey) mapped[mappedKey] = value;
          }

          const assetRecordType = normalizeType(String(mapped.assetRecordType || "L2"));
          const inServiceDate = parseDate(mapped.inServiceDate);
          const partsWarrantyEndDate = parseDate(mapped.partsWarrantyEndDate);
          const serviceContractEndDate = parseDate(mapped.serviceContractEndDate);
          const status = String(mapped.status || "Unknown");

          const priorityScore = calculatePriorityScore({
            assetRecordType,
            inServiceDate,
            partsWarrantyEndDate,
            serviceContractEndDate,
            status,
          });

          return {
            id: `charger-${idx + 1}`,
            assetName: String(mapped.assetName || `Charger-${idx + 1}`),
            assetRecordType,
            address: String(mapped.address || ""),
            city: String(mapped.city || ""),
            state: String(mapped.state || ""),
            zip: String(mapped.zip || ""),
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
            latitude: null,
            longitude: null,
          };
        });

        // Default sort: DCFC first, then by oldest in-service date
        const typeOrder: Record<ChargerType, number> = { DCFC: 0, HPCD: 1, L2: 2 };
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
    dcfcCount: chargers.filter(c => c.assetRecordType === "DCFC").length,
    l2Count: chargers.filter(c => c.assetRecordType === "L2").length,
    hpcdCount: chargers.filter(c => c.assetRecordType === "HPCD").length,
  };
}
