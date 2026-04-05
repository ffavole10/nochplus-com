import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Upload, Search, Check } from "lucide-react";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useCampaign, useChargerRecords, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useUploadFlow } from "@/hooks/useUploadFlow";
import { ImportPhase } from "@/components/upload/ImportPhase";
import { MapValidatePhase } from "@/components/upload/MapValidatePhase";
import { ConfirmPhase } from "@/components/upload/ConfirmPhase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Database } from "lucide-react";

const STEPS = [
  { number: 1, label: "Import File" },
  { number: 2, label: "Map & Validate" },
  { number: 3, label: "Confirm" },
];

export default function CampaignUpload() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { selectedCampaignName } = useCampaignContext();
  const { data: campaign } = useCampaign(campaignId || null);
  const { data: existingRecords = [] } = useChargerRecords(campaignId || null);
  const updateCampaign = useUpdateCampaign();

  const { state, parseFile, parsePastedData, updateMapping, updateCell, setPhase, reset, getMappedFieldValue } = useUploadFlow();
  const [importing, setImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [replacing, setReplacing] = useState(false);

  const hasExistingData = existingRecords.length > 0 && state.phase === 1 && !replacing;

  const handleImport = useCallback(async () => {
    if (!campaignId) return;
    setImporting(true);

    try {
      // Delete existing charger_records and campaign_chargers for this campaign
      if (existingRecords.length > 0) {
        await supabase.from("campaign_chargers").delete().eq("campaign_id", campaignId);
        await supabase.from("charger_records").delete().eq("campaign_id", campaignId);
      }

      // Batch insert charger_records
      const BATCH = 100;
      const allRecordIds: string[] = [];

      for (let i = 0; i < state.mappedRows.length; i += BATCH) {
        const batch = state.mappedRows.slice(i, i + BATCH).map(row => ({
          campaign_id: campaignId,
          station_id: getMappedFieldValue(row, "charger_id_external") || `CHG-${Math.random().toString(36).slice(2, 8)}`,
          station_name: getMappedFieldValue(row, "site_name") || null,
          serial_number: getMappedFieldValue(row, "charger_id_external") || null,
          model: getMappedFieldValue(row, "charger_model") || null,
          address: getMappedFieldValue(row, "address") || null,
          city: getMappedFieldValue(row, "city") || null,
          state: getMappedFieldValue(row, "state") || null,
          zip: getMappedFieldValue(row, "zip") || null,
          site_name: getMappedFieldValue(row, "site_name") || null,
          latitude: parseFloat(getMappedFieldValue(row, "latitude")) || null,
          longitude: parseFloat(getMappedFieldValue(row, "longitude")) || null,
          status: getMappedFieldValue(row, "status") || null,
          start_date: getMappedFieldValue(row, "install_date") || null,
          service_date: getMappedFieldValue(row, "last_service_date") || null,
          summary: getMappedFieldValue(row, "notes") || null,
          max_power: null,
          service_required: 0,
          serviced_qty: 0,
          report_url: null,
          power_cabinet_report_url: null,
          power_cabinet_status: null,
          power_cabinet_summary: null,
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
        }));

        const { data, error } = await supabase.from("charger_records").insert(batch).select("id");
        if (error) throw error;
        if (data) allRecordIds.push(...data.map(d => d.id));
      }

      // Create campaign_chargers linking records
      for (let i = 0; i < allRecordIds.length; i += BATCH) {
        const chargerBatch = allRecordIds.slice(i, i + BATCH).map(id => ({
          campaign_id: campaignId,
          charger_id: id,
          priority: "low",
          in_scope: true,
          status: "pending",
        }));

        const { error } = await supabase.from("campaign_chargers").insert(chargerBatch);
        if (error) throw error;
      }

      // Update campaign stats and stage_status
      const stateSet = new Set<string>();
      state.mappedRows.forEach(r => {
        const s = getMappedFieldValue(r, "state");
        if (s) stateSet.add(s.toUpperCase());
      });

      const currentStatus = (campaign?.stage_status as Record<string, string>) || {};
      await updateCampaign.mutateAsync({
        id: campaignId,
        total_chargers: allRecordIds.length,
        stage_status: { ...currentStatus, upload: "complete" } as any,
      });

      setImportedCount(allRecordIds.length);
      setImportComplete(true);
      toast.success(`Successfully imported ${allRecordIds.length} chargers`);
    } catch (e: any) {
      console.error("Import failed:", e);
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }, [campaignId, state.mappedRows, getMappedFieldValue, existingRecords, campaign, updateCampaign]);

  // Success state
  if (importComplete) {
    const stateCount = new Set(
      state.mappedRows.map(r => getMappedFieldValue(r, "state")).filter(Boolean)
    ).size;
    const siteCount = new Set(
      state.mappedRows.map(r => getMappedFieldValue(r, "site_name")).filter(Boolean)
    ).size;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Import Complete</h2>
        <p className="text-muted-foreground max-w-md">
          Successfully imported <strong>{importedCount}</strong> chargers across{" "}
          <strong>{siteCount}</strong> sites in <strong>{stateCount}</strong> states.
        </p>
        <Button
          onClick={() => navigate(`/campaigns/${campaignId}/scan`)}
          className="gap-2"
        >
          Continue to Scan <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Existing data view (when no upload in progress)
  if (hasExistingData && state.phase === 1 && !importComplete) {
    return (
      <div className="flex-1 flex flex-col">
        <UploadStepper phase={1} />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Database className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Dataset Imported</h2>
          <p className="text-muted-foreground">
            This campaign has <strong>{existingRecords.length}</strong> chargers imported.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setReplacing(true)}>
              Replace Dataset
            </Button>
            <Button onClick={() => navigate(`/campaigns/${campaignId}/scan`)} className="gap-2">
              Continue to Scan <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <UploadStepper phase={state.phase} />

      {state.phase === 1 && (
        <ImportPhase
          hasExistingData={existingRecords.length > 0}
          existingCount={existingRecords.length}
          onFileParsed={parseFile}
          onPastedData={parsePastedData}
        />
      )}

      {state.phase === 2 && (
        <MapValidatePhase
          headers={state.headers}
          mappings={state.mappings}
          rows={state.mappedRows}
          stats={state.stats}
          onUpdateMapping={updateMapping}
          onUpdateCell={updateCell}
          onContinue={() => setPhase(3)}
          onBack={() => reset()}
        />
      )}

      {state.phase === 3 && (
        <ConfirmPhase
          rows={state.mappedRows}
          mappings={state.mappings}
          stats={state.stats}
          importing={importing}
          onImport={handleImport}
          onBack={() => setPhase(2)}
        />
      )}
    </div>
  );
}

function UploadStepper({ phase }: { phase: number }) {
  return (
    <div className="px-6 py-3 border-b bg-card flex items-center justify-center gap-2">
      {STEPS.map((step, idx) => (
        <div key={step.number} className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            phase === step.number
              ? "bg-primary text-primary-foreground"
              : phase > step.number
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}>
            {phase > step.number ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">
                {step.number}
              </span>
            )}
            {step.label}
          </div>
          {idx < STEPS.length - 1 && (
            <div className={cn(
              "w-8 h-px",
              phase > step.number ? "bg-primary" : "bg-border"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
