import { useState, useMemo } from "react";
import { Package, Plus, Download, Upload, Search, LayoutGrid, List, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useParts, useCreatePart, useUpdatePart, useDeletePart, useAddStock, useUseStock, PART_CATEGORIES, CHARGER_TYPES, MANUFACTURERS, type Part } from "@/hooks/useParts";
import { useStockMovementsAll } from "@/hooks/useStockMovementsAll";
import { PartFormModal } from "@/components/parts/PartFormModal";
import { StockAdjustModal } from "@/components/parts/StockAdjustModal";
import { PartDetailModal } from "@/components/parts/PartDetailModal";
import { PartsAnalyticsDashboard } from "@/components/parts/PartsAnalyticsDashboard";

type StatusFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type ViewMode = "table" | "grid";

function getStatus(p: Part): "in_stock" | "low_stock" | "out_of_stock" {
  if (p.qty_in_stock === 0) return "out_of_stock";
  if (p.qty_in_stock <= p.reorder_point) return "low_stock";
  return "in_stock";
}

function StatusBadge({ part }: { part: Part }) {
  const s = getStatus(part);
  if (s === "out_of_stock") return <Badge variant="destructive" className="text-xs">❌ Out</Badge>;
  if (s === "low_stock") return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs">⚠️ Low</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-xs">✓ In Stock</Badge>;
}

const Parts = () => {
  const { data: parts = [], isLoading } = useParts();
  const { data: movements = [] } = useStockMovementsAll();
  const createPart = useCreatePart();
  const updatePart = useUpdatePart();
  const deletePart = useDeletePart();
  const addStock = useAddStock();
  const useStock = useUseStock();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [mfrFilter, setMfrFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editPart, setEditPart] = useState<Part | null>(null);
  const [stockPart, setStockPart] = useState<Part | null>(null);
  const [stockMode, setStockMode] = useState<"add" | "use">("add");
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [detailPart, setDetailPart] = useState<Part | null>(null);

  const filtered = useMemo(() => {
    let list = parts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.part_name.toLowerCase().includes(q) || p.part_number.toLowerCase().includes(q) || p.manufacturer.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter(p => getStatus(p) === statusFilter);
    if (categoryFilter !== "all") list = list.filter(p => p.category === categoryFilter);
    if (typeFilter !== "all") list = list.filter(p => p.charger_type === typeFilter);
    if (mfrFilter !== "all") list = list.filter(p => p.manufacturer === mfrFilter);
    return list;
  }, [parts, search, statusFilter, categoryFilter, typeFilter, mfrFilter]);


  const handleSave = (data: any) => {
    if (data.id) {
      updatePart.mutate(data, { onSuccess: () => { setFormOpen(false); setEditPart(null); } });
    } else {
      createPart.mutate(data, { onSuccess: () => { setFormOpen(false); } });
    }
  };

  const openAddStock = (p: Part) => { setStockPart(p); setStockMode("add"); setStockModalOpen(true); };
  const openUseStock = (p: Part) => { setStockPart(p); setStockMode("use"); setStockModalOpen(true); };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" /> Import</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button size="sm" onClick={() => { setEditPart(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Part
          </Button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <PartsAnalyticsDashboard
        parts={parts}
        movements={movements}
        onFilterLowStock={() => setStatusFilter("low_stock")}
        onViewPart={(p) => setDetailPart(p)}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by part name, number, or manufacturer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex gap-1">
          {(["all", "in_stock", "low_stock", "out_of_stock"] as StatusFilter[]).map(f => (
            <Button key={f} variant={statusFilter === f ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(f)}>
              {f === "all" ? "All" : f === "in_stock" ? "In Stock" : f === "low_stock" ? "Low Stock" : "Out of Stock"}
            </Button>
          ))}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PART_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CHARGER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mfrFilter} onValueChange={setMfrFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Mfr" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Mfrs</SelectItem>
            {MANUFACTURERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <Button variant={viewMode === "table" ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading parts...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">{parts.length === 0 ? "No parts in inventory" : "No parts match your filters"}</p>
          <p className="text-sm mt-1">{parts.length === 0 ? "Add your first part to get started" : "Try adjusting your search or filters"}</p>
          {parts.length === 0 && (
            <Button className="mt-4" onClick={() => { setEditPart(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add First Part
            </Button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Number</TableHead>
                <TableHead>Part Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mfr</TableHead>
                <TableHead className="text-right">In Stock</TableHead>
                <TableHead className="text-right">Reorder</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailPart(p)}>
                  <TableCell className="font-mono text-xs">{p.part_number}</TableCell>
                  <TableCell className="font-medium">{p.part_name}</TableCell>
                  <TableCell className="text-sm">{p.category}</TableCell>
                  <TableCell className="text-sm">{p.charger_type}</TableCell>
                  <TableCell className="text-sm">{p.manufacturer}</TableCell>
                  <TableCell className="text-right font-medium">{p.qty_in_stock}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{p.reorder_point}</TableCell>
                  <TableCell className="text-right">${p.unit_cost.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${(p.qty_in_stock * p.unit_cost).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge part={p} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setDetailPart(p)}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditPart(p); setFormOpen(true); }}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAddStock(p)}><Plus className="h-4 w-4 mr-2" /> Add Stock</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openUseStock(p)} disabled={p.qty_in_stock === 0}><Package className="h-4 w-4 mr-2" /> Use Stock</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deletePart.mutate(p.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailPart(p)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{p.part_number}</span>
                  <StatusBadge part={p} />
                </div>
                <p className="font-semibold text-sm">{p.part_name}</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>In Stock: <span className="font-medium text-foreground">{p.qty_in_stock}</span> units</p>
                  <p>Reorder at: {p.reorder_point}</p>
                  <p>Unit Cost: <span className="font-medium text-foreground">${p.unit_cost.toLocaleString()}</span></p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">{p.category}</Badge>
                  <Badge variant="outline" className="text-xs">{p.manufacturer}</Badge>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={e => { e.stopPropagation(); setDetailPart(p); }}>View</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={e => { e.stopPropagation(); openAddStock(p); }}>Add Stock</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <PartFormModal
        open={formOpen}
        onOpenChange={o => { setFormOpen(o); if (!o) setEditPart(null); }}
        part={editPart}
        onSave={handleSave}
        isPending={createPart.isPending || updatePart.isPending}
      />
      <StockAdjustModal
        open={stockModalOpen}
        onOpenChange={setStockModalOpen}
        part={stockPart}
        mode={stockMode}
        onConfirm={data => {
          if (!stockPart) return;
          const fn = stockMode === "add" ? addStock : useStock;
          fn.mutate({ partId: stockPart.id, ...data }, { onSuccess: () => setStockModalOpen(false) });
        }}
        isPending={addStock.isPending || useStock.isPending}
      />
      <PartDetailModal
        open={!!detailPart}
        onOpenChange={o => { if (!o) setDetailPart(null); }}
        part={detailPart}
        onEdit={() => { setEditPart(detailPart); setFormOpen(true); setDetailPart(null); }}
        onAddStock={() => { if (detailPart) { openAddStock(detailPart); setDetailPart(null); } }}
        onUseStock={() => { if (detailPart) { openUseStock(detailPart); setDetailPart(null); } }}
      />
    </div>
  );
};

export default Parts;
