import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { computeDealEconomics, PER_CONNECTOR_RATE, type DealType, type RecurringModel } from "@/types/growth";
import { DollarSign, Repeat, Package, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DealEconomicsForm {
  deal_type: DealType;
  recurring_model: RecurringModel | null;
  connector_count: string | number | null;
  monthly_rate: string | number | null;
  contract_length_months: string | number;
  one_time_value: string | number | null;
  one_time_description: string;
}

interface Props {
  value: DealEconomicsForm;
  onChange: (next: DealEconomicsForm) => void;
}

const TYPE_OPTIONS: { value: DealType; label: string; sub: string; icon: typeof Repeat }[] = [
  { value: "recurring", label: "Recurring", sub: "NOCH+ subscription", icon: Repeat },
  { value: "one_time", label: "One-time", sub: "Project / service", icon: Package },
  { value: "hybrid", label: "Hybrid", sub: "Both", icon: Layers },
];

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function DealEconomicsFields({ value, onChange }: Props) {
  const set = (patch: Partial<DealEconomicsForm>) => onChange({ ...value, ...patch });

  const isRecurring = value.deal_type === "recurring" || value.deal_type === "hybrid";
  const isOneTime = value.deal_type === "one_time" || value.deal_type === "hybrid";

  const econ = computeDealEconomics({
    deal_type: value.deal_type,
    recurring_model: value.recurring_model,
    connector_count: Number(value.connector_count) || 0,
    monthly_rate: Number(value.monthly_rate) || 0,
    contract_length_months: Number(value.contract_length_months) || 12,
    one_time_value: Number(value.one_time_value) || 0,
  });

  return (
    <div className="space-y-4">
      {/* Deal Type */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deal Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = value.deal_type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set({ deal_type: opt.value })}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-md border p-2.5 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-input hover:border-primary/50 hover:bg-accent/40",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-medium", active && "text-primary")}>{opt.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{opt.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recurring fields */}
      {isRecurring && (
        <div className="space-y-3 border-l-2 border-primary/30 pl-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Repeat className="h-3 w-3" /> Recurring
          </Label>

          <RadioGroup
            value={value.recurring_model || "per_connector"}
            onValueChange={(v) => set({ recurring_model: v as RecurringModel })}
            className="grid grid-cols-2 gap-2"
          >
            <label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent/40">
              <RadioGroupItem value="per_connector" id="rm-pc" />
              <div className="text-xs">
                <div className="font-medium">Per-connector</div>
                <div className="text-muted-foreground">${PER_CONNECTOR_RATE}/connector/mo</div>
              </div>
            </label>
            <label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent/40">
              <RadioGroupItem value="flat_monthly" id="rm-fm" />
              <div className="text-xs">
                <div className="font-medium">Flat monthly</div>
                <div className="text-muted-foreground">Custom rate</div>
              </div>
            </label>
          </RadioGroup>

          <div className="grid grid-cols-2 gap-3">
            {value.recurring_model === "per_connector" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Connector Count</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={value.connector_count ?? ""}
                    onChange={(e) => set({ connector_count: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Monthly Rate (auto)</Label>
                  <Input value={fmt(econ.mrr)} disabled className="bg-muted/40" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly Rate ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={value.monthly_rate ?? ""}
                    onChange={(e) => set({ monthly_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">MRR (auto)</Label>
                  <Input value={fmt(econ.mrr)} disabled className="bg-muted/40" />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Contract Length (months)</Label>
              <Input
                type="number"
                min={1}
                value={value.contract_length_months ?? 12}
                onChange={(e) => set({ contract_length_months: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">TCV (auto)</Label>
              <Input value={fmt(econ.tcv)} disabled className="bg-muted/40" />
            </div>
          </div>
        </div>
      )}

      {/* One-time fields */}
      {isOneTime && (
        <div className="space-y-3 border-l-2 border-amber-400/40 pl-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3 w-3" /> One-Time
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">One-Time Value ($)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={value.one_time_value ?? ""}
                onChange={(e) => set({ one_time_value: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={2}
              placeholder='e.g. "47 charger network audit + setup"'
              value={value.one_time_description}
              onChange={(e) => set({ one_time_description: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <DollarSign className="h-3 w-3" /> Summary
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <SummaryTile label="ARR" value={fmt(econ.arr)} />
          <SummaryTile label="TCV" value={fmt(econ.tcv)} sub={`over ${Math.max(1, Number(value.contract_length_months) || 12)} mo`} />
          <SummaryTile label="Year 1 Revenue" value={fmt(econ.year1Revenue)} sub={econ.oneTime > 0 ? `incl. ${fmt(econ.oneTime)} one-time` : undefined} highlight />
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-bold tabular-nums", highlight ? "text-primary" : "text-foreground")}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// Helpers to convert form values ↔ DB payload
export function emptyEconomics(): DealEconomicsForm {
  return {
    deal_type: "recurring",
    recurring_model: "per_connector",
    connector_count: "",
    monthly_rate: "",
    contract_length_months: 12,
    one_time_value: "",
    one_time_description: "",
  };
}

export function economicsFromDeal(d: any): DealEconomicsForm {
  return {
    deal_type: (d?.deal_type as DealType) || "recurring",
    recurring_model: (d?.recurring_model as RecurringModel) || "per_connector",
    connector_count: d?.connector_count ?? "",
    monthly_rate: d?.monthly_rate ?? "",
    contract_length_months: d?.contract_length_months ?? 12,
    one_time_value: d?.one_time_value ?? "",
    one_time_description: d?.one_time_description ?? "",
  };
}

export function economicsToPayload(form: DealEconomicsForm) {
  const econ = computeDealEconomics({
    deal_type: form.deal_type,
    recurring_model: form.recurring_model,
    connector_count: Number(form.connector_count) || 0,
    monthly_rate: Number(form.monthly_rate) || 0,
    contract_length_months: Number(form.contract_length_months) || 12,
    one_time_value: Number(form.one_time_value) || 0,
  });
  const isRecurring = form.deal_type === "recurring" || form.deal_type === "hybrid";
  const isOneTime = form.deal_type === "one_time" || form.deal_type === "hybrid";
  return {
    deal_type: form.deal_type,
    recurring_model: isRecurring ? form.recurring_model : null,
    connector_count: isRecurring && form.recurring_model === "per_connector" ? Number(form.connector_count) || 0 : null,
    monthly_rate: isRecurring ? econ.monthlyRate : null,
    contract_length_months: Number(form.contract_length_months) || 12,
    one_time_value: isOneTime ? Number(form.one_time_value) || 0 : null,
    one_time_description: isOneTime ? form.one_time_description || null : null,
    // Auto-keep predicted_arr & value in sync
    predicted_arr: econ.arr,
    value: econ.year1Revenue, // Year 1 revenue is the headline deal value
  };
}
