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
}

const BTC_DATABASE: Record<string, Omit<ChargerDatabaseRecord, "daysSinceLastService">> = {
  "NAS1800ss23E0212": {
    serialNumber: "NAS1800ss23E0212",
    brand: "BTC Power",
    model: "GEN3 180kW AiO",
    chargerType: "DC | Level 3",
    installationDate: "2024-01-15",
    ageInYears: 2.1,
    warrantyStatus: "active",
    warrantyExpirationDate: "2027-12-31",
    warrantyProvider: "BTC Power Inc.",
    slaStatus: "active",
    slaTier: "premium",
    serviceCount: 0,
    serviceHistory: [],
    knownIssues: [],
  },
  "BTC2018": {
    serialNumber: "BTC2018",
    brand: "BTC Power",
    model: "GEN2 60kW AiO",
    chargerType: "AC | Level 2",
    installationDate: "2019-09-03",
    ageInYears: 6.4,
    warrantyStatus: "expired",
    warrantyExpirationDate: "2022-09-03",
    warrantyProvider: "BTC Power Inc.",
    slaStatus: "expired",
    slaTier: "standard",
    lastServiceDate: "2024-01-15",
    serviceCount: 3,
    serviceHistory: [
      { date: "2024-01-15", workPerformed: "Power board replacement", cost: 850, partsReplaced: ["Power Board Assembly"] },
      { date: "2022-03-10", workPerformed: "Cloud board update", cost: 450, partsReplaced: ["Cloud Board"] },
      { date: "2021-06-20", workPerformed: "CCS cable replacement", cost: 320, partsReplaced: ["CCS1 Cable Assembly"] },
    ],
    knownIssues: ["Power supply failures after 5yr", "Cloud board connectivity issues in humid environments"],
    recallStatus: "Recall #BTC-2021-04: Cloud board firmware — completed",
  },
  "DC-FAST-001": {
    serialNumber: "DC-FAST-001",
    brand: "BTC Power",
    model: "GEN4 360kW Tower",
    chargerType: "DC | Level 3",
    installationDate: "2023-06-15",
    ageInYears: 2.7,
    warrantyStatus: "active",
    warrantyExpirationDate: "2028-06-15",
    warrantyProvider: "BTC Power Inc.",
    slaStatus: "active",
    slaTier: "enterprise",
    lastServiceDate: "2025-01-10",
    serviceCount: 1,
    serviceHistory: [
      { date: "2025-01-10", workPerformed: "Preventive maintenance — annual inspection", cost: 600, partsReplaced: [] },
    ],
    knownIssues: [],
  },
  "BTC-2024-00842": {
    serialNumber: "BTC-2024-00842",
    brand: "BTC Power",
    model: "GEN3 180kW AiO",
    chargerType: "DC | Level 3",
    installationDate: "2023-11-20",
    ageInYears: 2.3,
    warrantyStatus: "active",
    warrantyExpirationDate: "2026-11-20",
    warrantyProvider: "BTC Power Inc.",
    slaStatus: "active",
    slaTier: "premium",
    lastServiceDate: "2024-06-15",
    serviceCount: 1,
    serviceHistory: [
      { date: "2024-06-15", workPerformed: "Screen replacement — vandalism damage", cost: 1200, partsReplaced: ["LCD Assembly", "Touch Panel"] },
    ],
    knownIssues: ["CCS connector latch wear after 10K sessions"],
  },
  "ABB-HPC-7821": {
    serialNumber: "ABB-HPC-7821",
    brand: "ABB",
    model: "Terra 360",
    chargerType: "DC | Level 3",
    installationDate: "2022-08-10",
    ageInYears: 3.5,
    warrantyStatus: "active",
    warrantyExpirationDate: "2027-08-10",
    warrantyProvider: "ABB E-mobility",
    slaStatus: "active",
    slaTier: "enterprise",
    lastServiceDate: "2025-01-20",
    serviceCount: 2,
    serviceHistory: [
      { date: "2025-01-20", workPerformed: "RFID reader replacement", cost: 380, partsReplaced: ["RFID Module"] },
      { date: "2024-04-05", workPerformed: "Firmware update + diagnostics", cost: 250, partsReplaced: [] },
    ],
    knownIssues: ["RFID reader sensitivity drift after 18mo"],
  },
  "DLT-L2-4490": {
    serialNumber: "DLT-L2-4490",
    brand: "Delta",
    model: "AC Max 22kW",
    chargerType: "AC | Level 2",
    installationDate: "2020-03-25",
    ageInYears: 5.9,
    warrantyStatus: "expired",
    warrantyExpirationDate: "2023-03-25",
    warrantyProvider: "Delta Electronics",
    slaStatus: "none",
    lastServiceDate: "2023-11-10",
    serviceCount: 4,
    serviceHistory: [
      { date: "2023-11-10", workPerformed: "Ground fault relay replacement", cost: 520, partsReplaced: ["GFI Relay", "Control Board"] },
      { date: "2023-02-14", workPerformed: "J1772 connector replacement", cost: 280, partsReplaced: ["J1772 Cable Assembly"] },
      { date: "2022-07-08", workPerformed: "Breaker trip investigation — loose wiring", cost: 350, partsReplaced: ["Wiring Harness"] },
      { date: "2021-09-15", workPerformed: "Network module replacement", cost: 190, partsReplaced: ["WiFi/Cell Module"] },
    ],
    knownIssues: ["Ground fault sensor drift after 4yr", "Breaker compatibility issues with certain panels"],
    recallStatus: "Advisory #DLT-2022-01: Ground fault sensitivity — acknowledged",
  },
  "TRT-RT50-1192": {
    serialNumber: "TRT-RT50-1192",
    brand: "Tritium",
    model: "RT50 50kW",
    chargerType: "DC | Level 3",
    installationDate: "2023-02-10",
    ageInYears: 3.0,
    warrantyStatus: "active",
    warrantyExpirationDate: "2028-02-10",
    warrantyProvider: "Tritium DCFC",
    slaStatus: "active",
    slaTier: "standard",
    lastServiceDate: "2025-01-05",
    serviceCount: 1,
    serviceHistory: [
      { date: "2025-01-05", workPerformed: "Annual preventive maintenance", cost: 550, partsReplaced: [] },
    ],
    knownIssues: [],
  },
  "SGN-FC-0823": {
    serialNumber: "SGN-FC-0823",
    brand: "Signet",
    model: "FC 150kW",
    chargerType: "DC | Level 3",
    installationDate: "2021-10-01",
    ageInYears: 4.4,
    warrantyStatus: "expired",
    warrantyExpirationDate: "2024-10-01",
    warrantyProvider: "Signet EV",
    slaStatus: "expired",
    slaTier: "standard",
    lastServiceDate: "2024-08-20",
    serviceCount: 3,
    serviceHistory: [
      { date: "2024-08-20", workPerformed: "CCS cable inspection and repair", cost: 420, partsReplaced: ["Cable Jacket Repair Kit"] },
      { date: "2023-12-15", workPerformed: "Power module replacement", cost: 2800, partsReplaced: ["Power Module #2", "Cooling Fan Assembly"] },
      { date: "2023-03-01", workPerformed: "Annual maintenance", cost: 500, partsReplaced: [] },
    ],
    knownIssues: ["CCS cable wear at connector housing", "Power module overheating in high ambient temps"],
  },
};

function calcDaysSince(dateStr?: string): number {
  if (!dateStr) return 9999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export async function lookupCharger(serialNumber: string): Promise<ChargerDatabaseRecord | null> {
  // Simulate async DB lookup
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

  const record = BTC_DATABASE[serialNumber];
  if (!record) return null;

  return {
    ...record,
    daysSinceLastService: calcDaysSince(record.lastServiceDate),
  };
}

export function lookupChargerSync(serialNumber: string): ChargerDatabaseRecord | null {
  const record = BTC_DATABASE[serialNumber];
  if (!record) return null;
  return {
    ...record,
    daysSinceLastService: calcDaysSince(record.lastServiceDate),
  };
}
