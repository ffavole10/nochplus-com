import * as XLSX from "xlsx";

export interface ParsedChargerRow {
  station_id: string;
  station_name: string | null;
  serial_number: string | null;
  model: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  start_date: string | null;
  max_power: number | null;
  site_name: string | null;
  serviced_qty: number;
  service_date: string | null;
  report_url: string | null;
  status: "Optimal" | "Degraded" | "Critical" | null;
  summary: string | null;
  power_cabinet_report_url: string | null;
  power_cabinet_status: string | null;
  power_cabinet_summary: string | null;
  service_required: number;
  ccs_cable_issue: boolean;
  chademo_cable_issue: boolean;
  screen_damage: boolean;
  cc_reader_issue: boolean;
  rfid_reader_issue: boolean;
  app_issue: boolean;
  holster_issue: boolean;
  other_issue: boolean;
  power_supply_issue: boolean;
  circuit_board_issue: boolean;
}

export interface ParsedCampaign {
  name: string;
  customer: string;
  quarter: string | null;
  year: number | null;
  chargers: ParsedChargerRow[];
}

function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\n\r_\s]+/g, " ")
    .trim();
}

// Each field maps to an array of possible header names (normalized)
const FIELD_ALIASES: Record<keyof ParsedChargerRow, string[]> = {
  station_id: ["station id", "stationid", "charger id", "evse id", "charge box identity", "cbid", "asset id"],
  station_name: ["station name", "charger name", "asset name", "name"],
  serial_number: ["serial number", "serial", "serial no"],
  model: ["model", "charger model", "asset record type", "type"],
  address: ["address", "street address", "address line 1", "full address", "location address", "street", "location"],
  city: ["city", "town"],
  state: ["state", "state/province", "province", "st"],
  zip: ["zip", "zip code", "zip/postal code", "postal code", "zipcode"],
  start_date: ["start date", "in-service date", "in service date", "install date"],
  max_power: ["max. power", "max power", "power", "kw"],
  site_name: ["site name", "site", "location name", "account name", "organization"],
  serviced_qty: ["qty", "quantity", "serviced qty"],
  service_date: ["date", "service date"],
  report_url: ["full report", "report url"],
  status: ["status", "online status", "condition"],
  summary: ["summary", "notes", "description"],
  power_cabinet_report_url: ["report"],
  power_cabinet_status: ["power cabinet status", "cabinet status"],
  power_cabinet_summary: ["power cabinet summary", "cabinet summary"],
  service_required: ["service required", "service req"],
  ccs_cable_issue: ["ccs cable", "ccs"],
  chademo_cable_issue: ["chademo cable", "chademo"],
  screen_damage: ["screen damage", "screen"],
  cc_reader_issue: ["cc reader"],
  rfid_reader_issue: ["rfid reader", "rfid"],
  app_issue: ["app", "app issue"],
  holster_issue: ["holster", "holster issue"],
  other_issue: ["other", "other issue"],
  power_supply_issue: ["power supply"],
  circuit_board_issue: ["circuit board"],
};

function matchHeaderToField(header: string): keyof ParsedChargerRow | null {
  const normalized = normalizeColumnName(header);
  if (!normalized) return null;

  // Priority 1: Exact match
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(normalized)) return field as keyof ParsedChargerRow;
  }

  // Priority 2: Starts with
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.startsWith(alias) || alias.startsWith(normalized)) {
        return field as keyof ParsedChargerRow;
      }
    }
  }

  // Priority 3: Contains (only for longer aliases to avoid false positives)
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (alias.length >= 4 && normalized.includes(alias)) {
        return field as keyof ParsedChargerRow;
      }
    }
  }

  return null;
}

function extractLink(cell: XLSX.CellObject | undefined): string | null {
  if (!cell) return null;
  // Check for hyperlink
  if (cell.l && cell.l.Target) {
    return cell.l.Target;
  }
  // Check if the value itself is a URL
  const value = cell.v?.toString() || "";
  if (value.startsWith("http")) {
    return value;
  }
  return null;
}

function parseStatus(value: string | undefined | null): "Optimal" | "Degraded" | "Critical" | null {
  if (!value) return null;
  const normalized = value.toString().toLowerCase().trim();
  if (normalized === "optimal") return "Optimal";
  if (normalized === "degraded") return "Degraded";
  if (normalized === "critical") return "Critical";
  return null;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    return lower === "true" || lower === "yes" || lower === "1" || lower === "x";
  }
  return false;
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "number") {
    // Excel date serial number
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }
  if (typeof value === "string") {
    // Try to parse date string
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
  }
  return null;
}

