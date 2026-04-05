import { useMemo, useState, useEffect } from "react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCustomers } from "@/hooks/useCustomers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Rocket, Search } from "lucide-react";
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

// No longer needed — stages removed

export default function CampaignList() {
  const { selectedCustomer, setSelectedCampaignId, setSelectedCampaignName, setSelectedCustomer } = useCampaignContext();
  const { data: campaigns = [] } = useCampaigns();
  const { data: dbCustomers = [] } = useCustomers();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Open modal if ?new=1 query param (from sidebar "+ New Campaign")
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setNewOpen(true);
      setNewCustomer(selectedCustomer || "");
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  usePageTitle(selectedCustomer ? `Campaign HQ | ${selectedCustomer}` : "Campaign HQ");

  const filtered = useMemo(() => {
    let result = campaigns;
    if (selectedCustomer) {
      result = result.filter(c => (c as any).customer_company === selectedCustomer || c.customer === selectedCustomer);
    }
    if (statusFilter !== "all") {
      result = result.filter(c => (c.status || "draft") === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }
    return result;
  }, [campaigns, selectedCustomer, statusFilter, searchQuery]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [filtered]
  );

  const handleSelectCampaign = (campaign: typeof campaigns[0]) => {
    setSelectedCampaignId(campaign.id);
    setSelectedCampaignName(campaign.name);
    setSelectedCustomer((campaign as any).customer_company || campaign.customer);
    navigate(`/campaigns/${campaign.id}/overview`);
  };

  const openNewModal = () => {
    setNewCustomer(selectedCustomer || "");
    setNewOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const customerValue = newCustomer || "Unassigned";
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const insertPayload: any = {
        name: name.trim(),
        customer: customerValue,
        status: "draft",
        user_id: session?.user?.id ?? null,
      };
      // Try to set customer_id FK
      const matchedCustomer = dbCustomers.find(c => c.company === customerValue);
      if (matchedCustomer) {
        insertPayload.customer_id = matchedCustomer.id;
      }
      const { data, error } = await supabase.from("campaigns").insert(insertPayload).select().single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(`Campaign "${name}" created`);
      setNewOpen(false);
      setName("");
      setDescription("");
      setNewCustomer("");
      setSelectedCampaignId(data.id);
      setSelectedCampaignName(data.name);
      setSelectedCustomer(data.customer);
      navigate(`/campaigns/${data.id}/overview`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const renderProgress = (campaign: typeof campaigns[0]) => {
    const total = campaign.total_chargers || 0;
    const serviced = campaign.total_serviced || 0;
    if (total === 0) return <span className="text-muted-foreground">—</span>;
    const pct = Math.round((serviced / total) * 100);
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          Campaign HQ {selectedCustomer && <span className="text-muted-foreground font-normal">| {selectedCustomer}</span>}
        </h1>
        <Button onClick={openNewModal} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Campaign
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-1">
          {["all", "draft", "active", "completed"].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All" : s}
            </Button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Rocket className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            No campaigns{selectedCustomer ? ` for ${selectedCustomer}` : ""}{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first campaign to get started.</p>
          <Button onClick={openNewModal} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Campaign
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Campaign Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Customer</th>
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
                  <td className="px-4 py-3 text-muted-foreground">{(c as any).customer_company || c.customer}</td>
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
              <Label className="text-xs">Customer</Label>
              <Select value={newCustomer || "__none__"} onValueChange={v => setNewCustomer(v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[200]">
                  <SelectItem value="__none__" className="text-xs text-muted-foreground">No customer</SelectItem>
                  {dbCustomers.map(c => (
                    <SelectItem key={c.id} value={c.company} className="text-xs">{c.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
