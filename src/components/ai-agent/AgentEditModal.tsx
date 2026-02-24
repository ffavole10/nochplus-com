import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { AgentPrompt } from "./AgentCard";

interface AgentEditModalProps {
  agent: AgentPrompt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (agent: AgentPrompt) => void;
  isNew?: boolean;
}

const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3-flash-preview",
  "google/gemini-3-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
];

export function AgentEditModal({ agent, open, onOpenChange, onSave, isNew }: AgentEditModalProps) {
  const [form, setForm] = useState<Partial<AgentPrompt>>(
    agent || {
      agent_id: "",
      name: "",
      description: "",
      template: "",
      temperature: 0.3,
      max_tokens: 1500,
      model: "google/gemini-2.5-flash",
      status: "active",
      config: {},
    }
  );

  const handleSave = () => {
    if (!form.agent_id || !form.name || !form.template) return;
    onSave(form as AgentPrompt);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create New Prompt" : `Edit: ${agent?.name}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Agent ID</Label>
              <Input
                value={form.agent_id || ""}
                onChange={(e) => setForm((f) => ({ ...f, agent_id: e.target.value }))}
                placeholder="e.g. diagnostic-agent"
                disabled={!isNew}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Diagnostic Agent"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description || ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of what this agent does"
            />
          </div>

          <div className="space-y-2">
            <Label>Prompt Template</Label>
            <Textarea
              value={form.template || ""}
              onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}
              className="font-mono text-xs min-h-[300px]"
              placeholder="Enter Jinja2 prompt template..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Temperature: {form.temperature}</Label>
              <Slider
                value={[form.temperature || 0.3]}
                onValueChange={([v]) => setForm((f) => ({ ...f, temperature: Math.round(v * 10) / 10 }))}
                min={0}
                max={1}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={form.max_tokens || 1500}
                onChange={(e) => setForm((f) => ({ ...f, max_tokens: parseInt(e.target.value) || 1500 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={form.model || "google/gemini-2.5-flash"} onValueChange={(v) => setForm((f) => ({ ...f, model: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.agent_id || !form.name}>
            {isNew ? "Create Prompt" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
