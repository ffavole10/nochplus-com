import { Pin } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EntityType, isPinned, togglePin } from "./pinStorage";

interface Props {
  type: EntityType;
  id: string;
  label: string;
  className?: string;
  /** Show as full button with text, or icon-only (default). */
  variant?: "icon" | "compact";
}

/**
 * Header pin button used by Ticket inline expansion, WorkOrderDetailModal,
 * and Account 360 — keeps state in sync with the ⌘K palette via shared
 * localStorage. Re-reads on a custom `noch:pins-changed` window event so
 * pin/unpin from anywhere reflects everywhere.
 */
export function PinButton({ type, id, label, className, variant = "compact" }: Props) {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    setPinned(isPinned(type, id));
    const onChange = () => setPinned(isPinned(type, id));
    window.addEventListener("noch:pins-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("noch:pins-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [type, id]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = togglePin({ entity_type: type, entity_id: id, label });
    if (!result.ok) {
      toast.error("Pin limit reached. Unpin an item first.");
      return;
    }
    setPinned(result.pinned);
    toast.success(`${label} ${result.pinned ? "pinned" : "unpinned"}`);
    window.dispatchEvent(new Event("noch:pins-changed"));
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={pinned ? "Unpin" : "Pin"}
        className={cn(
          "inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors",
          pinned ? "text-primary" : "text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        <Pin className="h-3.5 w-3.5" fill={pinned ? "currentColor" : "none"} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={pinned ? "Unpin from ⌘K palette" : "Pin to ⌘K palette"}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 rounded-md border border-border bg-background hover:bg-accent px-2 text-xs transition-colors",
        pinned ? "text-primary border-primary/40" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Pin className="h-3 w-3" fill={pinned ? "currentColor" : "none"} />
      <span>{pinned ? "Pinned" : "Pin"}</span>
    </button>
  );
}
