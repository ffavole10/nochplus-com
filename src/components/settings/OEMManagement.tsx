import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Box, Plus, Trash2, FolderOpen, FileText } from "lucide-react";
import { useSWIOems, useSWICatalogEntries, type SWIOem } from "@/hooks/useSWICatalogDB";
import { toast } from "sonner";

export function OEMManagement() {
  const { oems, loading: oemsLoading, addOem, deleteOem } = useSWIOems();
  const { entries, loading: entriesLoading, addEntry, deleteEntry } = useSWICatalogEntries();
  const [newOemName, setNewOemName] = useState("");
  const [addingOem, setAddingOem] = useState(false);

  // SWI Entry dialog state
  const [swiDialog, setSwiDialog] = useState<{ open: boolean; oemId: string; oemName: string }>({ open: false, oemId: "", oemName: "" });
  const [swiForm, setSwiForm] = useState({ folder: "", title: "", filename: "", description: "", estimatedTime: "" });

  const handleAddOem = async () => {
    const name = newOemName.trim();
    if (!name) { toast.error("OEM name is required"); return; }
    if (oems.some(o => o.name.toLowerCase() === name.toLowerCase())) {
      toast.error("OEM already exists"); return;
    }
    setAddingOem(true);
    await addOem(name);
    setNewOemName("");
    setAddingOem(false);
  };

  const { confirm: confirmDialog, dialogProps } = useConfirmDialog();

  const handleDeleteOem = async (oem: SWIOem) => {
    const oemEntries = entries.filter(e => e.oem_id === oem.id);
    const ok = await confirmDialog({
      title: "Delete OEM?",
      description: `Delete OEM "${oem.name}"${oemEntries.length > 0 ? ` and its ${oemEntries.length} SWI entries` : ""}? This cannot be undone.`,
      confirmLabel: "Delete OEM",
    });
    if (!ok) return;
    await deleteOem(oem.id, oem.name);
  };

  const handleAddSwiEntry = async () => {
    if (!swiForm.title.trim() || !swiForm.filename.trim()) {
      toast.error("Title and filename are required"); return;
    }
    await addEntry({
      oem_id: swiDialog.oemId,
      folder: swiForm.folder.trim() || "General",
      title: swiForm.title.trim(),
      filename: swiForm.filename.trim(),
      description: swiForm.description.trim(),
      charger_models: [],
      issue_types: [],
      service_categories: [],
      priority: [],
      estimated_time: swiForm.estimatedTime.trim(),
      required_parts: [],
    });
    setSwiDialog({ open: false, oemId: "", oemName: "" });
    setSwiForm({ folder: "", title: "", filename: "", description: "", estimatedTime: "" });
  };

  // Group entries by OEM then folder
  const getOemFolders = (oemId: string) => {
    const oemEntries = entries.filter(e => e.oem_id === oemId);
    const folders: Record<string, typeof entries> = {};
    for (const entry of oemEntries) {
      const f = entry.folder || "General";
      if (!folders[f]) folders[f] = [];
      folders[f].push(entry);
    }
    return folders;
  };

  if (oemsLoading || entriesLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            OEM & SWI Management
          </CardTitle>
          <CardDescription>
            Add OEMs and manage their SWI catalog entries. These entries will appear in the SWI Library for document uploads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add OEM */}
          <div className="flex gap-2">
            <Input
              placeholder="New OEM name (e.g., ABB, Tritium)"
              value={newOemName}
              onChange={(e) => setNewOemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddOem()}
              className="max-w-xs"
            />
            <Button onClick={handleAddOem} disabled={addingOem} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add OEM
            </Button>
          </div>

          {/* OEM List */}
          {oems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Box className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No OEMs added yet. Add your first OEM above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {oems.map((oem) => {
                const folders = getOemFolders(oem.id);
                const totalEntries = entries.filter(e => e.oem_id === oem.id).length;

                return (
                  <div key={oem.id} className="border rounded-xl overflow-hidden bg-card">
                    {/* OEM Header */}
                    <div className="flex items-center gap-3 px-5 py-4 bg-muted/40 border-b">
                      <Box className="h-5 w-5 text-primary flex-shrink-0" />
                      <h3 className="font-bold text-base">{oem.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {totalEntries} SWI{totalEntries !== 1 ? "s" : ""}
                      </Badge>
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => setSwiDialog({ open: true, oemId: oem.id, oemName: oem.name })}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add SWI
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteOem(oem)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Folders & Entries */}
                    {totalEntries > 0 ? (
                      <div className="p-3">
                        <Accordion type="multiple" className="space-y-1.5">
                          {Object.keys(folders).sort().map((folder) => (
                            <AccordionItem key={folder} value={folder} className="border rounded-lg overflow-hidden">
                              <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                                <div className="flex items-center gap-3 flex-1">
                                  <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-semibold text-sm">{folder}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {folders[folder].length}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-0 pb-0">
                                <div className="divide-y">
                                  {folders[folder].map((entry) => (
                                    <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                                      <FileText className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{entry.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{entry.filename}</p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => deleteEntry(entry.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        No SWI entries yet. Click "Add SWI" to create one.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add SWI Entry Dialog */}
      <Dialog open={swiDialog.open} onOpenChange={(open) => !open && setSwiDialog({ open: false, oemId: "", oemName: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SWI Entry — {swiDialog.oemName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Folder / Category *</Label>
              <Input
                placeholder="e.g., Common, Level 2, 100kW AIO"
                value={swiForm.folder}
                onChange={(e) => setSwiForm(prev => ({ ...prev, folder: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., SECC Replacement"
                value={swiForm.title}
                onChange={(e) => setSwiForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Filename *</Label>
              <Input
                placeholder="e.g., SWI-HPDC-004 SECC Replacement.pdf"
                value={swiForm.filename}
                onChange={(e) => setSwiForm(prev => ({ ...prev, filename: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">This is used to auto-match uploaded PDFs</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the procedure"
                value={swiForm.description}
                onChange={(e) => setSwiForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Time</Label>
              <Input
                placeholder="e.g., 1-2 hours"
                value={swiForm.estimatedTime}
                onChange={(e) => setSwiForm(prev => ({ ...prev, estimatedTime: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwiDialog({ open: false, oemId: "", oemName: "" })}>Cancel</Button>
            <Button onClick={handleAddSwiEntry}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...dialogProps} />
    </>
  );
}
