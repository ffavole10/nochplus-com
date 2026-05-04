import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotesForLink, noteTypeMeta, type WeeklyReviewLinkType } from "@/hooks/useWeeklyReview";

/** Read-only list of all weekly review notes linked to this artifact. */
export function LinkedNotesList({
  linkType, linkId, title = "Weekly Review notes",
}: {
  linkType: WeeklyReviewLinkType;
  linkId: string;
  title?: string;
}) {
  const { data: notes = [] } = useNotesForLink(linkType, linkId);
  if (notes.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} ({notes.length})
      </p>
      <ol className="space-y-2">
        {notes.map((n) => {
          const meta = noteTypeMeta(n.note_type);
          return (
            <li key={n.id} className="rounded-md border bg-card px-3 py-2">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={cn("border text-[10px]", meta.color)}>
                  <span className="mr-1">{meta.icon}</span>{meta.label}
                </Badge>
                {n._review && (
                  <Badge variant="outline" className="text-[10px]">
                    Week {n._review.week_number} Review
                  </Badge>
                )}
                {n.locked && <Badge variant="outline" className="text-[10px]">🔒 Locked</Badge>}
              </div>
              <p className="text-sm whitespace-pre-wrap">{n.note_text}</p>
              {n.note_type === "action_item" && (n.owner || n.due_date) && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {n.owner && <>Owner: {n.owner}</>}
                  {n.owner && n.due_date && <span className="mx-1">·</span>}
                  {n.due_date && <>Due: {format(new Date(n.due_date), "MMM d, yyyy")}</>}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                {n.author} · {format(new Date(n.created_at), "MMM d, yyyy h:mm a")}
                {n.edited_at && <span className="ml-1 italic">· edited</span>}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
