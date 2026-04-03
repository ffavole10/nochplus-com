import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CampaignRates, DEFAULT_CAMPAIGN_RATES } from "@/services/campaignQuoteEngine";

export interface CostAssumptions extends CampaignRates {
  id?: string;
  campaign_id: string;
  rate_source: string;
  rate_card_id: string | null;
  overtime_daily_threshold: number;
  overtime_weekly_threshold: number;
  custom_overrides: Record<string, any> | null;
}

const DEFAULT_ASSUMPTIONS: Omit<CostAssumptions, "campaign_id"> = {
  ...DEFAULT_CAMPAIGN_RATES,
  rate_source: "custom",
  rate_card_id: null,
  overtime_daily_threshold: 8,
  overtime_weekly_threshold: 40,
  custom_overrides: null,
};

export function useCampaignCostAssumptions(campaignId: string | null) {
  const [assumptions, setAssumptions] = useState<CostAssumptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing or create defaults
  useEffect(() => {
    if (!campaignId) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("campaign_cost_assumptions")
        .select("*")
        .eq("campaign_id", campaignId)
        .limit(1);

      if (data && data.length > 0) {
        const row = data[0];
        setAssumptions({
          id: row.id,
          campaign_id: row.campaign_id,
          rate_source: row.rate_source || "custom",
          rate_card_id: row.rate_card_id,
          base_labor_rate: row.base_labor_rate,
          overtime_rate: row.overtime_rate,
          portal_to_portal_rate: row.portal_to_portal_rate,
          hotel_nightly_rate: row.hotel_nightly_rate,
          hotel_tax_pct: row.hotel_tax_pct,
          meal_per_diem: row.meal_per_diem,
          ev_rental_daily: row.ev_rental_daily,
          luggage_per_flight: row.luggage_per_flight,
          airfare_buffer_pct: row.airfare_buffer_pct,
          overtime_daily_threshold: row.overtime_daily_threshold,
          overtime_weekly_threshold: row.overtime_weekly_threshold,
          custom_overrides: row.custom_overrides as Record<string, any> | null,
        });
      } else {
        // Create default record
        const newRow = {
          campaign_id: campaignId,
          ...DEFAULT_CAMPAIGN_RATES,
          rate_source: "custom",
          overtime_daily_threshold: 8,
          overtime_weekly_threshold: 40,
        };
        const { data: inserted } = await supabase
          .from("campaign_cost_assumptions")
          .insert(newRow)
          .select()
          .single();

        if (inserted) {
          setAssumptions({
            id: inserted.id,
            campaign_id: inserted.campaign_id,
            rate_source: inserted.rate_source || "custom",
            rate_card_id: inserted.rate_card_id,
            base_labor_rate: inserted.base_labor_rate,
            overtime_rate: inserted.overtime_rate,
            portal_to_portal_rate: inserted.portal_to_portal_rate,
            hotel_nightly_rate: inserted.hotel_nightly_rate,
            hotel_tax_pct: inserted.hotel_tax_pct,
            meal_per_diem: inserted.meal_per_diem,
            ev_rental_daily: inserted.ev_rental_daily,
            luggage_per_flight: inserted.luggage_per_flight,
            airfare_buffer_pct: inserted.airfare_buffer_pct,
            overtime_daily_threshold: inserted.overtime_daily_threshold,
            overtime_weekly_threshold: inserted.overtime_weekly_threshold,
            custom_overrides: inserted.custom_overrides as Record<string, any> | null,
          });
        }
      }
      setLoading(false);
    })();
  }, [campaignId]);

  const updateField = useCallback(async (field: string, value: number | string | null) => {
    if (!assumptions?.id) return;
    setAssumptions(prev => prev ? { ...prev, [field]: value } : prev);
    setSaving(true);
    await supabase
      .from("campaign_cost_assumptions")
      .update({ [field]: value })
      .eq("id", assumptions.id);
    setSaving(false);
  }, [assumptions?.id]);

  const toRates = useCallback((): CampaignRates => {
    if (!assumptions) return DEFAULT_CAMPAIGN_RATES;
    return {
      base_labor_rate: assumptions.base_labor_rate,
      overtime_rate: assumptions.overtime_rate,
      portal_to_portal_rate: assumptions.portal_to_portal_rate,
      hotel_nightly_rate: assumptions.hotel_nightly_rate,
      hotel_tax_pct: assumptions.hotel_tax_pct,
      meal_per_diem: assumptions.meal_per_diem,
      ev_rental_daily: assumptions.ev_rental_daily,
      luggage_per_flight: assumptions.luggage_per_flight,
      airfare_buffer_pct: assumptions.airfare_buffer_pct,
    };
  }, [assumptions]);

  return { assumptions, loading, saving, updateField, toRates };
}
