import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSkipReview, type WeeklyReviewSkipReason } from "@/hooks/useWeeklyReview";

const REASONS: { value: WeeklyReviewSkipReason; label: string }[] = [
  { value: "holiday", label: "Holiday week" },
  { value: "trade_show", label: "Trade show / event" },
  { value: "team_travel", label: "Team travel" },
  { value: "sprint_week", label: "Sprint week (heavy build, no meeting)" },
  { value: "other", label: "Other" },
];

export function SkipReviewModal({
  open, onOpenChange, reviewId, weekNumber,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reviewId: string;
  weekNumber: number;
}) {
  const [reason, setReason] = useState<WeeklyReviewSkipReason>("holiday");
  const [notes, setNotes] = useState("");
  const skip = useSkipReview();

  const submit = async () => {
    await skip.mutateAsync({ id: reviewId, reason, notes });
    onOpenChange(false);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Week {weekNumber} as skipped</DialogTitle>
          <DialogDescription>This week's review won't happen — let's record why.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason *</p>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="skip-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Additional notes (optional)</p>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={skip.isPending}>Save reason</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
