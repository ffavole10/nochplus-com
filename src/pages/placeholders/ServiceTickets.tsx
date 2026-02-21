import { useState } from "react";
import { Ticket, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StandardizedTicketIntakeForm from "@/components/tickets/StandardizedTicketIntakeForm";
import type { TicketData } from "@/types/ticket";
import { toast } from "sonner";

export default function ServiceTickets() {
  const [formOpen, setFormOpen] = useState(false);

  const handleSubmit = (data: TicketData) => {
    console.log("New ticket:", data);
    toast.success("Ticket created successfully");
    setFormOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="items-end justify-between flex flex-col">
        
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground gap-4">
        <Ticket className="h-16 w-16 text-primary/40" />
        <p className="text-sm">Unified ticket view across all sources — coming soon.</p>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Service Ticket</DialogTitle>
          </DialogHeader>
          <StandardizedTicketIntakeForm
            mode="create"
            source="manual"
            onSubmit={handleSubmit}
            onCancel={() => setFormOpen(false)} />

        </DialogContent>
      </Dialog>
    </div>);

}