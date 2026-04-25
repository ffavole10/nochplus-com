/**
 * Cascading Partner → Site → POC pickers for the Create Work Order form.
 *
 *   PartnerPicker   queries public.customers (status='active')
 *   SitePicker      queries public.locations  (filter by customer_id)
 *   PocPicker       queries public.site_contacts (filter by site_id)
 *
 * Each picker supports inline creation of a new record. Selected values are
 * surfaced via onSelect callbacks. The owning form denormalizes display text
 * (company name / address / phone / email) onto the work_orders row for
 * backward compatibility with legacy free-text rendering.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Lock, Pencil, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────── */
/*  Types                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

export interface PartnerOption {
  id: string;
  company: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  categories: string[] | null;
}

export interface SiteOption {
  id: string;
  customer_id: string;
  site_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  access_notes: string | null;
}

export interface PocOption {
  id: string;
  site_id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string | null;
  is_primary: boolean;
}

const PARTNER_CATEGORIES = ["OEM", "CSMS", "CPO", "Site Host", "Other"];

/* ──────────────────────────────────────────────────────────────────────── */
/*  Small bits                                                             */
/* ──────────────────────────────────────────────────────────────────────── */

function CategoryPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
      {label}
    </span>
  );
}

function PartnerLogo({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="h-8 w-8 rounded-md object-contain bg-muted shrink-0"
      />
    );
  }
  return (
    <div className="h-8 w-8 rounded-md bg-muted text-[11px] font-bold flex items-center justify-center shrink-0">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Generic search dropdown                                                */
/* ──────────────────────────────────────────────────────────────────────── */

interface SearchableProps<T> {
  id: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  placeholder: string;
  selected: T | null;
  onSelect: (item: T | null) => void;
  search: (q: string) => Promise<T[]>;
  renderRow: (item: T) => React.ReactNode;
  renderSelected: (item: T) => React.ReactNode;
  emptyAction?: (query: string, close: () => void) => React.ReactNode;
  /** "soft" reset key — when this changes, the picker resets its query */
  resetKey?: string;
  errorMessage?: string;
}

function Searchable<T extends { id: string }>({
  id,
  label,
  required,
  disabled,
  disabledHint,
  placeholder,
  selected,
  onSelect,
  search,
  renderRow,
  renderSelected,
  emptyAction,
  resetKey,
  errorMessage,
}: SearchableProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset when parent dependency changes
  useEffect(() => {
    setQuery("");
    setResults([]);
    setTouched(false);
  }, [resetKey]);

  // Debounced search
  useEffect(() => {
    if (!open || disabled) return;
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const rows = await search(query);
        if (active) setResults(rows);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, open, disabled, search]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const showError =
    required && touched && !selected && !!query && results.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <Label htmlFor={id}>
        {label} {required && "*"}
      </Label>

      {selected ? (
        <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2">
          <div className="flex-1 min-w-0">{renderSelected(selected)}</div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => {
              onSelect(null);
              setQuery("");
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            aria-label={`Clear ${label}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative mt-1">
          <Input
            id={id}
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => !disabled && setOpen(true)}
            onBlur={() => setTouched(true)}
            placeholder={disabled ? disabledHint || placeholder : placeholder}
            disabled={disabled}
            autoComplete="off"
            className={cn(showError && "border-destructive focus-visible:ring-destructive")}
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      )}

      {showError && (
        <p className="text-xs text-destructive mt-1">
          {errorMessage || `Please select a ${label.toLowerCase()} from the list or create a new one`}
        </p>
      )}

      {open && !selected && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-80 overflow-auto">
          {loading ? (
            <div className="p-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              {query
                ? `No matches found for "${query}"`
                : "Start typing to search…"}
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-primary/5 focus:bg-primary/5 outline-none border-b border-border/50 last:border-0 transition-colors"
              >
                {renderRow(item)}
              </button>
            ))
          )}

          {emptyAction && query.trim() && !loading && (
            <div className="border-t border-border bg-muted/30">
              {emptyAction(query.trim(), () => {
                setOpen(false);
                setQuery("");
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Partner (Client) Picker                                                */
/* ──────────────────────────────────────────────────────────────────────── */

export function PartnerPicker({
  selected,
  onSelect,
}: {
  selected: PartnerOption | null;
  onSelect: (p: PartnerOption | null) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState("");
  const [woCount, setWoCount] = useState<number | null>(null);

  // Fetch lifetime work order count for the selected partner
  useEffect(() => {
    if (!selected) {
      setWoCount(null);
      return;
    }
    (async () => {
      const { count } = await supabase
        .from("work_orders")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", selected.id);
      setWoCount(count ?? 0);
    })();
  }, [selected]);

  const search = async (q: string): Promise<PartnerOption[]> => {
    const query = supabase
      .from("customers")
      .select("id, company, contact_name, email, phone, logo_url, categories")
      .eq("status", "active")
      .order("company", { ascending: true })
      .limit(8);
    const { data, error } = q
      ? await query.ilike("company", `%${q}%`)
      : await query;
    if (error) {
      console.error("[PartnerPicker] search failed", error);
      return [];
    }
    return (data ?? []).map((c: any) => ({
      id: c.id,
      company: c.company,
      contact_name: c.contact_name,
      email: c.email,
      phone: c.phone,
      logo_url: c.logo_url,
      categories: Array.isArray(c.categories) ? c.categories : null,
    }));
  };

  return (
    <>
      <Searchable<PartnerOption>
        id="client"
        label="Client Name"
        required
        placeholder="Search partners by name…"
        selected={selected}
        onSelect={onSelect}
        search={search}
        renderRow={(p) => (
          <div className="flex items-center gap-3">
            <PartnerLogo url={p.logo_url} name={p.company} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm truncate">{p.company}</span>
                {(p.categories ?? []).slice(0, 2).map((c) => (
                  <CategoryPill key={c} label={c} />
                ))}
              </div>
              {p.contact_name && (
                <div className="text-xs text-muted-foreground truncate">
                  {p.contact_name}
                </div>
              )}
            </div>
          </div>
        )}
        renderSelected={(p) => (
          <div className="flex items-center gap-3">
            <PartnerLogo url={p.logo_url} name={p.company} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm truncate">{p.company}</span>
                {(p.categories ?? []).slice(0, 2).map((c) => (
                  <CategoryPill key={c} label={c} />
                ))}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {p.contact_name || p.email || "No primary contact"}
                {woCount !== null && (
                  <span className="ml-2">· {woCount} work order{woCount === 1 ? "" : "s"}</span>
                )}
              </div>
            </div>
          </div>
        )}
        emptyAction={(q, close) => (
          <button
            type="button"
            className="w-full text-left px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-2"
            onClick={() => {
              setCreateDefaults(q);
              setCreateOpen(true);
              close();
            }}
          >
            <Plus className="h-4 w-4" />
            Create new partner: <span className="font-semibold">{q}</span>
          </button>
        )}
      />

      <CreatePartnerModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultName={createDefaults}
        onCreated={(p) => onSelect(p)}
      />
    </>
  );
}

function CreatePartnerModal({
  open,
  onOpenChange,
  defaultName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  defaultName: string;
  onCreated: (p: PartnerOption) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setCategory("");
      setContactName("");
      setEmail("");
      setPhone("");
    }
  }, [open, defaultName]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("customers" as any)
        .insert({
          company: name.trim(),
          contact_name: contactName,
          email,
          phone,
          status: "active",
          categories: category ? [category] : [],
        } as any)
        .select("id, company, contact_name, email, phone, logo_url, categories")
        .single();
      if (error) throw error;
      const created: PartnerOption = {
        id: (data as any).id,
        company: (data as any).company,
        contact_name: (data as any).contact_name,
        email: (data as any).email,
        phone: (data as any).phone,
        logo_url: (data as any).logo_url,
        categories: Array.isArray((data as any).categories)
          ? (data as any).categories
          : null,
      };
      toast.success(`Partner "${created.company}" created`);
      onCreated(created);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create partner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[2500]">
        <DialogHeader>
          <DialogTitle>New Partner</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
              <SelectContent className="z-[2600]">
                {PARTNER_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Contact Name</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!name.trim() || saving}>
            {saving ? "Saving…" : "Save and Use"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Site Picker                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

export function SitePicker({
  partner,
  selected,
  onSelect,
}: {
  partner: PartnerOption | null;
  selected: SiteOption | null;
  onSelect: (s: SiteOption | null) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState("");

  const search = async (q: string): Promise<SiteOption[]> => {
    if (!partner) return [];
    let qb = supabase
      .from("locations")
      .select("id, customer_id, site_name, address, city, state, zip, access_notes")
      .eq("customer_id", partner.id)
      .order("site_name", { ascending: true })
      .limit(20);
    if (q) qb = qb.ilike("site_name", `%${q}%`);
    const { data, error } = await qb;
    if (error) {
      console.error("[SitePicker] search failed", error);
      return [];
    }
    return (data as SiteOption[]) ?? [];
  };

  return (
    <>
      <Searchable<SiteOption>
        id="site"
        label="Site Name"
        required
        disabled={!partner}
        disabledHint="Select a partner first"
        placeholder="Search sites for this partner…"
        selected={selected}
        onSelect={onSelect}
        search={search}
        resetKey={partner?.id}
        renderRow={(s) => (
          <div>
            <div className="font-semibold text-sm">{s.site_name}</div>
            {(s.address || s.city) && (
              <div className="text-xs text-muted-foreground truncate">
                {[s.address, s.city, s.state].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        )}
        renderSelected={(s) => (
          <div>
            <div className="font-semibold text-sm">{s.site_name}</div>
            {(s.address || s.city) && (
              <div className="text-xs text-muted-foreground truncate">
                {[s.address, s.city, s.state].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        )}
        emptyAction={
          partner
            ? (q, close) => (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-2"
                  onClick={() => {
                    setCreateDefaults(q);
                    setCreateOpen(true);
                    close();
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Create new site for {partner.company}:{" "}
                  <span className="font-semibold">{q}</span>
                </button>
              )
            : undefined
        }
      />

      {partner && (
        <CreateSiteModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          partner={partner}
          defaultName={createDefaults}
          onCreated={onSelect}
        />
      )}
    </>
  );
}

function CreateSiteModal({
  open,
  onOpenChange,
  partner,
  defaultName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  partner: PartnerOption;
  defaultName: string;
  onCreated: (s: SiteOption) => void;
}) {
  const [siteName, setSiteName] = useState(defaultName);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSiteName(defaultName);
      setAddress("");
      setCity("");
      setState("");
      setZip("");
      setAccessNotes("");
    }
  }, [open, defaultName]);

  const save = async () => {
    if (!siteName.trim() || !address.trim()) {
      toast.error("Site name and address are required");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("locations" as any)
        .insert({
          customer_id: partner.id,
          site_name: siteName.trim(),
          address: address.trim(),
          city: city || null,
          state: state || null,
          zip: zip || null,
          access_notes: accessNotes || null,
        } as any)
        .select("id, customer_id, site_name, address, city, state, zip, access_notes")
        .single();
      if (error) throw error;
      toast.success(`Site "${(data as any).site_name}" created`);
      onCreated(data as unknown as SiteOption);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create site");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[2500]">
        <DialogHeader>
          <DialogTitle>New site for {partner.company}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Site Name *</Label>
            <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label className="text-xs">Address *</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">ZIP</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Access Notes</Label>
            <Textarea
              rows={2}
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              placeholder="Gate codes, parking instructions…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !siteName.trim() || !address.trim()}>
            {saving ? "Saving…" : "Save and Use"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  POC Picker                                                             */
/* ──────────────────────────────────────────────────────────────────────── */

export function PocPicker({
  site,
  partner,
  selected,
  onSelect,
}: {
  site: SiteOption | null;
  partner: PartnerOption | null;
  selected: PocOption | null;
  onSelect: (p: PocOption | null) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState("");

  const search = async (q: string): Promise<PocOption[]> => {
    if (!site) return [];
    let qb = supabase
      .from("site_contacts")
      .select("id, site_id, name, phone, email, role, is_primary")
      .eq("site_id", site.id)
      .order("is_primary", { ascending: false })
      .order("name", { ascending: true })
      .limit(20);
    if (q) qb = qb.ilike("name", `%${q}%`);
    const { data, error } = await qb;
    if (error) {
      console.error("[PocPicker] search failed", error);
      return [];
    }
    return (data as PocOption[]) ?? [];
  };

  return (
    <>
      <Searchable<PocOption>
        id="poc"
        label="Point of Contact"
        required
        disabled={!site}
        disabledHint="Select a site first"
        placeholder="Search contacts at this site…"
        selected={selected}
        onSelect={onSelect}
        search={search}
        resetKey={site?.id}
        renderRow={(p) => (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm">{p.name}</span>
              {p.is_primary && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Primary</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {p.role && <span>{p.role} · </span>}
              {p.phone}
            </div>
          </div>
        )}
        renderSelected={(p) => (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm">{p.name}</span>
              {p.is_primary && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Primary</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {p.role && <span>{p.role} · </span>}
              {p.phone}
              {p.email && <span> · {p.email}</span>}
            </div>
          </div>
        )}
        emptyAction={
          site
            ? (q, close) => (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-2"
                  onClick={() => {
                    setCreateDefaults(q);
                    setCreateOpen(true);
                    close();
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add new POC for this site
                </button>
              )
            : undefined
        }
      />

      {site && (
        <CreatePocModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          site={site}
          partner={partner}
          defaultName={createDefaults}
          onCreated={onSelect}
        />
      )}
    </>
  );
}

function CreatePocModal({
  open,
  onOpenChange,
  site,
  partner,
  defaultName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  site: SiteOption;
  partner: PartnerOption | null;
  defaultName: string;
  onCreated: (p: PocOption) => void;
}) {
  const { session } = useAuth();
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setPhone("");
      setEmail("");
      setRole("");
      setIsPrimary(false);
    }
  }, [open, defaultName]);

  const save = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setSaving(true);
    try {
      // If marking as primary, demote any existing primaries for this site
      if (isPrimary) {
        await supabase
          .from("site_contacts")
          .update({ is_primary: false })
          .eq("site_id", site.id)
          .eq("is_primary", true);
      }

      const { data, error } = await supabase
        .from("site_contacts" as any)
        .insert({
          site_id: site.id,
          customer_id: partner?.id ?? site.customer_id,
          name: name.trim(),
          phone: phone.trim(),
          email: email || null,
          role: role || null,
          is_primary: isPrimary,
          created_by: session?.user?.id ?? null,
        } as any)
        .select("id, site_id, name, phone, email, role, is_primary")
        .single();
      if (error) throw error;
      toast.success(`Contact "${(data as any).name}" added`);
      onCreated(data as unknown as PocOption);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[2500]">
        <DialogHeader>
          <DialogTitle>New point of contact for {site.site_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Phone *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Site Manager, Facilities Lead…" />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded border-input"
            />
            Set as primary contact for this site
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim() || !phone.trim()}>
            {saving ? "Saving…" : "Save and Use"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  LockedField — auto-filled inputs with override                         */
/* ──────────────────────────────────────────────────────────────────────── */

export function LockedField({
  id,
  label,
  value,
  onChange,
  hasSource,
  placeholder,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hasSource: boolean;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const locked = hasSource && !editing;

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          {label} {required && "*"}
        </Label>
        {hasSource && (
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {editing ? (
              <>
                <Check className="h-3 w-3" /> Done
              </>
            ) : (
              <>
                <Pencil className="h-3 w-3" /> Override
              </>
            )}
          </button>
        )}
      </div>
      <div className="relative mt-1">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={locked}
          required={required}
          className={cn(locked && "bg-muted/40 cursor-default pr-9")}
        />
        {locked && (
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
