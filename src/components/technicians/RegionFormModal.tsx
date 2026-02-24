import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceRegion } from "@/hooks/useTechnicians";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region: ServiceRegion | null;
  onSave: (data: any) => void;
}

export function RegionFormModal({ open, onOpenChange, region, onSave }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [citiesText, setCitiesText] = useState("");

  useEffect(() => {
    if (region) {
      setName(region.name);
      setDescription(region.description || "");
      setCitiesText((region.cities || []).join(", "));
    } else {
      setName("");
      setDescription("");
      setCitiesText("");
    }
  }, [region, open]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const cities = citiesText.split(",").map(c => c.trim()).filter(Boolean);
    onSave({
      ...(region ? { id: region.id } : {}),
      name: name.trim(),
      description,
      cities,
      technician_ids: region?.technician_ids || [],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{region ? "Edit Region" : "Add Region"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Region Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Southern California" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Coverage details..." />
          </div>
          <div>
            <Label>Cities (comma-separated)</Label>
            <Input value={citiesText} onChange={e => setCitiesText(e.target.value)} placeholder="San Diego, Los Angeles, ..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{region ? "Save" : "Add Region"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
