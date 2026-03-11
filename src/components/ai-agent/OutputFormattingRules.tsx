import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, AlignLeft, Gauge } from "lucide-react";

export type OutputFormattingConfig = {
  required_fields: Record<string, boolean>;
  summary_length: string;
  confidence_display: string;
  confidence_thresholds: { high: number; medium: number; low: number };
};

export const DEFAULT_OUTPUT_FORMATTING: OutputFormattingConfig = {
  required_fields: {
    root_cause: true,
    swi_reference: true,
    confidence_score: true,
    repair_time: true,
    parts_cost: true,
    priority: true,
    secondary_diagnosis: false,
    tech_skill_level: false,
    safety_warnings: false,
  },
  summary_length: "standard",
  confidence_display: "percentage_label",
  confidence_thresholds: { high: 80, medium: 60, low: 60 },
};

const FIELD_LABELS: Record<string, string> = {
  root_cause: "Root cause summary (1–2 sentences)",
  swi_reference: "Recommended SWI reference",
  confidence_score: "Confidence score (0–100%)",
  repair_time: "Estimated repair time",
  parts_cost: "Estimated parts cost",
  priority: "Priority recommendation",
  secondary_diagnosis: "Secondary diagnosis (alternative cause)",
  tech_skill_level: "Technician skill level required",
  safety_warnings: "Safety warnings / OSHA flags",
};

type Props = {
  value: OutputFormattingConfig;
  onChange: (v: OutputFormattingConfig) => void;
};

export function OutputFormattingRules({ value, onChange }: Props) {
  const update = (partial: Partial<OutputFormattingConfig>) => onChange({ ...value, ...partial });
  const setField = (key: string, v: boolean) =>
    update({ required_fields: { ...value.required_fields, [key]: v } });
  const setThreshold = (key: "high" | "medium" | "low", v: number) =>
    update({ confidence_thresholds: { ...value.confidence_thresholds, [key]: v } });

  return (
    <div className="border-t border-border pt-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Output Formatting Rules</h2>
        <p className="text-sm text-muted-foreground">
          Standardize how AutoHeal structures its diagnostic output on every ticket.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Required Output Fields */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Required Output Fields</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">AutoHeal must always populate these fields or flag the assessment incomplete.</p>
            <div className="space-y-2.5">
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`field-${key}`} className="text-xs cursor-pointer">{label}</Label>
                  <Switch
                    id={`field-${key}`}
                    checked={value.required_fields[key] ?? false}
                    onCheckedChange={(v) => setField(key, v)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Summary Length */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <AlignLeft className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Summary Length</h3>
              </div>
              <RadioGroup
                value={value.summary_length}
                onValueChange={(v) => update({ summary_length: v })}
                className="space-y-1.5"
              >
                {[
                  { value: "concise", label: "Concise — 1–2 sentences per section" },
                  { value: "standard", label: "Standard — 3–5 sentences per section" },
                  { value: "detailed", label: "Detailed — Full paragraph per section" },
                  { value: "technical", label: "Technical — Include raw diagnostic data" },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`len-${opt.value}`} />
                    <Label htmlFor={`len-${opt.value}`} className="text-xs">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Confidence Display */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Confidence Display</h3>
              </div>
              <p className="text-[10px] text-muted-foreground">How confidence scores appear on tickets.</p>
              <RadioGroup
                value={value.confidence_display}
                onValueChange={(v) => update({ confidence_display: v })}
                className="space-y-1.5"
              >
                {[
                  { value: "percentage", label: "Percentage only (87%)" },
                  { value: "percentage_label", label: "Percentage + label (87% — High Confidence)" },
                  { value: "label_only", label: "Label only (High Confidence)" },
                  { value: "color_only", label: "Color indicator only (green/amber/red dot)" },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`conf-${opt.value}`} />
                    <Label htmlFor={`conf-${opt.value}`} className="text-xs">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="pt-3 border-t border-border space-y-2">
                <p className="text-[10px] text-muted-foreground font-medium">Confidence level thresholds</p>
                {[
                  { key: "high" as const, label: "High", color: "text-emerald-500", suffix: "% and above → green" },
                  { key: "medium" as const, label: "Medium", color: "text-amber-500", suffix: `%–${(value.confidence_thresholds.high - 1)}% → amber` },
                  { key: "low" as const, label: "Low", color: "text-red-500", suffix: "% → red (below)" },
                ].map((t) => (
                  <div key={t.key} className="flex items-center gap-2">
                    <span className={`text-xs font-medium w-14 ${t.color}`}>{t.label}:</span>
                    <Input
                      type="number"
                      className="h-6 w-14 text-xs"
                      value={value.confidence_thresholds[t.key]}
                      onChange={(e) => setThreshold(t.key, parseInt(e.target.value) || 0)}
                      min={0}
                      max={100}
                    />
                    <span className="text-[10px] text-muted-foreground">{t.suffix}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
