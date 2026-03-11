import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Shield, Thermometer, Cpu, Key, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3-flash-preview",
  "google/gemini-3-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
];

const AutoHealConfig = () => {
  usePageTitle("Configuration");

  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [diagTemp, setDiagTemp] = useState(0.3);
  const [creativeTemp, setCreativeTemp] = useState(0.4);
  const [validationTemp, setValidationTemp] = useState(0.1);
  const [primaryModel, setPrimaryModel] = useState("google/gemini-2.5-flash");
  const [fallbackModel, setFallbackModel] = useState("openai/gpt-5-mini");

  const handleSave = () => {
    toast.success("Configuration saved successfully");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div />
          <Button onClick={handleSave}>Save Changes</Button>
        </div>

        {/* Model Configuration */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Model Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model Selection */}
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

            {/* API Config */}
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
          <h2 className="text-lg font-bold text-foreground mb-4">Agent Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Confidence Threshold */}
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

            {/* Temperature */}
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
      </div>
    </div>
  );
};

export default AutoHealConfig;
