import { Diamond } from "lucide-react";

export default function NochPlusDashboard() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground gap-4">
      <Diamond className="h-16 w-16 text-primary/40" />
      <h2 className="text-2xl font-semibold text-foreground">Noch+ Program Dashboard</h2>
      <p className="text-sm">Subscription analytics and program overview — coming soon.</p>
    </div>
  );
}
