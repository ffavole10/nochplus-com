import { useState, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText, Trash2, Search, Eye, Upload, FolderOpen, Box, Plus, Pencil, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import { uploadSWIDocument, deleteSWIDocument, getSWIPublicUrl, listSWIDocuments } from "@/lib/swiStorage";
import { SWIPreviewDialog } from "@/components/tickets/SWIPreviewDialog";
import { useSWIOems, useSWICatalogEntries, type SWICatalogEntry } from "@/hooks/useSWICatalogDB";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect } from "react";

export function SWIDocumentManagement() {
  const { oems, loading: oemsLoading, addOem, deleteOem } = useSWIOems();
  const { entries, loading: entriesLoading, addEntry, deleteEntry, updateEntry } = useSWICatalogEntries();

  const [search, setSearch] = useState("");
  const [newOemName, setNewOemName] = useState("");
  const [addingOem, setAddingOem] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<SWICatalogEntry | null>(null);
  const [uploadingOem, setUploadingOem] = useState<string | null>(null);
  const [draggingOver, setDraggingOver] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [uploadedIds, setUploadedIds] = useState<Set<string>>(new Set());
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Load which SWIs have uploaded files
  useEffect(() => {
    listSWIDocuments().then(files => {
      const ids = new Set(files.map(f => f.replace(/\.[^.]+$/, "")));
      setUploadedIds(ids);
    }).catch(console.error);
  }, []);

  const handleAddOem = async () => {
    const name = newOemName.trim();
    if (!name) return;
    if (oems.some(o => o.name.toLowerCase() === name.toLowerCase())) {
      toast.error("OEM already exists"); return;
    }
    setAddingOem(true);
    await addOem(name);
    setNewOemName("");
    setAddingOem(false);
  };

  const { confirm: confirmDialog, dialogProps } = useConfirmDialog();

  const handleDeleteOem = async (oem: { id: string; name: string }) => {
    const oemEntries = entries.filter(e => e.oem_id === oem.id);
    const ok = await confirmDialog({
      title: "Delete OEM?",
      description: `Delete OEM "${oem.name}"${oemEntries.length > 0 ? ` and its ${oemEntries.length} SWI entries` : ""}? This cannot be undone.`,
      confirmLabel: "Delete OEM",
    });
    if (!ok) return;
    await deleteOem(oem.id, oem.name);
  };

  const handleUploadSWIs = useCallback(async (files: FileList | File[], oemId: string) => {
    const pdfs = Array.from(files).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) { toast.error("Only PDF files are accepted"); return; }

    let uploaded = 0;
    for (const file of pdfs) {
      const title = file.name.replace(/\.pdf$/i, "");
      const tempId = `uploading-${Date.now()}-${file.name}`;
      setUploadingFiles(prev => new Set([...prev, tempId]));

      try {
        // Create catalog entry
        const ok = await addEntry({
          oem_id: oemId,
          folder: "General",
          title,
          filename: file.name,
          description: "",
          charger_models: [],
          issue_types: [],
          service_categories: [],
          priority: [],
          estimated_time: "",
          required_parts: [],
        });
        if (!ok) continue;

        // Find the newly created entry (reload happened in addEntry)
        // We need to get its ID to upload the file — use the latest entries
        // Since addEntry reloads, we query directly
        const { data: newEntries } = await (await import("@/integrations/supabase/client")).supabase
          .from("swi_catalog_entries")
          .select("id")
          .eq("oem_id", oemId)
          .eq("filename", file.name)
          .order("created_at", { ascending: false })
          .limit(1);

        if (newEntries && newEntries.length > 0) {
          await uploadSWIDocument(newEntries[0].id, file);
          setUploadedIds(prev => new Set([...prev, newEntries[0].id]));
        }
        uploaded++;
      } catch (err: any) {
        console.error(`Failed to upload ${file.name}:`, err);
        toast.error(`Failed: ${file.name}`);
      } finally {
        setUploadingFiles(prev => { const next = new Set(prev); next.delete(tempId); return next; });
      }
    }
    if (uploaded > 0) toast.success(`Uploaded ${uploaded} SWI${uploaded > 1 ? "s" : ""}`);
  }, [addEntry]);

  const handleDrop = useCallback((e: React.DragEvent, oemId: string) => {
    e.preventDefault(); e.stopPropagation(); setDraggingOver(null);
    handleUploadSWIs(e.dataTransfer.files, oemId);
  }, [handleUploadSWIs]);

  const handleDeleteSWI = async (entry: SWICatalogEntry) => {
    const ok = await confirmDialog({
      title: "Delete SWI?",
      description: `Delete SWI "${entry.title}"? This cannot be undone.`,
      confirmLabel: "Delete SWI",
    });
    if (!ok) return;
    try {
      await deleteSWIDocument(entry.id);
      setUploadedIds(prev => { const next = new Set(prev); next.delete(entry.id); return next; });
    } catch {}
    await deleteEntry(entry.id);
  };

  const handleStartRename = (entry: SWICatalogEntry) => {
    setEditingEntry(entry.id);
    setEditTitle(entry.title);
  };

  const handleSaveRename = async (id: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) { toast.error("Title cannot be empty"); return; }
    await updateEntry(id, { title: trimmed });
    setEditingEntry(null);
    toast.success("Renamed");
  };

  // Group entries by OEM then folder
  const getOemFolders = (oemId: string) => {
    const q = search.toLowerCase();
    const oemEntries = entries.filter(e => {
      if (e.oem_id !== oemId) return false;
      if (!q) return true;
      return e.title.toLowerCase().includes(q) || e.filename.toLowerCase().includes(q);
    });
    const folders: Record<string, SWICatalogEntry[]> = {};
    for (const entry of oemEntries) {
      const f = entry.folder || "General";
      if (!folders[f]) folders[f] = [];
      folders[f].push(entry);
    }
    return folders;
  };

  const sortedOems = useMemo(() =>
    [...oems].sort((a, b) => a.sort_order - b.sort_order),
    [oems]
  );

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
            <FileText className="h-5 w-5" />
            SWI Document Library
          </CardTitle>
          <CardDescription>
            Create OEM sections, then upload SWI documents directly into each one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Search */}
          {entries.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search SWI documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          )}

          {/* OEM Sections */}
          {oems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Box className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No OEMs added yet. Add your first OEM above.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedOems.map((oem) => {
                const folders = getOemFolders(oem.id);
                const totalEntries = Object.values(folders).flat().length;
                const isDropTarget = draggingOver === oem.id;
                const showUploadZone = uploadingOem === oem.id;

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
                          onClick={() => setUploadingOem(uploadingOem === oem.id ? null : oem.id)}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Upload SWI
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

                    {/* Upload zone (shown when toggled) */}
                    {showUploadZone && (
                      <div
                        className={`m-3 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          isDropTarget ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/40"
                        }`}
                        onDrop={(e) => handleDrop(e, oem.id)}
                        onDragOver={(e) => { e.preventDefault(); setDraggingOver(oem.id); }}
                        onDragLeave={(e) => { e.preventDefault(); setDraggingOver(null); }}
                      >
                        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Drag & drop SWI PDFs for {oem.name}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mb-3">
                          The filename will be used as the SWI title
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRefs.current[oem.id]?.click()}
                          className="gap-1.5"
                        >
                          <Upload className="h-3.5 w-3.5" /> Browse Files
                        </Button>
                        <input
                          ref={(el) => { fileInputRefs.current[oem.id] = el; }}
                          type="file"
                          accept=".pdf"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) handleUploadSWIs(e.target.files, oem.id);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    )}

                    {/* SWI Entries */}
                    {totalEntries > 0 ? (
                      <div className="p-3">
                        <Accordion type="multiple" className="space-y-1.5">
                          {Object.keys(folders).sort().map((folder) => (
                            <AccordionItem key={folder} value={folder} className="border rounded-lg overflow-hidden">
                              <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                                <div className="flex items-center gap-3 flex-1">
                                  <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-semibold text-sm">{folder}</span>
                                  <Badge variant="outline" className="text-xs">{folders[folder].length}</Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-0 pb-0">
                                <div className="divide-y">
                                  {folders[folder].map((entry) => {
                                    const hasFile = uploadedIds.has(entry.id);
                                    const isEditing = editingEntry === entry.id;

                                    return (
                                      <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                                        <div className="flex-shrink-0">
                                          {hasFile ? (
                                            <Check className="h-4 w-4 text-optimal" />
                                          ) : (
                                            <FileText className="h-4 w-4 text-muted-foreground/40" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          {isEditing ? (
                                            <div className="flex items-center gap-2">
                                              <Input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                className="h-7 text-sm"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") handleSaveRename(entry.id);
                                                  if (e.key === "Escape") setEditingEntry(null);
                                                }}
                                              />
                                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSaveRename(entry.id)}>
                                                <Check className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingEntry(null)}>
                                                <X className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <>
                                              <p className="text-sm font-medium truncate">{entry.title}</p>
                                              <p className="text-xs text-muted-foreground truncate">{entry.filename}</p>
                                            </>
                                          )}
                                        </div>
                                        {!isEditing && (
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            {hasFile && (
                                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewEntry(entry)} title="Preview">
                                                <Eye className="h-3.5 w-3.5" />
                                              </Button>
                                            )}
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleStartRename(entry)} title="Rename">
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteSWI(entry)} title="Delete">
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    ) : !showUploadZone ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        No SWIs yet. Click "Upload SWI" to add documents.
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {previewEntry && (
        <SWIPreviewDialog
          open={!!previewEntry}
          onOpenChange={(open) => !open && setPreviewEntry(null)}
          fileUrl={getSWIPublicUrl(`${previewEntry.id}.pdf`)}
          title={previewEntry.title}
          filename={previewEntry.filename}
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </>
  );
}
