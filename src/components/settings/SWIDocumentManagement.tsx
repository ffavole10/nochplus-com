import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Upload, Trash2, Check, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SWI_CATALOG, type SWIDocument } from "@/data/swiCatalog";
import { uploadSWIDocument, listSWIDocuments, deleteSWIDocument, getSWIPublicUrl } from "@/lib/swiStorage";
import { SWIPreviewDialog } from "@/components/tickets/SWIPreviewDialog";

export function SWIDocumentManagement() {
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [previewDoc, setPreviewDoc] = useState<SWIDocument | null>(null);

  useEffect(() => {
    loadUploaded();
  }, []);

  const loadUploaded = async () => {
    try {
      const files = await listSWIDocuments();
      const ids = new Set(files.map((f) => f.replace(/\.[^.]+$/, "")));
      setUploadedFiles(ids);
    } catch (err) {
      console.error("Failed to load SWI files:", err);
    }
  };

  const handleUpload = async (swiDoc: SWIDocument, file: File) => {
    setUploading(swiDoc.id);
    try {
      await uploadSWIDocument(swiDoc.id, file);
      setUploadedFiles((prev) => new Set([...prev, swiDoc.id]));
      toast.success(`Uploaded ${swiDoc.filename}`);
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (swiDoc: SWIDocument) => {
    if (!confirm(`Remove uploaded PDF for "${swiDoc.title}"?`)) return;
    try {
      await deleteSWIDocument(swiDoc.id);
      setUploadedFiles((prev) => {
        const next = new Set(prev);
        next.delete(swiDoc.id);
        return next;
      });
      toast.success("File removed");
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  const filtered = SWI_CATALOG.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.filename.toLowerCase().includes(q) ||
      s.folder.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  });

  const uploadedCount = SWI_CATALOG.filter((s) => uploadedFiles.has(s.id)).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            SWI Document Library
          </CardTitle>
          <CardDescription>
            Upload SWI PDFs so technicians can preview and download them directly from tickets.{" "}
            <span className="font-medium text-foreground">{uploadedCount}/{SWI_CATALOG.length}</span> uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SWI documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-muted w-10">#</TableHead>
                  <TableHead className="sticky top-0 bg-muted">SWI ID</TableHead>
                  <TableHead className="sticky top-0 bg-muted">Title</TableHead>
                  <TableHead className="sticky top-0 bg-muted">Folder</TableHead>
                  <TableHead className="sticky top-0 bg-muted">Status</TableHead>
                  <TableHead className="sticky top-0 bg-muted text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((swi, idx) => {
                  const isUploaded = uploadedFiles.has(swi.id);
                  const isCurrentlyUploading = uploading === swi.id;
                  return (
                    <TableRow key={swi.id}>
                      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{swi.id}</TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate">{swi.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{swi.folder}</Badge></TableCell>
                      <TableCell>
                        {isUploaded ? (
                          <Badge className="bg-optimal/10 text-optimal border-optimal/20 text-xs gap-1">
                            <Check className="h-3 w-3" /> Uploaded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Missing</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isUploaded && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setPreviewDoc(swi)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(swi)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button variant="outline" size="sm" asChild disabled={isCurrentlyUploading} className="h-7 text-xs">
                            <label className="cursor-pointer gap-1">
                              <Upload className="h-3 w-3" />
                              {isCurrentlyUploading ? "..." : isUploaded ? "Replace" : "Upload"}
                              <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUpload(swi, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
