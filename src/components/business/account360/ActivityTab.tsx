import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Power,
  Trash2,
  GitMerge,
  UserPlus,
  UserCog,
  UserMinus,
  Star,
  History,
} from "lucide-react";
import { useAccountActivity, type AccountActivityEntry } from "@/hooks/useAccountActivity";
import { fieldLabel } from "@/lib/accountActivity";
import { TabHeader, TabEmpty } from "./shared";
import { QuickNoteCapture } from "@/components/business/weekly-review/QuickNoteCapture";
import { LinkedNotesList } from "@/components/business/weekly-review/LinkedNotesList";

const ICONS: Record<string, any> = {
  created: Plus,
  updated: Pencil,
  status_changed: Power,
  deleted: Trash2,
  merged: GitMerge,
  merge_target: GitMerge,
  contact_added: UserPlus,
  contact_updated: UserCog,
  contact_removed: UserMinus,
  primary_contact_changed: Star,
};

function summarize(e: AccountActivityEntry): string {
  switch (e.action) {
    case "created":
      return `Account created${e.new_value ? ` — ${e.new_value}` : ""}`;
    case "updated":
      if (e.field_changed) {
        return `${fieldLabel(e.field_changed)} changed${e.old_value || e.new_value ? ` — “${e.old_value || "—"}” → “${e.new_value || "—"}”` : ""}`;
      }
      return "Account updated";
    case "status_changed":
      return `Status changed${e.old_value || e.new_value ? ` — ${e.old_value || "—"} → ${e.new_value || "—"}` : ""}`;
    case "deleted":
      return `Account archived${e.new_value ? ` — ${e.new_value}` : ""}`;
    case "merged":
      return `Merged into ${e.new_value || "another account"}`;
    case "merge_target":
      return `${e.new_value || "Another account"} merged into this account`;
    case "contact_added":
      return `Contact added${e.new_value ? ` — ${e.new_value}` : ""}`;
    case "contact_updated":
      return `Contact updated${e.new_value ? ` — ${e.new_value}` : ""}`;
    case "contact_removed":
      return `Contact removed${e.old_value ? ` — ${e.old_value}` : ""}`;
    case "primary_contact_changed":
      return `Primary contact changed${e.new_value ? ` — ${e.new_value}` : ""}`;
    default:
      return e.action;
  }
}

export function ActivityTab({ account }: { account: { id: string; company: string } }) {
  const { data: entries = [], isLoading } = useAccountActivity(account.id);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <TabHeader
        title="Activity"
        count={entries.length}
        subhead={`Audit log for ${account.company}`}
      />
      <QuickNoteCapture linkType="account" linkId={account.id} />
      <LinkedNotesList linkType="account" linkId={account.id} title="Weekly Review notes" />
      {entries.length === 0 ? (
        <TabEmpty label="No activity yet for this account." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ol className="divide-y divide-border">
              {entries.map((e) => {
                const Icon = ICONS[e.action] || History;
                return (
                  <li key={e.id} className="flex gap-3 px-4 py-3">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{summarize(e)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{format(new Date(e.created_at), "MMM d, yyyy · h:mm a")}</span>
                        {e.actor && (
                          <>
                            <span className="opacity-50">·</span>
                            <span>{e.actor}</span>
                          </>
                        )}
                        <Badge variant="outline" className="text-[10px] capitalize">{e.action.replace(/_/g, " ")}</Badge>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
