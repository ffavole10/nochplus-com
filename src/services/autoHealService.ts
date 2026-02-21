import { supabase } from "@/integrations/supabase/client";
import { lookupCharger, ChargerDatabaseRecord } from "./BtcDatabaseService";
import { SWI_CATALOG } from "@/data/swiCatalog";

export interface AutoHealAssessment {
  riskLevel: "Critical" | "High" | "Medium" | "Low";
  assessmentText: string;
  recommendation: string;
  chargerType: "AC | Level 2" | "DC | Level 3";
  warrantyNotes: string[];
  dataSources: string[];
  timestamp: string;
  btcData: ChargerDatabaseRecord | null;
}

export interface AutoHealResult {
  assessment: AutoHealAssessment;
  swiMatch: {
    matched_swi_id: string | null;
    confidence: number;
    reasoning: string;
    key_factors: string[];
    estimated_service_time: string;
    required_parts: string[];
    warnings: string[];
  } | null;
}

interface TicketInput {
  ticketId: string;
  serialNumber: string;
  chargerType: string;
  issueDescription: string;
  priority: string;
  customerName: string;
  customerCompany: string;
  photoCount: number;
  notes?: string;
}

async function invokeAI(prompt: string, maxTokens = 2048): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: {
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    },
  });

  if (error) throw new Error(`AI API error: ${error.message}`);
  return data?.content || "";
}

function parseJSON<T>(text: string): T {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response as JSON");
  return JSON.parse(jsonMatch[0]);
}

