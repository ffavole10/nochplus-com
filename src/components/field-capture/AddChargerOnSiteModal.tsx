import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  nextPosition: number;
  onCreated: (chargerId: string) => void;
}

export default function AddChargerOnSiteModal({
  open,
  onOpenChange,
  workOrderId,
  nextPosition,
  onCreated,
}: Props) {
  const [makeModel, setMakeModel] = useState("");
  const [serial, setSerial] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!makeModel.trim() || !serial.trim()) {
      toast.error("Make/model and serial number are required");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("work_order_chargers")
      .insert({
        work_order_id: workOrderId,
        charger_position: nextPosition,
        make_model: makeModel.trim(),
        serial_number: serial.trim(),
        added_on_site: true,
        status: "not_started",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message || "Could not add charger");
      return;
    }
    setMakeModel("");
    setSerial("");
    onOpenChange(false);
    onCreated(data.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add Charger</DialogTitle>
          <DialogDescription>
            Found a charger that wasn't scheduled? Add it here.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label>Make / Model</Label>
            <Input
              value={makeModel}
              onChange={(e) => setMakeModel(e.target.value)}
              placeholder="e.g. ChargePoint CT4000"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Serial Number</Label>
            <Input
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="Enter serial"
              className="h-11"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant="ghost"
            className="flex-1 h-11 rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-11 rounded-xl bg-fc-primary hover:bg-fc-primary-dark text-white"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Adding…" : "Add and Start Capture"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
