import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, AlertTriangle, Eye, CheckCircle2, Circle, Play, X, HelpCircle, Sparkles, History, Lock, Unlock,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useStrategyByCustomer, useEnsureStrategy, useUpdateStrategy, useMarkReviewed,
  useDecisionMap, useDecisionMapMutations,
  usePlays, usePlayMutations,
  useKpis, useKpiMutations,
  useKpiActuals, useKpiActualMutations,
  useRisks, useRiskMutations,
  seedKpisFromTemplates,
  useTourCompleted, useMarkTourCompleted,
} from "@/hooks/useStrategy";
import { useContacts } from "@/hooks/useContacts";
import { CONTACT_TYPE_LABELS, CONTACT_TYPE_PILL, type ContactType } from "@/lib/contactTypes";
import {
  ACCOUNT_TYPE_LABELS, POSITION_LABELS, STRATEGY_HEALTH_COLORS, STRATEGY_HEALTH_LABELS,
  computeKpiHealth, computeStrategyHealth, currentQuarter, formatKpiValue,
  computePhasedKpiStatus, getCurrentQuarterInfo,
  PHASED_STATUS_LABELS, PHASED_STATUS_COLORS, PHASING_TEMPLATES,
  isQuarterLocked, formatQuarterEnd,
  type StrategyAccountType, type StrategyPosition, type StrategyDecisionRole,
  type StrategyTemperature, type StrategyPlayStatus, type StrategyKpiUnit,
  type StrategyRiskSeverity, type KpiHealth,
  type StrategyKpi, type StrategyKpiActual, type QuarterPhasing,
} from "@/types/strategy";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StrategyWizard } from "./StrategyWizard";
import { runStrategyTour, runSectionHelp } from "./strategyTour";
import { toast } from "sonner";
import { QuickNoteCapture } from "@/components/business/weekly-review/QuickNoteCapture";
import { LinkedNotesList } from "@/components/business/weekly-review/LinkedNotesList";
import { format, formatDistanceToNow } from "date-fns";

const TEMPERATURE_COLORS: Record<StrategyTemperature, string> = {
  cold: "bg-slate-200 text-slate-700 border-slate-300",
  warm: "bg-amber-100 text-amber-800 border-amber-300",
  hot: "bg-teal-100 text-teal-800 border-teal-300",
};

const KPI_HEALTH_COLORS: Record<KpiHealth, string> = {
  ahead: "bg-emerald-500",
  on_track: "bg-blue-500",
  at_risk: "bg-amber-500",
  behind: "bg-rose-500",
};

const KPI_HEALTH_LABELS: Record<KpiHealth, string> = {
  ahead: "ahead",
  on_track: "on track",
  at_risk: "at risk",
  behind: "behind",
};

interface Props {
  account: { id: string; company: string };
}

export function StrategyTab({ account }: Props) {
  const { data: strategy, isLoading } = useStrategyByCustomer(account.id);
  const ensure = useEnsureStrategy();
  const [wizardOpen, setWizardOpen] = useState(false);

  // Auto-create strategy if none exists
  if (!isLoading && !strategy && !ensure.isPending) {
    ensure.mutate(account.id);
  }

  // Auto-open wizard if ?wizard=1 in URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("wizard") === "1" && strategy) {
      setWizardOpen(true);
      params.delete("wizard");
      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  }, [strategy]);

  if (isLoading || !strategy) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full" />
      </div>
    );
  }

  if (strategy.status === "needs_review" && !wizardOpen) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <Sparkles className="h-10 w-10 text-primary mx-auto" />
          <div>
            <h3 className="text-lg font-bold">No strategy yet for {account.company}</h3>
            <p className="text-sm text-muted-foreground mt-1">Walk through 5 quick steps to set this up.</p>
          </div>
          <Button onClick={() => setWizardOpen(true)} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Start Strategy Setup
          </Button>
        </CardContent>
        <StrategyWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          strategy={strategy}
          accountName={account.company}
        />
      </Card>
    );
  }

  return (
    <>
      <StrategyContent account={account} strategy={strategy} onLaunchWizard={() => setWizardOpen(true)} />
      <StrategyWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        strategy={strategy}
        accountName={account.company}
      />
    </>
  );
}

