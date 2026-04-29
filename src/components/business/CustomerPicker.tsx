import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerLogo } from "@/components/CustomerLogo";
import { CustomerTypeBadge } from "@/components/business/CustomerTypeBadge";
import { CreateAccountModal } from "@/components/business/CreateAccountModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import { findAccountMatches, type AccountMatch, normalizeName, extractDomain } from "@/lib/accountSimilarity";
import { Plus, Search, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerPickerProps {
  value?: string | null;
  onChange: (customerId: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function CustomerPicker({ value, onChange, placeholder = "Search or create customer…", className }: CustomerPickerProps) {
  const { data: customers = [] } = useCustomers();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialName, setCreateInitialName] = useState("");
  const [duplicateGuard, setDuplicateGuard] = useState<{ name: string; matches: AccountMatch<Customer>[] } | null>(null);
  const [debounced, setDebounced] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => customers.find((c) => c.id === value) || null, [customers, value]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build grouped results
  const { exactMatches, similarMatches } = useMemo(() => {
    if (!debounced.trim()) return { exactMatches: [] as AccountMatch<Customer>[], similarMatches: [] as AccountMatch<Customer>[] };
    const matches = findAccountMatches(debounced, customers, { similarThreshold: 0.55 });
    return {
      exactMatches: matches.filter((m) => m.kind === "exact").slice(0, 6),
      similarMatches: matches.filter((m) => m.kind === "similar").slice(0, 6),
    };
  }, [debounced, customers]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  const handleClickCreate = () => {
    const name = query.trim();
    if (!name) return;
    // Run duplicate check
    const matches = findAccountMatches(name, customers, { similarThreshold: 0.7 });
    const strong = matches.filter((m) => m.score >= 0.7);
    if (strong.length > 0) {
      setDuplicateGuard({ name, matches: strong.slice(0, 5) });
      setOpen(false);
    } else {
      setCreateInitialName(name);
      setCreateOpen(true);
      setOpen(false);
    }
  };

  return (
    <>
      <div ref={wrapRef} className={cn("relative", className)}>
        {selected ? (
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5">
            <CustomerLogo logoUrl={selected.logo_url} companyName={selected.company} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate flex items-center gap-1.5">
                {selected.company}
                <CustomerTypeBadge type={(selected as any).customer_type} typeOther={(selected as any).customer_type_other} />
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{selected.email}</p>
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="pl-9"
            />
          </div>
        )}

        {open && !selected && (
          <div className="absolute left-0 right-0 top-full mt-1 z-[2100] rounded-md border border-border bg-popover shadow-lg max-h-[360px] overflow-y-auto">
            {exactMatches.length > 0 && (
              <Section title="Exact match">
                {exactMatches.map((m) => <ResultRow key={m.account.id} match={m} onSelect={() => handleSelect(m.account.id)} />)}
              </Section>
            )}
            {similarMatches.length > 0 && (
              <Section title="Similar">
                {similarMatches.map((m) => <ResultRow key={m.account.id} match={m} onSelect={() => handleSelect(m.account.id)} />)}
              </Section>
            )}
            {debounced.trim() && exactMatches.length === 0 && similarMatches.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">No existing customer matches "{debounced}".</div>
            )}
            {!debounced.trim() && (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">Start typing to search customers…</div>
            )}
            {debounced.trim() && (
              <button
                type="button"
                onClick={handleClickCreate}
                className="w-full text-left px-3 py-2.5 border-t border-border hover:bg-primary/5 flex items-center gap-2 text-sm text-primary font-medium"
              >
                <Plus className="h-4 w-4" />
                Create new customer "{debounced.trim()}"
              </button>
            )}
          </div>
        )}
      </div>

      {/* Duplicate guard modal */}
      <Dialog open={!!duplicateGuard} onOpenChange={(o) => !o && setDuplicateGuard(null)}>
        <DialogContent className="max-w-lg z-[2200]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle>Possible duplicate found</DialogTitle>
            </div>
            <DialogDescription>
              We found accounts that look similar to "{duplicateGuard?.name}". Is your customer one of these?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {duplicateGuard?.matches.map((m) => (
              <button
                key={m.account.id}
                type="button"
                onClick={() => { handleSelect(m.account.id); setDuplicateGuard(null); }}
                className="w-full text-left flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <CustomerLogo logoUrl={m.account.logo_url} companyName={m.account.company} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm">{m.account.company}</span>
                    <CustomerTypeBadge type={(m.account as any).customer_type} typeOther={(m.account as any).customer_type_other} />
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{m.account.email}</p>
                  <p className="text-[10px] text-muted-foreground">{m.reason} · last activity {m.account.last_service_date || "—"}</p>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDuplicateGuard(null)}>Cancel</Button>
            <Button
              onClick={() => {
                setCreateInitialName(duplicateGuard!.name);
                setDuplicateGuard(null);
                setCreateOpen(true);
              }}
            >
              These are different — create new
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateAccountModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialCompanyName={createInitialName}
        onCreated={(c) => { onChange(c.id); setQuery(""); }}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{title}</p>
      <div className="space-y-0.5 pb-1">{children}</div>
    </div>
  );
}

function ResultRow({ match, onSelect }: { match: AccountMatch<Customer>; onSelect: () => void }) {
  const c = match.account;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-primary/5"
    >
      <CustomerLogo logoUrl={c.logo_url} companyName={c.company} size="xs" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-sm truncate">{c.company}</span>
          <CustomerTypeBadge type={(c as any).customer_type} typeOther={(c as any).customer_type_other} />
          {(c as any).relationship_type && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/40 text-primary capitalize">
              {(c as any).relationship_type}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">
          {c.contact_name ? `${c.contact_name} · ` : ""}{c.email}
        </p>
      </div>
    </button>
  );
}
