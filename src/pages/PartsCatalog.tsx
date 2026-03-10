import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { BookOpen, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePartsCatalog, useCreatePartsCatalogItem, useUpdatePartsCatalogItem, useDeletePartsCatalogItem,
  type PartsCatalogItem,
} from "@/hooks/usePartsCatalog";
import { PartsCatalogFormModal } from "@/components/parts-catalog/PartsCatalogFormModal";
import { formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 50;

const CATEGORY_COLORS: Record<string, string> = {
  Labor: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  Hardware: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  Cable: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  Module: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
  Electrical: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  Travel: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400",
  parts: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  labor: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  travel: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400",
  other: "bg-muted text-muted-foreground border-border",
};

export default function PartsCatalogPage() {
  usePageTitle("Parts Catalog");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("usage_count");
  const [sortAsc, setSortAsc] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PartsCatalogItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<PartsCatalogItem | null>(null);

  const { data, isLoading } = usePartsCatalog(page, PAGE_SIZE, search, sortField, sortAsc);
  const createItem = useCreatePartsCatalogItem();
  const updateItem = useUpdatePartsCatalogItem();
  const deleteItemMutation = useDeletePartsCatalogItem();

  const items = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Stats
  const mostUsed = useMemo(() => {
    if (items.length === 0) return null;
    return [...items].sort((a, b) => b.usage_count - a.usage_count)[0];
  }, [items]);

  const maxUsage = mostUsed?.usage_count || 1;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortIndicator = (field: string) => {
    if (sortField !== field) return null;
    return sortAsc ? " ↑" : " ↓";
  };

  const handleSave = (data: Partial<PartsCatalogItem>) => {
    if (data.id) {
      updateItem.mutate(data as any, { onSuccess: () => { setFormOpen(false); setEditItem(null); } });
    } else {
      createItem.mutate(data, { onSuccess: () => { setFormOpen(false); } });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parts Catalog</h1>
          <p className="text-sm text-muted-foreground">All parts and labor items learned from estimates</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parts..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-8 w-64"
            />
          </div>
          <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Part
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Parts</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Most Used</p>
            <p className="text-sm font-semibold text-foreground mt-1 truncate">{mostUsed?.description || "—"}</p>
            {mostUsed && <p className="text-xs text-muted-foreground">{mostUsed.usage_count} uses</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Added</p>
            <p className="text-sm font-semibold text-foreground mt-1">
              {items.length > 0
                ? formatDistanceToNow(new Date([...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at), { addSuffix: true })
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading catalog...</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BookOpen className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">{search ? "No parts match your search" : "Parts catalog is empty"}</p>
          <p className="text-sm mt-1">{search ? "Try a different search term" : "Parts will be added automatically as you create estimates"}</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("description")}>
                    Description{sortIndicator("description")}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("part_number")}>
                    Part #{sortIndicator("part_number")}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("category")}>
                    Category{sortIndicator("category")}
                  </TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("unit_price")}>
                    Unit Price{sortIndicator("unit_price")}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("usage_count")}>
                    Used{sortIndicator("usage_count")}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("last_used_at")}>
                    Last Used{sortIndicator("last_used_at")}
                  </TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-xs truncate">{item.description}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.part_number || "—"}</TableCell>
                    <TableCell>
                      {item.category ? (
                        <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other}`}>
                          {item.category}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.unit || "each"}</TableCell>
                    <TableCell className="text-right tabular-nums">${Number(item.unit_price).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm tabular-nums">{item.usage_count}</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(100, (item.usage_count / maxUsage) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.last_used_at
                        ? formatDistanceToNow(new Date(item.last_used_at), { addSuffix: true })
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditItem(item); setFormOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteItem(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      <PartsCatalogFormModal
        open={formOpen}
        onOpenChange={o => { setFormOpen(o); if (!o) setEditItem(null); }}
        item={editItem}
        onSave={handleSave}
        isPending={createItem.isPending || updateItem.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => { if (!o) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteItem?.description}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This won't affect existing estimates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteItem) {
                  deleteItemMutation.mutate(deleteItem.id);
                  setDeleteItem(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
