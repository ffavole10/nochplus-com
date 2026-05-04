// QBR document extraction via Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an extraction agent for NOCH+ QBR documents.
Parse the uploaded retrospective document and extract structured data matching the NOCH+ QBR template.
Return ONLY valid JSON matching the schema. No prose. If a field cannot be extracted, use null or [].
Do NOT extract financial data — that section is manual-only. Preserve the user's voice in extracted text.`;

const TOOL = {
  type: "function",
  function: {
    name: "extract_qbr",
    description: "Extract structured QBR data from a retrospective document.",
    parameters: {
      type: "object",
      properties: {
        strategic_narrative: { type: "string" },
        operational_metrics: {
          type: "object",
          properties: {
            active_customers_end: { type: ["number", "null"] },
            field_service_jobs_total: { type: ["number", "null"] },
            avg_jobs_per_week: { type: ["number", "null"] },
            technicians_end: { type: ["number", "null"] },
            connectors_engaged: { type: ["number", "null"] },
            states_operating: { type: ["number", "null"] },
          },
        },
        team_org: {
          type: "object",
          properties: {
            headcount_start: { type: ["number", "null"] },
            headcount_end: { type: ["number", "null"] },
            key_hires: { type: "array", items: { type: "string" } },
            key_departures: { type: "array", items: { type: "string" } },
            org_changes: { type: "string" },
          },
        },
        wins: { type: "array", items: { type: "string" } },
        lessons: { type: "array", items: { type: "string" } },
        decisions: { type: "array", items: { type: "string" } },
        focus_accounts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              account_name: { type: "string" },
              why_it_mattered: { type: "string" },
              what_we_achieved: { type: "string" },
              end_of_quarter_state: { type: "string" },
            },
            required: ["account_name"],
          },
        },
        platform_progress: {
          type: "object",
          properties: {
            neural_milestones: { type: "array", items: { type: "string" } },
            platform_features_shipped: { type: "array", items: { type: "string" } },
            argentina_hub_status: { type: "string" },
            ai_agent_status: { type: "string" },
          },
        },
        carry_forward: { type: "string" },
        risks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              risk_text: { type: "string" },
              mitigation: { type: "string" },
            },
            required: ["risk_text"],
          },
        },
      },
      required: ["strategic_narrative", "wins", "lessons"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { document_text, quarter, year } = await req.json();
    if (!document_text || typeof document_text !== "string") {
      return new Response(JSON.stringify({ error: "document_text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Cap to ~200k chars
    const text = document_text.slice(0, 200_000);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Quarter: ${quarter} ${year}\n\nDocument:\n${text}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_qbr" } },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error", res.status, body);
      return new Response(JSON.stringify({ error: "Extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = call?.function?.arguments || "{}";
    let extracted: any = {};
    try { extracted = JSON.parse(argsStr); } catch { extracted = {}; }

    return new Response(JSON.stringify({ extracted }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("qbr-extract error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
