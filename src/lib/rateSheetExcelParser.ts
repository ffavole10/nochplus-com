import * as XLSX from "xlsx";

export type ParsedScope = {
  scope_code: string;
  scope_name: string;
  exhibit: string;
  hours_to_complete: number | null;
  price_24hr: number | null;
  price_48hr: number | null;
  price_72hr: number | null;
  price_96hr: number | null;
  price_192hr: number | null;
  travel_note: string;
  requires_ev_rental: boolean;
  sort_order: number;
};

export type ParsedTravelFee = {
  fee_type: string;
  label: string;
  rate: number;
  unit: string;
  threshold: number | null;
  notes: string;
  sort_order: number;
};

export type ParsedVolumeDiscount = {
  discount_type: string;
  min_stations: number;
  max_stations: number | null;
  discount_percent: number;
};

export type ParsedRateSheet = {
  scopes: ParsedScope[];
  travelFees: ParsedTravelFee[];
  volumeDiscounts: ParsedVolumeDiscount[];
  warnings: string[];
};

function isNumeric(val: any): boolean {
  if (val === null || val === undefined || val === "") return false;
  return !isNaN(Number(val));
}

function parsePrice(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "string") {
    const cleaned = val.replace(/[$,\s]/g, "");
    if (cleaned.toUpperCase() === "X" || cleaned === "-" || cleaned === "N/A") return null;
    if (isNumeric(cleaned)) return parseFloat(cleaned);
    return null;
  }
  if (typeof val === "number") return val;
  return null;
}

