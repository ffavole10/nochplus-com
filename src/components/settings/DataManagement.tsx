import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Database, Download, Upload, Trash2, FileSpreadsheet, AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCampaigns, useChargerRecords, useCreateChargerRecords, type ChargerRecord } from "@/hooks/useCampaigns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { cleanupDuplicateSubmissionTickets } from "@/services/ticketCleanupService";

export function DataManagement() {
  const { data: campaigns = [] } = useCampaigns();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const { data: records = [], isLoading } = useChargerRecords(selectedCampaignId || null);
  const createRecords = useCreateChargerRecords();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId),
    [campaigns, selectedCampaignId]
  );

  const handleDownload = () => {
    if (records.length === 0) {
      toast.error("No records to download");
      return;
    }

    // Convert records to a clean spreadsheet format
    const rows = records.map((r) => ({
      "Station ID": r.station_id,
      "Station Name": r.station_name || "",
      "Serial Number": r.serial_number || "",
      "Model": r.model || "",
      "Site Name": r.site_name || "",
      "Address": r.address || "",
      "City": r.city || "",
      "State": r.state || "",
      "ZIP": r.zip || "",
      "Latitude": r.latitude ?? "",
      "Longitude": r.longitude ?? "",
      "Status": r.status || "",
      "Start Date": r.start_date || "",
      "Service Date": r.service_date || "",
      "Max Power": r.max_power ?? "",
      "Serviced Qty": r.serviced_qty,
      "Service Required": r.service_required,
      "Summary": r.summary || "",
      "Report URL": r.report_url || "",
      "CCS Cable Issue": r.ccs_cable_issue ? "Yes" : "No",
      "CHAdeMO Cable Issue": r.chademo_cable_issue ? "Yes" : "No",
      "Screen Damage": r.screen_damage ? "Yes" : "No",
      "CC Reader Issue": r.cc_reader_issue ? "Yes" : "No",
      "RFID Reader Issue": r.rfid_reader_issue ? "Yes" : "No",
      "App Issue": r.app_issue ? "Yes" : "No",
      "Holster Issue": r.holster_issue ? "Yes" : "No",
      "Power Supply Issue": r.power_supply_issue ? "Yes" : "No",
      "Circuit Board Issue": r.circuit_board_issue ? "Yes" : "No",
      "Other Issue": r.other_issue ? "Yes" : "No",
      "Power Cabinet Status": r.power_cabinet_status || "",
      "Power Cabinet Summary": r.power_cabinet_summary || "",
      "Power Cabinet Report URL": r.power_cabinet_report_url || "",
      "Ticket ID": (r as any).ticket_id || "",
      "Ticket Created Date": (r as any).ticket_created_date || "",
      "Ticket Solved Date": (r as any).ticket_solved_date || "",
      "Ticket Group": (r as any).ticket_group || "",
      "Ticket Subject": (r as any).ticket_subject || "",
      "Ticket Reporting Source": (r as any).ticket_reporting_source || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Charger Records");

    const campaignName = selectedCampaign?.name || "charger-records";
    const safeName = campaignName.replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(wb, `${safeName}.xlsx`);
    toast.success(`Downloaded ${records.length} records`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (records.length > 0) {
      setPendingFile(file);
      setConfirmReplace(true);
    } else {
      processUpload(file);
    }
  };

  const processUpload = async (file: File) => {
    if (!selectedCampaignId) return;
    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(data), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (jsonData.length === 0) {
        toast.error("No data found in file");
        setUploading(false);
        return;
      }

      // Delete existing records for this campaign
      if (records.length > 0) {
        const { error: delErr } = await supabase
          .from("charger_records")
          .delete()
          .eq("campaign_id", selectedCampaignId);
        if (delErr) throw delErr;
      }

      // Map spreadsheet rows to charger_records
      const parseDate = (val: unknown): string | null => {
        if (!val || val === "") return null;
        if (typeof val === "number") {
          // Excel serial date number — convert to ISO date
          const epoch = new Date(Date.UTC(1899, 11, 30));
          const date = new Date(epoch.getTime() + val * 86400000);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split("T")[0];
          }
        }
        if (typeof val === "string") {
          const d = new Date(val);
          if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
        }
        return null;
      };

      const mapped = jsonData.map((row: any) => {
        // Normalize key for flexible matching
        const normalizeKey = (k: string) => k.toLowerCase().replace(/[\n\r_\s]+/g, " ").trim();
        
        // Build a normalized lookup from row keys
        const normalizedRow: Record<string, any> = {};
        for (const [key, val] of Object.entries(row)) {
          normalizedRow[normalizeKey(key)] = val;
        }

        const get = (keys: string[]) => {
          for (const k of keys) {
            // Try exact key first
            if (row[k] !== undefined && row[k] !== "") return row[k];
            // Try normalized
            const norm = normalizeKey(k);
            if (normalizedRow[norm] !== undefined && normalizedRow[norm] !== "") return normalizedRow[norm];
          }
          // Fallback: "contains" match for longer keys
          for (const k of keys) {
            const norm = normalizeKey(k);
            if (norm.length < 4) continue;
            for (const [rowKey, val] of Object.entries(normalizedRow)) {
              if (rowKey.includes(norm) || norm.includes(rowKey)) {
                if (val !== undefined && val !== "") return val;
              }
            }
          }
          return null;
        };

        const boolField = (keys: string[]) => {
          const v = get(keys);
          if (v === null) return false;
          const s = String(v).toLowerCase();
          return s === "yes" || s === "true" || s === "1";
        };

        return {
          campaign_id: selectedCampaignId,
          station_id: String(get(["Station ID", "station_id", "EVSE ID", "evse_id", "Charger ID", "Asset ID", "Charge Box Identity", "CBID"]) || `STA-${Math.random().toString(36).slice(2, 8)}`),
          station_name: get(["Station Name", "station_name", "Asset Name", "Charger Name", "Device Name"]) as string | null,
          serial_number: get(["Serial Number", "serial_number", "Serial"]) as string | null,
          model: get(["Model", "model", "Asset Record Type", "Charger Model"]) as string | null,
          site_name: get(["Site Name", "site_name", "Account Name", "Organization", "Organization Name", "Location Name"]) as string | null,
          address: get(["Address", "address", "Street Address", "Address Line 1", "Full Address", "Location Address", "Street", "Location"]) as string | null,
          city: get(["City", "city", "Town"]) as string | null,
          state: get(["State", "state", "State/Province", "Province"]) as string | null,
          zip: get(["ZIP", "zip", "Zip", "Zip Code", "Zip/Postal Code", "Postal Code", "Zipcode"]) as string | null,
          latitude: get(["Latitude", "latitude"]) ? Number(get(["Latitude", "latitude"])) : null,
          longitude: get(["Longitude", "longitude"]) ? Number(get(["Longitude", "longitude"])) : null,
          status: (get(["Status", "status", "Online Status", "Condition"]) as "Optimal" | "Degraded" | "Critical" | null),
          start_date: parseDate(get(["Start Date", "start_date", "In-Service Date", "In Service Date", "Install Date"])),
          service_date: parseDate(get(["Service Date", "service_date", "DATE"])),
          max_power: get(["Max Power", "max_power", "Max. Power", "Power", "kW"]) ? Number(get(["Max Power", "max_power", "Max. Power"])) : null,
          serviced_qty: Number(get(["Serviced Qty", "serviced_qty", "QTY", "Quantity"]) || 0),
          service_required: Number(get(["Service Required", "service_required"]) || 0),
          summary: get(["Summary", "summary", "Notes", "Description"]) as string | null,
          report_url: get(["Report URL", "report_url", "FULL Report", "Full Report"]) as string | null,
          ccs_cable_issue: boolField(["CCS Cable Issue", "ccs_cable_issue", "CCS Cable", "CCS"]),
          chademo_cable_issue: boolField(["CHAdeMO Cable Issue", "chademo_cable_issue", "CHAdeMo Cable", "CHAdeMO"]),
          screen_damage: boolField(["Screen Damage", "screen_damage", "Screen"]),
          cc_reader_issue: boolField(["CC Reader Issue", "cc_reader_issue", "CC Reader"]),
          rfid_reader_issue: boolField(["RFID Reader Issue", "rfid_reader_issue", "RFID Reader", "RFID"]),
          app_issue: boolField(["App Issue", "app_issue", "App"]),
          holster_issue: boolField(["Holster Issue", "holster_issue", "Holster"]),
          power_supply_issue: boolField(["Power Supply Issue", "power_supply_issue", "Power Supply"]),
          circuit_board_issue: boolField(["Circuit Board Issue", "circuit_board_issue", "Circuit Board"]),
          other_issue: boolField(["Other Issue", "other_issue", "Other"]),
          power_cabinet_status: get(["Power Cabinet Status", "power_cabinet_status", "Cabinet Status"]) as string | null,
          power_cabinet_summary: get(["Power Cabinet Summary", "power_cabinet_summary", "Cabinet Summary"]) as string | null,
          power_cabinet_report_url: get(["Power Cabinet Report URL", "power_cabinet_report_url", "Report"]) as string | null,
          ticket_id: get(["Ticket ID", "ticket_id"]) as string | null,
          ticket_created_date: parseDate(get(["Ticket Created Date", "ticket_created_date", "PST Ticket Created Date"])),
          ticket_solved_date: parseDate(get(["Ticket Solved Date", "ticket_solved_date"])),
          ticket_group: get(["Ticket Group", "ticket_group"]) as string | null,
          ticket_subject: get(["Ticket Subject", "ticket_subject"]) as string | null,
          ticket_reporting_source: get(["Ticket Reporting Source", "ticket_reporting_source"]) as string | null,
        };
      });

      // Insert in batches of 500
      for (let i = 0; i < mapped.length; i += 500) {
        const batch = mapped.slice(i, i + 500);
        await createRecords.mutateAsync(batch);
      }

      // Update total_chargers on the campaign
      await supabase
        .from("campaigns")
        .update({ total_chargers: mapped.length })
        .eq("id", selectedCampaignId);

      queryClient.invalidateQueries({ queryKey: ["charger_records", selectedCampaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(`Uploaded ${mapped.length} records`);
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
      setPendingFile(null);
      setConfirmReplace(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedCampaignId || records.length === 0) return;
    if (!confirm(`Delete all ${records.length} records for this campaign? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from("charger_records")
        .delete()
        .eq("campaign_id", selectedCampaignId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["charger_records", selectedCampaignId] });
      toast.success("All records deleted");
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>Browse, download, and re-upload charger records by campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campaign selector + actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedCampaignId || "none"} onValueChange={(v) => setSelectedCampaignId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="none">— Select Campaign —</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.customer})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCampaignId && (
              <>
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={records.length === 0}>
                  <Download className="h-4 w-4 mr-1" />
                  Download ({records.length})
                </Button>

                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-1" />
                    {uploading ? "Uploading..." : "Upload"}
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                  </label>
                </Button>

                {records.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete All
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Records preview table */}
          {selectedCampaignId && (
            <div className="border rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No records</p>
                  <p className="text-sm">Upload an Excel or CSV file to populate this campaign.</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-muted">#</TableHead>
                        <TableHead className="sticky top-0 bg-muted">Station ID</TableHead>
                        <TableHead className="sticky top-0 bg-muted">Name</TableHead>
                        <TableHead className="sticky top-0 bg-muted">Site</TableHead>
                        <TableHead className="sticky top-0 bg-muted">City</TableHead>
                        <TableHead className="sticky top-0 bg-muted">State</TableHead>
                        <TableHead className="sticky top-0 bg-muted">Status</TableHead>
                        <TableHead className="sticky top-0 bg-muted">Model</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.slice(0, 200).map((r, idx) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{r.station_id}</TableCell>
                          <TableCell>{r.station_name || "—"}</TableCell>
                          <TableCell>{r.site_name || "—"}</TableCell>
                          <TableCell>{r.city || "—"}</TableCell>
                          <TableCell>{r.state || "—"}</TableCell>
                          <TableCell>
                            {r.status ? (
                              <Badge variant="outline" className="text-xs">
                                {r.status}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{r.model || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {records.length > 200 && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                      Showing 200 of {records.length} records. Download for full data.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog for replacing data */}
      <Dialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Replace Existing Data?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This campaign has <strong>{records.length}</strong> existing records. Uploading will <strong>delete all current records</strong> and replace them with the new file.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmReplace(false); setPendingFile(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => pendingFile && processUpload(pendingFile)}>
              Replace Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DuplicateTicketCleanup() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const handleCleanup = async () => {
    setRunning(true);
    setConfirmOpen(false);
    try {
      const result = await cleanupDuplicateSubmissionTickets();
      if (result.duplicatesRemoved === 0) {
        toast.info("No duplicate tickets found — everything looks clean.");
      } else {
        toast.success(
          `Cleanup complete — ${result.duplicatesRemoved} duplicate tickets removed, ${result.groupedTicketsCreated} grouped tickets created.`
        );
      }
    } catch (err) {
      console.error("Cleanup failed:", err);
      toast.error("Cleanup failed. Check console for details.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ticket Cleanup</CardTitle>
        <CardDescription>
          Remove duplicate individual tickets from Noch+ submissions and consolidate them into grouped tickets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={running}
          className="gap-2"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {running ? "Cleaning up…" : "Clean Up Duplicate Submission Tickets"}
        </Button>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Cleanup</DialogTitle>
              <DialogDescription>
                This will delete all duplicate individual tickets from Noch+ submissions and keep one grouped ticket per submission. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleCleanup}>Confirm Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
