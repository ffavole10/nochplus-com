// Scribe v2 — generates a structured JSON account brief via Claude API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SCRIBE_SYSTEM_PROMPT = `You are Scribe, the Account Intelligence Agent for NOCH+.

Generate a one-page account brief for the sales team to read before any meeting or outreach with this customer. The brief is consumed by NOCH+ leadership and sales reps who need fast, sharp context.

Output strict JSON in this format:
{
  "headline": "1-line summary of where this deal stands",
  "ops_reality": "2-3 sentences on their current ops state",
  "where_we_stand": "2-3 sentences on the relationship and deal state",
  "open_questions": ["...", "...", "..."],
  "risks": ["...", "..."],
  "recommended_next_action": "specific, actionable, owner-assigned",
  "talking_points": ["...", "...", "..."],
  "buying_signal_flag": "none | weak | moderate | strong",
  "buying_signal_reason": "if flagged, 1 sentence why"
}

RULES:
- No fluff. No filler. No generic statements.
- If data is missing, say "Not available" rather than guessing.
- Reference specific numbers from ops data wherever possible.
- Tone: confident, direct, operator-to-operator.
- Talking points must be sharp and tied to their ops reality, not generic value props.
- Max 3 talking points. Max 3 risks. Max 3 open questions.
- Buying signal flag: only mark "strong" or "moderate" if there's clear evidence in the data (incident spike, high charger count + recent stage progression, repeated activity). Default to "none" if uncertain.
- Output JSON only. No prose outside the JSON.`;

interface Body { deal_id: string; }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { deal_id } = (await req.json()) as Body;
    if (!deal_id) throw new Error("deal_id required");

    // Auth
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load deal + customer
    const { data: deal, error: dealErr } = await supabase
      .from("deals").select("*, customers:partner_id(*)").eq("id", deal_id).single();
    if (dealErr || !deal) throw new Error(dealErr?.message || "Deal not found");

    const { data: snapshot } = await supabase
      .from("account_ops_snapshot").select("*")
      .eq("customer_id", (deal as any).partner_id).maybeSingle();

    const { data: recentActivity } = await supabase
      .from("activities").select("activity_date, summary, outcome, type")
      .eq("deal_id", deal_id).order("activity_date", { ascending: false }).limit(10);

    const customer = (deal as any).customers || {};

    const daysInStage = Math.max(0, Math.floor(
      (Date.now() - new Date((deal as any).last_activity_at || deal.updated_at).getTime()) / 86400000
    ));

    const inputJson = {
      customer: {
        name: customer.company || "Not available",
        domain: customer.website_url || "Not available",
        customer_type: customer.customer_type || customer.customer_type_other || "Not available",
        primary_contact: customer.contact_name || "Not available",
      },
      deal: {
        stage: deal.stage,
        value: Number(deal.value || 0),
        predicted_close_date: (deal as any).predicted_close_date || (deal as any).expected_close_date || "Not available",
        owner: (deal as any).owner || "Not available",
        next_action: deal.next_action || "Not available",
        notes: (deal as any).notes || "Not available",
        days_in_stage: daysInStage,
      },
      ops_snapshot: snapshot ? {
        charger_count: snapshot.charger_count ?? 0,
        sites_count: snapshot.sites_count ?? 0,
        incidents_30d: snapshot.incidents_30d ?? 0,
        uptime_pct_estimated: Number(snapshot.uptime_pct ?? 100),
        truck_rolls_30d: snapshot.truck_rolls_30d ?? 0,
        estimated_monthly_savings: Number(snapshot.estimated_monthly_savings ?? 0),
      } : "Not available",
      recent_activity: (recentActivity || []).map((a: any) => ({
        timestamp: a.activity_date,
        note: [a.type, a.summary, a.outcome].filter(Boolean).join(" — "),
      })),
    };

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 2000,
        system: SCRIBE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(inputJson) }],
      }),
    });

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error("Claude error", claudeResp.status, errText);
      throw new Error(`Claude API ${claudeResp.status}`);
    }

    const claudeJson = await claudeResp.json();
    const raw = claudeJson?.content?.[0]?.text ?? "";

    // Extract JSON object — tolerate code fences
    let parsed: any = null;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch (e) {
      console.error("Failed to parse Scribe JSON:", raw);
      throw new Error("Scribe returned invalid JSON");
    }

    const { data: inserted, error: insErr } = await supabase
      .from("agent_outputs").insert({
        deal_id,
        agent_name: "scribe",
        output_type: "brief",
        content: parsed,
        generated_by: userData.user.email || userData.user.id,
      }).select().single();
    if (insErr) throw new Error(insErr.message);

    return new Response(JSON.stringify({ output: inserted }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-brief error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
