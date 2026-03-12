import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashContent(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return resp;
      if (resp.status === 429 || resp.status >= 500) {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        continue;
      }
      return resp;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error("Max retries exceeded");
}

const CATEGORY_MAP: Record<string, string> = {
  FLEET: "ev_specific", ELEC: "electrical_code", GOV: "permitting",
  UTIL: "utility_interconnection", REG: "ev_specific", INC: "incentives_rebates",
  MFR: "ev_specific", OTHER: "ev_specific",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create sync log entry
    const { data: logEntry } = await supabase
      .from("regulatory_sync_log")
      .insert({ sync_type: "scheduled" })
      .select("id")
      .single();

    let regionsUpdated = 0;
    let documentsAdded = 0;
    let changesDetected = 0;

    // Get all active regions due for sync
    const { data: regions } = await supabase
      .from("regulatory_regions")
      .select("*")
      .eq("is_active", true);

    for (const region of regions || []) {
      try {
        // Fetch DOE AFDC
        const lawsUrl = `https://developer.nrel.gov/api/afdc/laws.json?state=${region.state_code}&category=EVSE&limit=50&api_key=DEMO_KEY`;
        const lawsResp = await fetchWithRetry(lawsUrl);

        if (lawsResp.ok) {
          const lawsData = await lawsResp.json();
          const laws = lawsData.result || [];

          for (const law of laws) {
            const fullText = (law.text || "").slice(0, 10000);
            const hash = await hashContent(fullText);
            const sourceUrl = `https://afdc.energy.gov/laws/${law.id}`;

            const { data: existing } = await supabase
              .from("regulatory_documents")
              .select("id, version_hash")
              .eq("region_id", region.id)
              .eq("source_url", sourceUrl)
              .eq("is_current", true)
              .maybeSingle();

            if (existing && existing.version_hash === hash) continue;

            if (existing) {
              await supabase.from("regulatory_documents").update({ is_current: false }).eq("id", existing.id);
            }

            const category = CATEGORY_MAP[(law.type || "").toUpperCase()] || "ev_specific";

            const { data: newDoc } = await supabase
              .from("regulatory_documents")
              .insert({
                region_id: region.id,
                category,
                title: law.title,
                source_url: sourceUrl,
                source_name: "DOE AFDC",
                content_summary: fullText.slice(0, 500),
                full_text: fullText,
                version_hash: hash,
                effective_date: law.enacted_date || null,
                is_current: true,
              })
              .select("id")
              .single();

            if (newDoc) {
              await supabase.from("regulatory_changes").insert({
                region_id: region.id,
                document_id: newDoc.id,
                change_type: existing ? "updated" : "new",
                change_summary: `${existing ? "Updated" : "New"}: ${law.title}`,
                previous_hash: existing?.version_hash || null,
                new_hash: hash,
              });
              changesDetected++;
            }
            documentsAdded++;
          }
        }

        // Update sync timestamps
        const nextSync = new Date();
        nextSync.setDate(nextSync.getDate() + 7);
        await supabase.from("regulatory_regions").update({
          last_synced_at: new Date().toISOString(),
          next_sync_at: nextSync.toISOString(),
        }).eq("id", region.id);

        regionsUpdated++;
      } catch (err) {
        console.error(`Sync failed for region ${region.id}:`, err);
      }
    }

    // Update sync log
    if (logEntry) {
      await supabase.from("regulatory_sync_log").update({
        completed_at: new Date().toISOString(),
        regions_updated: regionsUpdated,
        documents_added: documentsAdded,
        changes_detected: changesDetected,
        status: "completed",
      }).eq("id", logEntry.id);
    }

    return new Response(
      JSON.stringify({ regionsUpdated, documentsAdded, changesDetected }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("sync-regional-regulations error:", error);
    return new Response(
      JSON.stringify({ error: "Sync failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
