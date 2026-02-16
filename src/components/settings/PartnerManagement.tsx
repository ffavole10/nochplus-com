import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Check, X, Plus, Handshake } from "lucide-react";
import { toast } from "sonner";
import { usePartners, useCreatePartner, useUpdatePartner, useDeletePartner } from "@/hooks/usePartners";

const CATEGORIES = ["CPOs", "OEMs", "CSMS"];

export function PartnerManagement() {
  const { data: partners = [], isLoading } = usePartners();
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const deletePartner = useDeletePartner();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("CPOs");

  const sortedPartners = useMemo(() => {
    return [...partners].sort((a, b) => a.label.localeCompare(b.label));
  }, [partners]);

  const startEdit = (p: { id: string; label: string; category: string }) => {
    setEditingId(p.id);
    setEditLabel(p.label);
    setEditCategory(p.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editLabel.trim()) return;
    try {
      await updatePartner.mutateAsync({ id: editingId, label: editLabel.trim(), category: editCategory });
      toast.success("Partner updated");
      cancelEdit();
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete partner "${label}"?`)) return;
    try {
      await deletePartner.mutateAsync(id);
      toast.success("Partner deleted");
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) {
      toast.error("Name is required");
      return;
    }
    const value = newLabel.trim().toLowerCase().replace(/\s+/g, "_");
    const maxOrder = partners.reduce((max, p) => Math.max(max, p.sort_order), 0);
    try {
      await createPartner.mutateAsync({
        value,
        label: newLabel.trim(),
        category: newCategory,
        sort_order: maxOrder + 1,
      });
      toast.success("Partner added");
      setAddOpen(false);
      setNewLabel("");
      setNewCategory("CPOs");
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Partners
          </CardTitle>
          <CardDescription>{partners.length} total partners</CardDescription>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Partner
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPartners.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {editingId === p.id ? (
                        <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-8 text-sm" />
                      ) : (
                        <span className="font-medium">{p.label}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === p.id ? (
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="h-8 w-[120px] text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{p.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === p.id ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={saveEdit} disabled={updatePartner.isPending}>
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id, p.label)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Partner Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Tesla" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createPartner.isPending}>
              {createPartner.isPending ? "Adding..." : "Add Partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
