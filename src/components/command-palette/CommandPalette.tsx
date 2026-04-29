import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Pin,
  PinOff,
  Clock,
  X,
  Ticket,
  Briefcase,
  Building2,
  Zap,
  FileText,
  Sparkles,
  User,
  ArrowUpRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./CommandPaletteContext";
import {
  EntityType,
  PinnedItem,
  RecentSearch,
  getPins,
  getRecent,
  isPinned,
  pushRecent,
  removeRecent,
  togglePin,
} from "./pinStorage";

interface Result {
  type: EntityType;
  id: string;
  label: string;
  sublabel?: string;
  status?: string;
}

const TYPE_META: Record<EntityType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  ticket: { label: "Ticket", icon: Ticket },
  work_order: { label: "Work Order", icon: Briefcase },
  account: { label: "Account", icon: Building2 },
  charger: { label: "Charger", icon: Zap },
  estimate: { label: "Estimate", icon: FileText },
  member: { label: "Member", icon: Sparkles },
  contact: { label: "Contact", icon: User },
};

const TYPE_ORDER: EntityType[] = [
  "ticket",
  "work_order",
  "account",
  "charger",
  "estimate",
  "member",
  "contact",
];

function detectBoost(pathname: string): EntityType | null {
  if (pathname.startsWith("/operations/tickets")) return "ticket";
  if (pathname.startsWith("/operations/work-orders")) return "work_order";
  if (pathname.startsWith("/business/accounts")) return "account";
  if (pathname.startsWith("/command-center/mission-control")) return "charger";
  if (pathname.startsWith("/business/membership")) return "member";
  return null;
}

function navigateForResult(navigate: (to: string) => void, r: Result) {
  switch (r.type) {
    case "ticket":
      navigate(`/operations/tickets?ticket=${r.id}`);
      break;
    case "work_order":
      navigate(`/operations/work-orders?wo=${r.id}`);
      break;
    case "account":
      navigate(`/business/accounts/${r.id}`);
      break;
    case "charger":
      navigate(`/command-center/mission-control?charger=${r.id}`);
      break;
    case "estimate":
      navigate(`/operations/estimates?estimate=${r.id}`);
      break;
    case "member":
      navigate(`/business/membership?member=${r.id}`);
      break;
    case "contact":
      navigate(`/business/accounts?contact=${r.id}#contacts`);
      break;
  }
}

