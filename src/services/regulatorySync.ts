import { supabase } from "@/integrations/supabase/client";

// MOCK hash function — replace with crypto.subtle.digest when available
async function md5Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

const CATEGORY_MAP: Record<string, string> = {
  FLEET: "ev_specific",
  ELEC: "electrical_code",
  GOV: "permitting",
  UTIL: "utility_interconnection",
  REG: "ev_specific",
  INC: "incentives_rebates",
  MFR: "ev_specific",
  OTHER: "ev_specific",
};

function mapCategory(type?: string): string {
  if (!type) return "ev_specific";
  return CATEGORY_MAP[type.toUpperCase()] || "ev_specific";
}

// Exponential backoff fetch wrapper
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

interface AFDCLaw {
  id: number;
  title: string;
  text: string;
  enacted_date?: string;
  agency?: string;
  type?: string;
  state?: string;
}

interface AFDCResult {
  result: AFDCLaw[];
}

export async function syncRegionRegulations(regionId: string): Promise<{ documentsAdded: number; changesDetected: number }> {
  let documentsAdded = 0;
  let changesDetected = 0;

  // Load region
  const { data: region, error: regionError } = await supabase
    .from("regulatory_regions")
    .select("*")
    .eq("id", regionId)
    .single();

  if (regionError || !region) {
    console.error("Failed to load region:", regionError);
    return { documentsAdded, changesDetected };
  }

  try {
    // Fetch DOE AFDC laws for the state
    const lawsUrl = `https://developer.nrel.gov/api/afdc/laws.json?state=${region.state_code}&category=EVSE&limit=50&api_key=DEMO_KEY`;
    const lawsResp = await fetchWithRetry(lawsUrl);

    if (lawsResp.ok) {
      const lawsData: AFDCResult = await lawsResp.json();
      const laws = lawsData.result || [];

      for (const law of laws) {
        const fullText = (law.text || "").slice(0, 10000);
        const hash = await md5Hash(fullText);
        const sourceUrl = `https://afdc.energy.gov/laws/${law.id}`;

        // Check existing doc
        const { data: existing } = await supabase
          .from("regulatory_documents")
          .select("id, version_hash, is_current")
          .eq("region_id", regionId)
          .eq("source_url", sourceUrl)
          .eq("is_current", true)
          .maybeSingle();

        if (existing && existing.version_hash === hash) {
          continue; // Unchanged
        }

        if (existing && existing.version_hash !== hash) {
          // Mark old as not current
          await supabase
            .from("regulatory_documents")
            .update({ is_current: false })
            .eq("id", existing.id);

          // Insert new version
          const { data: newDoc } = await supabase
            .from("regulatory_documents")
            .insert({
              region_id: regionId,
              category: mapCategory(law.type),
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
              region_id: regionId,
              document_id: newDoc.id,
              change_type: "updated",
              change_summary: `Updated: ${law.title}`,
              previous_hash: existing.version_hash,
              new_hash: hash,
            });
            changesDetected++;
          }
          documentsAdded++;
        } else {
          // New document
          const { data: newDoc } = await supabase
            .from("regulatory_documents")
            .insert({
              region_id: regionId,
              category: mapCategory(law.type),
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
              region_id: regionId,
              document_id: newDoc.id,
              change_type: "new",
              change_summary: `New regulation: ${law.title}`,
              new_hash: hash,
            });
            changesDetected++;
          }
          documentsAdded++;
        }
      }
    }
  } catch (err) {
    console.error(`DOE AFDC fetch failed for ${region.state_code}:`, err);
  }

  // Fetch federal eCFR if this is a federal region
  if (region.region_type === "federal") {
    try {
      const ecfrUrl = `https://www.ecfr.gov/api/versioner/v1/search?query=electric+vehicle+charging+station&per_page=20`;
      const ecfrResp = await fetchWithRetry(ecfrUrl);

      if (ecfrResp.ok) {
        const ecfrData = await ecfrResp.json();
        const results = ecfrData.results || [];

        for (const item of results.slice(0, 20)) {
          const title = item.headings?.title || item.full_text_excerpt || "Federal EV Regulation";
          const fullText = (item.full_text_excerpt || "").slice(0, 10000);
          const hash = await md5Hash(fullText);

          const { data: existing } = await supabase
            .from("regulatory_documents")
            .select("id, version_hash")
            .eq("region_id", regionId)
            .eq("title", title)
            .eq("is_current", true)
            .maybeSingle();

          if (existing && existing.version_hash === hash) continue;

          if (existing) {
            await supabase.from("regulatory_documents").update({ is_current: false }).eq("id", existing.id);
          }

          const { data: newDoc } = await supabase
            .from("regulatory_documents")
            .insert({
              region_id: regionId,
              category: "electrical_code",
              title,
              source_url: item.html_url || null,
              source_name: "eCFR",
              content_summary: fullText.slice(0, 500),
              full_text: fullText,
              version_hash: hash,
              is_current: true,
            })
            .select("id")
            .single();

          if (newDoc) {
            await supabase.from("regulatory_changes").insert({
              region_id: regionId,
              document_id: newDoc.id,
              change_type: existing ? "updated" : "new",
              change_summary: `${existing ? "Updated" : "New"}: ${title}`,
              previous_hash: existing?.version_hash || null,
              new_hash: hash,
            });
            changesDetected++;
          }
          documentsAdded++;
        }
      }
    } catch (err) {
      console.error("eCFR fetch failed:", err);
    }
  }

  // Update region sync timestamps
  const nextSync = new Date();
  nextSync.setDate(nextSync.getDate() + 7);

  await supabase
    .from("regulatory_regions")
    .update({
      last_synced_at: new Date().toISOString(),
      next_sync_at: nextSync.toISOString(),
    })
    .eq("id", regionId);

  return { documentsAdded, changesDetected };
}

