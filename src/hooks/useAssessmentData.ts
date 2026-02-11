import { useState, useCallback, useEffect } from "react";
import { AssessmentCharger, Phase } from "@/types/assessment";

const STORAGE_KEY = "assessment-chargers";

export function useAssessmentData() {
  const [chargers, setChargers] = useState<AssessmentCharger[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chargers));
  }, [chargers]);

  const importChargers = useCallback((newChargers: AssessmentCharger[]) => {
    setChargers(newChargers);
  }, []);

  const updateCharger = useCallback((id: string, updates: Partial<AssessmentCharger>) => {
    setChargers(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates, lastUpdated: new Date().toISOString() } : c
    ));
  }, []);

  const moveChargerToPhase = useCallback((id: string, phase: Phase) => {
    setChargers(prev => prev.map(c =>
      c.id === id ? { ...c, phase, lastUpdated: new Date().toISOString() } : c
    ));
  }, []);

  const clearData = useCallback(() => {
    setChargers([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { chargers, importChargers, updateCharger, moveChargerToPhase, clearData };
}
