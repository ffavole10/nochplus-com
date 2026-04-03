import { useState, useCallback } from "react";
import * as XLSX from "xlsx";

export interface UploadedRow {
  _rowIndex: number;
  _status: "valid" | "warning" | "error";
  _errors: string[];
  _needsGeocoding: boolean;
  [key: string]: unknown;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null; // null = ignore
}

export interface UploadState {
  phase: 1 | 2 | 3;
  fileName: string;
  fileSize: number;
  headers: string[];
  rawRows: Record<string, unknown>[];
  mappings: ColumnMapping[];
  mappedRows: UploadedRow[];
  stats: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
    needsGeocoding: number;
  };
}

const SYSTEM_FIELDS = [
  { key: "charger_id_external", label: "Charger ID / Serial", required: true },
  { key: "site_name", label: "Site Name", required: true },
  { key: "address", label: "Address", required: true },
  { key: "city", label: "City", required: false },
  { key: "state", label: "State", required: false },
  { key: "zip", label: "ZIP Code", required: false },
  { key: "latitude", label: "Latitude", required: false },
  { key: "longitude", label: "Longitude", required: false },
  { key: "charger_model", label: "Charger Model", required: false },
  { key: "charger_type", label: "Charger Type", required: false },
  { key: "operator", label: "Operator", required: false },
  { key: "status", label: "Status", required: false },
  { key: "fault_code", label: "Fault Code", required: false },
  { key: "install_date", label: "Install Date", required: false },
  { key: "last_service_date", label: "Last Service Date", required: false },
  { key: "notes", label: "Notes", required: false },
];

export { SYSTEM_FIELDS };

const FIELD_ALIASES: Record<string, string[]> = {
  charger_id_external: ["station id", "stationid", "charger id", "evse id", "charge box identity", "cbid", "asset id", "serial number", "serial", "charger_id", "id"],
  site_name: ["site name", "location", "branch", "site", "account name", "location name", "facility"],
  address: ["address", "street address", "address line 1", "full address", "location address", "street"],
  city: ["city", "town"],
  state: ["state", "province", "region", "st"],
  zip: ["zip", "zip code", "postal code", "zipcode", "postal"],
  latitude: ["latitude", "lat", "geo lat"],
  longitude: ["longitude", "lng", "lon", "geo lng", "geo lon"],
  charger_model: ["model", "charger model", "asset record type", "type", "equipment model"],
  charger_type: ["charger type", "level", "power level", "equipment type"],
  operator: ["operator", "network", "network operator", "csms", "cpo"],
  status: ["status", "charger status", "condition"],
  fault_code: ["fault code", "error code", "fault", "error"],
  install_date: ["install date", "installation date", "in service date", "commissioned"],
  last_service_date: ["last service date", "last serviced", "service date"],
  notes: ["notes", "comments", "remarks", "description"],
};

const VALID_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
]);

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\n\r_\s]+/g, " ").trim();
}

function autoMap(headers: string[]): ColumnMapping[] {
  return headers.map(h => {
    const norm = normalize(h);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some(a => norm === a || norm.includes(a))) {
        return { sourceColumn: h, targetField: field };
      }
    }
    return { sourceColumn: h, targetField: null };
  });
}

function validateRows(rawRows: Record<string, unknown>[], mappings: ColumnMapping[]): UploadedRow[] {
  const fieldMap = new Map<string, string>();
  mappings.forEach(m => {
    if (m.targetField) fieldMap.set(m.targetField, m.sourceColumn);
  });

  const seenIds = new Set<string>();

  return rawRows.map((raw, idx) => {
    const errors: string[] = [];
    let status: "valid" | "warning" | "error" = "valid";

    const getValue = (field: string): string => {
      const col = fieldMap.get(field);
      if (!col) return "";
      const v = raw[col];
      return v != null ? String(v).trim() : "";
    };

    // Required field checks
    const chargerId = getValue("charger_id_external");
    const siteName = getValue("site_name");
    const address = getValue("address");

    if (!chargerId) { errors.push("Missing Charger ID"); status = "error"; }
    if (!siteName) { errors.push("Missing Site Name"); status = "error"; }
    if (!address) { errors.push("Missing Address"); status = "error"; }

    // Duplicate check
    if (chargerId && seenIds.has(chargerId)) {
      if (status !== "error") status = "warning";
      errors.push("Duplicate Charger ID");
    }
    if (chargerId) seenIds.add(chargerId);

    // State validation
    const stateVal = getValue("state").toUpperCase();
    if (stateVal && !VALID_STATES.has(stateVal)) {
      if (status !== "error") status = "warning";
      errors.push(`Invalid state: ${stateVal}`);
    }

    const lat = getValue("latitude");
    const lng = getValue("longitude");
    const needsGeocoding = !lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng));

    return {
      _rowIndex: idx,
      _status: status,
      _errors: errors,
      _needsGeocoding: needsGeocoding,
      ...raw,
    } as UploadedRow;
  });
}