export async function syncAllActiveRegions(): Promise<{
  regionsUpdated: number;
  documentsAdded: number;
  changesDetected: number;
}> {
  const { data: regions } = await supabase
    .from("regulatory_regions")
    .select("id")
    .eq("is_active", true);

  let regionsUpdated = 0;
  let totalDocsAdded = 0;
  let totalChanges = 0;

  for (const region of regions || []) {
    try {
      const result = await syncRegionRegulations(region.id);
      totalDocsAdded += result.documentsAdded;
      totalChanges += result.changesDetected;
      regionsUpdated++;
    } catch (err) {
      console.error(`Sync failed for region ${region.id}:`, err);
    }
  }

  return {
    regionsUpdated,
    documentsAdded: totalDocsAdded,
    changesDetected: totalChanges,
  };
}

// Build regulatory context for a ticket based on its location
export async function buildTicketRegulatoryContext(
  ticketId: string,
  state: string,
  city?: string,
): Promise<void> {
  if (!state) return;

  const stateCode = state.length === 2 ? state.toUpperCase() : getStateCode(state);
  if (!stateCode) return;

  // Find matching regions (federal + state + any matching city)
  const { data: regions } = await supabase
    .from("regulatory_regions")
    .select("id, name, region_type, state_code")
    .eq("is_active", true)
    .or(`region_type.eq.federal,state_code.eq.${stateCode}`);

  if (!regions || regions.length === 0) return;

  for (const region of regions) {
    // If it's a city-level region, only apply if city matches
    if (region.region_type === "city" && city && !region.name.toLowerCase().includes(city.toLowerCase())) {
      continue;
    }

    // Get current documents for this region
    const { data: docs } = await supabase
      .from("regulatory_documents")
      .select("id, category, title, content_summary")
      .eq("region_id", region.id)
      .eq("is_current", true);

    if (!docs || docs.length === 0) continue;

    const docIds = docs.map(d => d.id);
    const requiresPermit = docs.some(d => d.category === "permitting");
    const permitDoc = docs.find(d => d.category === "permitting");
    const requiresLicensed = docs.some(d => d.category === "contractor_licensing");
    const licensingDoc = docs.find(d => d.category === "contractor_licensing");
    const incentiveDoc = docs.find(d => d.category === "incentives_rebates");
    const complianceFlags = docs
      .filter(d => ["electrical_code", "ada_compliance", "environmental"].includes(d.category))
      .map(d => d.title);

    await supabase.from("ticket_regulatory_context").insert({
      ticket_id: ticketId,
      region_id: region.id,
      applicable_docs: docIds,
      requires_permit: requiresPermit,
      permit_authority: permitDoc?.content_summary?.slice(0, 200) || null,
      requires_licensed_contractor: requiresLicensed,
      licensing_requirement: licensingDoc?.content_summary?.slice(0, 200) || null,
      available_incentives: incentiveDoc?.content_summary?.slice(0, 500) || null,
      compliance_flags: complianceFlags,
      max_prompt_version: "1.0",
    });
  }
}

