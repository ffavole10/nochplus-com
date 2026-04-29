import { Search } from "lucide-react";
import { useCommandPalette } from "./CommandPaletteContext";

export function CommandPaletteTrigger() {
  const { setOpen } = useCommandPalette();
  const mac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <button
      onClick={() => setOpen(true)}
      className="hidden md:inline-flex items-center gap-2 h-9 rounded-md border border-border bg-background hover:bg-accent px-2.5 text-xs text-muted-foreground transition-colors"
      title="Open command palette"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="font-mono text-[10px] rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">
        {mac ? "⌘K" : "Ctrl K"}
      </span>
    </button>
  );
}
