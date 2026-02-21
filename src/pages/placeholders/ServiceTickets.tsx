import { Ticket } from "lucide-react";

export default function ServiceTickets() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground gap-4">
      <Ticket className="h-16 w-16 text-primary/40" />
      <h2 className="text-2xl font-semibold text-foreground">Service Tickets</h2>
      <p className="text-sm">Unified ticket view across all sources — coming soon.</p>
    </div>
  );
}
