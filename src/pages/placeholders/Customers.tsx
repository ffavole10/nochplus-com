import { Users } from "lucide-react";

export default function Customers() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground gap-4">
      <Users className="h-16 w-16 text-primary/40" />
      <h2 className="text-2xl font-semibold text-foreground">Customers</h2>
      <p className="text-sm">Customer management — coming soon.</p>
    </div>
  );
}
