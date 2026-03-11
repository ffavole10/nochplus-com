import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Coins, DollarSign } from "lucide-react";

const AGENTS = [
  { name: "Intake Validation Agent", key: "intake", defaultTokens: 500 },
  { name: "Diagnostic Agent", key: "diagnostic", defaultTokens: 1500 },
  { name: "SWI Matching Agent", key: "swi_matching", defaultTokens: 1000 },
  { name: "Resolution Agent", key: "resolution", defaultTokens: 1200 },
];

const COST_PER_1K = 0.000125;

export type TokenControlsConfig = {
  token_limits: Record<string, number>;
  cost_ceiling_enabled: boolean;
  monthly_budget: number;
  warning_threshold: number;
  limit_action: "pause" | "fallback";
};

export const DEFAULT_TOKEN_CONTROLS: TokenControlsConfig = {
  token_limits: { intake: 500, diagnostic: 1500, swi_matching: 1000, resolution: 1200 },
  cost_ceiling_enabled: false,
  monthly_budget: 50,
  warning_threshold: 80,
  limit_action: "pause",
};

type Props = {
  value: TokenControlsConfig;
  onChange: (v: TokenControlsConfig) => void;
};

export function TokenCostControls({ value, onChange }: Props) {
  const update = (partial: Partial<TokenControlsConfig>) => onChange({ ...value, ...partial });
  const setLimit = (key: string, tokens: number) =>
    update({ token_limits: { ...value.token_limits, [key]: tokens } });

  return (
    <div className="border-t border-border pt-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Token & Cost Controls</h2>
        <p className="text-sm text-muted-foreground">
          Limit token usage and API spend per agent execution to prevent runaway costs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token Limits */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Token Limits per Agent</h3>
            </div>
            <div className="space-y-3">
              {AGENTS.map((agent) => {
                const tokens = value.token_limits[agent.key] ?? agent.defaultTokens;
                const cost = ((tokens / 1000) * COST_PER_1K).toFixed(5);
                return (
                  <div key={agent.key}>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{agent.name}</Label>
                      <Input
                        type="number"
                        className="h-7 w-24 text-xs text-right"
                        value={tokens}
                        onChange={(e) => setLimit(agent.key, parseInt(e.target.value) || 0)}
                        min={0}
                        max={10000}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                      tokens · ~${cost} per run
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Cost Ceiling */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Monthly Cost Ceiling</h3>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Enable monthly spend limit</Label>
              <Switch
                checked={value.cost_ceiling_enabled}
                onCheckedChange={(v) => update({ cost_ceiling_enabled: v })}
              />
            </div>
            {value.cost_ceiling_enabled && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly budget</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      className="h-7 w-24 text-xs"
                      value={value.monthly_budget}
                      onChange={(e) => update({ monthly_budget: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Warning threshold</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      className="h-7 w-16 text-xs"
                      value={value.warning_threshold}
                      onChange={(e) => update({ warning_threshold: parseInt(e.target.value) || 0 })}
                      min={0}
                      max={100}
                    />
                    <span className="text-xs text-muted-foreground">% of budget</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Send alert when {value.warning_threshold}% of budget is reached
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Action when limit hit</Label>
                  <RadioGroup
                    value={value.limit_action}
                    onValueChange={(v) => update({ limit_action: v as "pause" | "fallback" })}
                    className="space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="pause" id="pause" />
                      <Label htmlFor="pause" className="text-xs">Pause AutoHeal</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="fallback" id="fallback-only" />
                      <Label htmlFor="fallback-only" className="text-xs">Switch to fallback only</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">Estimated cost this month: <span className="font-semibold text-foreground">$0.00</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
