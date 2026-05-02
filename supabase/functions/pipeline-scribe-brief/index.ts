// Pipeline Scribe — generates an account intelligence brief via Claude API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  deal_id: string;
}

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

    // Authenticate caller
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load deal + customer + ops snapshot
    const { data: deal, error: dealErr } = await supabase
      .from("deals")
      .select("*, customers:partner_id(*)")
      .eq("id", deal_id)
      .single();
    if (dealErr || !deal) throw new Error(dealErr?.message || "Deal not found");

    const { data: snapshot } = await supabase
      .from("account_ops_snapshot")
      .select("*")
      .eq("customer_id", (deal as any).partner_id)
      .maybeSingle();

    // Pull account strategy context
    const { data: strategy } = await supabase
      .from("account_strategies")
      .select("*")
      .eq("customer_id", (deal as any).partner_id)
      .maybeSingle();
    let strategyContext = "";
    if (strategy) {
      const { data: sPlays } = await supabase
        .from("strategy_plays")
        .select("title,status,owner,due_date")
        .eq("strategy_id", (strategy as any).id)
        .in("status", ["not_started", "in_progress"])
        .limit(3);
      const { data: sKpis } = await supabase
        .from("strategy_kpis")
        .select("name,current_value,target_value,is_deferred,is_primary")
        .eq("strategy_id", (strategy as any).id);
      const atRisk = (sKpis || []).filter((k: any) => {
        if (k.is_deferred || !k.is_primary || !k.target_value) return false;
        return Number(k.current_value) / Number(k.target_value) < 0.75;
      });
      strategyContext = `

ACCOUNT STRATEGY
- North Star: ${(strategy as any).north_star || "—"}
- Account types: ${((strategy as any).account_types || []).join(", ") || "—"}
- Current position: ${(strategy as any).current_position}
- Top open plays: ${(sPlays || []).map((p: any) => `${p.title} (${p.status})`).join("; ") || "—"}
- KPIs at risk: ${atRisk.map((k: any) => `${k.name} ${k.current_value}/${k.target_value}`).join("; ") || "none"}

When generating talking points and recommended next actions, REFERENCE the account strategy above. If the strategy has open plays, suggest actions that advance them.`;
    }


    const customer = (deal as any).customers || {};

    // Pull all internal contacts for this customer (primary + the rest).
    const { data: contactRows } = await supabase
      .from("contacts")
      .select("name,title,contact_type,email,is_primary")
      .eq("customer_id", (deal as any).partner_id)
      .order("is_primary", { ascending: false });
    const allContacts = contactRows || [];
    const primaryContact = allContacts.find((c: any) => c.is_primary) || null;

    const contactsBlock = allContacts.length === 0
      ? "- (no internal contacts on file)"
      : allContacts.map((c: any) => {
          const tag = c.is_primary ? "PRIMARY" : (c.contact_type || "champion").toUpperCase().replace(/_/g, " ");
          return `- [${tag}] ${c.name}${c.title ? ` — ${c.title}` : ""}${c.email ? ` <${c.email}>` : ""}`;
        }).join("\n");

    const prompt = `You are Scribe, the NOCH+ pipeline intelligence agent. Produce a sharp, actionable account brief for the rep working this deal.

DEAL
- Name: ${deal.deal_name}
- Stage: ${deal.stage}
- Value: $${Number(deal.value || 0).toLocaleString()}
- Predicted ARR: $${Number((deal as any).predicted_arr || 0).toLocaleString()}
- Owner: ${(deal as any).owner || "unassigned"}
- Next action: ${deal.next_action || "—"}
- Notes: ${(deal as any).notes || "—"}

CUSTOMER
- Company: ${customer.company || "—"}
- Industry: ${customer.industry || "—"}
- Website: ${customer.website_url || "—"}
- Description: ${customer.description || "—"}
- Primary contact: ${primaryContact ? `${primaryContact.name}${primaryContact.title ? ` (${primaryContact.title})` : ""}` : "—"}

INTERNAL CONTACT ROSTER
${contactsBlock}

LIVE OPS SNAPSHOT (NOCH+ network)
- Chargers: ${snapshot?.charger_count ?? 0}
- Sites: ${snapshot?.sites_count ?? 0}
- Incidents (30d): ${snapshot?.incidents_30d ?? 0}
- Uptime: ${Number(snapshot?.uptime_pct ?? 100).toFixed(1)}%
- Truck rolls (30d): ${snapshot?.truck_rolls_30d ?? 0}
- Estimated monthly NOCH+ savings: $${Number(snapshot?.estimated_monthly_savings ?? 0).toLocaleString()}

Use the full contact roster when relevant. If briefing on a deal in proposal stage, suggest who to engage at the customer (e.g., loop in the Decision Maker, prep the Technical Buyer, lean on the Champion to socialize internally). Reference contacts by name and role.

Return concise markdown with these sections:
## Executive Summary
## Why Now (urgency drivers)
## Talking Points (3–5 bullets)
## Suggested Next Step
## Risks & Watch-outs${strategyContext}`;

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      throw new Error(`Claude API ${claudeResp.status}: ${errText}`);
    }

    const claudeJson = await claudeResp.json();
    const briefMarkdown =
      claudeJson?.content?.[0]?.text ?? "(empty response)";

    // Persist
    const { data: inserted, error: insErr } = await supabase
      .from("agent_outputs")
      .insert({
        deal_id,
        agent_name: "scribe",
        output_type: "brief",
        content: { markdown: briefMarkdown, model: "claude-sonnet-4-5" },
        generated_by: userData.user.email || userData.user.id,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    return new Response(JSON.stringify({ output: inserted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scribe error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