// Get regulatory context text for Max agent injection
export async function getRegulatoryContextForPrompt(ticketId: string): Promise<string | null> {
  const { data: contexts } = await supabase
    .from("ticket_regulatory_context")
    .select(`
      *,
      regulatory_regions!inner (name, state_code, region_type)
    `)
    .eq("ticket_id", ticketId);

  if (!contexts || contexts.length === 0) return null;

  let block = "JURISDICTION CONTEXT:\n";

  for (const ctx of contexts) {
    const region = (ctx as any).regulatory_regions;
    block += `\nThis job is located in ${region?.name || "Unknown Region"}.\n`;
    block += `The following regulations apply:\n`;

    // Fetch applicable docs
    if (ctx.applicable_docs && (ctx.applicable_docs as string[]).length > 0) {
      const { data: docs } = await supabase
        .from("regulatory_documents")
        .select("category, title, content_summary")
        .in("id", ctx.applicable_docs as string[]);

      if (docs) {
        for (const doc of docs) {
          block += `\nCategory: ${doc.category}\n`;
          block += `Regulation: ${doc.title}\n`;
          block += `Key Requirements: ${doc.content_summary?.slice(0, 300) || "N/A"}\n`;
        }
      }
    }

    block += `\nCompliance Requirements:\n`;
    block += `- Permit required: ${ctx.requires_permit ? "yes" : "no"}${ctx.permit_authority ? ` — ${ctx.permit_authority}` : ""}\n`;
    block += `- Licensed contractor required: ${ctx.requires_licensed_contractor ? "yes" : "no"}${ctx.licensing_requirement ? ` — ${ctx.licensing_requirement}` : ""}\n`;

    if (ctx.available_incentives) {
      block += `\nAvailable Incentives:\n${ctx.available_incentives}\n`;
    }

    if (ctx.compliance_flags && (ctx.compliance_flags as string[]).length > 0) {
      block += `\nCompliance Flags: ${(ctx.compliance_flags as string[]).join(", ")}\n`;
    }
  }

  block += `\nWhen generating your SWI recommendation, cite applicable regulations by name. Flag any compliance requirements the technician must address. Note any available incentives relevant to this repair.`;

  return block;
}

// Default regions to seed
export const DEFAULT_REGIONS = [
  { region_type: "federal", name: "Federal (All States)", state_code: "US" },
  { region_type: "state", name: "California", state_code: "CA" },
  { region_type: "state", name: "Nevada", state_code: "NV" },
  { region_type: "state", name: "Washington", state_code: "WA" },
  { region_type: "state", name: "Texas", state_code: "TX" },
  { region_type: "state", name: "Florida", state_code: "FL" },
  { region_type: "state", name: "New York", state_code: "NY" },
];

export async function seedDefaultRegions(): Promise<void> {
  const { data: existing } = await supabase
    .from("regulatory_regions")
    .select("id")
    .limit(1);

  if (existing && existing.length > 0) return; // Already seeded

  await supabase.from("regulatory_regions").insert(DEFAULT_REGIONS);
}

// US state name → code mapping
function getStateCode(name: string): string | null {
  const states: Record<string, string> = {
    alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
    colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
    hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
    kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
    massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
    montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
    ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
    "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
    utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
    wisconsin: "WI", wyoming: "WY",
  };
  return states[name.toLowerCase()] || null;
}