function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [pins, setPins] = useState<PinnedItem[]>([]);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDebounced("");
      setResults([]);
      setSelectedIdx(0);
      setPins(getPins());
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const q = debounced.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    runSearch(q)
      .then((rs) => {
        if (cancelled) return;
        setResults(rs);
        setSelectedIdx(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const boost = detectBoost(location.pathname);

  const grouped = useMemo(() => {
    const byType = new Map<EntityType, Result[]>();
    results.forEach((r) => {
      const arr = byType.get(r.type) ?? [];
      arr.push(r);
      byType.set(r.type, arr);
    });
    const order: EntityType[] = boost
      ? [boost, ...TYPE_ORDER.filter((t) => t !== boost)]
      : TYPE_ORDER;
    return order
      .map((type) => ({ type, items: byType.get(type) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [results, boost]);

  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    if (selectedIdx >= flat.length) setSelectedIdx(0);
  }, [flat.length, selectedIdx]);

  const handleOpenResult = useCallback(
    (r: Result) => {
      if (debounced.trim()) {
        const next = pushRecent(debounced.trim());
        setRecent(next);
      }
      setOpen(false);
      navigateForResult(navigate, r);
    },
    [debounced, navigate, setOpen],
  );

  const handleTogglePin = useCallback(
    (r: Result) => {
      const result = togglePin({
        entity_type: r.type,
        entity_id: r.id,
        label: r.label,
      });
      if (!result.ok) {
        toast.error("Pin limit reached. Unpin an item first.");
        return;
      }
      setPins(result.pins);
    },
    [],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = flat[selectedIdx];
      if (r) handleOpenResult(r);
    } else if ((e.key === "p" || e.key === "P") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const r = flat[selectedIdx];
      if (r) handleTogglePin(r);
    }
  };

  const showEmpty = !debounced.trim();
  const mac = isMac();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="hide-default-close max-w-[640px] w-[92vw] p-0 gap-0 !top-[15vh] !translate-y-0 overflow-hidden border-border bg-background"
        onKeyDown={onKeyDown}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets, accounts, chargers, members…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          {loading && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Searching…
            </span>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {showEmpty ? (
            <EmptyState
              pins={pins}
              recent={recent}
              onPickRecent={(q) => setQuery(q)}
              onRemoveRecent={(q) => setRecent(removeRecent(q))}
              onOpenPin={(p) => {
                setOpen(false);
                navigateForResult(navigate, {
                  type: p.entity_type,
                  id: p.entity_id,
                  label: p.label,
                });
              }}
              onUnpin={(p) => {
                togglePin({ entity_type: p.entity_type, entity_id: p.entity_id, label: p.label });
                setPins(getPins());
              }}
            />
          ) : flat.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No results for "{debounced}". Try a different search.
            </div>
          ) : (
            <ResultsList
              grouped={grouped}
              flat={flat}
              selectedIdx={selectedIdx}
              setSelectedIdx={setSelectedIdx}
              onOpen={handleOpenResult}
              onTogglePin={handleTogglePin}
              boost={boost}
              pinnedSet={new Set(pins.map((p) => `${p.entity_type}:${p.entity_id}`))}
            />
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          <Kbd>↑↓</Kbd>
          <span>navigate</span>
          <span className="text-border">·</span>
          <Kbd>↵</Kbd>
          <span>open</span>
          <span className="text-border">·</span>
          <Kbd>{mac ? "⌘P" : "Ctrl P"}</Kbd>
          <span>pin</span>
          <span className="text-border">·</span>
          <Kbd>esc</Kbd>
          <span>close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

function EmptyState({
  pins,
  recent,
  onPickRecent,
  onRemoveRecent,
  onOpenPin,
  onUnpin,
}: {
  pins: PinnedItem[];
  recent: RecentSearch[];
  onPickRecent: (q: string) => void;
  onRemoveRecent: (q: string) => void;
  onOpenPin: (p: PinnedItem) => void;
  onUnpin: (p: PinnedItem) => void;
}) {
  return (
    <div className="py-2">
      <SectionHeader>Pinned</SectionHeader>
      {pins.length === 0 ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Pin items from any detail view to see them here
        </div>
      ) : (
        <ul>
          {pins.slice(0, 5).map((p) => {
            const Icon = TYPE_META[p.entity_type].icon;
            return (
              <li key={`${p.entity_type}:${p.entity_id}`}>
                <button
                  onClick={() => onOpenPin(p)}
                  className="group w-full flex items-center gap-3 px-4 py-2 hover:bg-accent text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground truncate flex-1">{p.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground rounded border border-border px-1.5 py-0.5">
                    {TYPE_META[p.entity_type].label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpin(p);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                    title="Unpin"
                  >
                    <PinOff className="h-3.5 w-3.5" />
                  </button>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <SectionHeader>Recent</SectionHeader>
      {recent.length === 0 ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Your recent searches will appear here
        </div>
      ) : (
        <ul>
          {recent.slice(0, 8).map((r) => (
            <li key={r.query}>
              <button
                onClick={() => onPickRecent(r.query)}
                className="group w-full flex items-center gap-3 px-4 py-2 hover:bg-accent text-left"
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground truncate flex-1">{r.query}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRecent(r.query);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
      {children}
    </div>
  );
}

function ResultsList({
  grouped,
  flat,
  selectedIdx,
  setSelectedIdx,
  onOpen,
  onTogglePin,
  boost,
  pinnedSet,
}: {
  grouped: { type: EntityType; items: Result[] }[];
  flat: Result[];
  selectedIdx: number;
  setSelectedIdx: (i: number) => void;
  onOpen: (r: Result) => void;
  onTogglePin: (r: Result) => void;
  boost: EntityType | null;
  pinnedSet: Set<string>;
}) {
  let runningIdx = 0;
  return (
    <div className="py-1">
      {grouped.map((group, gi) => {
        const isBoosted = boost === group.type && gi === 0;
        const headerLabel = isBoosted
          ? `From ${TYPE_META[group.type].label}s · ${group.items.length}`
          : `${TYPE_META[group.type].label}s · ${group.items.length}`;
        return (
          <div key={group.type}>
            <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
              {isBoosted && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              {headerLabel}
            </div>
            <ul>
              {group.items.map((r) => {
                const idx = runningIdx++;
                const selected = idx === selectedIdx;
                const Icon = TYPE_META[r.type].icon;
                const pinned = pinnedSet.has(`${r.type}:${r.id}`);
                return (
                  <li key={`${r.type}:${r.id}`}>
                    <button
                      onMouseEnter={() => setSelectedIdx(idx)}
                      onClick={() => onOpen(r)}
                      className={cn(
                        "group w-full flex items-center gap-3 px-4 py-2 text-left",
                        selected
                          ? "bg-primary/15 border-l-2 border-primary"
                          : "border-l-2 border-transparent hover:bg-accent",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selected ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground truncate">{r.label}</div>
                        {r.sublabel && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            {r.sublabel}
                          </div>
                        )}
                      </div>
                      {r.status && (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground rounded border border-border px-1.5 py-0.5">
                          {r.status}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(r);
                        }}
                        className={cn(
                          "shrink-0 transition-opacity",
                          pinned
                            ? "text-primary opacity-100"
                            : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground",
                        )}
                        title={pinned ? "Unpin" : "Pin"}
                      >
                        <Pin className="h-3.5 w-3.5" fill={pinned ? "currentColor" : "none"} />
                      </button>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <div className="sr-only">{flat.length} results</div>
    </div>
  );
}

async function runSearch(q: string): Promise<Result[]> {
  const results: Result[] = [];
  const esc = q.replace(/[%_,]/g, (c) => `\\\\${c}`);
  const ilike = `%${esc}%`;

  const queries: Promise<Result[]>[] = [
    (async () => {
      const { data } = await supabase
        .from("service_tickets")
        .select("id,ticket_id,company_name,city,state,status")
        .or(
          `ticket_id.ilike.${ilike},company_name.ilike.${ilike},full_name.ilike.${ilike}`,
        )
        .limit(PER_TYPE);
      return (data || []).map<Result>((t: any) => ({
        type: "ticket",
        id: t.id,
        label: `${t.ticket_id || "—"} · ${t.company_name || ""}`.trim(),
        sublabel: [t.city, t.state].filter(Boolean).join(", "),
        status: t.status,
      }));
    })(),
    (async () => {
      const { data } = await supabase
        .from("work_orders")
        .select("id,work_order_number,site_name,client_name,status")
        .or(
          `work_order_number.ilike.${ilike},site_name.ilike.${ilike},client_name.ilike.${ilike}`,
        )
        .limit(PER_TYPE);
      return (data || []).map<Result>((w: any) => ({
        type: "work_order",
        id: w.id,
        label: `${w.work_order_number || "WO"} · ${w.site_name || ""}`.trim(),
        sublabel: w.client_name,
        status: w.status,
      }));
    })(),
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id,company,contact_name,email")
        .or(`company.ilike.${ilike},contact_name.ilike.${ilike},email.ilike.${ilike}`)
        .limit(PER_TYPE);
      return (data || []).map<Result>((c: any) => ({
        type: "account",
        id: c.id,
        label: c.company,
        sublabel: c.contact_name || c.email,
      }));
    })(),
    (async () => {
      const { data } = await supabase
        .from("charger_records")
        .select("id,station_id,model,site_name,city,state")
        .or(`station_id.ilike.${ilike},model.ilike.${ilike},site_name.ilike.${ilike}`)
        .limit(PER_TYPE);
      return (data || []).map<Result>((c: any) => ({
        type: "charger",
        id: c.station_id || c.id,
        label: `${c.station_id || "—"} · ${c.model || ""}`.trim(),
        sublabel: [c.site_name, c.city, c.state].filter(Boolean).join(" · "),
      }));
    })(),
    (async () => {
      const { data } = await supabase
        .from("estimates")
        .select("id,estimate_number,customer_name,site_name,status")
        .or(
          `estimate_number.ilike.${ilike},customer_name.ilike.${ilike},site_name.ilike.${ilike}`,
        )
        .limit(PER_TYPE);
      return (data || []).map<Result>((e: any) => ({
        type: "estimate",
        id: e.id,
        label: `${e.estimate_number || "Estimate"} · ${e.customer_name || ""}`.trim(),
        sublabel: e.site_name,
        status: e.status,
      }));
    })(),
    (async () => {
      const { data } = await supabase
        .from("noch_plus_members")
        .select("id,company_name,contact_name,tier,status")
        .or(`company_name.ilike.${ilike},contact_name.ilike.${ilike},tier.ilike.${ilike}`)
        .limit(PER_TYPE);
      return (data || []).map<Result>((m: any) => ({
        type: "member",
        id: m.id,
        label: m.company_name,
        sublabel: `${m.tier || ""}${m.contact_name ? ` · ${m.contact_name}` : ""}`.trim(),
        status: m.status,
      }));
    })(),
    (async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id,name,email,phone,role,customer_id")
        .or(`name.ilike.${ilike},email.ilike.${ilike},phone.ilike.${ilike}`)
        .limit(PER_TYPE);
      return (data || []).map<Result>((c: any) => ({
        type: "contact",
        id: c.id,
        label: c.name,
        sublabel: [c.role, c.email].filter(Boolean).join(" · "),
      }));
    })(),
  ];

  const settled = await Promise.allSettled(queries);
  settled.forEach((s) => {
    if (s.status === "fulfilled") results.push(...s.value);
  });
  return results;
}

const PER_TYPE = 6;
