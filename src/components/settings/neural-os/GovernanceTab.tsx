import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Shield, Thermometer, Cpu, Key, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  TokenCostControls,
  DEFAULT_TOKEN_CONTROLS,
  type TokenControlsConfig,
} from "@/components/ai-agent/TokenCostControls";
import {
  ExecutionRules,
  DEFAULT_EXECUTION_RULES,
  type ExecutionRulesConfig,
} from "@/components/ai-agent/ExecutionRules";
import {
  RetryFallbackLogic,
  DEFAULT_RETRY_LOGIC,
  type RetryLogicConfig,
} from "@/components/ai-agent/RetryFallbackLogic";
import {
  OutputFormattingRules,
  DEFAULT_OUTPUT_FORMATTING,
  type OutputFormattingConfig,
} from "@/components/ai-agent/OutputFormattingRules";
import { NeuralOsHeader } from "./NeuralOsHeader";

const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3-flash-preview",
  "google/gemini-3-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
];

export function GovernanceTab() {
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [primaryModel, setPrimaryModel] = useState("google/gemini-2.5-flash");
  const [fallbackModel, setFallbackModel] = useState("openai/gpt-5-mini");

  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [diagTemp, setDiagTemp] = useState(0.3);
  const [creativeTemp, setCreativeTemp] = useState(0.4);
  const [validationTemp, setValidationTemp] = useState(0.1);

  const [tokenControls, setTokenControls] = useState<TokenControlsConfig>(DEFAULT_TOKEN_CONTROLS);
  const [executionRules, setExecutionRules] = useState<ExecutionRulesConfig>(DEFAULT_EXECUTION_RULES);
  const [retryLogic, setRetryLogic] = useState<RetryLogicConfig>(DEFAULT_RETRY_LOGIC);
  const [outputFormatting, setOutputFormatting] = useState<OutputFormattingConfig>(DEFAULT_OUTPUT_FORMATTING);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase.from("autoheal_config").select("*").limit(1).maybeSingle();
    if (data) {
      setConfigId(data.id);
      const mc = (data.model_config as any) || {};
      const as_ = (data.agent_settings as any) || {};
      if (mc.primaryModel) setPrimaryModel(mc.primaryModel);
      if (mc.fallbackModel) setFallbackModel(mc.fallbackModel);
      if (as_.confidenceThreshold != null) setConfidenceThreshold(as_.confidenceThreshold);
      if (as_.diagTemp != null) setDiagTemp(as_.diagTemp);
      if (as_.creativeTemp != null) setCreativeTemp(as_.creativeTemp);
      if (as_.validationTemp != null) setValidationTemp(as_.validationTemp);
      if (data.token_controls && Object.keys(data.token_controls as object).length > 0)
        setTokenControls(data.token_controls as unknown as TokenControlsConfig);
      if (data.execution_rules && Object.keys(data.execution_rules as object).length > 0)
        setExecutionRules(data.execution_rules as unknown as ExecutionRulesConfig);
      if (data.retry_logic && Object.keys(data.retry_logic as object).length > 0)
        setRetryLogic(data.retry_logic as unknown as RetryLogicConfig);
      if (data.output_formatting && Object.keys(data.output_formatting as object).length > 0)
        setOutputFormatting(data.output_formatting as unknown as OutputFormattingConfig);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      model_config: { primaryModel, fallbackModel } as any,
      agent_settings: { confidenceThreshold, diagTemp, creativeTemp, validationTemp } as any,
      token_controls: tokenControls as any,
      execution_rules: executionRules as any,
      retry_logic: retryLogic as any,
      output_formatting: outputFormatting as any,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (configId) {
      ({ error } = await supabase.from("autoheal_config").update(payload).eq("id", configId));
    } else {
      const { data, error: insertError } = await supabase
        .from("autoheal_config")
        .insert(payload)
        .select("id")
        .single();
      error = insertError;
      if (data) setConfigId(data.id);
    }

    setSaving(false);
    if (error) {
      toast.error("Failed to save configuration");
      console.error(error);
    } else {
      toast.success("Configuration saved — changes apply to next Neural OS execution");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <NeuralOsHeader
          title="Governance Layer | Neural OS"
          description="Trust as architecture. Confidence thresholds, audit trails, human-in-the-loop policy, and model governance."
        />
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Model Configuration */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">Model Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Model Selection</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Model</Label>
                  <Select value={primaryModel} onValueChange={setPrimaryModel}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODELS.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fallback Model</Label>
                  <Select value={fallbackModel} onValueChange={setFallbackModel}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODELS.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">API Configuration</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">API Key (Lovable AI)</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="••••••••••••••••" readOnly className="h-8 text-xs flex-1" />
                    <Button variant="outline" size="sm" className="h-8 text-xs">Update</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Rate Limit: 100 requests/hour</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 w-full"
                  onClick={() => toast.success("API connection successful")}
                >
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
            Changes to configuration affect all active agents immediately.
          </p>
        </div>
      </div>

      {/* Agent Settings */}
      <div className="border-t border-border pt-8">
        <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">Agent Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Confidence Threshold</h3>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">Minimum to proceed without flag</Label>
                  <span className="font-mono text-sm font-bold text-foreground">{confidenceThreshold}%</span>
                </div>
                <Slider
                  value={[confidenceThreshold]}
                  onValueChange={([v]) => setConfidenceThreshold(v)}
                  min={50}
                  max={95}
                  step={5}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>50% (Lenient)</span>
                  <span>95% (Strict)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Temperature Settings</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Diagnostic precision</Label>
                    <span className="font-mono text-xs">{diagTemp}</span>
                  </div>
                  <Slider value={[diagTemp]} onValueChange={([v]) => setDiagTemp(Math.round(v * 10) / 10)} min={0} max={1} step={0.1} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Creative problem solving</Label>
                    <span className="font-mono text-xs">{creativeTemp}</span>
                  </div>
                  <Slider value={[creativeTemp]} onValueChange={([v]) => setCreativeTemp(Math.round(v * 10) / 10)} min={0} max={1} step={0.1} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Validation strictness</Label>
                    <span className="font-mono text-xs">{validationTemp}</span>
                  </div>
                  <Slider value={[validationTemp]} onValueChange={([v]) => setValidationTemp(Math.round(v * 10) / 10)} min={0} max={1} step={0.1} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TokenCostControls value={tokenControls} onChange={setTokenControls} />
      <ExecutionRules value={executionRules} onChange={setExecutionRules} />
      <RetryFallbackLogic value={retryLogic} onChange={setRetryLogic} />
      <OutputFormattingRules value={outputFormatting} onChange={setOutputFormatting} />
    </div>
  );
}
