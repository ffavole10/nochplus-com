import { FolderOpen } from "lucide-react";

export default function FieldReports() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground gap-4">
      <FolderOpen className="h-16 w-16 text-primary/40" />
      <h2 className="text-2xl font-semibold text-foreground">Field Reports</h2>
      <p className="text-sm">Campaign field reports and documentation — coming soon.</p>
    </div>
  );
}
