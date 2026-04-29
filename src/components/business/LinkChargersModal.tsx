import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAvailableChargers, useLinkChargers } from "@/hooks/useChargerRelationships";
import { RELATIONSHIP_LABEL, type ChargerRelationshipType } from "@/types/growth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string;
  customerName: string;
}

export function LinkChargersModal({ open, onOpenChange, customerId, customerName }: Props) {
  const [search, setSearch] = useState("");
  const [relType, setRelType] = useState<ChargerRelationshipType>("cms");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: chargers = [], isLoading } = useAvailableChargers(search);
  const link = useLinkChargers();

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleLink = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one charger");
      return;
    }
    try {
      await link.mutateAsync({
        customerId,
        chargerIds: Array.from(selected),
        relationshipType: relType,
      });
      toast.success(`Linked ${selected.size} charger(s) to ${customerName} as ${RELATIONSHIP_LABEL[relType]}`);
      setSelected(new Set());
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to link chargers");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Link Chargers to {customerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Relationship</Label>
              <Select value={relType} onValueChange={(v) => setRelType(v as ChargerRelationshipType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[2200]">
                  {(Object.keys(RELATIONSHIP_LABEL) as ChargerRelationshipType[]).map((k) => (
                    <SelectItem key={k} value={k}>{RELATIONSHIP_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-7"
                  placeholder="Station ID, name, model, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border rounded-md max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading...
              </div>
            ) : chargers.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground italic">
                No chargers found
              </div>
            ) : (
              <ul className="divide-y">
                {chargers.map((c: any) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 p-2.5 hover:bg-accent/50 cursor-pointer"
                    onClick={() => toggle(c.id)}
                  >
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.station_id} {c.station_name ? `· ${c.station_name}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[c.model, c.city, c.state].filter(Boolean).join(" · ") || "No details"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {selected.size} selected · Will link as {RELATIONSHIP_LABEL[relType]}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleLink} disabled={link.isPending || selected.size === 0}>
            {link.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Linking...</> : `Link ${selected.size} charger(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
