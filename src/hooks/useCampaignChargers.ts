import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignChargerRow {
  id: string;
  campaign_id: string;
  charger_id: string;
  technician_id: string | null;
  priority: string;
  in_scope: boolean;
  sequence_order: number | null;
  estimated_hours: number | null;
  status: string;
  scan_notes: string | null;
  // Joined from charger_records
  station_id: string;
  station_name: string | null;
  serial_number: string | null;
  model: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  site_name: string | null;
  charger_status: string | null;
  start_date: string | null;
  service_date: string | null;
  summary: string | null;
  max_power: number | null;
}

export function useCampaignChargers(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaign_chargers", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const allRows: CampaignChargerRow[] = [];
      const PAGE = 1000;
      let from = 0;
      let keepGoing = true;

      while (keepGoing) {
        const { data, error } = await supabase
          .from("campaign_chargers")
          .select(`
            id, campaign_id, charger_id, technician_id, priority, in_scope,
            sequence_order, estimated_hours, status, scan_notes,
            charger_records!campaign_chargers_charger_id_fkey (
              station_id, station_name, serial_number, model, address,
              city, state, zip, latitude, longitude, site_name,
              status, start_date, service_date, summary, max_power
            )
          `)
          .eq("campaign_id", campaignId)
          .range(from, from + PAGE - 1);

        if (error) throw error;
        if (data) {
          for (const row of data) {
            const cr = row.charger_records as any;
            allRows.push({
              id: row.id,
              campaign_id: row.campaign_id,
              charger_id: row.charger_id,
              technician_id: row.technician_id,
              priority: row.priority,
              in_scope: row.in_scope,
              sequence_order: row.sequence_order,
              estimated_hours: row.estimated_hours,
              status: row.status,
              scan_notes: row.scan_notes,
              station_id: cr?.station_id || "",
              station_name: cr?.station_name || null,
              serial_number: cr?.serial_number || null,
              model: cr?.model || null,
              address: cr?.address || null,
              city: cr?.city || null,
              state: cr?.state || null,
              zip: cr?.zip || null,
              latitude: cr?.latitude || null,
              longitude: cr?.longitude || null,
              site_name: cr?.site_name || null,
              charger_status: cr?.status || null,
              start_date: cr?.start_date || null,
              service_date: cr?.service_date || null,
              summary: cr?.summary || null,
              max_power: cr?.max_power || null,
            });
          }
        }
        if (!data || data.length < PAGE) keepGoing = false;
        else from += PAGE;
      }
      return allRows;
    },
    enabled: !!campaignId,
  });
}

export function useUpdateCampaignCharger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Pick<CampaignChargerRow, "priority" | "in_scope" | "scan_notes" | "technician_id" | "estimated_hours" | "status" | "sequence_order">>) => {
      const { error } = await supabase.from("campaign_chargers").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign_chargers"] });
    },
  });
}

export function useBulkUpdateCampaignChargers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Pick<CampaignChargerRow, "priority" | "in_scope" | "scan_notes">> }) => {
      const BATCH = 100;
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const { error } = await supabase
          .from("campaign_chargers")
          .update(updates)
          .in("id", batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign_chargers"] });
    },
  });
}