function computeStats(rows: UploadedRow[]) {
  return {
    total: rows.length,
    valid: rows.filter(r => r._status === "valid").length,
    warnings: rows.filter(r => r._status === "warning").length,
    errors: rows.filter(r => r._status === "error").length,
    needsGeocoding: rows.filter(r => r._needsGeocoding).length,
  };
}

export function useUploadFlow() {
  const [state, setState] = useState<UploadState>({
    phase: 1,
    fileName: "",
    fileSize: 0,
    headers: [],
    rawRows: [],
    mappings: [],
    mappedRows: [],
    stats: { total: 0, valid: 0, warnings: 0, errors: 0, needsGeocoding: 0 },
  });

  const parseFile = useCallback(async (file: File) => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (json.length === 0) throw new Error("The uploaded file contains no data rows.");

    const headers = Object.keys(json[0]);
    const mappings = autoMap(headers);
    const mapped = validateRows(json, mappings);
    const stats = computeStats(mapped);

    setState({
      phase: 2,
      fileName: file.name,
      fileSize: file.size,
      headers,
      rawRows: json,
      mappings,
      mappedRows: mapped,
      stats,
    });
  }, []);

  const parsePastedData = useCallback((text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) throw new Error("Need at least a header row and one data row.");

    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ""));
    const rawRows = lines.slice(1).map(line => {
      const vals = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, unknown> = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ""; });
      return row;
    });

    const mappings = autoMap(headers);
    const mapped = validateRows(rawRows, mappings);
    const stats = computeStats(mapped);

    setState({
      phase: 2,
      fileName: "pasted-data",
      fileSize: text.length,
      headers,
      rawRows,
      mappings,
      mappedRows: mapped,
      stats,
    });
  }, []);

  const updateMapping = useCallback((sourceColumn: string, targetField: string | null) => {
    setState(prev => {
      const newMappings = prev.mappings.map(m =>
        m.sourceColumn === sourceColumn ? { ...m, targetField } : m
      );
      const mapped = validateRows(prev.rawRows, newMappings);
      return { ...prev, mappings: newMappings, mappedRows: mapped, stats: computeStats(mapped) };
    });
  }, []);

  const updateCell = useCallback((rowIndex: number, column: string, value: string) => {
    setState(prev => {
      const newRaw = [...prev.rawRows];
      newRaw[rowIndex] = { ...newRaw[rowIndex], [column]: value };
      const mapped = validateRows(newRaw, prev.mappings);
      return { ...prev, rawRows: newRaw, mappedRows: mapped, stats: computeStats(mapped) };
    });
  }, []);

  const setPhase = useCallback((phase: 1 | 2 | 3) => {
    setState(prev => ({ ...prev, phase }));
  }, []);

  const reset = useCallback(() => {
    setState({
      phase: 1,
      fileName: "",
      fileSize: 0,
      headers: [],
      rawRows: [],
      mappings: [],
      mappedRows: [],
      stats: { total: 0, valid: 0, warnings: 0, errors: 0, needsGeocoding: 0 },
    });
  }, []);

  const getMappedFieldValue = useCallback((row: Record<string, unknown>, field: string): string => {
    const mapping = state.mappings.find(m => m.targetField === field);
    if (!mapping) return "";
    const v = row[mapping.sourceColumn];
    return v != null ? String(v).trim() : "";
  }, [state.mappings]);

  return {
    state,
    parseFile,
    parsePastedData,
    updateMapping,
    updateCell,
    setPhase,
    reset,
    getMappedFieldValue,
  };
}
