import { useState } from "react";
import { CampaignPlan, PlanStatus } from "@/hooks/useCampaignPlan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Save, Check, Loader2, FileText, Trash2 } from "lucide-react";

interface PlanSelectorBarProps {
  plans: CampaignPlan[];
  activePlan: CampaignPlan | null;
  saving: boolean;
  saved: boolean;
  onSelectPlan: (planId: string | null) => void;
  onCreatePlan: (name: string) => void;
  onDeletePlan: (planId: string) => void;
}

const STATUS_COLORS: Record<PlanStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  quoted: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  active: "bg-optimal/10 text-optimal border-optimal/30",
  completed: "bg-emerald-700/10 text-emerald-700 border-emerald-700/30",
  cancelled: "bg-critical/10 text-critical border-critical/30",
};

export function PlanSelectorBar({
  plans,
  activePlan,
  saving,
  saved,
  onSelectPlan,
  onCreatePlan,
  onDeletePlan,
}: PlanSelectorBarProps) {
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");

  const handleCreate = () => {
    if (!newPlanName.trim()) return;
    onCreatePlan(newPlanName.trim());
    setNewPlanName("");
    setNewPlanOpen(false);
  };

  return (
    <>
      <div className="px-4 py-2.5 border-b border-border bg-card flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Campaign Plan
        </div>

        <Select
          value={activePlan?.id || "none"}
          onValueChange={(v) => onSelectPlan(v === "none" ? null : v)}
        >
          <SelectTrigger className="h-8 w-[220px] text-xs">
            <SelectValue placeholder="No plan selected" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="none" className="text-xs text-muted-foreground">No plan selected</SelectItem>
            {plans.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activePlan && (
          <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[activePlan.status]}`}>
            {activePlan.status}
          </Badge>
        )}

        {/* Save indicator */}
        {activePlan && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {saving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
            ) : saved ? (
              <><Check className="h-3 w-3 text-optimal" /> Saved</>
            ) : null}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {activePlan && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-critical hover:text-critical"
              onClick={() => onDeletePlan(activePlan.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Cancel Plan
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setNewPlanOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" /> New Plan
          </Button>
        </div>
      </div>

      <Dialog open={newPlanOpen} onOpenChange={setNewPlanOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Campaign Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Plan Name</Label>
              <Input
                className="mt-1"
                placeholder="e.g., Phase 1 — West Coast"
                value={newPlanName}
                onChange={e => setNewPlanName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPlanOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newPlanName.trim()}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
