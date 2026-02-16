import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Check, X, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useCampaigns, useUpdateCampaign, useDeleteCampaign } from "@/hooks/useCampaigns";
import { usePartners } from "@/hooks/usePartners";

export function CampaignManagement() {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const { data: dbPartners = [] } = usePartners();

  const partnerCategories = useMemo(() => {
    const cats = ["CPOs", "OEMs", "CSMS"];
    return cats
      .map((cat) => ({ label: cat, partners: dbPartners.filter((p) => p.category === cat) }))
      .filter((g) => g.partners.length > 0);
  }, [dbPartners]);

  const partnerLabels = useMemo(() => {
    return Object.fromEntries(dbPartners.map((p) => [p.value, p.label]));
  }, [dbPartners]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCustomer, setEditCustomer] = useState("");

  const startEdit = (campaign: { id: string; name: string; customer: string }) => {
    setEditingId(campaign.id);
    setEditName(campaign.name);
    setEditCustomer(campaign.customer);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditCustomer("");
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateCampaign.mutateAsync({ id: editingId, name: editName.trim(), customer: editCustomer });
      toast.success("Campaign updated");
      cancelEdit();
    } catch (err: any) {
      toast.error("Failed to update: " + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"? This will also remove all associated charger records.`)) return;
    try {
      await deleteCampaign.mutateAsync(id);
      toast.success("Campaign deleted");
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Campaigns
        </CardTitle>
        <CardDescription>{campaigns.length} total campaigns</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No campaigns yet. Create one from the sidebar.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Chargers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {editingId === c.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span className="font-medium">{c.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === c.id ? (
                      <Select value={editCustomer} onValueChange={setEditCustomer}>
                        <SelectTrigger className="h-8 w-[160px] text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {partnerCategories.map((cat) => (
                            <SelectGroup key={cat.label}>
                              <SelectLabel className="text-xs">{cat.label}</SelectLabel>
                              {cat.partners.map((p) => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      partnerLabels[c.customer] || c.customer
                    )}
                  </TableCell>
                  <TableCell>{c.total_chargers}</TableCell>
                  <TableCell className="capitalize">{c.status || "draft"}</TableCell>
                  <TableCell className="text-right">
                    {editingId === c.id ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={saveEdit} disabled={updateCampaign.isPending}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id, c.name)} className="text-destructive hover:text-destructive">
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
    </Card>
  );
}
