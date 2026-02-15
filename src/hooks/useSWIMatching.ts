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
const ESTIMATE_STATUSES_KEY = "ticket-estimate-statuses";
const ACCOUNT_MANAGERS_KEY = "ticket-account-managers";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function useSWIMatching() {
  const [matches, setMatches] = useState<Record<string, EnrichedSWIMatch>>(() => loadFromStorage(SWI_MATCHES_KEY, {}));
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
        setMatches((prev) => ({
          ...prev,
          [id]: { ...result, swiDocument, matchedAt: new Date().toISOString() },
        }));
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

  const getSWIMatch = useCallback((id: string): EnrichedSWIMatch | undefined => matches[id], [matches]);

  const isMatching = useCallback((id: string): boolean => matchingIds.has(id), [matchingIds]);

  const getError = useCallback((id: string): string | undefined => errors[id], [errors]);

  const clearMatch = useCallback((id: string) => {
    setMatches((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setErrors((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }, []);

  return { matches, matchingIds, errors, matchTicket, matchBatch, getSWIMatch, isMatching, getError, clearMatch, batchProgress };
}
