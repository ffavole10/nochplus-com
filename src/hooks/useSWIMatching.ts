import { useState, useCallback, useEffect } from "react";
import { AssessmentCharger } from "@/types/assessment";
import { matchSWIWithClaude, SWIMatchResult } from "@/services/swiScanner";
import { SWI_CATALOG, SWIDocument } from "@/data/swiCatalog";

export interface EnrichedSWIMatch extends SWIMatchResult {
  swiDocument?: SWIDocument;
  matchedAt: string;
  manual_override?: boolean;
}

export interface BatchProgress {
  current: number;
  total: number;
  status: "idle" | "running" | "done";
  isRunning: boolean;
}

const SWI_MATCHES_KEY = "swi-matches";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored);
    // Migrate old single-match format to array format
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const migrated: Record<string, EnrichedSWIMatch[]> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (Array.isArray(v)) {
          migrated[k] = v as EnrichedSWIMatch[];
        } else if (v && typeof v === "object" && "confidence" in (v as any)) {
          migrated[k] = [v as EnrichedSWIMatch];
        }
      }
      return migrated as T;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

export function useSWIMatching() {
  const [matches, setMatches] = useState<Record<string, EnrichedSWIMatch[]>>(() => loadFromStorage(SWI_MATCHES_KEY, {}));
  const [matchingIds, setMatchingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({ current: 0, total: 0, status: "idle", isRunning: false });

  useEffect(() => {
    localStorage.setItem(SWI_MATCHES_KEY, JSON.stringify(matches));
  }, [matches]);

  const matchTicket = useCallback(async (charger: AssessmentCharger) => {
    const id = charger.id;
    setMatchingIds((prev) => new Set(prev).add(id));
    setErrors((prev) => { const next = { ...prev }; delete next[id]; return next; });

    try {
      const ticket = {
        id: charger.id,
        ticketId: charger.ticketId || undefined,
        chargerModel: charger.assetRecordType,
        title: charger.ticketSubject || undefined,
        description: charger.ticketSubject || undefined,
        recommendation: charger.notes || undefined,
        priority: charger.priorityLevel,
        account: charger.accountName,
        daysOld: charger.ticketCreatedDate
          ? Math.floor((Date.now() - new Date(charger.ticketCreatedDate).getTime()) / 86400000)
          : 0,
        location: [charger.city, charger.state].filter(Boolean).join(", "),
        group: charger.ticketGroup || undefined,
      };

      const result = await matchSWIWithClaude(ticket, SWI_CATALOG);

      if (result.error) {
        setErrors((prev) => ({ ...prev, [id]: result.reasoning }));
      } else {
        const swiDocument = result.matched_swi_id
          ? SWI_CATALOG.find((s) => s.id === result.matched_swi_id)
          : undefined;
        const enriched: EnrichedSWIMatch = { ...result, swiDocument, matchedAt: new Date().toISOString() };
        setMatches((prev) => {
          const existing = prev[id] || [];
          // Don't add duplicate SWI
          if (enriched.matched_swi_id && existing.some(m => m.matched_swi_id === enriched.matched_swi_id)) {
            return prev;
          }
          return { ...prev, [id]: [...existing, enriched] };
        });
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Unknown error",
      }));
    } finally {
      setMatchingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }, []);

  const matchBatch = useCallback(async (chargers: AssessmentCharger[]) => {
    setBatchProgress({ current: 0, total: chargers.length, status: "running", isRunning: true });
    for (let i = 0; i < chargers.length; i++) {
      await matchTicket(chargers[i]);
      setBatchProgress({ current: i + 1, total: chargers.length, status: "running", isRunning: true });
      if (i < chargers.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    setBatchProgress((prev) => ({ ...prev, status: "done", isRunning: false }));
  }, [matchTicket]);

  const addManualMatch = useCallback((ticketId: string, swiDoc: SWIDocument) => {
    const enriched: EnrichedSWIMatch = {
      matched_swi_id: swiDoc.id,
      confidence: 100,
      reasoning: "Manually selected by user",
      key_factors: ["Manual selection"],
      estimated_service_time: swiDoc.estimatedTime,
      required_parts: swiDoc.requiredParts,
      alternative_swis: [],
      warnings: [],
      timestamp: new Date().toISOString(),
      model_used: "manual",
      swiDocument: swiDoc,
      matchedAt: new Date().toISOString(),
      manual_override: true,
    };
    setMatches((prev) => {
      const existing = prev[ticketId] || [];
      if (existing.some(m => m.matched_swi_id === swiDoc.id)) return prev;
      return { ...prev, [ticketId]: [...existing, enriched] };
    });
  }, []);

  const removeMatch = useCallback((ticketId: string, swiId: string) => {
    setMatches((prev) => {
      const existing = prev[ticketId] || [];
      const filtered = existing.filter(m => m.matched_swi_id !== swiId);
      if (filtered.length === 0) {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      }
      return { ...prev, [ticketId]: filtered };
    });
  }, []);

  const getSWIMatches = useCallback((id: string): EnrichedSWIMatch[] => matches[id] || [], [matches]);

  // Backward compat: return first match
  const getSWIMatch = useCallback((id: string): EnrichedSWIMatch | undefined => (matches[id] || [])[0], [matches]);

  const isMatching = useCallback((id: string): boolean => matchingIds.has(id), [matchingIds]);

  const getError = useCallback((id: string): string | undefined => errors[id], [errors]);

  const clearMatch = useCallback((id: string) => {
    setMatches((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setErrors((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }, []);

  return { matches, matchingIds, errors, matchTicket, matchBatch, getSWIMatch, getSWIMatches, isMatching, getError, clearMatch, addManualMatch, removeMatch, batchProgress };
}