export function parseRateSheetExcel(buffer: ArrayBuffer): ParsedRateSheet {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const warnings: string[] = [];
  const scopes: ParsedScope[] = [];
  const travelFees: ParsedTravelFee[] = [];
  const volumeDiscounts: ParsedVolumeDiscount[] = [];

  // Find SLA header row
  let headerRow = -1;
  let slaCols = { c24: -1, c48: -1, c72: -1, c96: -1, c192: -1 };
  let hoursCol = -1;
  let travelNoteCol = -1;

  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r];
    if (!row) continue;
    const joined = row.map((c: any) => String(c).toLowerCase()).join(" ");
    if (joined.includes("24") && (joined.includes("48") || joined.includes("72"))) {
      headerRow = r;
      for (let c = 0; c < row.length; c++) {
        const h = String(row[c]).toLowerCase().replace(/\s+/g, "");
        if (h.includes("24")) slaCols.c24 = c;
        else if (h.includes("48")) slaCols.c48 = c;
        else if (h.includes("72")) slaCols.c72 = c;
        else if (h.includes("96")) slaCols.c96 = c;
        else if (h.includes("192")) slaCols.c192 = c;
        else if (h.includes("hour") || h.includes("hrs") || h === "hours") hoursCol = c;
      }
      // Travel note col is typically after last SLA col
      const maxSlaCol = Math.max(slaCols.c24, slaCols.c48, slaCols.c72, slaCols.c96, slaCols.c192);
      if (maxSlaCol >= 0 && maxSlaCol + 1 < row.length) travelNoteCol = maxSlaCol + 1;
      break;
    }
  }

  if (headerRow === -1) {
    warnings.push("Could not detect SLA tier header row. Looked for columns containing '24' and '48'/'72'.");
    return { scopes, travelFees, volumeDiscounts, warnings };
  }

  let currentExhibit = "A";
  let sortA = 0;
  let sortB = 0;

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c: any) => c === "" || c === null || c === undefined)) continue;

    const firstCell = String(row[0] || "").trim();
    const joinedRow = row.map((c: any) => String(c)).join(" ").toLowerCase();

    // Check for Exhibit B transition
    if (joinedRow.includes("exhibit b") || joinedRow.includes("installation")) {
      currentExhibit = "B";
      continue;
    }

    // Check for volume discount patterns
    const discountMatch = joinedRow.match(/for\s+(\d+)[-–](\d+)\s+stations?.*?(\d+)%/i) ||
      joinedRow.match(/(\d+)\+?\s+stations?.*?(\d+)%/i);
    if (discountMatch) {
      if (discountMatch.length === 4) {
        volumeDiscounts.push({
          discount_type: currentExhibit === "B" ? "installation" : "service",
          min_stations: parseInt(discountMatch[1]),
          max_stations: parseInt(discountMatch[2]),
          discount_percent: parseInt(discountMatch[3]),
        });
      }
      continue;
    }

    // Check for travel fee patterns
    if (joinedRow.includes("per mile") || joinedRow.includes("mileage")) {
      const rate = parsePrice(row[slaCols.c24 >= 0 ? slaCols.c24 : 2]);
      if (rate !== null) {
        const threshMatch = joinedRow.match(/over\s+(\d+)/);
        travelFees.push({
          fee_type: "mileage", label: firstCell || "Per mile",
          rate, unit: "/mile",
          threshold: threshMatch ? parseInt(threshMatch[1]) : null,
          notes: "", sort_order: travelFees.length + 1,
        });
      }
      continue;
    }

    if (joinedRow.includes("ev rental") || joinedRow.includes("forklift") ||
      joinedRow.includes("airfare") || joinedRow.includes("hotel") ||
      joinedRow.includes("per diem") || joinedRow.includes("meals") ||
      joinedRow.includes("rental car") || joinedRow.includes("misc")) {
      // Try to parse as travel fee
      const rate = parsePrice(row[1]) || parsePrice(row[2]);
      if (rate !== null) {
        const feeType = joinedRow.includes("ev rental") ? "ev_rental" :
          joinedRow.includes("forklift") ? "forklift" :
            joinedRow.includes("airfare") ? "airfare" :
              joinedRow.includes("hotel") ? "hotel" :
                joinedRow.includes("rental") ? "rental_car" :
                  joinedRow.includes("per diem") ? "per_diem" :
                    joinedRow.includes("meals") ? "meals" : "misc";
        travelFees.push({
          fee_type: feeType, label: firstCell, rate,
          unit: joinedRow.includes("cost +") || joinedRow.includes("cost+") ? "cost_plus_pct" :
            joinedRow.includes("/day") ? "/day" : joinedRow.includes("/flight") ? "/flight hr" : "flat",
          threshold: null, notes: "", sort_order: travelFees.length + 1,
        });
      }
      continue;
    }

    // Parse scope row — first cell should contain scope info
    if (firstCell && (firstCell.toLowerCase().includes("scope") || /^\d/.test(firstCell) || /^[A-Z0-9]/.test(firstCell))) {
      // Extract scope code from name
      const scopeMatch = firstCell.match(/^(?:Scope\s+)?([^\s:–-]+(?:\s*-\s*\w+)?)\s*[-–:.]?\s*(.*)/i);
      if (!scopeMatch) {
        warnings.push(`Row ${r + 1}: Could not parse scope from "${firstCell}"`);
        continue;
      }

      const scopeCode = scopeMatch[1].trim();
      const scopeName = scopeMatch[2]?.trim() || firstCell;
      const hours = hoursCol >= 0 ? parsePrice(row[hoursCol]) : null;
      const sort = currentExhibit === "A" ? ++sortA : ++sortB;
      const travelNote = travelNoteCol >= 0 ? String(row[travelNoteCol] || "").trim() : "";

      scopes.push({
        scope_code: scopeCode,
        scope_name: scopeName || scopeCode,
        exhibit: currentExhibit,
        hours_to_complete: hours,
        price_24hr: slaCols.c24 >= 0 ? parsePrice(row[slaCols.c24]) : null,
        price_48hr: slaCols.c48 >= 0 ? parsePrice(row[slaCols.c48]) : null,
        price_72hr: slaCols.c72 >= 0 ? parsePrice(row[slaCols.c72]) : null,
        price_96hr: slaCols.c96 >= 0 ? parsePrice(row[slaCols.c96]) : null,
        price_192hr: slaCols.c192 >= 0 ? parsePrice(row[slaCols.c192]) : null,
        travel_note: travelNote,
        requires_ev_rental: travelNote.toLowerCase().includes("ev required"),
        sort_order: sort,
      });
    }
  }

  if (scopes.length === 0) {
    warnings.push("No scope rows were detected. Make sure the spreadsheet has rows below the SLA header.");
  }

  return { scopes, travelFees, volumeDiscounts, warnings };
}
