import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CustomerLogo } from "@/components/CustomerLogo";
import { Search, X, Plus, Star, Target, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { currentQuarter, FOCUS_5_LIMIT, ACCOUNT_TYPE_LABELS, type AccountStrategy, type StrategyAccountType } from "@/types/strategy";
import { useAddToFocus5, useRemoveFromFocus5, useUpdateFocusReason } from "@/hooks/useFocus5";

export interface Focus5ManagerEntry {
  strategy: AccountStrategy;
  customer: { id: string; company: string; logo_url?: string | null };
  health?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entries: Focus5ManagerEntry[]; // all enriched strategies (focus + non-focus)
}

type Mode = "list" | "pick" | "reason";

export function Focus5ManagerModal({ open, onOpenChange, entries }: Props) {
  const quarter = currentQuarter();
  const add = useAddToFocus5();
  const remove = useRemoveFromFocus5();
  const updateReason = useUpdateFocusReason();

  const focused = useMemo(
    () => entries.filter((e) => e.strategy.is_focus),
    [entries]
  );
  const others = useMemo(
    () => entries.filter((e) => !e.strategy.is_focus),
    [entries]
  );

  const [mode, setMode] = useState<Mode>("list");
  const [pickQuery, setPickQuery] = useState("");
  const [pendingPick, setPendingPick] = useState<Focus5ManagerEntry | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [editingReasonFor, setEditingReasonFor] = useState<string | null>(null);
  const [editingReasonValue, setEditingReasonValue] = useState("");

  const atLimit = focused.length >= FOCUS_5_LIMIT;

  const reset = () => {
    setMode("list");
    setPickQuery("");
    setPendingPick(null);
    setReasonDraft("");
    setEditingReasonFor(null);
    setEditingReasonValue("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const filteredOthers = pickQuery.trim()
    ? others.filter((e) => e.customer.company.toLowerCase().includes(pickQuery.trim().toLowerCase()))
    : others;

  const handleAdd = () => {
    if (!pendingPick || !reasonDraft.trim()) return;
    add.mutate(
      {
        strategyId: pendingPick.strategy.id,
        customerId: pendingPick.customer.id,
        reason: reasonDraft.trim(),
      },
      {
        onSuccess: () => {
          setPendingPick(null);
          setReasonDraft("");
          setMode("list");
        },
      }
    );
  };

  const saveReasonEdit = (strategyId: string) => {
    if (!editingReasonValue.trim()) return;
    updateReason.mutate(
      { strategyId, reason: editingReasonValue.trim() },
      {
        onSuccess: () => {
          setEditingReasonFor(null);
          setEditingReasonValue("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-500" />
            Focus 5 — {quarter.replace("-", " ")}
          </DialogTitle>
          <DialogDescription>
            These are the accounts that get 80% of your time and energy this quarter.
          </DialogDescription>
        </DialogHeader>

        {mode === "list" && (
          <div className="space-y-4">
            {/* Current Focus 5 */}
            <div className="space-y-2">
              {focused.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
                  No Focus accounts yet. Add up to {FOCUS_5_LIMIT}.
                </div>
              )}
              {focused.map((e) => {
                const isEditing = editingReasonFor === e.strategy.id;
                return (
                  <div
                    key={e.strategy.id}
                    className="flex items-start gap-3 p-3 rounded-md border border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10"
                  >
                    <CustomerLogo logoUrl={e.customer.logo_url} companyName={e.customer.company} size="sm" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        <p className="text-sm font-semibold truncate">{e.customer.company}</p>
                        <div className="flex flex-wrap gap-1">
                          {(e.strategy.account_types || []).slice(0, 2).map((t: StrategyAccountType) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">{ACCOUNT_TYPE_LABELS[t]}</Badge>
                          ))}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="flex gap-2 items-start">
                          <Textarea
                            value={editingReasonValue}
                            onChange={(ev) => setEditingReasonValue(ev.target.value)}
                            className="text-xs min-h-[50px]"
                            placeholder="Why is this account Focus this quarter?"
                          />
                          <div className="flex flex-col gap-1">
                            <Button size="sm" onClick={() => saveReasonEdit(e.strategy.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingReasonFor(null); setEditingReasonValue(""); }}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground italic text-left hover:text-foreground transition-colors w-full"
                          onClick={() => {
                            setEditingReasonFor(e.strategy.id);
                            setEditingReasonValue(e.strategy.focus_reason || "");
                          }}
                          title="Click to edit reason"
                        >
                          {e.strategy.focus_reason || "Click to add a reason…"}
                        </button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      onClick={() => remove.mutate({ strategyId: e.strategy.id })}
                      disabled={remove.isPending}
                    >
                      <X className="h-3 w-3" /> Remove
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Add */}
            <Button
              variant="outline"
              className="w-full gap-1.5 border-dashed"
              onClick={() => setMode("pick")}
              disabled={atLimit}
              title={atLimit ? "You already have 5 Focus accounts. Remove one first." : "Add an account to Focus 5"}
            >
              <Plus className="h-4 w-4" />
              {atLimit ? "Focus 5 full — remove one to add another" : "Add account to Focus 5"}
            </Button>

            <div className="pt-3 border-t flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                End of quarter? Review your Focus 5 and rotate.
              </p>
              <Button variant="ghost" size="sm" disabled className="text-xs">
                Review Focus 5 →
              </Button>
            </div>
          </div>
        )}

        {mode === "pick" && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setMode("list")} className="gap-1.5 -ml-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search accounts…"
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {filteredOthers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No matching accounts.</p>
              )}
              {filteredOthers.map((e) => (
                <button
                  key={e.strategy.id}
                  type="button"
                  onClick={() => { setPendingPick(e); setMode("reason"); }}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left transition-colors"
                  )}
                >
                  <CustomerLogo logoUrl={e.customer.logo_url} companyName={e.customer.company} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.customer.company}</p>
                    <div className="flex gap-1 mt-0.5">
                      {(e.strategy.account_types || []).slice(0, 2).map((t: StrategyAccountType) => (
                        <Badge key={t} variant="outline" className="text-[10px]">{ACCOUNT_TYPE_LABELS[t]}</Badge>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "reason" && pendingPick && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => { setMode("pick"); setPendingPick(null); setReasonDraft(""); }} className="gap-1.5 -ml-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40">
              <CustomerLogo logoUrl={pendingPick.customer.logo_url} companyName={pendingPick.customer.company} size="sm" />
              <p className="text-sm font-semibold">{pendingPick.customer.company}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Why is this account Focus 5? <span className="text-muted-foreground">(1 sentence)</span>
              </label>
              <Textarea
                value={reasonDraft}
                onChange={(e) => setReasonDraft(e.target.value)}
                placeholder="e.g., Largest expansion opportunity this quarter — $400K ARR target."
                rows={3}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setMode("pick"); setPendingPick(null); setReasonDraft(""); }}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!reasonDraft.trim() || add.isPending}>
                {add.isPending ? "Adding…" : "Add to Focus 5"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