export function parseExcelFile(file: File): Promise<ParsedCampaign> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Get the range
        const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

        // Find header row (look for "Station ID" in first few rows)
        let headerRowIndex = -1;
        let headerMap: Record<number, keyof ParsedChargerRow | null> = {};

        for (let row = range.s.r; row <= Math.min(range.s.r + 5, range.e.r); row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = sheet[cellAddress];
            const value = cell?.v?.toString().trim();

            if (value === "Station ID") {
              headerRowIndex = row;
              break;
            }
          }
          if (headerRowIndex >= 0) break;
        }

        if (headerRowIndex < 0) {
          throw new Error("Could not find header row with 'Station ID' column");
        }

        // Build header map
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
          const cell = sheet[cellAddress];
          const headerValue = cell?.v?.toString().trim() || "";
          headerMap[col] = matchHeaderToField(headerValue);
        }

        // Find the column indices for report URLs (need special handling for links)
        let reportUrlCol = -1;
        let powerCabinetReportCol = -1;
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
          const cell = sheet[cellAddress];
          const headerValue = cell?.v?.toString().trim() || "";
          if (headerValue === "FULL Report") reportUrlCol = col;
          if (headerValue === "Report" && col > reportUrlCol) powerCabinetReportCol = col;
        }

        // Parse data rows
        const chargers: ParsedChargerRow[] = [];
        for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
          const stationIdCell = sheet[XLSX.utils.encode_cell({ r: row, c: Object.keys(headerMap).find(c => headerMap[parseInt(c)] === "station_id") ? parseInt(Object.keys(headerMap).find(c => headerMap[parseInt(c)] === "station_id")!) : 0 })];
          
          // Find station_id column
          let stationIdCol = -1;
          for (const [col, field] of Object.entries(headerMap)) {
            if (field === "station_id") {
              stationIdCol = parseInt(col);
              break;
            }
          }

          if (stationIdCol < 0) continue;

          const stationIdCellAddr = XLSX.utils.encode_cell({ r: row, c: stationIdCol });
          const stationId = sheet[stationIdCellAddr]?.v?.toString().trim();

          if (!stationId) continue; // Skip empty rows

          const chargerRow: ParsedChargerRow = {
            station_id: stationId,
            station_name: null,
            serial_number: null,
            model: null,
            address: null,
            city: null,
            state: null,
            zip: null,
            start_date: null,
            max_power: null,
            site_name: null,
            serviced_qty: 0,
            service_date: null,
            report_url: null,
            status: null,
            summary: null,
            power_cabinet_report_url: null,
            power_cabinet_status: null,
            power_cabinet_summary: null,
            service_required: 0,
            ccs_cable_issue: false,
            chademo_cable_issue: false,
            screen_damage: false,
            cc_reader_issue: false,
            rfid_reader_issue: false,
            app_issue: false,
            holster_issue: false,
            other_issue: false,
            power_supply_issue: false,
            circuit_board_issue: false,
          };

          // Parse each column
          for (const [colStr, field] of Object.entries(headerMap)) {
            if (!field) continue;
            const col = parseInt(colStr);
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = sheet[cellAddress];
            const value = cell?.v;

            switch (field) {
              case "station_id":
                chargerRow.station_id = value?.toString() || "";
                break;
              case "station_name":
              case "serial_number":
              case "model":
              case "address":
              case "city":
              case "state":
              case "zip":
              case "site_name":
              case "summary":
              case "power_cabinet_summary":
                chargerRow[field] = value?.toString() || null;
                break;
              case "max_power":
                chargerRow.max_power = parseNumber(value) || null;
                break;
              case "serviced_qty":
              case "service_required":
                chargerRow[field] = parseNumber(value);
                break;
              case "start_date":
              case "service_date":
                chargerRow[field] = parseDate(value);
                break;
              case "status":
                chargerRow.status = parseStatus(value?.toString());
                break;
              case "power_cabinet_status":
                chargerRow.power_cabinet_status = value?.toString() || null;
                break;
              case "report_url":
                chargerRow.report_url = extractLink(cell);
                break;
              case "power_cabinet_report_url":
                chargerRow.power_cabinet_report_url = extractLink(cell);
                break;
              case "ccs_cable_issue":
              case "chademo_cable_issue":
              case "screen_damage":
              case "cc_reader_issue":
              case "rfid_reader_issue":
              case "app_issue":
              case "holster_issue":
              case "other_issue":
              case "power_supply_issue":
              case "circuit_board_issue":
                chargerRow[field] = parseBoolean(value);
                break;
            }
          }

          chargers.push(chargerRow);
        }

        // Extract campaign info from sheet title or first row
        let campaignTitle = "EVSE Information";
        let quarter: string | null = null;
        let year: number | null = null;

        // Check first row for campaign title
        const firstCell = sheet["A1"];
        if (firstCell?.v) {
          const titleMatch = firstCell.v.toString().match(/(.+?)\s*\|\s*(Q\d)\s+(\d{4})/);
          if (titleMatch) {
            campaignTitle = titleMatch[1].trim();
            quarter = titleMatch[2];
            year = parseInt(titleMatch[3]);
          }
        }

        resolve({
          name: campaignTitle,
          customer: "EVgo", // Default, can be changed by user
          quarter,
          year,
          chargers,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

export function parseCSVFile(file: File): Promise<ParsedCampaign> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const workbook = XLSX.read(text, { type: "string" });
        
        // Use same parsing logic as Excel
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // For CSV, create a temporary Excel-like parsing
        const tempFile = new Blob([text], { type: "text/csv" });
        // Simplified parsing for CSV
        resolve({
          name: file.name.replace(/\.(csv|xlsx?)$/i, ""),
          customer: "EVgo",
          quarter: null,
          year: new Date().getFullYear(),
          chargers: [],
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
