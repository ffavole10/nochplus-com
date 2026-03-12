import { lookupCharger, ChargerDatabaseRecord } from "./BtcDatabaseService";
import { supabase } from "@/integrations/supabase/client";
import { getRegulatoryContextForPrompt } from "./regulatorySync";

export interface AutoHealAssessment {
  riskLevel: "Critical" | "High" | "Medium" | "Low";
  assessmentText: string;
  recommendation: string;
  chargerType: "AC | Level 2" | "DC | Level 3";
  warrantyNotes: string[];
  dataSources: string[];
  timestamp: string;
  btcData: ChargerDatabaseRecord | null;
  confidence?: number;
  flags?: string[];
  swiMatchDetail?: {
    code: string;
    title: string;
    confidence: number;
    estimatedHours: string;
    partsRequired: unknown[];
    safetyWarnings: string[];
  } | null;
  costEstimate?: Record<string, unknown> | null;
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

export type AgentStepStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface AgentStep {
  agentId: string;
  label: string;
  status: AgentStepStatus;
  error?: string;
}

const AGENT_STEPS: { agentId: string; label: string }[] = [
  { agentId: "intake-validator", label: "Validating ticket data" },
  { agentId: "diagnostic-agent", label: "Running diagnostics" },
  { agentId: "swi-matcher", label: "Matching SWI documents" },
  { agentId: "resolution-agent", label: "Generating resolution" },
  { agentId: "learning-agent", label: "Processing learning patterns" },
  { agentId: "validation-agent", label: "Running quality validation" },
];

export async function runAutoHealAssessment(
  ticket: TicketInput,
  onProgress?: (step: string) => void,
  onStepUpdate?: (steps: AgentStep[]) => void,
): Promise<AutoHealResult> {
  const dataSources: string[] = ["Customer submission"];

  // BTC database lookup
  onProgress?.("Querying BTC database...");
  let btcData: ChargerDatabaseRecord | null = null;
  try {
    btcData = await lookupCharger(ticket.serialNumber);
    if (btcData) dataSources.push("BTC database (warranty, installation, service history)");
  } catch (err) {
    console.warn("BTC database lookup failed:", err);
  }

  if (ticket.photoCount > 0) dataSources.push(`Photos analyzed (${ticket.photoCount})`);
  if (ticket.notes) dataSources.push("Account manager notes");

  const chargerTypeLabel = btcData?.chargerType || (ticket.chargerType.includes("DC") ? "DC | Level 3" : "AC | Level 2");

  // Build ticket data for edge function
  const ticketData: Record<string, unknown> = {
    ticket_id: ticket.ticketId,
    customer_name: ticket.customerName,
    customer_company: ticket.customerCompany,
    charger_brand: btcData?.brand || "Unknown",
    charger_model: btcData?.model || "",
    charger_type: chargerTypeLabel,
    serial_number: ticket.serialNumber,
    issue_description: ticket.issueDescription,
    photos_count: ticket.photoCount,
    priority: ticket.priority,
    location: "See ticket details",
    warranty_status: btcData?.warrantyStatus || "unknown",
    warranty_expiration: btcData?.warrantyExpirationDate || "N/A",
    charger_age_years: btcData?.ageInYears || "unknown",
    service_count: btcData?.serviceCount || 0,
    service_history: btcData?.serviceHistory || [],
    known_issues: btcData?.knownIssues?.join(", ") || "None",
    installation_date: btcData?.installationDate || "N/A",
    climate_zone: "N/A",
    environment_type: "N/A",
    telemetry_data: "N/A",
    photos: [],
    dataSources,
    notes: ticket.notes || "",
  };

  // Initialize steps
  const steps: AgentStep[] = AGENT_STEPS.map((s) => ({ ...s, status: "pending" as AgentStepStatus }));
  onStepUpdate?.(steps);

  // Call the autoheal-assessment edge function via SSE
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autoheal-assessment`;

  // Get user session token for authenticated request
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ticketData }),
  });

  if (!resp.ok || !resp.body) {
    const errText = await resp.text().catch(() => "Unknown error");
    throw new Error(`AutoHeal API error (${resp.status}): ${errText}`);
  }

  // Parse SSE stream
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: Record<string, unknown> | null = null;
  let errorMsg: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 2);

      let eventType = "";
      let eventData = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) eventType = line.slice(7).trim();
        else if (line.startsWith("data: ")) eventData = line.slice(6);
      }

      if (!eventType || !eventData) continue;

      try {
        const parsed = JSON.parse(eventData);

        if (eventType === "step") {
          const idx = steps.findIndex((s) => s.agentId === parsed.agentId);
          if (idx >= 0) {
            steps[idx] = { ...steps[idx], status: parsed.status, error: parsed.error };
            onStepUpdate?.([...steps]);
            onProgress?.(parsed.label + "...");
          }
        } else if (eventType === "complete") {
          finalResult = parsed;
        } else if (eventType === "error") {
          errorMsg = parsed.message || "AutoHeal assessment failed";
        } else if (eventType === "warning") {
          console.warn("AutoHeal warning:", parsed);
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  if (errorMsg && !finalResult) {
    throw new Error(errorMsg);
  }

  if (!finalResult) {
    throw new Error("No result received from AutoHeal");
  }

  // Map edge function result to AutoHealResult
  const assessment = finalResult.assessment as Record<string, unknown> || {};
  const swiMatchData = finalResult.swiMatch as Record<string, unknown> | null;

  const warrantyNotes: string[] = [];
  if (btcData) {
    if (btcData.warrantyStatus === "active") {
      warrantyNotes.push(`ℹ️ Unit under warranty until ${btcData.warrantyExpirationDate} — parts covered`);
    } else if (btcData.warrantyStatus === "expired") {
      warrantyNotes.push(`⚠️ Warranty expired ${btcData.warrantyExpirationDate} — full cost applies`);
    }
    if (btcData.ageInYears > 5) {
      warrantyNotes.push(`⚠️ Unit age: ${btcData.ageInYears} years — consider replacement cost analysis`);
    }
    if (btcData.serviceCount > 2) {
      warrantyNotes.push(`⚠️ ${btcData.serviceCount} prior repairs on record — monitor for chronic issues`);
    }
    if (btcData.knownIssues?.length > 0) {
      warrantyNotes.push(`ℹ️ Known model issues: ${btcData.knownIssues.join("; ")}`);
    }
  }

  const riskMap: Record<string, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  const riskLevel = riskMap[String(assessment.riskLevel || "medium").toLowerCase()] || "Medium";

  const autoHealAssessment: AutoHealAssessment = {
    riskLevel: riskLevel as AutoHealAssessment["riskLevel"],
    assessmentText: String(assessment.detailedAssessment || assessment.summary || "Assessment generated by AutoHeal"),
    recommendation: String(assessment.recommendation || "Schedule on-site diagnostic"),
    chargerType: chargerTypeLabel as AutoHealAssessment["chargerType"],
    warrantyNotes,
    dataSources: (assessment.dataSources as string[]) || dataSources,
    timestamp: String(assessment.generatedAt || new Date().toISOString()),
    btcData,
    confidence: Number(assessment.confidence) || 75,
    flags: (finalResult.flags as string[]) || [],
    swiMatchDetail: swiMatchData ? {
      code: String(swiMatchData.code || ""),
      title: String(swiMatchData.title || ""),
      confidence: Number(swiMatchData.confidence) || 0,
      estimatedHours: String(swiMatchData.estimatedHours || "N/A"),
      partsRequired: (swiMatchData.partsRequired as unknown[]) || [],
      safetyWarnings: (swiMatchData.safetyWarnings as string[]) || [],
    } : null,
    costEstimate: (finalResult.costEstimate as Record<string, unknown>) || null,
  };

  const swiMatch = swiMatchData ? {
    matched_swi_id: String(swiMatchData.code || null),
    confidence: Number(swiMatchData.confidence) || 0,
    reasoning: `AutoHeal matched SWI: ${swiMatchData.title}`,
    key_factors: [],
    estimated_service_time: String(swiMatchData.estimatedHours || "N/A"),
    required_parts: ((swiMatchData.partsRequired as any[]) || []).map((p: any) => typeof p === "string" ? p : p?.name || String(p)),
    warnings: (swiMatchData.safetyWarnings as string[]) || [],
  } : null;

  return { assessment: autoHealAssessment, swiMatch };
}
