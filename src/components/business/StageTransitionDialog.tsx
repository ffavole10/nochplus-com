import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  classifyTransition, FORWARD_PROMPTS, LOSS_REASONS, LOSS_REASON_LABELS,
  WIN_REASONS, WIN_REASON_LABELS, type DealStage,
} from "@/types/growth";
import { useCommitStageTransition } from "@/hooks/useStageTransitions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  partnerId: string;
  dealName: string;
  fromStage: DealStage;
  toStage: DealStage;
  currentValue: number;
  onSuccess?: () => void;
}

export function StageTransitionDialog({
  open, onOpenChange, dealId, partnerId, dealName, fromStage, toStage, currentValue, onSuccess,
}: Props) {
  const type = useMemo(() => classifyTransition(fromStage, toStage), [fromStage, toStage]);
  const commit = useCommitStageTransition();

  const [notes, setNotes] = useState("");
  const [reasonCode, setReasonCode] = useState<string>("");
  const [reasonNotes, setReasonNotes] = useState("");
  const [finalValue, setFinalValue] = useState<string>(String(currentValue || ""));

  useEffect(() => {
    if (open) {
      setNotes("");
      setReasonCode("");
      setReasonNotes("");
      setFinalValue(String(currentValue || ""));
    }
  }, [open, currentValue]);

  const title = (() => {
    switch (type) {
      case "closed_won": return `Mark "${dealName}" as Closed Won`;
      case "closed_lost": return `Mark "${dealName}" as Closed Lost`;
      case "backward": return `Moving "${dealName}" back to ${toStage}`;
      case "reopen": return `Reopening "${dealName}"`;
      default: return `Moving "${dealName}" to ${toStage}`;
    }
  })();

  const confirmLabel = (() => {
    switch (type) {
      case "closed_won": return "Mark as Closed Won";
      case "closed_lost": return "Mark as Closed Lost";
      case "reopen": return `Reopen to ${toStage}`;
      default: return `Move to ${toStage}`;
    }
  })();

  const valueNum = Number(finalValue);
  const reasonOtherNeedsNotes =
    (reasonCode === "other") && (reasonNotes.trim().length < 10);

  const validation = (() => {
    if (type === "closed_won") {
      if (!reasonCode) return "Win reason required.";
      if (reasonCode === "other" && reasonNotes.trim().length < 10) return "Add at least 10 chars when 'Other'.";
      if (!finalValue || isNaN(valueNum) || valueNum <= 0) return "Final deal value required.";
      return null;
    }
    if (type === "closed_lost") {
      if (!reasonCode) return "Loss reason required.";
      if (reasonCode === "other" && reasonNotes.trim().length < 10) return "Add at least 10 chars when 'Other'.";
      return null;
    }
    if (notes.trim().length < 10) return "Notes required (min 10 characters).";
    return null;
  })();

  const handleConfirm = () => {
    if (validation) { toast.error(validation); return; }
    commit.mutate({
      deal_id: dealId,
      partner_id: partnerId,
      from_stage: fromStage,
      to_stage: toStage,
      notes: notes.trim(),
      reason_code: (type === "closed_won" || type === "closed_lost") ? reasonCode : null,
      reason_notes: (type === "closed_won" || type === "closed_lost") ? reasonNotes.trim() : null,
      final_value: type === "closed_won" ? valueNum : null,
      current_value: currentValue,
    }, {
      onSuccess: () => {
        toast.success(`Deal ${type === "closed_won" ? "won" : type === "closed_lost" ? "lost" : "moved"}.`);
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (e: any) => toast.error(e.message || "Failed to update deal"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {type === "closed_won" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Win Reason *</Label>
                <Select value={reasonCode} onValueChange={setReasonCode}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {WIN_REASONS.map(r => <SelectItem key={r} value={r}>{WIN_REASON_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Final Deal Value *</Label>
                <Input type="number" value={finalValue} onChange={e => setFinalValue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes {reasonCode === "other" ? "*" : "(optional)"}</Label>
                <Textarea rows={3} value={reasonNotes} onChange={e => setReasonNotes(e.target.value)} />
              </div>
            </>
          )}

          {type === "closed_lost" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Loss Reason *</Label>
                <Select value={reasonCode} onValueChange={setReasonCode}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {LOSS_REASONS.map(r => <SelectItem key={r} value={r}>{LOSS_REASON_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes {reasonCode === "other" ? "*" : "(optional)"}</Label>
                <Textarea rows={3} value={reasonNotes} onChange={e => setReasonNotes(e.target.value)} />
              </div>
            </>
          )}

          {(type === "forward" || type === "backward" || type === "reopen") && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                {type === "backward"
                  ? "Why is this deal moving back? (champion left, lost momentum, scope reset, etc.) *"
                  : type === "reopen"
                  ? "Why are you reopening this deal? *"
                  : (FORWARD_PROMPTS[toStage] || `What changed to move this to ${toStage}?`) + " *"}
              </Label>
              <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Min 10 characters" />
              <p className="text-[10px] text-muted-foreground">{notes.trim().length}/10 minimum</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={commit.isPending || !!validation || reasonOtherNeedsNotes && (type === "closed_won" || type === "closed_lost")}>
            {commit.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
