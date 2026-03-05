import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_ORDER = [
  "intake-validator",
  "diagnostic-agent",
  "swi-matcher",
  "resolution-agent",
  "learning-agent",
  "validation-agent",
];

const AGENT_LABELS: Record<string, string> = {
  "intake-validator": "Validating ticket data",
  "diagnostic-agent": "Running diagnostics",
  "swi-matcher": "Matching SWI documents",
  "resolution-agent": "Generating resolution",
  "learning-agent": "Processing learning patterns",
  "validation-agent": "Running quality validation",
};

function renderTemplate(template: string, vars: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const strVal = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? "N/A");
    // Replace {{ key }} patterns
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), strVal);
  }
  // Remove remaining template tags
  result = result.replace(/\{%[\s\S]*?%\}/g, "");
  result = result.replace(/\{\{[\s\S]*?\}\}/g, "N/A");
  return result;
}

function parseJSON(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { raw_response: text };
  try {
    return JSON.parse(match[0]);
  } catch {
    return { raw_response: text };
  }
}

async function callAI(
  apiKey: string,
  model: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
): Promise<{ content: string; tokensUsed: number; executionTimeMs: number }> {
  const start = Date.now();
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI gateway error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const tokensUsed = data.usage?.total_tokens || 0;
  return { content, tokensUsed, executionTimeMs: Date.now() - start };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ticketData } = await req.json();
    if (!ticketData || typeof ticketData !== "object" || Array.isArray(ticketData)) {
      return new Response(JSON.stringify({ error: "ticketData is required and must be an object" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate ticketData size to prevent abuse
    const ticketDataStr = JSON.stringify(ticketData);
    if (ticketDataStr.length > 100000) {
      return new Response(JSON.stringify({ error: "ticketData exceeds maximum size" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate expected field types and enforce limits
    const stringFields = ["ticket_id", "station_id", "site_name", "charger_model", "issue_description", "notes"];
    for (const field of stringFields) {
      if (ticketData[field] !== undefined) {
        if (typeof ticketData[field] !== "string") {
          return new Response(JSON.stringify({ error: `${field} must be a string` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (ticketData[field].length > 5000) {
          return new Response(JSON.stringify({ error: `${field} exceeds 5000 character limit` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const arrayFields = ["symptoms", "error_codes", "dataSources"];
    for (const field of arrayFields) {
      if (ticketData[field] !== undefined) {
        if (!Array.isArray(ticketData[field]) || ticketData[field].length > 20) {
          return new Response(JSON.stringify({ error: `${field} must be an array with at most 20 items` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        for (const item of ticketData[field]) {
          if (typeof item !== "string" || item.length > 500) {
            return new Response(JSON.stringify({ error: `Each item in ${field} must be a string under 500 chars` }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    // Reject deeply nested objects (max 2 levels)
    function checkDepth(obj: unknown, depth: number): boolean {
      if (depth > 3) return false;
      if (typeof obj === "object" && obj !== null) {
        for (const v of Object.values(obj)) {
          if (!checkDepth(v, depth + 1)) return false;
        }
      }
      return true;
    }
    if (!checkDepth(ticketData, 0)) {
      return new Response(JSON.stringify({ error: "ticketData is too deeply nested" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active agent configs
    const { data: agents, error: agentsError } = await supabase
      .from("ai_agent_prompts")
      .select("*")
      .eq("status", "active");

    if (agentsError) throw new Error(`Failed to load agents: ${agentsError.message}`);
    const agentMap = new Map((agents || []).map((a: any) => [a.agent_id, a]));

    // Fetch SWI catalog for SWI matcher and validator
    const { data: swiEntries } = await supabase
      .from("swi_catalog_entries")
      .select("id, title, filename, folder, description, charger_models, issue_types, service_categories, priority, estimated_time, required_parts");

    const swiLibrary = swiEntries || [];

    // Use SSE for progress
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(event: string, data: unknown) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        }

        const results: Record<string, unknown> = {};
        let overallSuccess = true;
        let failedAgent = "";

        try {
          for (const agentId of AGENT_ORDER) {
            const agentConfig = agentMap.get(agentId);
            if (!agentConfig) {
              sendEvent("step", { agentId, status: "skipped", label: AGENT_LABELS[agentId] || agentId });
              continue;
            }

            sendEvent("step", { agentId, status: "running", label: AGENT_LABELS[agentId] || agentId });

            // Build template variables
            const templateVars: Record<string, unknown> = {
              ...ticketData,
              // Pass previous agent results
              diagnostic_results: results["diagnostic-agent"] || "N/A",
              // Extract specific fields from diagnostic results for SWI matcher
              primary_issue: (results["diagnostic-agent"] as any)?.diagnosis?.primary_issue
                || (results["diagnostic-agent"] as any)?.primary_issue
                || ticketData.issue_description
                || "N/A",
              root_cause: (results["diagnostic-agent"] as any)?.diagnosis?.root_cause
                || (results["diagnostic-agent"] as any)?.root_cause
                || "N/A",
              swi_recommendations: results["swi-matcher"] || "N/A",
              swi_library_json: JSON.stringify(swiLibrary.slice(0, 150)),
              swi_count: swiLibrary.length,
              autoheal_full_output: JSON.stringify(results),
              // Placeholders for data not yet available
              parts_inventory: "Parts inventory not yet configured",
              technician_locations: "Technician locations not yet configured",
              original_assessment: results["resolution-agent"] || "N/A",
              predicted_swi: (results["swi-matcher"] as any)?.recommendations?.[0]?.swi_code || "N/A",
              predicted_issue: (results["diagnostic-agent"] as any)?.diagnosis?.primary_issue || "N/A",
              predicted_hours: "N/A",
              predicted_parts: "N/A",
              predicted_cost: "N/A",
              actual_issue: "N/A",
              actual_swi: "N/A",
              actual_hours: "N/A",
              actual_parts: "N/A",
              actual_cost: "N/A",
              technician_notes: "N/A",
              success_status: "N/A",
            };

            const renderedPrompt = renderTemplate(agentConfig.template, templateVars);

            try {
              const { content, tokensUsed, executionTimeMs } = await callAI(
                LOVABLE_API_KEY,
                agentConfig.model || "google/gemini-2.5-flash",
                renderedPrompt,
                Number(agentConfig.temperature) || 0.3,
                agentConfig.max_tokens || 1500,
              );

              const parsed = parseJSON(content);
              results[agentId] = parsed;

              // Log execution
              await supabase.from("ai_execution_log").insert({
                agent_id: agentId,
                ticket_id: ticketData.ticket_id || null,
                status: "success",
                input_data: { ticket_id: ticketData.ticket_id },
                output_data: parsed,
                tokens_used: tokensUsed,
                execution_time_ms: executionTimeMs,
                confidence_score: (parsed as any).confidence_level || (parsed as any).quality_score || null,
              });

              sendEvent("step", { agentId, status: "done", label: AGENT_LABELS[agentId] || agentId, result: parsed });

              // Check intake validation — warn but continue pipeline
              if (agentId === "intake-validator" && (parsed as any).proceed_to_diagnostic === false) {
                sendEvent("warning", {
                  agent: agentId,
                  message: `Some data is missing (${((parsed as any).missing_fields || []).join(", ")}), proceeding with available information`,
                  validation: parsed,
                });
                // Continue pipeline — don't break
              }

              // Check final validation
              if (agentId === "validation-agent" && (parsed as any).validation_result === "fail") {
                sendEvent("warning", {
                  agent: agentId,
                  message: "Quality validation failed",
                  issues: (parsed as any).issues_found,
                });
              }
            } catch (aiErr) {
              const errMsg = aiErr instanceof Error ? aiErr.message : "Unknown AI error";
              sendEvent("step", { agentId, status: "error", label: AGENT_LABELS[agentId] || agentId, error: errMsg });

              await supabase.from("ai_execution_log").insert({
                agent_id: agentId,
                ticket_id: ticketData.ticket_id || null,
                status: "error",
                input_data: { ticket_id: ticketData.ticket_id },
                output_data: { error: errMsg },
              });

              // For critical agents, stop; for learning agent, continue
              if (agentId !== "learning-agent") {
                overallSuccess = false;
                failedAgent = agentId;
                sendEvent("error", { agent: agentId, message: errMsg });
                break;
              }
            }
          }

          // Build final assessment from results
          const diagnostic = results["diagnostic-agent"] as any || {};
          const swiMatch = results["swi-matcher"] as any || {};
          const resolution = results["resolution-agent"] as any || {};
          const validation = results["validation-agent"] as any || {};

          const confidence = resolution?.confidence_metrics?.overall_confidence
            || diagnostic?.diagnosis?.confidence_level
            || validation?.quality_score
            || 75;

          const flags: string[] = [];
          if (confidence < 70) flags.push("⚠️ Confidence below 70% — recommend human review");
          if (validation?.flags_added) flags.push(...validation.flags_added);
          if (swiMatch?.no_swi_match) flags.push("⚠️ No exact SWI match found");

          const finalResult = {
            success: overallSuccess,
            failedAgent: overallSuccess ? null : failedAgent,
            assessment: {
              riskLevel: resolution?.assessment_summary?.risk_level || diagnostic?.risk_assessment?.safety_risk || "medium",
              statusBadge: resolution?.assessment_summary?.status_badge || "Needs Attention",
              summary: resolution?.assessment_summary?.one_line_summary || diagnostic?.diagnosis?.primary_issue || "Assessment generated",
              detailedAssessment: resolution?.detailed_assessment || diagnostic?.diagnosis?.root_cause || "See diagnostic results for details.",
              recommendation: resolution?.recommendation || "Schedule on-site diagnostic.",
              confidence,
              generatedAt: new Date().toISOString(),
              generatedBy: "AutoHeal",
              dataSources: resolution?.data_sources_used || ticketData.dataSources || ["Customer submission"],
            },
            swiMatch: swiMatch?.recommendations?.[0] ? {
              code: swiMatch.recommendations[0].swi_code,
              title: swiMatch.recommendations[0].swi_title,
              confidence: swiMatch.recommendations[0].confidence_score,
              estimatedHours: swiMatch.recommendations[0].estimated_hours,
              partsRequired: swiMatch.recommendations[0].parts_required || [],
              safetyWarnings: swiMatch.recommendations[0].safety_warnings || [],
            } : null,
            costEstimate: resolution?.cost_breakdown || null,
            safetyWarnings: resolution?.safety_warnings || [],
            flags,
            agentResults: results,
          };

          sendEvent("complete", finalResult);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          sendEvent("error", { agent: "system", message: msg });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("autoheal-assessment error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
