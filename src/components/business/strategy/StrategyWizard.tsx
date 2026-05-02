import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_DESCRIPTIONS,
  getKpiTemplatesForTypes,
  type StrategyAccountType,
  type KpiTemplate,
} from "@/types/strategy";
import { useUpdateStrategy, useKpiMutations, usePlayMutations } from "@/hooks/useStrategy";
import type { AccountStrategy as AS } from "@/types/strategy";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  strategy: AS;
  accountName: string;
}

const NORTH_STAR_EXAMPLES = [
  "Convert AmpUP to paid customer with 200+ connectors by Q4 2026",
  "Make BTC Power our top OEM advocate generating 5+ warm CPO intros",
  "Use CARB pilot to land 3 California state agency deals",
];

const TYPES: StrategyAccountType[] = ["revenue", "strategic_partner", "reference", "beachhead", "defensive"];

export function StrategyWizard({ open, onOpenChange, strategy, accountName }: Props) {
  const [step, setStep] = useState(1);
  const [northStar, setNorthStar] = useState(strategy.north_star || "");
  const [types, setTypes] = useState<StrategyAccountType[]>(strategy.account_types || []);
  const [why, setWhy] = useState(strategy.strategic_value || "");
  const [kpis, setKpis] = useState<(KpiTemplate & { include: boolean; target: number | null })[]>([]);
  const [plays, setPlays] = useState<{ title: string; owner: string; due: string }[]>([
    { title: "", owner: "", due: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const updateStrategy = useUpdateStrategy();
  const kpiM = useKpiMutations(strategy.id);
  const playM = usePlayMutations(strategy.id);

  const refreshKpis = (selected: StrategyAccountType[]) => {
    const tpls = getKpiTemplatesForTypes(selected).filter((t) => t.primary);
    setKpis(tpls.map((t) => ({ ...t, include: true, target: t.default_target })));
  };

  const toggleType = (t: StrategyAccountType) => {
    const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    setTypes(next);
    refreshKpis(next);
  };

  const canNext = () => {
    if (step === 1) return northStar.trim().length >= 10;
    if (step === 2) return types.length >= 1;
    if (step === 3) return why.trim().length >= 30;
    return true;
  };

  const finish = async () => {
    setSaving(true);
    try {
      await updateStrategy.mutateAsync({
        id: strategy.id,
        north_star: northStar.trim(),
        account_types: types,
        strategic_value: why.trim(),
        status: "active",
        last_reviewed_at: new Date().toISOString(),
      } as any);

      const includedKpis = kpis
        .filter((k) => k.include)
        .map((k) => ({
          strategy_id: strategy.id,
          name: k.name,
          unit: k.unit,
          target_value: k.target,
          current_value: 0,
          kpi_template_origin: types.join(","),
          is_primary: true,
          is_deferred: !!k.is_deferred,
          deferred_reason: k.deferred_reason || null,
          notes: null,
          target_date: null,
        }));
      if (includedKpis.length) await kpiM.addMany.mutateAsync(includedKpis as any);

      const newPlays = plays.filter((p) => p.title.trim()).map((p) => ({
        strategy_id: strategy.id,
        title: p.title.trim(),
        description: null,
        owner: p.owner.trim() || null,
        due_date: p.due || null,
        quarter: null,
        status: "not_started" as const,
      }));
      for (const p of newPlays) await playM.add.mutateAsync(p as any);

      toast.success(`Strategy created for ${accountName}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save strategy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Strategy Setup · {accountName}</DialogTitle>
          <p className="text-xs text-muted-foreground">Step {step} of 5</p>
        </DialogHeader>

        <div className="space-y-4">
          {step === 1 && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold">What do we want from this account in the next 12 months?</h3>
              <p className="text-xs text-muted-foreground">One sentence. Specific. Time-bound. Measurable.</p>
              <Textarea rows={2} value={northStar} onChange={(e) => setNorthStar(e.target.value)} placeholder="One sentence describing the win..." maxLength={200} />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Examples:</p>
                {NORTH_STAR_EXAMPLES.map((ex) => (
                  <p key={ex} className="pl-3 italic">• {ex}</p>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold">Why does this account matter?</h3>
              <div className="space-y-2">
                {TYPES.map((t) => {
                  const active = types.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleType(t)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all",
                        active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <div className={cn("h-4 w-4 rounded border flex items-center justify-center", active ? "bg-primary border-primary" : "border-muted-foreground")}>
                          {active && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        {ACCOUNT_TYPE_LABELS[t]} Account
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 pl-6">{ACCOUNT_TYPE_DESCRIPTIONS[t]}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold">Why are we investing here vs. another company?</h3>
              <p className="text-xs text-muted-foreground">2-3 sentences. The strategic 'why'.</p>
              <Textarea rows={5} value={why} onChange={(e) => setWhy(e.target.value)} maxLength={500} placeholder="The strategic reasoning..." />
              <p className="text-[11px] text-muted-foreground">{why.length}/500 chars · need 30+</p>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold">Here are the KPIs based on what you picked.</h3>
              <p className="text-xs text-muted-foreground">Targets are editable. Uncheck any you don't need.</p>
              <div className="space-y-2">
                {kpis.length === 0 && <p className="text-sm text-muted-foreground italic">No KPIs — pick at least one account type.</p>}
                {kpis.map((k, idx) => (
                  <Card key={k.name}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={k.include}
                        onChange={(e) => setKpis(kpis.map((x, i) => (i === idx ? { ...x, include: e.target.checked } : x)))}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{k.name}</p>
                        <p className="text-[11px] text-muted-foreground">{k.unit}{k.is_deferred && " · telemetry pending"}</p>
                      </div>
                      <Input
                        type="number"
                        className="w-28"
                        value={k.target ?? ""}
                        onChange={(e) =>
                          setKpis(kpis.map((x, i) => (i === idx ? { ...x, target: e.target.value === "" ? null : Number(e.target.value) } : x)))
                        }
                        placeholder="Target"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="space-y-3">
              <h3 className="text-base font-semibold">Add 1-3 specific actions for this quarter.</h3>
              <p className="text-xs text-muted-foreground">What's the first thing we're going to do? You can skip and add later.</p>
              {plays.map((p, idx) => (
                <Card key={idx}>
                  <CardContent className="p-3 grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6 space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input value={p.title} onChange={(e) => setPlays(plays.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))} />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Owner</Label>
                      <Input value={p.owner} onChange={(e) => setPlays(plays.map((x, i) => (i === idx ? { ...x, owner: e.target.value } : x)))} />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Due</Label>
                      <Input type="date" value={p.due} onChange={(e) => setPlays(plays.map((x, i) => (i === idx ? { ...x, due: e.target.value } : x)))} />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {plays.length < 3 && (
                <Button size="sm" variant="outline" onClick={() => setPlays([...plays, { title: "", owner: "", due: "" }])} className="gap-1.5">
                  <Plus className="h-3 w-3" /> Add another
                </Button>
              )}
            </section>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Save & exit</Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={saving} className="gap-1.5">
                <ArrowLeft className="h-3 w-3" /> Back
              </Button>
            )}
            {step < 5 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext() || saving} className="gap-1.5">
                Next <ArrowRight className="h-3 w-3" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={saving} className="gap-1.5">
                Finish
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
