import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  description: string;
  unit_price: number;
  unit: string | null;
  category: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: Suggestion) => void;
  disabled?: boolean;
  className?: string;
}

export function PartsCatalogAutocomplete({ value, onChange, onSelect, disabled, className }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [isNew, setIsNew] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setIsNew(false);
      return;
    }
    const { data } = await supabase
      .from("parts_catalog")
      .select("id, description, unit_price, unit, category")
      .ilike("description", `%${term}%`)
      .order("usage_count", { ascending: false })
      .limit(8);

    const results = (data || []) as Suggestion[];
    setSuggestions(results);
    setOpen(results.length > 0);
    setHighlightIdx(-1);

    // Check if exact match exists
    const exact = results.some(r => r.description.toLowerCase() === term.toLowerCase());
    setIsNew(!exact && term.length >= 3);
  }, []);

  const handleChange = (newVal: string) => {
    onChange(newVal);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(newVal), 200);
  };

  const selectItem = (item: Suggestion) => {
    onSelect(item);
    onChange(item.description);
    setOpen(false);
    setIsNew(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      selectItem(suggestions[highlightIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <Input
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          className={cn("h-8 text-sm", className)}
          disabled={disabled}
        />
        {isNew && value.length >= 3 && (
          <Badge variant="outline" className="text-[9px] shrink-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            New
          </Badge>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-sm hover:bg-accent transition-colors",
                idx === highlightIdx && "bg-accent"
              )}
              onMouseEnter={() => setHighlightIdx(idx)}
              onClick={() => selectItem(item)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">{item.description}</span>
                {item.category && (
                  <Badge variant="secondary" className="text-[9px] shrink-0">
                    {item.category}
                  </Badge>
                )}
              </div>
              <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
                ${Number(item.unit_price).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
