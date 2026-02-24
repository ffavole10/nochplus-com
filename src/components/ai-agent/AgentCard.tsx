import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Play, Pencil, Trash2, ChevronDown, ChevronRight, Thermometer, Cpu, Hash } from "lucide-react";

export type AgentPrompt = {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  template: string;
  temperature: number;
  max_tokens: number;
  model: string;
  status: string;
  config: Record<string, any>;
};

interface AgentCardProps {
  agent: AgentPrompt;
  onTest: (agent: AgentPrompt) => void;
  onEdit: (agent: AgentPrompt) => void;
  onDelete: (agent: AgentPrompt) => void;
  onToggleStatus: (agent: AgentPrompt) => void;
}

export function AgentCard({ agent, onTest, onEdit, onDelete, onToggleStatus }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isActive = agent.status === "active";

  return (
    <Card className="border-border/60 bg-card">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 hover:text-primary transition-colors">
                    {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                  </button>
                </CollapsibleTrigger>
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={`text-[10px] cursor-pointer ${isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                  onClick={() => onToggleStatus(agent)}
                >
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono ml-6">ID: {agent.agent_id}</p>
              <p className="text-sm text-muted-foreground mt-1 ml-6">{agent.description}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => onTest(agent)}>
                <Play className="h-3 w-3" /> Test
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(agent)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(agent)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Config badges */}
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Thermometer className="h-3.5 w-3.5" />
                <span>Temp: <span className="font-mono text-foreground">{agent.temperature}</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                <span>Max Tokens: <span className="font-mono text-foreground">{agent.max_tokens}</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Cpu className="h-3.5 w-3.5" />
                <span>Model: <span className="font-mono text-foreground">{agent.model}</span></span>
              </div>
            </div>

            {/* Template Preview */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Prompt Template</p>
              <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono text-foreground/80 overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {agent.template}
              </pre>
            </div>

            {/* Access/triggers from config */}
            {agent.config?.access && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-semibold">Access:</span>
                {(agent.config.access as string[]).map((a) => (
                  <Badge key={a} variant="outline" className="text-[10px] font-mono">{a}</Badge>
                ))}
              </div>
            )}
            {agent.config?.triggers && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-semibold">Triggers:</span>
                {(agent.config.triggers as string[]).map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px] font-mono">{t}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
