import { useState, useCallback } from "react";
import { AssessmentCharger } from "@/types/assessment";
import { matchSWIWithClaude, SWIMatchResult } from "@/services/swiScanner";
import { SWI_CATALOG, SWIDocument } from "@/data/swiCatalog";

export interface EnrichedSWIMatch extends SWIMatchResult {
  swiDocument?: SWIDocument;
  matchedAt: string;
  manual_override?: boolean;
}

export function useSWIMatching() {
  const [matches, setMatches] = useState<Record<string, EnrichedSWIMatch>>({});
  const [matchingIds, setMatchingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const matchTicket = useCallback(async (charger: AssessmentCharger) => {
    const id = charger.id;
    setMatchingIds((prev) => new Set(prev).add(id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

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
          [id]: {
            ...result,
            swiDocument,
            matchedAt: new Date().toISOString(),
          },
        }));
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Unknown error",
      }));
    } finally {
      setMatchingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const clearMatch = useCallback((id: string) => {
    setMatches((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return {
    matches,
    matchingIds,
    errors,
    matchTicket,
    clearMatch,
  };
}
