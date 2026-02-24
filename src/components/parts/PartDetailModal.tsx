import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Plus, Minus, Package } from "lucide-react";
import { useStockMovements, type Part } from "@/hooks/useParts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: Part | null;
  onEdit: () => void;
  onAddStock: () => void;
  onUseStock: () => void;
}

function getStatusBadge(part: Part) {
  if (part.qty_in_stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
  if (part.qty_in_stock <= part.reorder_point) return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Low Stock</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">In Stock</Badge>;
}

export function PartDetailModal({ open, onOpenChange, part, onEdit, onAddStock, onUseStock }: Props) {
  const { data: movements = [] } = useStockMovements(part?.id);

  if (!part) return null;

  const totalValue = part.qty_in_stock * part.unit_cost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{part.part_number} — {part.part_name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(part)}
                <span className="text-sm text-muted-foreground">{part.qty_in_stock} units</span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button variant="outline" size="sm" onClick={onAddStock}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
              <Button variant="outline" size="sm" onClick={onUseStock} disabled={part.qty_in_stock === 0}><Minus className="h-3.5 w-3.5 mr-1" /> Use</Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Stock History</TabsTrigger>
            <TabsTrigger value="swis" className="flex-1">Related SWIs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ScrollArea className="max-h-[50vh]">
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Inventory</p>
                    <p className="text-sm">In Stock: <span className="font-semibold">{part.qty_in_stock}</span></p>
                    <p className="text-sm">Reorder Point: {part.reorder_point}</p>
                    <p className="text-sm">Location: {part.location_bin || "—"}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Pricing</p>
                    <p className="text-sm">Unit Cost: <span className="font-semibold">${part.unit_cost.toLocaleString()}</span></p>
                    <p className="text-sm">Total Value: ${totalValue.toLocaleString()}</p>
                    <p className="text-sm">Supplier: {part.supplier || "—"}</p>
                    <p className="text-sm">Lead Time: {part.lead_time_days} days</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Details</p>
                    <p className="text-sm">Category: {part.category}</p>
                    <p className="text-sm">Type: {part.charger_type}</p>
                    <p className="text-sm">Manufacturer: {part.manufacturer}</p>
                    <p className="text-sm">Weight: {part.weight_lbs ? `${part.weight_lbs} lbs` : "—"}</p>
                    <p className="text-sm">Dimensions: {part.dimensions || "—"}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Usage (30 Days)</p>
                    <p className="text-sm">Times Used: {part.usage_count_30d}</p>
                    <p className="text-sm">Last Used: {part.last_used_date ? format(new Date(part.last_used_date), "MMM d, yyyy") : "Never"}</p>
                  </div>
                </div>
              </div>
              {part.description && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</p>
                  <p className="text-sm">{part.description}</p>
                </div>
              )}
              {part.compatible_models.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Compatible Models</p>
                  <div className="flex flex-wrap gap-1">
                    {part.compatible_models.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="max-h-[50vh]">
              {movements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No stock movements recorded</p>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  {movements.map(mv => (
                    <div key={mv.id} className="p-3 border rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className={mv.movement_type === "add" ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                          {mv.movement_type === "add" ? "➕" : "➖"} {mv.movement_type === "add" ? "Stock Added" : "Stock Used"}: {Math.abs(mv.quantity)} units
                        </span>
                        <span className="text-xs text-muted-foreground">{format(new Date(mv.created_at), "MMM d, yyyy h:mm a")}</span>
                      </div>
                      <p className="text-muted-foreground mt-1">Reason: {mv.reason}</p>
                      {mv.ticket_id && <p className="text-muted-foreground">Ticket: {mv.ticket_id}</p>}
                      {mv.notes && <p className="text-muted-foreground">Notes: {mv.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1">Balance after: {mv.balance_after} units</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="swis">
            <ScrollArea className="max-h-[50vh]">
              {part.compatible_swis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No SWIs linked to this part</p>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  {part.compatible_swis.map(swi => (
                    <div key={swi} className="p-3 border rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium">{swi}</span>
                      <Badge variant="outline">Linked</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
