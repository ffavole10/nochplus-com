import { useMemo, useState } from "react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { usePageTitle } from "@/hooks/usePageTitle";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  on_hold: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

function getFirstActiveStage(stageStatus: Record<string, string> | null): string {
  if (!stageStatus) return "upload";
  const stages = ["upload", "scan", "deploy", "price", "launch"];
  const inProgress = stages.find(s => stageStatus[s] === "in_progress");
  if (inProgress) return inProgress;
  const firstNotStarted = stages.find(s => stageStatus[s] === "not_started");
  if (firstNotStarted) return firstNotStarted;
  return "launch";
}

export default function CampaignList() {
  const { selectedCustomer, setSelectedCampaignId, setSelectedCampaignName, setSelectedCustomer } = useCampaignContext();
  const { data: campaigns = [] } = useCampaigns();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  usePageTitle(selectedCustomer ? `Campaigns | ${selectedCustomer}` : "Campaigns");

  const filtered = useMemo(() => {
    if (!selectedCustomer) return campaigns;
    return campaigns.filter(c => c.customer === selectedCustomer);
  }, [campaigns, selectedCustomer]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [filtered]
  );

  const handleSelectCampaign = (campaign: typeof campaigns[0]) => {
    setSelectedCampaignId(campaign.id);
    setSelectedCampaignName(campaign.name);
    setSelectedCustomer(campaign.customer);
    const ss = campaign.stage_status as Record<string, string> | null;
    const stage = getFirstActiveStage(ss);
    navigate(`/campaigns/${campaign.id}/${stage}`);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.from("campaigns").insert({
        name: name.trim(),
        customer: selectedCustomer || "Unassigned",
        status: "draft",
        user_id: session?.user?.id ?? null,
      }).select().single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(`Campaign "${name}" created`);
      setNewOpen(false);
      setName("");
      setDescription("");
      setSelectedCampaignId(data.id);
      setSelectedCampaignName(data.name);
      setSelectedCustomer(data.customer);
      navigate(`/campaigns/${data.id}/upload`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const renderStageDots = (stageStatus: Record<string, string> | null) => {
    const stages = ["upload", "scan", "deploy", "price", "launch"];
    const ss = stageStatus || {};
    return (
      <div className="flex items-center gap-1">
        {stages.map(s => {
          const status = ss[s] || "not_started";
          return (
            <div
              key={s}
              className={`w-2 h-2 rounded-full ${
                status === "complete" ? "bg-primary" :
                status === "in_progress" ? "bg-primary/50" :
                "bg-muted-foreground/20"
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          Campaigns {selectedCustomer && <span className="text-muted-foreground font-normal">| {selectedCustomer}</span>}
        </h1>
        <Button onClick={() => setNewOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Campaign
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Rocket className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            No campaigns yet{selectedCustomer ? ` for ${selectedCustomer}` : ""}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first campaign to get started.</p>
          <Button onClick={() => setNewOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Campaign
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Campaign Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Progress</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Chargers</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Created</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr
                  key={c.id}
                  onClick={() => handleSelectCampaign(c)}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[c.status || "draft"]}`}>
                      {(c.status || "draft").replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {renderStageDots(c.stage_status as Record<string, string> | null)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{c.total_chargers || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(c.created_at), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(c.updated_at), "MMM d, yyyy")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Campaign Name</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Shell Q2 2026 California"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                className="mt-1"
                placeholder="Brief description of campaign scope..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
