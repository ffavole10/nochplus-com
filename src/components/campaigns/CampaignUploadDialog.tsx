import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { parseExcelFile, ParsedCampaign } from "@/lib/excelParser";
import { useCreateCampaign, useCreateChargerRecords } from "@/hooks/useCampaigns";
import { toast } from "sonner";

interface CampaignUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CUSTOMERS = [
  { value: "evgo", label: "EVgo" },
  { value: "chargepoint", label: "ChargePoint" },
  { value: "electrify_america", label: "Electrify America" },
  { value: "tesla", label: "Tesla" },
  { value: "rivian", label: "Rivian" },
  { value: "other", label: "Other" },
];

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export function CampaignUploadDialog({ open, onOpenChange, onSuccess }: CampaignUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsed, setIsParsed] = useState(false);
  
  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [customer, setCustomer] = useState("evgo");
  const [quarter, setQuarter] = useState("Q1");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const createCampaign = useCreateCampaign();
  const createChargerRecords = useCreateChargerRecords();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);
    setIsParsed(false);

    try {
      const parsed = await parseExcelFile(selectedFile);
      setParsedData(parsed);
      setCampaignName(parsed.name || selectedFile.name.replace(/\.(xlsx?|csv)$/i, ""));
      if (parsed.quarter) setQuarter(parsed.quarter);
      if (parsed.year) setYear(parsed.year.toString());
      setIsParsed(true);
      toast.success(`Parsed ${parsed.chargers.length} charger records`);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Failed to parse file. Please check the format.");
      setParsedData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!parsedData || parsedData.chargers.length === 0) {
      toast.error("No charger data to upload");
      return;
    }

    setIsLoading(true);

    try {
      // Calculate stats from parsed data
      const chargers = parsedData.chargers;
      const optimalCount = chargers.filter(c => c.status === "Optimal").length;
      const degradedCount = chargers.filter(c => c.status === "Degraded").length;
      const criticalCount = chargers.filter(c => c.status === "Critical").length;
      const totalServiced = chargers.reduce((sum, c) => sum + (c.serviced_qty || 0), 0);

      const percentOptimal = chargers.length > 0 ? (optimalCount / chargers.length) * 100 : 0;
      const percentCritical = chargers.length > 0 ? (criticalCount / chargers.length) * 100 : 0;
      const healthScore = Math.round(
        (percentOptimal * 0.5) + ((100 - percentCritical) * 0.3) + 100 * 0.2
      );

      // Create campaign
      const campaign = await createCampaign.mutateAsync({
        name: campaignName,
        customer,
        quarter,
        year: parseInt(year),
        start_date: null,
        end_date: null,
        total_chargers: chargers.length,
        total_serviced: totalServiced,
        optimal_count: optimalCount,
        degraded_count: degradedCount,
        critical_count: criticalCount,
        health_score: healthScore,
      });

      // Create charger records
      const chargerRecords = chargers.map(c => ({
        campaign_id: campaign.id,
        station_id: c.station_id,
        station_name: c.station_name,
        serial_number: c.serial_number,
        model: c.model,
        address: c.address,
        city: c.city,
        state: c.state,
        zip: c.zip,
        start_date: c.start_date,
        max_power: c.max_power,
        site_name: c.site_name,
        serviced_qty: c.serviced_qty,
        service_date: c.service_date,
        report_url: c.report_url,
        status: c.status,
        summary: c.summary,
        power_cabinet_report_url: c.power_cabinet_report_url,
        power_cabinet_status: c.power_cabinet_status,
        power_cabinet_summary: c.power_cabinet_summary,
        service_required: c.service_required,
        ccs_cable_issue: c.ccs_cable_issue,
        chademo_cable_issue: c.chademo_cable_issue,
        screen_damage: c.screen_damage,
        cc_reader_issue: c.cc_reader_issue,
        rfid_reader_issue: c.rfid_reader_issue,
        app_issue: c.app_issue,
        holster_issue: c.holster_issue,
        other_issue: c.other_issue,
        power_supply_issue: c.power_supply_issue,
        circuit_board_issue: c.circuit_board_issue,
        latitude: null,
        longitude: null,
      }));

      await createChargerRecords.mutateAsync(chargerRecords);

      toast.success(`Campaign "${campaignName}" created with ${chargers.length} chargers`);
      
      // Reset state
      setFile(null);
      setParsedData(null);
      setIsParsed(false);
      setCampaignName("");
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error("Failed to create campaign");
    } finally {
      setIsLoading(false);
    }
  }, [parsedData, campaignName, customer, quarter, year, createCampaign, createChargerRecords, onOpenChange, onSuccess]);

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setIsParsed(false);
    setCampaignName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Campaign Data
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file to create a new campaign with charger data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Campaign Data File</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="campaign-file"
                disabled={isLoading}
              />
              <label htmlFor="campaign-file" className="cursor-pointer">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Parsing file...</span>
                  </div>
                ) : isParsed && parsedData ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <span className="text-sm font-medium">{file?.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {parsedData.chargers.length} chargers found
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Drop file here or click to upload
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Supports .xlsx, .xls, .csv
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Campaign Details */}
          {isParsed && parsedData && (
            <>
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={customer} onValueChange={setCustomer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMERS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quarter</Label>
                  <Select value={quarter} onValueChange={setQuarter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTERS.map((q) => (
                        <SelectItem key={q} value={q}>
                          {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min="2020"
                  max="2030"
                />
              </div>

              {/* Preview Stats */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Preview</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Chargers</span>
                    <p className="font-semibold">{parsedData.chargers.length}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Optimal</span>
                    <p className="font-semibold text-green-500">
                      {parsedData.chargers.filter(c => c.status === "Optimal").length}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Critical</span>
                    <p className="font-semibold text-red-500">
                      {parsedData.chargers.filter(c => c.status === "Critical").length}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isParsed || isLoading || !campaignName}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Create Campaign"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
