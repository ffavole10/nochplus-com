import { supabase } from "@/integrations/supabase/client";

interface Ticket {
  id?: string;
  ticketId?: string;
  chargerModel?: string;
  charger_model?: string;
  title?: string;
  description?: string;
  recommendation?: string;
  issue?: string;
  priority?: string;
  account?: string;
  daysOld?: number;
  age?: number;
  location?: string;
  group?: string;
}

export interface SWIMatchResult {
  matched_swi_id: string | null;
  confidence: number;
  reasoning: string;
  key_factors: string[];
  estimated_service_time: string;
  required_parts: string[];
  alternative_swis: string[];
  warnings: string[];
  timestamp?: string;
  model_used?: string;
  ticket_id?: string;
  error?: boolean;
}

interface SWIValidationResult {
  is_appropriate: boolean;
  confidence: number;
  feedback: string;
  suggestions: string[];
}

interface AISuggestionsResult {
  likely_issues: string[];
  diagnostic_steps: string[];
  safety_notes: string[];
}

export interface BatchResult {
  ticketId: string;
  match: SWIMatchResult | null;
  status: "success" | "error";
  error?: string;
}

async function invokeAI(prompt: string, maxTokens = 1024): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: {
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    },
  });

  if (error) {
    throw new Error(`AI API error: ${error.message}`);
  }

  return data?.content || "";
}

function parseJSON<T>(text: string): T {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }
  return JSON.parse(jsonMatch[0]);
}

/**
 * Use Claude AI to match a ticket with the most appropriate SWI document
 */
export async function matchSWIWithClaude(
  ticket: Ticket,
  swiCatalog: unknown[]
): Promise<SWIMatchResult> {
  try {
    const prompt = `You are an expert EV charger service technician analyzing service tickets to match them with the correct Service Work Instructions (SWI) document.

TICKET INFORMATION:
- Ticket ID: ${ticket.ticketId || ticket.id || "Unknown"}
- Charger Model: ${ticket.chargerModel || ticket.charger_model || "Unknown"}
- Issue Title: ${ticket.title || ""}
- Issue Description: ${ticket.description || ticket.recommendation || ticket.issue || ""}
- Priority: ${ticket.priority || "Unknown"}
- Account: ${ticket.account || "Unknown"}
- Days Open: ${ticket.daysOld || ticket.age || 0}
- Location: ${ticket.location || "Unknown"}
- Group/Category: ${ticket.group || "Unknown"}

AVAILABLE SWI DOCUMENTS:
${JSON.stringify(swiCatalog, null, 2)}

TASK:
Analyze the ticket and determine which SWI document is most appropriate. Consider:
1. Charger model compatibility (exact match preferred, "ALL" applies to any model)
2. Issue type keywords match (compare ticket description with SWI issueTypes)
3. Priority level appropriateness
4. Service category match
5. Estimated time and complexity

MATCHING RULES:
- If charger model matches exactly, give high weight
- If SWI has "ALL" in chargerModels, it applies to any charger
- Match keywords from ticket description against issueTypes array
- P1/P2 tickets need fast, critical repair SWIs
- P3/P4 tickets can use maintenance/preventive SWIs

Respond with ONLY a valid JSON object in this exact format:
{
  "matched_swi_id": "swi_xxx",
  "confidence": 95,
  "reasoning": "Clear explanation of why this SWI matches (2-3 sentences)",
  "key_factors": ["Exact model match: BTC2018", "Issue matches: station offline", "Priority appropriate: P2"],
  "estimated_service_time": "2-4 hours",
  "required_parts": ["part 1", "part 2"],
  "alternative_swis": ["swi_yyy", "swi_zzz"],
  "warnings": ["Safety note: Ensure power is disconnected"]
}

If no good match exists (confidence < 50), set matched_swi_id to null and explain why in reasoning.
Always provide confidence as a number between 0-100.`;

    const responseText = await invokeAI(prompt, 1500);
    console.log("Claude AI Response:", responseText);

    const result = parseJSON<SWIMatchResult>(responseText);

    if (!result.matched_swi_id && result.confidence >= 50) {
      throw new Error("Invalid AI response: no match found but confidence is high");
    }

    result.timestamp = new Date().toISOString();
    result.model_used = "claude-sonnet-4";
    result.ticket_id = ticket.id || ticket.ticketId;

    return result;
  } catch (error) {
    console.error("Claude AI matching error:", error);

    return {
      matched_swi_id: null,
      confidence: 0,
      reasoning: `AI matching failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      key_factors: [],
      estimated_service_time: "Unknown",
      required_parts: [],
      alternative_swis: [],
      warnings: ["Manual SWI selection required - AI matching unavailable"],
      error: true,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Batch match multiple tickets with progress tracking
 */
export async function batchMatchSWI(
  tickets: Ticket[],
  swiCatalog: unknown[],
  onProgress?: (current: number, total: number, match: SWIMatchResult | null) => void
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];

  for (let i = 0; i < tickets.length; i++) {
    try {
      const match = await matchSWIWithClaude(tickets[i], swiCatalog);
      results.push({
        ticketId: tickets[i].id || tickets[i].ticketId || "",
        match,
        status: "success",
      });
      onProgress?.(i + 1, tickets.length, match);

      if (i < tickets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      results.push({
        ticketId: tickets[i].id || tickets[i].ticketId || "",
        match: null,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      onProgress?.(i + 1, tickets.length, null);
    }
  }

  return results;
}

/**
 * Validate a manual SWI selection using Claude
 */
export async function validateSWISelection(
  ticket: Ticket,
  selectedSWI: unknown
): Promise<SWIValidationResult | null> {
  try {
    const prompt = `Review this SWI selection for appropriateness:

TICKET:
${JSON.stringify(
  {
    id: ticket.id || ticket.ticketId,
    chargerModel: ticket.chargerModel,
    description: ticket.description || ticket.recommendation,
    priority: ticket.priority,
  },
  null,
  2
)}

SELECTED SWI:
${JSON.stringify(selectedSWI, null, 2)}

Is this SWI appropriate? Respond with ONLY valid JSON:
{
  "is_appropriate": true,
  "confidence": 85,
  "feedback": "Good match because...",
  "suggestions": []
}`;

    const responseText = await invokeAI(prompt, 512);
    return parseJSON<SWIValidationResult>(responseText);
  } catch (error) {
    console.error("SWI validation error:", error);
    return null;
  }
}

/**
 * Get AI suggestions for a ticket without matching to specific SWI
 */
export async function getAISuggestions(ticket: Ticket): Promise<AISuggestionsResult | null> {
  try {
    const prompt = `Analyze this EV charger service ticket and provide diagnostic suggestions:

TICKET:
- Model: ${ticket.chargerModel || ticket.charger_model || "Unknown"}
- Issue: ${ticket.description || ticket.recommendation || ticket.issue || ""}
- Priority: ${ticket.priority || "Unknown"}
- Days Open: ${ticket.daysOld || ticket.age || 0}

Provide brief diagnostic suggestions and potential root causes. Respond with JSON:
{
  "likely_issues": ["issue 1", "issue 2"],
  "diagnostic_steps": ["step 1", "step 2"],
  "safety_notes": ["note 1"]
}`;

    const responseText = await invokeAI(prompt, 512);
    return parseJSON<AISuggestionsResult>(responseText);
  } catch (error) {
    console.error("AI suggestions error:", error);
    return null;
  }
}
