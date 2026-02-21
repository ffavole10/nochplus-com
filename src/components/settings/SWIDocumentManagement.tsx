import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Trash2, Check, Search, Eye, Upload, FolderOpen, Box } from "lucide-react";
import { toast } from "sonner";
import { SWI_CATALOG, getSWIOem, type SWIDocument } from "@/data/swiCatalog";
import { uploadSWIDocument, listSWIDocuments, deleteSWIDocument, getSWIPublicUrl } from "@/lib/swiStorage";
import { SWIPreviewDialog } from "@/components/tickets/SWIPreviewDialog";
import { useSWIOems, useSWICatalogEntries } from "@/hooks/useSWICatalogDB";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const FOLDER_ORDER = [
  "Common", "Level 2", "Gen 2 Split System", "Gen 2 Split System (HPDC)",
  "100kW AIO", "50kW Slim", "50kW Regular", "180kW AiO", "360kW Tower",
  "Gen4 Public/EA", "Gen4 EA Dispenser (G4HP)", "Volta",
];

// Unified SWI item shape for rendering
interface UnifiedSWI {
  id: string;
  title: string;
  filename: string;
  folder: string;
  oem: string;
}

export function SWIDocumentManagement() {
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [previewDoc, setPreviewDoc] = useState<UnifiedSWI | null>(null);
  const [draggingOver, setDraggingOver] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { oems } = useSWIOems();
  const { entries: dbEntries } = useSWICatalogEntries();

  useEffect(() => { loadUploaded(); }, []);

  const loadUploaded = async () => {
    try {
      const files = await listSWIDocuments();
      const ids = new Set(files.map((f) => f.replace(/\.[^.]+$/, "")));
      setUploadedFiles(ids);
    } catch (err) {
      console.error("Failed to load SWI files:", err);
    }
  };

  // Build unified list: hardcoded + DB entries
  const allSWIs: UnifiedSWI[] = useMemo(() => {
    const hardcoded: UnifiedSWI[] = SWI_CATALOG.map(s => ({
      id: s.id, title: s.title, filename: s.filename, folder: s.folder, oem: getSWIOem(s),
    }));

    const oemMap = Object.fromEntries(oems.map(o => [o.id, o.name]));
    const fromDb: UnifiedSWI[] = dbEntries.map(e => ({
      id: e.id, title: e.title, filename: e.filename, folder: e.folder, oem: oemMap[e.oem_id] || "Unknown",
    }));

    return [...hardcoded, ...fromDb];
  }, [oems, dbEntries]);

  // Group by OEM -> folder
  const groupedByOem = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = allSWIs.filter((s) => {
      if (!q) return true;
      return s.title.toLowerCase().includes(q) || s.filename.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    });

    const oemMap: Record<string, Record<string, UnifiedSWI[]>> = {};
    for (const swi of filtered) {
      if (!oemMap[swi.oem]) oemMap[swi.oem] = {};
      const folder = swi.folder || "Other";
      if (!oemMap[swi.oem][folder]) oemMap[swi.oem][folder] = [];
      oemMap[swi.oem][folder].push(swi);
    }
    return oemMap;
  }, [allSWIs, search]);

  // Sorted OEM names (hardcoded first, then DB OEMs)
  const sortedOemNames = useMemo(() => {
    const names = Object.keys(groupedByOem);
    return names.sort((a, b) => {
      if (a === "BTC Power") return -1;
      if (b === "BTC Power") return 1;
      return a.localeCompare(b);
    });
  }, [groupedByOem]);

  const sortFolders = (folders: string[]) =>
    [...folders].sort((a, b) => {
      const ia = FOLDER_ORDER.indexOf(a);
      const ib = FOLDER_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

  const matchFileToSWI = (filename: string): UnifiedSWI | undefined => {
    const cleanName = filename.replace(/\.[^.]+$/, "").toLowerCase();
    let match = allSWIs.find(s => s.filename.replace(/\.[^.]+$/, "").toLowerCase() === cleanName);
    if (match) return match;
    const idPattern = cleanName.replace(/[\s-]/g, "_");
    match = allSWIs.find(s => idPattern.includes(s.id));
    if (match) return match;
    match = allSWIs.find(s => cleanName.includes(s.title.toLowerCase().replace(/[^a-z0-9]/g, "")));
    return match;
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (pdfFiles.length === 0) { toast.error("Only PDF files are accepted"); return; }

    let uploaded = 0;
    let unmatched: string[] = [];

    for (const file of pdfFiles) {
      const swiDoc = matchFileToSWI(file.name);
      if (!swiDoc) { unmatched.push(file.name); continue; }

      setUploading(prev => new Set([...prev, swiDoc.id]));
      try {
        await uploadSWIDocument(swiDoc.id, file);
        setUploadedFiles(prev => new Set([...prev, swiDoc.id]));
        uploaded++;
      } catch (err: any) {
        console.error(`Failed to upload ${file.name}:`, err);
      } finally {
        setUploading(prev => { const next = new Set(prev); next.delete(swiDoc.id); return next; });
      }
    }

    if (uploaded > 0) toast.success(`Uploaded ${uploaded} SWI document${uploaded > 1 ? "s" : ""}`);
    if (unmatched.length > 0) {
      toast.error(`${unmatched.length} file${unmatched.length > 1 ? "s" : ""} couldn't be matched: ${unmatched.slice(0, 3).join(", ")}${unmatched.length > 3 ? "..." : ""}`);
    }
  }, [allSWIs]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDraggingOver(null);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent, zone: string) => {
    e.preventDefault(); e.stopPropagation(); setDraggingOver(zone);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDraggingOver(null);
  }, []);

  const handleDelete = async (swi: UnifiedSWI) => {
    if (!confirm(`Remove uploaded PDF for "${swi.title}"?`)) return;
    try {
      await deleteSWIDocument(swi.id);
      setUploadedFiles(prev => { const next = new Set(prev); next.delete(swi.id); return next; });
      toast.success("File removed");
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  const uploadedCount = allSWIs.filter(s => uploadedFiles.has(s.id)).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            SWI Document Library
          </CardTitle>
          <CardDescription>
            Drag & drop PDF files to upload. Files are auto-matched to SWI entries by filename.{" "}
            <span className="font-medium text-foreground">{uploadedCount}/{allSWIs.length}</span> uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              draggingOver === "__global" ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/40"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => handleDragOver(e, "__global")}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground mb-1">Drag & drop SWI PDFs here</p>
            <p className="text-xs text-muted-foreground/70 mb-3">
              Files will be auto-matched by filename (e.g., "SWI-COMN-016 Touch-Up Paint Application.pdf")
            </p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Browse Files
            </Button>
            <input ref={fileInputRef} type="file" accept=".pdf" multiple className="hidden"
              onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search SWI documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {/* OEM Boxes */}
          <div className="space-y-6">
            {sortedOemNames.map((oemName) => {
              const folders = groupedByOem[oemName];
              const allOemDocs = Object.values(folders).flat();
              const oemUploaded = allOemDocs.filter(s => uploadedFiles.has(s.id)).length;

              return (
                <div key={oemName} className="border rounded-xl overflow-hidden bg-card">
                  <div className="flex items-center gap-3 px-5 py-4 bg-muted/40 border-b">
                    <Box className="h-5 w-5 text-primary flex-shrink-0" />
                    <h3 className="font-bold text-base">{oemName}</h3>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {oemUploaded}/{allOemDocs.length} uploaded
                    </Badge>
                    {oemUploaded === allOemDocs.length && allOemDocs.length > 0 && (
                      <Badge className="bg-optimal/10 text-optimal border-optimal/20 text-xs gap-1">
                        <Check className="h-3 w-3" /> Complete
                      </Badge>
                    )}
                  </div>

                  <div className="p-3">
                    <Accordion type="multiple" className="space-y-1.5">
                      {sortFolders(Object.keys(folders)).map((folder) => {
                        const docs = folders[folder];
                        const folderUploaded = docs.filter(s => uploadedFiles.has(s.id)).length;

                        return (
                          <AccordionItem key={folder} value={folder} className="border rounded-lg overflow-hidden">
                            <AccordionTrigger className="px-4 py-2.5 hover:no-underline">
                              <div className="flex items-center gap-3 flex-1">
                                <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-semibold text-sm">{folder}</span>
                                <Badge variant="outline" className="text-xs">{folderUploaded}/{docs.length}</Badge>
                                {folderUploaded === docs.length && docs.length > 0 && (
                                  <Badge className="bg-optimal/10 text-optimal border-optimal/20 text-xs gap-1">
                                    <Check className="h-3 w-3" /> Complete
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-0 pb-0">
                              <div className="divide-y">
                                {docs.map((swi) => {
                                  const isUploaded = uploadedFiles.has(swi.id);
                                  const isCurrentlyUploading = uploading.has(swi.id);
                                  return (
                                    <div key={swi.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                                      <div className="flex-shrink-0">
                                        {isCurrentlyUploading ? (
                                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        ) : isUploaded ? (
                                          <Check className="h-4 w-4 text-optimal" />
                                        ) : (
                                          <FileText className="h-4 w-4 text-muted-foreground/40" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{swi.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{swi.filename}</p>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        {isUploaded && (
                                          <>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewDoc(swi)} title="Preview">
                                              <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(swi)} title="Remove">
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {previewDoc && (
        <SWIPreviewDialog
          open={!!previewDoc}
          onOpenChange={(open) => !open && setPreviewDoc(null)}
          fileUrl={getSWIPublicUrl(`${previewDoc.id}.pdf`)}
          title={previewDoc.title}
          filename={previewDoc.filename}
        />
      )}
    </>
  );
}