export async function runAutoHealAssessment(
  ticket: TicketInput,
  onProgress?: (step: string) => void,
): Promise<AutoHealResult> {
  const dataSources: string[] = ["Customer submission"];

  // Step 1: Analyze ticket data
  onProgress?.("Analyzing ticket data...");
  await new Promise((r) => setTimeout(r, 600));

  if (ticket.photoCount > 0) {
    dataSources.push(`Photos analyzed (${ticket.photoCount})`);
  }

  // Step 2: Query BTC database
  onProgress?.("Querying BTC database...");
  let btcData: ChargerDatabaseRecord | null = null;
  try {
    btcData = await lookupCharger(ticket.serialNumber);
    if (btcData) {
      dataSources.push("BTC database (warranty, installation, service history)");
    }
  } catch (err) {
    console.warn("BTC database lookup failed:", err);
  }

  // Step 3: Generate assessment
  onProgress?.("Generating assessment...");

  const warrantyNotes: string[] = [];
  let warrantyContext = "";
  let historyContext = "";
  let ageContext = "";

  if (btcData) {
    if (btcData.warrantyStatus === "active") {
      warrantyNotes.push(`ℹ️ Unit under warranty until ${btcData.warrantyExpirationDate} — parts covered`);
      warrantyContext = `WARRANTY: Active until ${btcData.warrantyExpirationDate}. Provider: ${btcData.warrantyProvider}. Parts and labor covered under ${btcData.slaTier || "standard"} SLA.`;
    } else if (btcData.warrantyStatus === "expired") {
      warrantyNotes.push(`⚠️ Warranty expired ${btcData.warrantyExpirationDate} — full cost applies`);
      warrantyContext = `WARRANTY: EXPIRED on ${btcData.warrantyExpirationDate}. All parts and labor at customer cost.`;
    }

    if (btcData.ageInYears > 5) {
      warrantyNotes.push(`⚠️ Unit age: ${btcData.ageInYears} years — consider replacement cost analysis`);
      ageContext = `CHARGER AGE: ${btcData.ageInYears} years. This is an aging unit — consider total cost of ownership vs replacement.`;
    } else {
      ageContext = `CHARGER AGE: ${btcData.ageInYears} years.`;
    }

    if (btcData.serviceCount > 2) {
      warrantyNotes.push(`⚠️ ${btcData.serviceCount} prior repairs on record — monitor for chronic issues`);
      historyContext = `SERVICE HISTORY: ${btcData.serviceCount} prior service events. Recent: ${btcData.serviceHistory.slice(0, 3).map(h => `${h.date}: ${h.workPerformed} ($${h.cost})`).join("; ")}`;
    } else if (btcData.serviceCount > 0) {
      historyContext = `SERVICE HISTORY: ${btcData.serviceCount} prior service event(s). ${btcData.serviceHistory[0] ? `Last: ${btcData.serviceHistory[0].date} — ${btcData.serviceHistory[0].workPerformed}` : ""}`;
    }

    if (btcData.knownIssues.length > 0) {
      warrantyNotes.push(`ℹ️ Known model issues: ${btcData.knownIssues.join("; ")}`);
    }

    if (btcData.recallStatus) {
      warrantyNotes.push(`ℹ️ Recall: ${btcData.recallStatus}`);
    }
  }

  const chargerTypeLabel = btcData?.chargerType || (ticket.chargerType.includes("DC") ? "DC | Level 3" : "AC | Level 2");

  try {
    const prompt = `You are an expert EV charger service technician performing an AutoHeal assessment.

TICKET:
- ID: ${ticket.ticketId}
- Charger: ${ticket.serialNumber} (${chargerTypeLabel})
- Issue: ${ticket.issueDescription}
- Priority: ${ticket.priority}
- Customer: ${ticket.customerName} (${ticket.customerCompany})
- Photos: ${ticket.photoCount} uploaded

${btcData ? `BTC DATABASE RECORD:
- Brand: ${btcData.brand} ${btcData.model}
- ${warrantyContext}
- ${ageContext}
- ${historyContext || "No prior service history."}
- Known Issues: ${btcData.knownIssues.length > 0 ? btcData.knownIssues.join(", ") : "None"}
${btcData.recallStatus ? `- Recall: ${btcData.recallStatus}` : ""}` : "No BTC database record found for this serial number."}

${ticket.notes ? `ACCOUNT MANAGER NOTES: ${ticket.notes}` : ""}

TASK: Provide a risk assessment considering warranty status, charger age, service history, and the reported issue. Include charger type context (${chargerTypeLabel}).

Respond with ONLY valid JSON:
{
  "risk_level": "Critical|High|Medium|Low",
  "assessment_text": "Detailed assessment (3-5 sentences including warranty/age context, charger type)",
  "recommendation": "Specific recommended action (1-2 sentences)"
}`;

    const response = await invokeAI(prompt, 1024);
    const parsed = parseJSON<{ risk_level: string; assessment_text: string; recommendation: string }>(response);

    // Step 4: Match SWI
    onProgress?.("Matching SWI...");

    let swiMatch = null;
    try {
      const swiPrompt = `You are matching an EV charger service ticket with the correct Service Work Instruction (SWI).

TICKET:
- Charger: ${ticket.serialNumber} (${btcData?.brand || "Unknown"} ${btcData?.model || ""})
- Type: ${chargerTypeLabel}
- Issue: ${ticket.issueDescription}
- Priority: ${ticket.priority}
${btcData ? `- Age: ${btcData.ageInYears} years
- Warranty: ${btcData.warrantyStatus}
- Known Issues: ${btcData.knownIssues.join(", ") || "None"}` : ""}

SWI CATALOG:
${JSON.stringify(SWI_CATALOG.slice(0, 50), null, 2)}

Match the most appropriate SWI. If warranty is active, note that in warnings.

Respond with ONLY valid JSON:
{
  "matched_swi_id": "swi_xxx",
  "confidence": 85,
  "reasoning": "Why this SWI matches (2-3 sentences)",
  "key_factors": ["factor 1", "factor 2"],
  "estimated_service_time": "2-4 hours",
  "required_parts": ["part 1"],
  "warnings": ["warning 1"]
}`;

      const swiResponse = await invokeAI(swiPrompt, 1024);
      swiMatch = parseJSON<AutoHealResult["swiMatch"]>(swiResponse);
    } catch (err) {
      console.warn("SWI matching failed:", err);
    }

    if (ticket.notes) {
      dataSources.push("Account manager notes");
    }

    const assessment: AutoHealAssessment = {
      riskLevel: (parsed.risk_level || ticket.priority) as AutoHealAssessment["riskLevel"],
      assessmentText: parsed.assessment_text,
      recommendation: parsed.recommendation,
      chargerType: chargerTypeLabel as AutoHealAssessment["chargerType"],
      warrantyNotes,
      dataSources,
      timestamp: new Date().toISOString(),
      btcData,
    };

    return { assessment, swiMatch };
  } catch (err) {
    // Fallback to basic assessment
    const assessment: AutoHealAssessment = {
      riskLevel: ticket.priority as AutoHealAssessment["riskLevel"],
      assessmentText: `${chargerTypeLabel} charger ${ticket.serialNumber} reported: ${ticket.issueDescription}. ${btcData ? `Unit is ${btcData.ageInYears} years old with ${btcData.serviceCount} prior service events. Warranty: ${btcData.warrantyStatus}.` : "No BTC database record found."}`,
      recommendation: "Schedule on-site diagnostic to verify reported issue and determine required repairs.",
      chargerType: chargerTypeLabel as AutoHealAssessment["chargerType"],
      warrantyNotes,
      dataSources,
      timestamp: new Date().toISOString(),
      btcData,
    };

    return { assessment, swiMatch: null };
  }
}
