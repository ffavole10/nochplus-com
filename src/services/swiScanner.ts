import { supabase } from "@/integrations/supabase/client";

interface Ticket {
  id?: string;
  ticketId?: string;
  chargerModel?: string;
  title?: string;
  description?: string;
  recommendation?: string;
  priority?: string;
  account?: string;
  daysOld?: number;
  location?: string;
}

interface SWIMatchResult {
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
}

interface SWIValidationResult {
  is_appropriate: boolean;
  confidence: number;
  feedback: string;
  suggestions: string[];
}

interface BatchResult {
  ticketId: string;
  match: SWIMatchResult | null;
  status: "success" | "error";
  error?: string;
}

/**
 * Use Claude AI to match a ticket with the most appropriate SWI document
 */
export async function matchSWIWithClaude(
  ticket: Ticket,
  swiCatalog: unknown[]
): Promise<SWIMatchResult> {
  const prompt = `You are an expert EV charger service technician analyzing service tickets to match them with the correct Service Work Instructions (SWI) document.

TICKET INFORMATION:
- Ticket ID: ${ticket.ticketId || ticket.id}
- Charger Model: ${ticket.chargerModel || "Unknown"}
- Issue Title: ${ticket.title || ""}
- Issue Description: ${ticket.description || ticket.recommendation || ""}
- Priority: ${ticket.priority || "Unknown"}
- Account: ${ticket.account || "Unknown"}
- Days Open: ${ticket.daysOld || 0}
- Location: ${ticket.location || "Unknown"}

AVAILABLE SWI DOCUMENTS:
${JSON.stringify(swiCatalog, null, 2)}

TASK:
Analyze the ticket and determine which SWI document is most appropriate. Consider:
1. Charger model compatibility
2. Issue type match
3. Priority level appropriateness
4. Required service category
5. Estimated time and complexity

Respond with ONLY a valid JSON object in this exact format:
{
  "matched_swi_id": "swi_xxx",
  "confidence": 95,
  "reasoning": "Clear explanation of why this SWI matches",
  "key_factors": ["factor 1", "factor 2", "factor 3"],
  "estimated_service_time": "2-4 hours",
  "required_parts": ["part 1", "part 2"],
  "alternative_swis": ["swi_yyy"],
  "warnings": ["any special considerations or safety notes"]
}

If no good match exists (confidence < 50), set matched_swi_id to null and explain why in reasoning.`;

  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    },
  });

  if (error) {
    throw new Error(`AI matching failed: ${error.message}`);
  }

  const responseText = data?.content || "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  const result: SWIMatchResult = JSON.parse(jsonMatch[0]);
  result.timestamp = new Date().toISOString();
  result.model_used = data?.model || "claude-sonnet-4";

  return result;
}

/**
 * Batch match multiple tickets
 */
export async function batchMatchSWI(
  tickets: Ticket[],
  swiCatalog: unknown[],
  onProgress?: (current: number, total: number, match: SWIMatchResult) => void
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

      if (onProgress) {
        onProgress(i + 1, tickets.length, match);
      }

      // Small delay between requests to avoid rate limits
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

TICKET: ${JSON.stringify(ticket, null, 2)}

SELECTED SWI: ${JSON.stringify(selectedSWI, null, 2)}

Is this SWI appropriate? Respond with JSON:
{
  "is_appropriate": true,
  "confidence": 85,
  "feedback": "explanation",
  "suggestions": ["alternative if not appropriate"]
}`;

    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512,
      },
    });

    if (error) throw error;

    const jsonMatch = data?.content?.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error("SWI validation error:", error);
    return null;
  }
}