function StrategyContent({
  account,
  strategy,
  onLaunchWizard,
}: {
  account: { id: string; company: string };
  strategy: any;
  onLaunchWizard: () => void;
}) {
  const update = useUpdateStrategy();
  const markReviewed = useMarkReviewed();
  const { data: plays = [] } = usePlays(strategy.id);
  const { data: kpis = [] } = useKpis(strategy.id);
  const { data: tourDone } = useTourCompleted();
  const markTourDone = useMarkTourCompleted();

  useEffect(() => {
    if (tourDone === false) {
      const t = setTimeout(() => {
        runStrategyTour("full", () => markTourDone.mutate());
      }, 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourDone]);

  const health = useMemo(() => computeStrategyHealth(strategy, kpis, plays), [strategy, kpis, plays]);
  const activeKpis = kpis.filter((k) => !k.is_deferred);
  const onTrackCount = activeKpis.filter((k) => {
    const h = computeKpiHealth(k);
    return h === "ahead" || h === "on_track";
  }).length;
  const atRiskCount = activeKpis.filter((k) => {
    const h = computeKpiHealth(k);
    return h === "at_risk" || h === "behind";
  }).length;
  const playsActive = plays.filter((p) => p.status === "in_progress").length;

  const updateField = (field: string, value: any) =>
    update.mutate({ id: strategy.id, [field]: value } as any);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <h2 className="text-lg font-bold" data-tour="strategy-title">Account Strategy · {account.company}</h2>
              <div className="flex flex-wrap gap-1.5" data-tour="account-types">
                {(strategy.account_types || []).map((t: StrategyAccountType) => (
                  <Badge key={t} variant="secondary">{ACCOUNT_TYPE_LABELS[t]}</Badge>
                ))}
                {(!strategy.account_types || strategy.account_types.length === 0) && (
                  <Badge variant="outline" className="text-muted-foreground">No types set</Badge>
                )}
                <AccountTypeEditor
                  current={strategy.account_types || []}
                  onChange={async (next) => {
                    await update.mutateAsync({ id: strategy.id, account_types: next } as any);
                    const existingNames = kpis.map((k) => k.name);
                    await seedKpisFromTemplates(strategy.id, next, existingNames);
                    toast.success("Account types updated");
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge data-tour="health-badge" className={cn("border", STRATEGY_HEALTH_COLORS[health])}>
                {STRATEGY_HEALTH_LABELS[health]}
              </Badge>
              <TourMenu data-tour="wizard-icon" />
              <Button variant="outline" size="sm" onClick={onLaunchWizard} className="gap-1.5">
                <Pencil className="h-3 w-3" /> Edit Strategy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* North Star */}
      <Card data-tour="north-star">
        <CardContent className="p-5 space-y-2 bg-primary/5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">North Star · Next 12 Months</p>
            <button onClick={() => runSectionHelp("[data-tour='north-star']", "North Star", "What we want from this account in 12 months. One sentence. Specific. Time-bound.")}>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <InlineEditableText
            value={strategy.north_star || ""}
            placeholder={strategy.status === "needs_review" ? "TBD — needs strategic review" : "Define what we want from this account in 12 months..."}
            maxLength={200}
            onSave={(v) => updateField("north_star", v.trim() || null)}
            className="text-base font-semibold leading-relaxed"
          />
        </CardContent>
      </Card>

      {/* Why this account */}
      <Card data-tour="why-this-account">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Why This Account</p>
            <button onClick={() => runSectionHelp("[data-tour='why-this-account']", "Why this account", "2-3 sentences explaining why we're investing here vs. another company.")}>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <InlineEditableText
            value={strategy.strategic_value || ""}
            placeholder="Why are we investing strategic energy in this account vs. others?"
            maxLength={500}
            multiline
            onSave={(v) => updateField("strategic_value", v.trim() || null)}
            className="text-sm text-foreground"
          />
        </CardContent>
      </Card>

      {/* Position + Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Current Position</p>
            <Select value={strategy.current_position} onValueChange={(v) => updateField("current_position", v as StrategyPosition)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[2100]">
                {(Object.keys(POSITION_LABELS) as StrategyPosition[]).map((p) => (
                  <SelectItem key={p} value={p}>{POSITION_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Strategy Health</p>
            <Badge className={cn("border text-sm py-1 px-3", STRATEGY_HEALTH_COLORS[health])}>
              {STRATEGY_HEALTH_LABELS[health]}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {playsActive} of {plays.length} plays active · {onTrackCount} KPIs ahead · {atRiskCount} KPIs at risk
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Decision Map */}
      <DecisionMapSection strategyId={strategy.id} customerId={account.id} />

      {/* Plays */}
      <PlaysSection strategyId={strategy.id} />

      {/* KPIs */}
      <KpisSection strategyId={strategy.id} accountTypes={strategy.account_types || []} />

      {/* Risks */}
      <RisksSection strategyId={strategy.id} />

      {/* Weekly Review notes */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Weekly Review Activity</h3>
          <QuickNoteCapture linkType="strategy" linkId={strategy.id} />
          <LinkedNotesList linkType="strategy" linkId={strategy.id} title="Notes from Weekly Reviews" />
        </CardContent>
      </Card>


      {/* Footer */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span>Created {format(new Date(strategy.created_at), "MMM d, yyyy")}</span>
            <span>·</span>
            <span>
              Last reviewed: {strategy.last_reviewed_at ? formatDistanceToNow(new Date(strategy.last_reviewed_at), { addSuffix: true }) : "never"}
            </span>
            {strategy.owner && <><span>·</span><span>Owner: {strategy.owner}</span></>}
          </div>
          <Button size="sm" variant="outline" onClick={() => markReviewed.mutate(strategy.id)} className="gap-1.5">
            <CheckCircle2 className="h-3 w-3" /> Mark as Reviewed
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// === Account Type Editor ===
function AccountTypeEditor({ current, onChange }: { current: StrategyAccountType[]; onChange: (next: StrategyAccountType[]) => void }) {
  const TYPES: StrategyAccountType[] = ["revenue", "strategic_partner", "reference", "beachhead", "defensive"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1"><Pencil className="h-3 w-3" /> Edit</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-[2100]">
        {TYPES.map((t) => (
          <DropdownMenuItem key={t} onSelect={(e) => { e.preventDefault(); onChange(current.includes(t) ? current.filter((x) => x !== t) : [...current, t]); }}>
            <Checkbox checked={current.includes(t)} /> {ACCOUNT_TYPE_LABELS[t]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span className={cn("inline-block h-3.5 w-3.5 mr-2 border rounded", checked ? "bg-primary border-primary" : "border-muted-foreground")}>
      {checked && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
    </span>
  );
}

// === Tour Menu ===
function TourMenu(props: any) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Show me how this page works" {...props}>
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-[2100]">
        <DropdownMenuItem onSelect={() => runStrategyTour("full")}>Full tour (10 steps)</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => runStrategyTour("quick")}>Quick refresher (3 steps)</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast("Click any section's help icon for section-specific help.")}>Help with a specific section</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// === Inline editable text ===
function InlineEditableText({
  value, placeholder, maxLength, multiline, onSave, className,
}: {
  value: string;
  placeholder: string;
  maxLength?: number;
  multiline?: boolean;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <div className="space-y-2">
        {multiline ? (
          <Textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={maxLength} autoFocus />
        ) : (
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={maxLength} autoFocus />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { onSave(draft); setEditing(false); }}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setDraft(value); setEditing(false); }}>Cancel</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="cursor-pointer group" onClick={() => setEditing(true)}>
      {value ? (
        <p className={cn("whitespace-pre-wrap", className)}>{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">{placeholder}</p>
      )}
      <p className="text-[10px] text-muted-foreground/50 mt-1 opacity-0 group-hover:opacity-100">Click to edit</p>
    </div>
  );
}

// === Decision Map ===
function DecisionMapSection({ strategyId, customerId }: { strategyId: string; customerId: string }) {
  const { data: entries = [] } = useDecisionMap(strategyId);
  const { data: contacts = [] } = useContacts(customerId);
  const { add, update, remove } = useDecisionMapMutations(strategyId);
  const [addOpen, setAddOpen] = useState<StrategyDecisionRole | null>(null);

  const ROLES: { key: StrategyDecisionRole; label: string }[] = [
    { key: "champion", label: "Champions" },
    { key: "decision_maker", label: "Decision Makers" },
    { key: "blocker", label: "Blockers" },
  ];

  const grouped = (role: StrategyDecisionRole) => entries.filter((e) => e.role === role);

  return (
    <Card data-tour="decision-map">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Decision Map</p>
          <button onClick={() => runSectionHelp("[data-tour='decision-map']", "Decision Map", "Champions root for us. Decision Makers sign. Blockers can kill it.")}>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ROLES.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-foreground">{label}</p>
              {grouped(key).length === 0 && (
                <p className="text-xs text-muted-foreground italic">None added</p>
              )}
              {grouped(key).map((e) => {
                const c = contacts.find((x) => x.id === e.contact_id);
                return (
                  <div key={e.id} className="border rounded-md p-2 text-xs space-y-1 group">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{c?.name || "—"}</p>
                      <button onClick={() => remove.mutate(e.id)} className="opacity-0 group-hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-muted-foreground">{c?.title || c?.role || ""}</p>
                    <Select value={e.temperature} onValueChange={(v) => update.mutate({ id: e.id, temperature: v as StrategyTemperature })}>
                      <SelectTrigger className={cn("h-6 text-[10px] capitalize", TEMPERATURE_COLORS[e.temperature])}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[2100]">
                        {(["cold", "warm", "hot"] as StrategyTemperature[]).map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
              <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => setAddOpen(key)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          ))}
        </div>
      </CardContent>

      {addOpen && (
        <AddDecisionDialog
          role={addOpen}
          contacts={contacts}
          existingContactIds={entries.filter((e) => e.role === addOpen).map((e) => e.contact_id).filter(Boolean) as string[]}
          onClose={() => setAddOpen(null)}
          onSave={async (contact_id, temperature) => {
            await add.mutateAsync({ strategy_id: strategyId, contact_id, role: addOpen, temperature, notes: null } as any);
            setAddOpen(null);
          }}
        />
      )}
    </Card>
  );
}

function AddDecisionDialog({
  role, contacts, existingContactIds, onClose, onSave,
}: {
  role: StrategyDecisionRole;
  contacts: any[];
  existingContactIds: string[];
  onClose: () => void;
  onSave: (contactId: string, temp: StrategyTemperature) => void;
}) {
  const [contactId, setContactId] = useState("");
  const [temp, setTemp] = useState<StrategyTemperature>("warm");
  const available = contacts.filter((c) => !existingContactIds.includes(c.id));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add {role.replace("_", " ")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Contact</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger><SelectValue placeholder="Pick a contact" /></SelectTrigger>
              <SelectContent className="z-[2100]">
                {available.length === 0 && <p className="p-2 text-xs text-muted-foreground">No more contacts to add. Add one in the Contacts tab.</p>}
                {available.map((c) => {
                  const t = (c.is_primary ? "primary" : (c.contact_type as ContactType) || "champion") as ContactType;
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span>{c.name}{c.title ? ` · ${c.title}` : ""}</span>
                        <span className={`text-[9px] font-semibold uppercase tracking-wide border rounded-full px-1.5 py-0.5 ${CONTACT_TYPE_PILL[t]}`}>
                          {CONTACT_TYPE_LABELS[t]}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Temperature</Label>
            <Select value={temp} onValueChange={(v) => setTemp(v as StrategyTemperature)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[2100]">
                <SelectItem value="cold">Cold</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!contactId} onClick={() => onSave(contactId, temp)}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// === Plays ===
function PlaysSection({ strategyId }: { strategyId: string }) {
  const [quarter, setQuarter] = useState(currentQuarter());
  const { data: plays = [] } = usePlays(strategyId);
  const { add, update, remove } = usePlayMutations(strategyId);
  const [addOpen, setAddOpen] = useState(false);
  const [editPlay, setEditPlay] = useState<any | null>(null);

  const filtered = plays.filter((p) => !p.quarter || p.quarter === quarter);

  // Quarters list: this and next 3
  const quarters = useMemo(() => {
    const list: string[] = [];
    const d = new Date();
    for (let i = -2; i <= 4; i++) {
      const dd = new Date(d.getFullYear(), d.getMonth() + i * 3, 1);
      list.push(currentQuarter(dd));
    }
    return Array.from(new Set(list));
  }, []);

  const cycleStatus = (s: StrategyPlayStatus): StrategyPlayStatus => {
    if (s === "not_started") return "in_progress";
    if (s === "in_progress") return "complete";
    return "not_started";
  };

  return (
    <Card data-tour="plays">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Strategic Plays · {quarter}</p>
            <button onClick={() => runSectionHelp("[data-tour='plays']", "Plays", "Specific actions you're running this quarter — not 'have a meeting'. Each has an owner and a due date.")}>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[2100]">
              {quarters.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {filtered.length === 0 && <p className="text-sm text-muted-foreground italic">No plays for this quarter.</p>}
        <div className="space-y-1">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/40 group">
              <button onClick={() => update.mutate({ id: p.id, status: cycleStatus(p.status) } as any)}>
                {p.status === "not_started" && <Circle className="h-4 w-4 text-muted-foreground" />}
                {p.status === "in_progress" && <Play className="h-4 w-4 text-blue-600" />}
                {p.status === "complete" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {p.status === "abandoned" && <X className="h-4 w-4 text-rose-600" />}
              </button>
              <div className="flex-1">
                <p className={cn("text-sm font-medium", p.status === "complete" && "line-through text-muted-foreground")}>{p.title}</p>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              </div>
              <p className="text-xs text-muted-foreground">{p.owner || "—"}</p>
              <p className="text-xs text-muted-foreground">{p.due_date ? format(new Date(p.due_date), "MMM d") : "—"}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditPlay(p)}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-3 w-3" /> Add Play
        </Button>
      </CardContent>

      {(addOpen || editPlay) && (
        <PlayDialog
          play={editPlay}
          quarter={quarter}
          onClose={() => { setAddOpen(false); setEditPlay(null); }}
          onSave={async (data) => {
            if (editPlay) await update.mutateAsync({ id: editPlay.id, ...data } as any);
            else await add.mutateAsync({ strategy_id: strategyId, ...data, status: "not_started" } as any);
            setAddOpen(false); setEditPlay(null);
          }}
        />
      )}
    </Card>
  );
}

function PlayDialog({ play, quarter, onClose, onSave }: { play: any; quarter: string; onClose: () => void; onSave: (data: any) => void }) {
  const [title, setTitle] = useState(play?.title || "");
  const [description, setDescription] = useState(play?.description || "");
  const [owner, setOwner] = useState(play?.owner || "");
  const [due, setDue] = useState(play?.due_date || "");
  const [q, setQ] = useState(play?.quarter || quarter);
  const [status, setStatus] = useState<StrategyPlayStatus>(play?.status || "not_started");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{play ? "Edit Play" : "Add Play"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Owner</Label><Input value={owner} onChange={(e) => setOwner(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Due date</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quarter</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Q2-2026" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StrategyPlayStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[2100]">
                  <SelectItem value="not_started">Not started</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!title.trim()} onClick={() => onSave({
            title: title.trim(),
            description: description.trim() || null,
            owner: owner.trim() || null,
            due_date: due || null,
            quarter: q || null,
            status,
          })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// === KPIs ===

// In-memory unlock grants for past quarters. Reset on page reload, per spec
// ("After save (or modal close), quarter auto-relocks. Each unlock requires a new reason").
type UnlockKey = string; // `${kpiId}:${quarter}:${year}`
function unlockKey(kpiId: string, quarter: QKey, year: number): UnlockKey {
  return `${kpiId}:${quarter}:${year}`;
}

async function logKpiAudit(args: {
  kpi_id: string;
  quarter: string;
  action: "unlock" | "edit_while_unlocked";
  reason?: string | null;
  before_value?: any;
  after_value?: any;
}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    await (supabase as any).from("strategy_kpi_audit_log").insert({
      kpi_id: args.kpi_id,
      quarter: args.quarter,
      action: args.action,
      reason: args.reason ?? null,
      before_value: args.before_value ?? null,
      after_value: args.after_value ?? null,
      user_id: u.user?.id ?? null,
      user_email: u.user?.email ?? null,
    });
  } catch (e) {
    console.warn("audit log insert failed", e);
  }
}

function KpisSection({ strategyId, accountTypes }: { strategyId: string; accountTypes: StrategyAccountType[] }) {
  const { data: kpis = [] } = useKpis(strategyId);
  const { data: actuals = [] } = useKpiActuals(strategyId);
  const { add, update, remove } = useKpiMutations(strategyId);
  const { add: addActual } = useKpiActualMutations(strategyId);
  const [addOpen, setAddOpen] = useState(false);
  const [editKpi, setEditKpi] = useState<any | null>(null);
  const [actualKpi, setActualKpi] = useState<StrategyKpi | null>(null);
  const [unlocked, setUnlocked] = useState<Set<UnlockKey>>(new Set());
  const [unlockRequest, setUnlockRequest] = useState<{ kpi: StrategyKpi; quarter: QKey; year: number } | null>(null);

  const requestUnlock = (kpi: StrategyKpi, quarter: QKey, year: number) => {
    setUnlockRequest({ kpi, quarter, year });
  };
  const grantUnlock = async (reason: string) => {
    if (!unlockRequest) return;
    const k = unlockKey(unlockRequest.kpi.id, unlockRequest.quarter, unlockRequest.year);
    setUnlocked((prev) => new Set(prev).add(k));
    await logKpiAudit({
      kpi_id: unlockRequest.kpi.id,
      quarter: `${unlockRequest.quarter}-${unlockRequest.year}`,
      action: "unlock",
      reason,
    });
    toast.success(`${unlockRequest.quarter} ${unlockRequest.year} unlocked for amendment`);
    setUnlockRequest(null);
  };


  const typeLabel = accountTypes.length ? accountTypes.map((t) => ACCOUNT_TYPE_LABELS[t]).join(" + ") : "—";

  return (
    <Card data-tour="kpis">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">KPIs · {typeLabel} Profile</p>
              <button onClick={() => runSectionHelp("[data-tour='kpis']", "KPIs", "Auto-set from account type. Edit targets anytime. Greyed-out KPIs activate when telemetry comes online.")}>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">These KPIs are based on the account type. Edit targets anytime.</p>
          </div>
        </div>
        {kpis.length === 0 && <p className="text-sm text-muted-foreground italic">No KPIs yet. Pick an account type to auto-populate.</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kpis.map((k) => {
            const isPhased = k.target_type === "phased";
            return isPhased ? (
              <PhasedKpiCard
                key={k.id}
                kpi={k}
                actuals={actuals}
                onEdit={() => setEditKpi(k)}
                onRemove={() => remove.mutate(k.id)}
                onUpdateActual={() => setActualKpi(k)}
              />
            ) : (
              <SingleKpiCard
                key={k.id}
                kpi={k}
                onEdit={() => setEditKpi(k)}
                onRemove={() => remove.mutate(k.id)}
              />
            );
          })}
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-3 w-3" /> Add Custom KPI
        </Button>
      </CardContent>

      {(addOpen || editKpi) && (
        <KpiDialog
          kpi={editKpi}
          onClose={() => { setAddOpen(false); setEditKpi(null); }}
          onSave={async (data) => {
            if (editKpi) await update.mutateAsync({ id: editKpi.id, ...data } as any);
            else await add.mutateAsync({ strategy_id: strategyId, ...data, is_primary: true, is_deferred: false } as any);
            setAddOpen(false); setEditKpi(null);
          }}
        />
      )}

      {actualKpi && (
        <UpdateActualDialog
          kpi={actualKpi}
          onClose={() => setActualKpi(null)}
          onSave={async ({ value, notes }) => {
            const { quarter, year } = getCurrentQuarterInfo();
            await addActual.mutateAsync({
              strategy_kpi_id: actualKpi.id,
              quarter, year,
              actual_value: value,
              entered_by: null,
              notes: notes || null,
            } as any);
            toast.success("Actual recorded");
            setActualKpi(null);
          }}
        />
      )}
    </Card>
  );
}

function SingleKpiCard({ kpi: k, onEdit, onRemove }: { kpi: StrategyKpi; onEdit: () => void; onRemove: () => void }) {
  const health = computeKpiHealth(k);
  const target = Number(k.target_value || 0);
  const current = Number(k.current_value || 0);
  const pct = target ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <Card className={cn("relative group", k.is_deferred && "opacity-60")}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" title={k.name}>{k.name}</p>
            {k.is_deferred && <Badge variant="outline" className="text-[10px] mt-1">{k.deferred_reason || "Telemetry pending"}</Badge>}
          </div>
          {!k.is_deferred && health && (
            <Badge variant="secondary" className="text-[10px]">{health}</Badge>
          )}
        </div>
        <p className="text-xs">
          <span className="font-bold">{formatKpiValue(current, k.unit)}</span>
          <span className="text-muted-foreground"> / {formatKpiValue(target, k.unit)}</span>
        </p>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full transition-all", health ? KPI_HEALTH_COLORS[health] : "bg-muted-foreground")} style={{ width: `${pct}%` }} />
        </div>
        {!k.is_deferred && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PhasedKpiCard({
  kpi: k, actuals, onEdit, onRemove, onUpdateActual,
}: { kpi: StrategyKpi; actuals: StrategyKpiActual[]; onEdit: () => void; onRemove: () => void; onUpdateActual: () => void }) {
  const status = useMemo(() => computePhasedKpiStatus(k, actuals), [k, actuals]);
  const [expanded, setExpanded] = useState<QKey | null>(null);
  const phasing = (k.quarter_phasing || {}) as QuarterPhasing;
  const annualActualPct = status.annualTarget > 0 ? Math.min(100, (status.annualActual / status.annualTarget) * 100) : 0;
  const yearWeek = Math.min(52, Math.max(1, Math.ceil(((Date.now() - new Date(status.year, 0, 1).getTime()) / (7 * 86400000)))));

  const qIndex = (q: QKey) => Number(q[1]) - 1;
  const currentQIdx = qIndex(status.currentQuarter);

  const quarterRow = (q: QKey) => {
    const idx = qIndex(q);
    const phase = phasing[q];
    const target = Number(phase?.target_value || 0);
    const qActuals = actuals.filter((a) => a.strategy_kpi_id === k.id && a.quarter === q && a.year === status.year);
    const actual = qActuals.reduce((s, a) => s + Number(a.actual_value || 0), 0);
    const isPast = idx < currentQIdx;
    const isCurrent = idx === currentQIdx;
    const isFuture = idx > currentQIdx;
    const ctx: "past" | "current" | "future" = isPast ? "past" : isCurrent ? "current" : "future";
    const pctOfTarget = target > 0 ? Math.min(100, (actual / target) * 100) : (actual > 0 ? 100 : 0);
    const expectedPct = isCurrent && target > 0 ? Math.min(100, (status.expectedToday / target) * 100) : 0;

    let badge: { label: string; cls: string } | null = null;
    if (isFuture) badge = { label: "—", cls: "text-muted-foreground" };
    else if (target === 0 && actual === 0) badge = { label: "✓", cls: "text-emerald-600" };
    else if (isPast) {
      if (target > 0 && actual >= target) badge = { label: "✓ done", cls: "text-emerald-600" };
      else if (target > 0) badge = { label: `✗ ${Math.round((actual / target) * 100)}%`, cls: "text-rose-600" };
      else badge = { label: "✓", cls: "text-emerald-600" };
    } else if (isCurrent) {
      const pace = status.expectedToday > 0 ? actual / status.expectedToday : 0;
      const delta = Math.round((pace - 1) * 100);
      if (status.weeksElapsed <= 2) badge = { label: "starting", cls: "text-slate-500" };
      else if (pace >= 1) badge = { label: `+${delta}%`, cls: "text-emerald-600" };
      else badge = { label: `${delta}%`, cls: "text-rose-600" };
    }

    return (
      <div key={q}>
        <button
          type="button"
          onClick={() => setExpanded(expanded === q ? null : q)}
          className={cn(
            "w-full flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted/50 transition",
            isCurrent && "ring-1 ring-primary/40 bg-primary/5",
            isPast && "opacity-70",
          )}
        >
          <span className="text-[10px] font-bold w-6 shrink-0">{q}</span>
          <div className="relative h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
            <div className={cn("absolute inset-y-0 left-0", isPast ? "bg-slate-400" : isCurrent ? "bg-teal-500" : "bg-muted-foreground/20")} style={{ width: `${pctOfTarget}%` }} />
            {isCurrent && <div className="absolute inset-y-0 w-px bg-foreground/60" style={{ left: `${expectedPct}%` }} />}
          </div>
          <span className="text-[10px] text-muted-foreground w-20 text-right truncate">
            {formatKpiValue(actual, k.unit)}<span className="opacity-50"> / {formatKpiValue(target, k.unit)}</span>
          </span>
          <span className={cn("text-[10px] w-14 text-right shrink-0", badge?.cls)}>{badge?.label}</span>
          <span className="text-[9px] uppercase text-muted-foreground/60 w-12 shrink-0">{ctx}</span>
        </button>
        {expanded === q && (
          <QuarterDetailPanel
            kpi={k}
            quarter={q}
            year={status.year}
            ctx={ctx}
            target={target}
            actual={actual}
            qActuals={qActuals}
            phasingNotes={phase?.notes || ""}
            currentWeek={isCurrent ? status.weeksElapsed : null}
            onAddActual={onUpdateActual}
          />
        )}
      </div>
    );
  };

  return (
    <Card className={cn("relative group md:col-span-2", k.is_deferred && "opacity-60")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" title={k.name}>{k.name}</p>
            <p className="text-[10px] text-muted-foreground">Phased · {status.year} · current {status.currentQuarter}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs">
              <span className="font-bold">{formatKpiValue(status.annualActual, k.unit)}</span>
              <span className="text-muted-foreground"> / {formatKpiValue(status.annualTarget, k.unit)} annual</span>
            </p>
            <Badge variant="outline" className={cn("text-[10px] mt-1", PHASED_STATUS_COLORS[status.status])}>
              {PHASED_STATUS_LABELS[status.status]}
            </Badge>
          </div>
        </div>
        <div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary/70" style={{ width: `${annualActualPct}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Annual progress · {Math.round(annualActualPct)}% (Week {yearWeek} of 52)
          </p>
        </div>
        <div className="space-y-1">
          {QUARTERS.map(quarterRow)}
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] gap-1" onClick={onUpdateActual}>
            <Plus className="h-3 w-3" /> Add {status.currentQuarter} actual
          </Button>
          {!k.is_deferred && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuarterDetailPanel({
  kpi: k, quarter, year, ctx, target, actual, qActuals, phasingNotes, currentWeek, onAddActual,
}: {
  kpi: StrategyKpi; quarter: QKey; year: number; ctx: "past" | "current" | "future";
  target: number; actual: number; qActuals: StrategyKpiActual[]; phasingNotes: string;
  currentWeek: number | null; onAddActual: () => void;
}) {
  const pace = ctx === "current" && currentWeek
    ? (target > 0 ? (actual / (target * (currentWeek / 13))) : 0)
    : 0;
  const expected = ctx === "current" && currentWeek ? target * (currentWeek / 13) : 0;
  return (
    <div className="ml-8 mr-2 mb-2 px-3 py-2 rounded border bg-muted/30 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold">
          {quarter} {year} · {ctx === "past" ? "past — locked" : ctx === "current" ? `Week ${currentWeek}/13` : "future"}
        </p>
        {ctx === "past" && <Badge variant="outline" className="text-[9px]"><Lock className="h-2.5 w-2.5 mr-1" />Locked</Badge>}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Target: <span className="text-foreground font-medium">{formatKpiValue(target, k.unit)}</span> ·
        Actual: <span className="text-foreground font-medium"> {formatKpiValue(actual, k.unit)}</span>
        {ctx === "current" && expected > 0 && (
          <> · Pace: <span className="text-foreground font-medium">{Math.round(pace * 100)}%</span> of expected ({formatKpiValue(expected, k.unit)})</>
        )}
      </p>
      {phasingNotes && (
        <p className="text-[10px] italic text-muted-foreground border-l-2 pl-2">{phasingNotes}</p>
      )}
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold text-muted-foreground">Recent actuals</p>
        {qActuals.length === 0 && <p className="text-[10px] text-muted-foreground italic">None recorded</p>}
        {qActuals.slice(0, 5).map((a) => (
          <p key={a.id} className="text-[10px] flex justify-between">
            <span>{format(new Date(a.entered_at), "MMM d")}</span>
            <span className="font-mono">+{formatKpiValue(Number(a.delta_value ?? a.actual_value), k.unit)}</span>
          </p>
        ))}
      </div>
      {ctx === "current" && (
        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={onAddActual}>
          <Plus className="h-2.5 w-2.5" /> Add actual for current week
        </Button>
      )}
      {ctx === "future" && (
        <p className="text-[10px] text-muted-foreground italic">Forecast quarter — actuals open once {quarter} begins.</p>
      )}
    </div>
  );
}

function UpdateActualDialog({ kpi, onClose, onSave }: { kpi: StrategyKpi; onClose: () => void; onSave: (d: { value: number; notes: string }) => void }) {
  const { quarter } = getCurrentQuarterInfo();
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Update actual · {kpi.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Current {quarter} actual to add</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
            <p className="text-[10px] text-muted-foreground">Adds to existing {quarter} actuals.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={value === "" || isNaN(Number(value))} onClick={() => onSave({ value: Number(value), notes })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type QKey = "Q1" | "Q2" | "Q3" | "Q4";
const QUARTERS: QKey[] = ["Q1", "Q2", "Q3", "Q4"];

function KpiDialog({ kpi, onClose, onSave }: { kpi: any; onClose: () => void; onSave: (data: any) => void }) {
  const [name, setName] = useState(kpi?.name || "");
  const [unit, setUnit] = useState<StrategyKpiUnit>(kpi?.unit || "count");
  const [targetType, setTargetType] = useState<"single" | "phased">(kpi?.target_type || "single");
  const [target, setTarget] = useState<string>(kpi?.target_value?.toString() || "");
  const [current, setCurrent] = useState<string>(kpi?.current_value?.toString() || "0");
  const [notes, setNotes] = useState(kpi?.notes || "");
  const [annual, setAnnual] = useState<string>(
    (kpi?.annual_target_value ?? (kpi?.target_type === "phased" ? kpi?.target_value : ""))?.toString() || ""
  );
  const initialPhasing = (kpi?.quarter_phasing || {}) as QuarterPhasing;
  const [phasing, setPhasing] = useState<Record<QKey, { value: number; pct: number; notes: string }>>(() => ({
    Q1: { value: Number(initialPhasing.Q1?.target_value || 0), pct: Number(initialPhasing.Q1?.target_percent || 0), notes: initialPhasing.Q1?.notes || "" },
    Q2: { value: Number(initialPhasing.Q2?.target_value || 0), pct: Number(initialPhasing.Q2?.target_percent || 0), notes: initialPhasing.Q2?.notes || "" },
    Q3: { value: Number(initialPhasing.Q3?.target_value || 0), pct: Number(initialPhasing.Q3?.target_percent || 0), notes: initialPhasing.Q3?.notes || "" },
    Q4: { value: Number(initialPhasing.Q4?.target_value || 0), pct: Number(initialPhasing.Q4?.target_percent || 0), notes: initialPhasing.Q4?.notes || "" },
  }));
  const [locked, setLocked] = useState<QKey>((kpi?.locked_quarter as QKey) || "Q4");
  const [template, setTemplate] = useState<string>("");

  const annualNum = Number(annual || 0);

  type PRow = { value: number; pct: number; notes: string };
  // Recompute the locked quarter as the remainder of the others.
  const recomputeLocked = (state: Record<QKey, PRow>, lockedQ: QKey, ann: number): Record<QKey, PRow> => {
    const others = QUARTERS.filter((q) => q !== lockedQ);
    const sumOtherPct = others.reduce((s, q) => s + (Number(state[q].pct) || 0), 0);
    const sumOtherVal = others.reduce((s, q) => s + (Number(state[q].value) || 0), 0);
    const lockedPct = Math.max(0, 100 - sumOtherPct);
    const lockedVal = ann > 0 ? Math.max(0, ann - sumOtherVal) : 0;
    return { ...state, [lockedQ]: { ...state[lockedQ], value: lockedVal, pct: lockedPct } };
  };

  // When annual changes, recompute dollar amounts from existing percentages and rebalance locked.
  useEffect(() => {
    if (targetType !== "phased" || !annualNum) return;
    setPhasing((prev) => {
      const next: Record<QKey, PRow> = { ...prev };
      QUARTERS.filter((q) => q !== locked).forEach((q) => {
        next[q] = { ...next[q], value: Math.round(((Number(next[q].pct) || 0) / 100) * annualNum) };
      });
      return recomputeLocked(next, locked, annualNum);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annualNum, targetType]);

  const applyTemplate = (tplKey: string) => {
    setTemplate(tplKey);
    const tpl = PHASING_TEMPLATES[tplKey];
    if (!tpl) return;
    const next: Record<QKey, PRow> = { ...phasing };
    QUARTERS.forEach((q) => {
      const pct = tpl.quarters[q];
      const value = annualNum ? Math.round((pct / 100) * annualNum) : 0;
      next[q] = { ...next[q], value, pct };
    });
    setPhasing(recomputeLocked(next, locked, annualNum));
  };

  const updateQuarterValue = (q: QKey, raw: string) => {
    if (q === locked) return;
    const v = Number(raw || 0);
    const pct = annualNum > 0 ? (v / annualNum) * 100 : 0;
    const next: Record<QKey, PRow> = { ...phasing, [q]: { ...phasing[q], value: v, pct: Math.round(pct * 10) / 10 } };
    setPhasing(recomputeLocked(next, locked, annualNum));
    setTemplate("");
  };

  const updateQuarterPct = (q: QKey, raw: string) => {
    if (q === locked) return;
    const p = Number(raw || 0);
    const v = annualNum > 0 ? Math.round((p / 100) * annualNum) : 0;
    const next: Record<QKey, PRow> = { ...phasing, [q]: { ...phasing[q], pct: p, value: v } };
    setPhasing(recomputeLocked(next, locked, annualNum));
    setTemplate("");
  };

  const updateQuarterNotes = (q: QKey, raw: string) => {
    setPhasing((prev) => ({ ...prev, [q]: { ...prev[q], notes: raw } }));
  };

  const setLockedQuarter = (q: QKey) => {
    setLocked(q);
    setPhasing((prev) => recomputeLocked(prev, q, annualNum));
  };

  const totalPct = QUARTERS.reduce((s, q) => s + (Number(phasing[q].pct) || 0), 0);
  const totalValue = QUARTERS.reduce((s, q) => s + (Number(phasing[q].value) || 0), 0);
  const pctDelta = totalPct - 100;
  const isExact = Math.abs(pctDelta) < 0.5;
  const isOver = pctDelta > 0.5;
  const isUnder = pctDelta < -0.5;

  const handleSave = () => {
    if (targetType === "single") {
      onSave({
        name: name.trim(), unit,
        target_type: "single",
        target_value: target === "" ? null : Number(target),
        current_value: current === "" ? 0 : Number(current),
        annual_target_value: null,
        quarter_phasing: null,
        locked_quarter: null,
        notes: notes.trim() || null,
      });
    } else {
      const qp: QuarterPhasing = {};
      QUARTERS.forEach((q) => {
        qp[q] = { target_value: Number(phasing[q].value || 0), target_percent: Number(phasing[q].pct || 0), notes: phasing[q].notes || "" };
      });
      onSave({
        name: name.trim(), unit,
        target_type: "phased",
        target_value: annual === "" ? null : Number(annual),
        annual_target_value: annual === "" ? null : Number(annual),
        quarter_phasing: qp,
        locked_quarter: locked,
        current_value: current === "" ? 0 : Number(current),
        notes: notes.trim() || null,
      });
    }
  };

  const phasedSaveBlocked = targetType === "phased" && (annualNum <= 0 || isOver);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{kpi ? "Edit KPI" : "Add Custom KPI"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as StrategyKpiUnit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[2100]">
                  <SelectItem value="dollar">$</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                  <SelectItem value="count">count</SelectItem>
                  <SelectItem value="yes_no">yes/no</SelectItem>
                  <SelectItem value="multiplier">multiplier</SelectItem>
                  <SelectItem value="days">days</SelectItem>
                  <SelectItem value="months">months</SelectItem>
                  <SelectItem value="custom">custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Current actual</Label><Input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
          </div>

          {(() => {
            const unitMeta: Record<string, { label: string; placeholder: string }> = {
              dollar: { label: "Annual target ($)", placeholder: "e.g. 2,400,000" },
              percent: { label: "Annual target (%)", placeholder: "e.g. 50" },
              count: { label: "Annual target (count)", placeholder: "e.g. 10,000" },
              days: { label: "Annual target (days)", placeholder: "e.g. 365" },
              months: { label: "Annual target (months)", placeholder: "e.g. 12" },
              multiplier: { label: "Annual target (ratio)", placeholder: "e.g. 0.95" },
              custom: { label: "Annual target", placeholder: "e.g. 2,000" },
              yes_no: { label: "Target", placeholder: "" },
            };
            const meta = unitMeta[unit] || unitMeta.custom;
            const isBinary = unit === "yes_no";
            const effectiveType = isBinary ? "single" : targetType;
            return (
              <>
                {!isBinary && (
                  <div className="space-y-2 rounded-md border p-3">
                    <Label className="text-xs font-semibold">Target type</Label>
                    <div className="flex gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={targetType === "single"} onChange={() => setTargetType("single")} />
                        Single annual target
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={targetType === "phased"} onChange={() => setTargetType("phased")} />
                        Phased quarterly targets
                      </label>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Phased targets break your annual goal into quarterly milestones, so status updates show whether you're on pace for THIS point in the quarter — not just whether you've hit the annual target.
                    </p>
                  </div>
                )}

                {effectiveType === "single" ? (
                  <div className="space-y-1.5"><Label className="text-xs">{isBinary ? "Target (1 = yes)" : meta.label}</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={meta.placeholder} /></div>
                ) : (
                  <div className="space-y-3 rounded-md border p-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{meta.label}</Label>
                      <Input type="number" value={annual} onChange={(e) => setAnnual(e.target.value)} placeholder={meta.placeholder} />
                    </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phasing template</Label>
                <Select value={template} onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue placeholder="Pick a template (optional)" /></SelectTrigger>
                  <SelectContent className="z-[2100]">
                    {Object.entries(PHASING_TEMPLATES).map(([key, tpl]) => (
                      <SelectItem key={key} value={key}>{tpl.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {QUARTERS.map((q) => {
                  const isLocked = q === locked;
                  return (
                    <div key={q} className={cn("space-y-1 rounded p-1.5", isLocked && "bg-muted/40")}>
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold">{q}</Label>
                        <button
                          type="button"
                          onClick={() => setLockedQuarter(q)}
                          title={isLocked ? "Auto-balanced quarter" : "Make this the auto-balanced quarter"}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        </button>
                      </div>
                      <Input
                        type="number"
                        placeholder="$"
                        value={phasing[q].value || ""}
                        onChange={(e) => updateQuarterValue(q, e.target.value)}
                        readOnly={isLocked}
                        className={cn("h-8 text-xs", isLocked && "text-muted-foreground")}
                      />
                      <Input
                        type="number"
                        placeholder="%"
                        value={phasing[q].pct ? String(Math.round(phasing[q].pct * 10) / 10) : ""}
                        onChange={(e) => updateQuarterPct(q, e.target.value)}
                        readOnly={isLocked}
                        className={cn("h-8 text-xs", isLocked && "text-muted-foreground")}
                      />
                      <Textarea
                        rows={2}
                        placeholder="Notes / assumptions"
                        value={phasing[q].notes || ""}
                        onChange={(e) => updateQuarterNotes(q, e.target.value)}
                        className="text-[10px] min-h-[44px]"
                      />
                    </div>
                  );
                })}
              </div>
              <div
                className={cn(
                  "text-[11px] rounded px-2 py-1.5 flex items-center justify-between",
                  isExact && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                  isUnder && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                  isOver && "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
                )}
              >
                <span>
                  Total: {formatKpiValue(totalValue, unit)} ({totalPct.toFixed(1)}%)
                  {isExact && " ✓"}
                  {isUnder && ` ⚠ ${Math.abs(pctDelta).toFixed(1)}% (${formatKpiValue(annualNum - totalValue, unit)}) unaccounted for`}
                  {isOver && ` ✗ exceeds annual by ${formatKpiValue(totalValue - annualNum, unit)} — resolve to save`}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {locked} auto-balances by default to keep totals at 100%. Click any other quarter's lock icon to change which one auto-balances.
              </p>
            </div>
          )}
              </>
            );
          })()}

          <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!name.trim() || phasedSaveBlocked} onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// === Risks ===
function RisksSection({ strategyId }: { strategyId: string }) {
  const { data: risks = [] } = useRisks(strategyId);
  const { add, remove } = useRiskMutations(strategyId);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState<StrategyRiskSeverity>("risk");

  return (
    <Card data-tour="risks">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Risks & Watch Items</p>
          <button onClick={() => runSectionHelp("[data-tour='risks']", "Risks", "Add risks as you spot them. Review them in your weekly account review.")}>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        {risks.length === 0 && !adding && <p className="text-sm text-muted-foreground italic">No risks logged.</p>}
        <div className="space-y-1">
          {risks.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/40 group">
              {r.severity === "critical" || r.severity === "risk" ? (
                <AlertTriangle className={cn("h-4 w-4", r.severity === "critical" ? "text-rose-600" : "text-amber-600")} />
              ) : (
                <Eye className="h-4 w-4 text-slate-500" />
              )}
              <p className="flex-1 text-sm">{r.risk_text}</p>
              <Badge variant="outline" className="text-[10px] capitalize">{r.severity}</Badge>
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove.mutate(r.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        {adding ? (
          <div className="space-y-2 border rounded p-3">
            <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the risk or watch item..." />
            <div className="flex items-center gap-2">
              <Select value={severity} onValueChange={(v) => setSeverity(v as StrategyRiskSeverity)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[2100]">
                  <SelectItem value="watch">Watch</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!text.trim()} onClick={async () => {
                await add.mutateAsync({ strategy_id: strategyId, risk_text: text.trim(), severity } as any);
                setText(""); setAdding(false);
              }}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setText(""); setAdding(false); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5">
            <Plus className="h-3 w-3" /> Add Risk
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
