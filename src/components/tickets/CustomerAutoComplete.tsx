import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, User, Building2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CustomerMatch {
  id: string;
  contact_name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
}

interface CustomerAutoCompleteProps {
  field: "name" | "company";
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (customer: CustomerMatch) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  isAutoFilled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Fuzzy matching utility                                             */
/* ------------------------------------------------------------------ */

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return true;
  // Levenshtein-like: check edit distance for short strings
  if (Math.abs(na.length - nb.length) <= 2 && na.length >= 4) {
    let matches = 0;
    const shorter = na.length <= nb.length ? na : nb;
    const longer = na.length <= nb.length ? nb : na;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    return matches / shorter.length > 0.8;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CustomerAutoComplete({
  field,
  label,
  value,
  onChange,
  onSelect,
  disabled,
  error,
  required,
  isAutoFilled,
}: CustomerAutoCompleteProps) {
  const [results, setResults] = useState<CustomerMatch[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [fuzzyWarning, setFuzzyWarning] = useState<CustomerMatch | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setResults([]);
        setShowDropdown(false);
        setFuzzyWarning(null);
        return;
      }

      setIsSearching(true);
      try {
        const searchTerm = `%${query.trim()}%`;
        const column = field === "name" ? "contact_name" : "company";
        const otherColumn = field === "name" ? "company" : "contact_name";

        // Search both name and company columns
        const { data, error: err } = await supabase
          .from("customers")
          .select("id, contact_name, company, email, phone, address")
          .or(`${column}.ilike.${searchTerm},${otherColumn}.ilike.${searchTerm}`)
          .order("company")
          .limit(7);

        if (err) throw err;

        const matches = (data || []) as unknown as CustomerMatch[];
        setResults(matches);
        setShowDropdown(matches.length > 0);

        // Fuzzy warning: if no exact match but there's a fuzzy match
        if (matches.length === 0) {
          // Do a broader search for fuzzy matching
          const { data: allData } = await supabase
            .from("customers")
            .select("id, contact_name, company, email, phone, address")
            .limit(50);

          const fuzzy = (allData || [] as any[]).find((c: any) => {
            const fieldVal = field === "name" ? c.contact_name : c.company;
            return fuzzyMatch(query.trim(), fieldVal);
          }) as CustomerMatch | undefined;

          setFuzzyWarning(fuzzy || null);
        } else {
          setFuzzyWarning(null);
        }
      } catch (err) {
        console.warn("Customer search failed:", err);
      } finally {
        setIsSearching(false);
      }
    },
    [field]
  );

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(newValue), 300);
  };

  const handleSelect = (customer: CustomerMatch) => {
    setShowDropdown(false);
    setFuzzyWarning(null);
    setResults([]);
    onSelect(customer);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setShowDropdown(false);
  };

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-critical">*</span>}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={field === "name" ? "Start typing to search..." : "Start typing company name..."}
          className={cn(
            error && "border-critical",
            isAutoFilled && "bg-primary/5 border-primary/30"
          )}
        />
        {isAutoFilled && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              Auto-filled
            </span>
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-[280px] overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0"
            >
              <div className="flex items-start gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {c.contact_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{c.company}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="truncate">{c.email}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && results.length === 0 && value.trim().length >= 2 && !isSearching && !fuzzyWarning && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            No matching customer found — a new customer will be created.
          </p>
        </div>
      )}

      {/* Fuzzy match warning */}
      {fuzzyWarning && (
        <div className="flex items-start gap-2 bg-medium/10 border border-medium/30 rounded-lg px-3 py-2 mt-1">
          <AlertTriangle className="h-3.5 w-3.5 text-medium mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="text-foreground">A similar customer already exists: </span>
            <button
              type="button"
              onClick={() => handleSelect(fuzzyWarning)}
              className="font-semibold text-primary hover:underline"
            >
              {fuzzyWarning.contact_name}
            </button>
            <span className="text-muted-foreground"> at {fuzzyWarning.company}. Did you mean to select them?</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}
