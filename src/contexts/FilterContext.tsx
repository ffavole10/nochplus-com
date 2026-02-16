import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type StatusLevel = "Critical" | "High" | "Medium" | "Low";

export interface GlobalFilters {
  status: StatusLevel[];
  states: string[];
  chargerTypes: string[];
  swiStatus: string[];
  accountManagers: string[];
  search: string;
}

const DEFAULT_FILTERS: GlobalFilters = {
  status: ["Critical", "High", "Medium", "Low"],
  states: [],
  chargerTypes: [],
  swiStatus: [],
  accountManagers: [],
  search: "",
};

interface FilterContextType {
  filters: GlobalFilters;
  setFilters: (filters: GlobalFilters) => void;
  updateFilter: <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => void;
  toggleArrayFilter: <K extends keyof GlobalFilters>(key: K, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<GlobalFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback(<K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayFilter = useCallback(<K extends keyof GlobalFilters>(key: K, value: string) => {
    setFilters(prev => {
      const arr = prev[key] as string[];
      const newArr = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [key]: newArr };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters =
    filters.status.length < 4 ||
    filters.states.length > 0 ||
    filters.chargerTypes.length > 0 ||
    filters.swiStatus.length > 0 ||
    filters.accountManagers.length > 0 ||
    filters.search !== "";

  return (
    <FilterContext.Provider value={{ filters, setFilters, updateFilter, toggleArrayFilter, clearFilters, hasActiveFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) throw new Error("useFilters must be used within FilterProvider");
  return context;
};
