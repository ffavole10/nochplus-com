import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, ShieldAlert, AlertOctagon } from "lucide-react";

export type RetryLogicConfig = {
  max_retries: number;
  retry_delay: string;
  retry_on: Record<string, boolean>;
  confidence_fallback_threshold: number;
  timeout_seconds: number;
  allow_full_fallback: boolean;
  failure_action: string;
};

export const DEFAULT_RETRY_LOGIC: RetryLogicConfig = {
  max_retries: 2,
  retry_delay: "2s",
  retry_on: {
    api_timeout: true,
    model_error: true,
    json_parse: true,
    low_confidence: false,
  },
  confidence_fallback_threshold: 60,
  timeout_seconds: 15,
  allow_full_fallback: true,
  failure_action: "flag_review",
};

type Props = {
  value: RetryLogicConfig;
  onChange: (v: RetryLogicConfig) => void;
};

export function RetryFallbackLogic({ value, onChange }: Props) {
  const update = (partial: Partial<RetryLogicConfig>) => onChange({ ...value, ...partial });
  const setRetryOn = (key: string, v: boolean) =>
    update({ retry_on: { ...value.retry_on, [key]: v } });

  return (
    <div className="border-t border-border pt-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Retry & Fallback Logic</h2>
        <p className="text-sm text-muted-foreground">
          Define how AutoHeal handles failures, timeouts, and low-confidence results.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Retry Settings */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Retry Settings</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Max retries per agent</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="h-7 w-16 text-xs"
                    value={value.max_retries}
                    onChange={(e) => update({ max_retries: Math.min(5, Math.max(0, parseInt(e.target.value) || 0)) })}
                    min={0}
                    max={5}
                  />
                  <span className="text-[10px] text-muted-foreground">retries before fallback</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Retry delay</Label>
                <Select value={value.retry_delay} onValueChange={(v) => update({ retry_delay: v })}>
                  <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="text-xs">No delay</SelectItem>
                    <SelectItem value="2s" className="text-xs">2 seconds</SelectItem>
                    <SelectItem value="5s" className="text-xs">5 seconds</SelectItem>
                    <SelectItem value="10s" className="text-xs">10 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Retry on</Label>
                <div className="space-y-2">
                  {[
                    { key: "api_timeout", label: "API timeout" },
                    { key: "model_error", label: "Model error / rate limit" },
                    { key: "json_parse", label: "JSON parse failure" },
                    { key: "low_confidence", label: "Low confidence score" },
                  ].map((opt) => (
                    <div key={opt.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`retry-${opt.key}`}
                        checked={value.retry_on[opt.key] ?? false}
                        onCheckedChange={(v) => setRetryOn(opt.key, !!v)}
                      />
                      <Label htmlFor={`retry-${opt.key}`} className="text-xs cursor-pointer">{opt.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fallback Triggers */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Fallback Triggers</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">When to switch from primary to fallback model mid-execution.</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Confidence below</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    className="h-7 w-16 text-xs"
                    value={value.confidence_fallback_threshold}
                    onChange={(e) => update({ confidence_fallback_threshold: parseInt(e.target.value) || 60 })}
                    min={0}
                    max={100}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Response time exceeds</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    className="h-7 w-16 text-xs"
                    value={value.timeout_seconds}
                    onChange={(e) => update({ timeout_seconds: parseInt(e.target.value) || 15 })}
                    min={1}
                  />
                  <span className="text-xs text-muted-foreground">seconds</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label className="text-xs max-w-[220px]">Allow fallback model to run entire pipeline if primary fails on step 1</Label>
                <Switch
                  checked={value.allow_full_fallback}
                  onCheckedChange={(v) => update({ allow_full_fallback: v })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* When All Retries Fail */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">When All Retries Fail</h3>
          </div>
          <RadioGroup
            value={value.failure_action}
            onValueChange={(v) => update({ failure_action: v })}
            className="space-y-3"
          >
            {[
              { value: "flag_review", label: "Flag ticket for manual review", desc: 'Adds "AutoHeal Failed" tag, notifies manager' },
              { value: "partial_save", label: "Create ticket with partial assessment", desc: "Save whatever data was collected" },
              { value: "skip_silent", label: "Skip silently", desc: "Log the failure, take no visible action" },
            ].map((opt) => (
              <div key={opt.value} className="flex items-start gap-2">
                <RadioGroupItem value={opt.value} id={`fail-${opt.value}`} className="mt-0.5" />
                <div>
                  <Label htmlFor={`fail-${opt.value}`} className="text-xs font-medium cursor-pointer">{opt.label}</Label>
                  <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
