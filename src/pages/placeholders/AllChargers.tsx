import { HardDrive } from "lucide-react";

export default function AllChargers() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground gap-4">
      <HardDrive className="h-16 w-16 text-primary/40" />
      <h2 className="text-2xl font-semibold text-foreground">All Chargers</h2>
      <p className="text-sm">Cross-campaign charger database — coming soon.</p>
    </div>
  );
}
