import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import {
  useCurrentWeeklyReview, useAddReviewNote, noteTypeMeta,
  type WeeklyReviewNoteType, type WeeklyReviewLinkType,
} from "@/hooks/useWeeklyReview";

const CHIPS: WeeklyReviewNoteType[] = ["update", "decision", "action_item", "risk", "need"];

/** Inline note capture with the 5-chip system. Auto-links to current week's review. */
export function QuickNoteCapture({
  linkType, linkId, compact,
}: {
  linkType: WeeklyReviewLinkType;
  linkId: string;
  compact?: boolean;
}) {
  const { data: current } = useCurrentWeeklyReview();
  const add = useAddReviewNote();
  const [type, setType] = useState<WeeklyReviewNoteType | null>(null);
  const [text, setText] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");

  const canCapture =
    current && (current.status === "open" || current.status === "pre_meeting" || current.status === "pending_close");

  const submit = async () => {
    if (!type || !text.trim() || !current) return;
    await add.mutateAsync({
      weekly_review_id: current.id,
      note_type: type,
      note_text: text.trim(),
      linked_to_type: linkType,
      linked_to_id: linkId,
      owner: type === "action_item" ? owner || null : null,
      due_date: type === "action_item" ? due || null : null,
      is_pre_meeting: current.status === "pre_meeting",
    });
    setText(""); setOwner(""); setDue(""); setType(null);
  };

  if (!canCapture) return null;

  return (
    <div className={cn("rounded-md border bg-muted/30 p-3 space-y-2", compact && "p-2")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground mr-1">
          Tag for Week {current.week_number} review:
        </span>
        {CHIPS.map((c) => {
          const meta = noteTypeMeta(c);
          const active = type === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setType(active ? null : c)}
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full border transition-all",
                meta.color,
                active ? "ring-2 ring-primary/50" : "opacity-60 hover:opacity-100"
              )}
            >
              <span className="mr-1">{meta.icon}</span>{meta.label}
            </button>
          );
        })}
      </div>
      {type && (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Add a ${noteTypeMeta(type).label.toLowerCase()}…`}
            rows={2}
            className="text-sm"
          />
          {type === "action_item" && (
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} className="h-8 text-xs" />
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-8 text-xs" />
            </div>
          )}
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="text-[10px]">📅 Will appear in Week {current.week_number} review</Badge>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setType(null); setText(""); }}>Cancel</Button>
              <Button size="sm" onClick={submit} disabled={!text.trim() || add.isPending}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
