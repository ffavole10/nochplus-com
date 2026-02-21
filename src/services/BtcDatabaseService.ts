import { BTC_DATABASE_INDEX, type BtcRawRecord } from "@/data/btcChargerDatabase";

export interface ChargerDatabaseRecord {
  serialNumber: string;
  brand: string;
  model: string;
  chargerType: "AC | Level 2" | "DC | Level 3";

  installationDate: string;
  ageInYears: number;
  warrantyStatus: "active" | "expired" | "unknown";
  warrantyExpirationDate?: string;
  warrantyProvider: string;

  slaStatus?: "active" | "expired" | "none";
  slaTier?: "standard" | "premium" | "enterprise";

  lastServiceDate?: string;
  serviceCount: number;
  daysSinceLastService: number;
  serviceHistory: Array<{
    date: string;
    workPerformed: string;
    cost: number;
    partsReplaced: string[];
  }>;

  knownIssues: string[];
  recallStatus?: string;

  // Extended fields from spreadsheet
  administrator?: string;
  accountName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  evseId?: string;
  warrantyNotes?: string;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

function calcAge(dateStr: string): number {
  const d = parseDate(dateStr);
  if (!d || isNaN(d.getTime())) return 0;
  return Math.round(((Date.now() - d.getTime()) / (365.25 * 86400000)) * 10) / 10;
}

function calcDaysSince(dateStr?: string): number {
  if (!dateStr) return 9999;
  const d = parseDate(dateStr);
  if (!d || isNaN(d.getTime())) return 9999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function deriveWarrantyStatus(pwEnd: string): "active" | "expired" | "unknown" {
  if (!pwEnd) return "unknown";
  const d = parseDate(pwEnd);
  if (!d || isNaN(d.getTime())) return "unknown";
  return d.getTime() > Date.now() ? "active" : "expired";
}

function deriveSlaStatus(scEnd: string): "active" | "expired" | "none" {
  if (!scEnd) return "none";
  const d = parseDate(scEnd);
  if (!d || isNaN(d.getTime())) return "none";
  return d.getTime() > Date.now() ? "active" : "expired";
}

function toRecord(raw: BtcRawRecord): ChargerDatabaseRecord {
  const installStr = raw.inServiceDate || raw.installDate || raw.partsWarrantyStart || "";
  const pwEnd = raw.partsWarrantyEnd || "";
  const formattedInstall = installStr;

  return {
    serialNumber: raw.assetName,
    brand: "BTC Power",
    model: raw.model || "Unknown",
    chargerType: raw.assetRecordType === "DCFC" ? "DC | Level 3" : "AC | Level 2",
    installationDate: formattedInstall,
    ageInYears: calcAge(installStr),
    warrantyStatus: deriveWarrantyStatus(pwEnd),
    warrantyExpirationDate: pwEnd || undefined,
    warrantyProvider: "BTC Power Inc.",
    slaStatus: deriveSlaStatus(raw.serviceContractEnd),
    slaTier: raw.serviceContractEnd ? "standard" : undefined,
    serviceCount: 0,
    daysSinceLastService: 9999,
    serviceHistory: [],
    knownIssues: [],
    administrator: raw.administrator || undefined,
    accountName: raw.accountName || undefined,
    address: raw.address || undefined,
    city: raw.city || undefined,
    state: raw.state || undefined,
    zip: raw.zip || undefined,
    evseId: raw.evseId || undefined,
    warrantyNotes: raw.warrantyNotes || undefined,
  };
}

export async function lookupCharger(serialNumber: string): Promise<ChargerDatabaseRecord | null> {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
  const raw = BTC_DATABASE_INDEX[serialNumber];
  if (!raw) return null;
  return toRecord(raw);
}

export function lookupChargerSync(serialNumber: string): ChargerDatabaseRecord | null {
  const raw = BTC_DATABASE_INDEX[serialNumber];
  if (!raw) return null;
  return toRecord(raw);
}

/** Return all records (for AllChargers page, etc.) */
export function getAllChargers(): ChargerDatabaseRecord[] {
  return Object.values(BTC_DATABASE_INDEX).map(toRecord);
}
