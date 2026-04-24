import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  UserCog,
  Ban,
  Trash2,
  Archive,
  FileDown,
  FileText,
} from "lucide-react";
import type { WorkOrderStatus } from "@/types/fieldCapture";
import { cn } from "@/lib/utils";

export type QuickAction =
  | "open"
  | "edit"
  | "duplicate"
  | "reassign"
  | "cancel"
  | "delete"
  | "archive"
  | "view_submission"
  | "export_pdf";

interface Props {
  status: WorkOrderStatus;
  isArchived?: boolean;
  onAction: (action: QuickAction) => void;
}

interface Item {
  key: QuickAction;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  separatorBefore?: boolean;
}

function itemsForStatus(status: WorkOrderStatus, isArchived: boolean): Item[] {
  if (isArchived) {
    return [
      { key: "open", label: "View Details", icon: Eye },
      { key: "duplicate", label: "Duplicate Work Order", icon: Copy },
      { key: "archive", label: "Unarchive", icon: Archive },
    ];
  }

  switch (status) {
    case "scheduled":
      return [
        { key: "edit", label: "Edit Details", icon: Pencil },
        { key: "duplicate", label: "Duplicate Work Order", icon: Copy },
        { key: "reassign", label: "Reassign Technician", icon: UserCog },
        { key: "cancel", label: "Cancel Job", icon: Ban, separatorBefore: true },
        { key: "delete", label: "Delete", icon: Trash2, destructive: true },
      ];
    case "in_progress":
      return [
        { key: "edit", label: "Edit Details", icon: Pencil },
        { key: "duplicate", label: "Duplicate Work Order", icon: Copy },
        { key: "reassign", label: "Reassign Technician", icon: UserCog },
        { key: "archive", label: "Archive", icon: Archive, separatorBefore: true },
      ];
    case "submitted":
    case "pending_review":
    case "flagged":
      return [
        { key: "open", label: "View Submission", icon: FileText },
        { key: "duplicate", label: "Duplicate Work Order", icon: Copy },
        { key: "archive", label: "Archive", icon: Archive, separatorBefore: true },
      ];
    case "approved":
    case "closed":
      return [
        { key: "open", label: "View Details", icon: Eye },
        { key: "duplicate", label: "Duplicate Work Order", icon: Copy },
        { key: "export_pdf", label: "Export PDF", icon: FileDown },
        { key: "archive", label: "Archive", icon: Archive, separatorBefore: true },
      ];
    case "cancelled":
      return [
        { key: "open", label: "View Details", icon: Eye },
        { key: "duplicate", label: "Duplicate Work Order", icon: Copy },
        { key: "archive", label: "Archive", icon: Archive, separatorBefore: true },
        { key: "delete", label: "Delete", icon: Trash2, destructive: true },
      ];
    case "archived":
      return [
        { key: "open", label: "View Details", icon: Eye },
        { key: "duplicate", label: "Duplicate Work Order", icon: Copy },
      ];
    default:
      return [
        { key: "open", label: "View Details", icon: Eye },
        { key: "duplicate", label: "Duplicate Work Order", icon: Copy },
      ];
  }
}

export default function WorkOrderQuickActionsMenu({
  status,
  isArchived = false,
  onAction,
}: Props) {
  const items = itemsForStatus(status, isArchived);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Quick actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          {items.map((it) => (
            <div key={it.key}>
              {it.separatorBefore && <div className="my-1 h-px bg-border" />}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(it.key);
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md text-left",
                  "hover:bg-accent transition-colors",
                  it.destructive && "text-destructive hover:bg-destructive/10",
                )}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
