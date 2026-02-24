import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Info } from "lucide-react";
import aiAgentAvatar from "@/assets/ai-agent-avatar.png";
import { toast } from "sonner";
import { AgentCard, type AgentPrompt } from "@/components/ai-agent/AgentCard";
import { AgentTestModal } from "@/components/ai-agent/AgentTestModal";
import { AgentEditModal } from "@/components/ai-agent/AgentEditModal";
import { MLSection } from "@/components/ai-agent/MLSection";
import { WebSearchSection } from "@/components/ai-agent/WebSearchSection";
import { ConfigSection } from "@/components/ai-agent/ConfigSection";
import { MetricsDashboard } from "@/components/ai-agent/MetricsDashboard";

const AIAgent = () => {
  const [agents, setAgents] = useState<AgentPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [testAgent, setTestAgent] = useState<AgentPrompt | null>(null);
  const [editAgent, setEditAgent] = useState<AgentPrompt | null>(null);
  const [isNewPrompt, setIsNewPrompt] = useState(false);

  const loadAgents = async () => {
    const { data, error } = await supabase
      .from("ai_agent_prompts")
      .select("*")
      .order("config->order", { ascending: true });

    if (error) {
      toast.error("Failed to load agents");
      console.error(error);
    } else {
      setAgents((data || []) as unknown as AgentPrompt[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleToggleStatus = async (agent: AgentPrompt) => {
    const newStatus = agent.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("ai_agent_prompts")
      .update({ status: newStatus })
      .eq("id", agent.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`${agent.name} ${newStatus === "active" ? "activated" : "deactivated"}`);
      loadAgents();
    }
  };

  const handleDelete = async (agent: AgentPrompt) => {
    if (!confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("ai_agent_prompts").delete().eq("id", agent.id);
    if (error) {
      toast.error("Failed to delete agent");
    } else {
      toast.success("Agent deleted");
      loadAgents();
    }
  };

  const handleSave = async (agent: AgentPrompt) => {
    if (isNewPrompt) {
      const { error } = await supabase.from("ai_agent_prompts").insert({
        agent_id: agent.agent_id,
        name: agent.name,
        description: agent.description,
        template: agent.template,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
        model: agent.model,
        status: agent.status,
        config: agent.config as any,
      });
      if (error) {
        toast.error("Failed to create prompt: " + error.message);
        return;
      }
      toast.success("Prompt created");
    } else {
      const { error } = await supabase
        .from("ai_agent_prompts")
        .update({
          name: agent.name,
          description: agent.description,
          template: agent.template,
          temperature: agent.temperature,
          max_tokens: agent.max_tokens,
          model: agent.model,
          config: agent.config as any,
        })
        .eq("id", agent.id);
      if (error) {
        toast.error("Failed to update prompt");
        return;
      }
      toast.success("Prompt updated");
    }
    setEditAgent(null);
    setIsNewPrompt(false);
    loadAgents();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex gap-5">
            <img src={aiAgentAvatar} alt="AI Agent" className="w-24 h-24 rounded-xl object-cover shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                AI Agent
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Manage AI prompts and templates for charging station analysis</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                AI prompts define how different agents analyze incidents and generate responses. Each prompt uses Jinja2 templates and validates output against JSON schemas. Changes take effect immediately for new executions.
              </p>
            </div>
          </div>
          <Button
            className="gap-1.5"
            onClick={() => {
              setIsNewPrompt(true);
              setEditAgent({
                id: "",
                agent_id: "",
                name: "",
                description: "",
                template: "",
                temperature: 0.3,
                max_tokens: 1500,
                model: "google/gemini-2.5-flash",
                status: "active",
                config: {},
              });
            }}
          >
            <Plus className="h-4 w-4" />
            Create Prompt
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                AutoHeal™ uses a multi-agent system to analyze service tickets, match SWIs, and generate professional assessments.
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                Note: The AI engine is powered by Noch Power. You can test and execute prompts directly from this page.
              </p>
            </div>
          </div>
        </div>

        {/* Agent Cards */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Agent Prompts</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onTest={setTestAgent}
                  onEdit={(a) => { setIsNewPrompt(false); setEditAgent(a); }}
                  onDelete={handleDelete}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
              {agents.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No agent prompts configured yet.</p>
              )}
            </div>
          )}
        </div>

        {/* ML Section */}
        <div className="border-t border-border pt-8">
          <MLSection />
        </div>

        {/* Web Search */}
        <div className="border-t border-border pt-8">
          <WebSearchSection />
        </div>

        {/* Config */}
        <div className="border-t border-border pt-8">
          <ConfigSection />
        </div>

        {/* Metrics */}
        <div className="border-t border-border pt-8">
          <MetricsDashboard />
        </div>
      </div>

      {/* Modals */}
      <AgentTestModal agent={testAgent} open={!!testAgent} onOpenChange={(open) => !open && setTestAgent(null)} />
      <AgentEditModal
        agent={editAgent}
        open={!!editAgent}
        onOpenChange={(open) => { if (!open) { setEditAgent(null); setIsNewPrompt(false); } }}
        onSave={handleSave}
        isNew={isNewPrompt}
      />
    </div>
  );
};

export default AIAgent;
