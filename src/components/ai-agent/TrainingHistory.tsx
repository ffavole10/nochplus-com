import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Check, X, Loader2, Eye, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface UploadRecord {
  id: string;
  filename: string;
  file_type: string;
  file_size_kb: number;
  status: string;
  quality_score: number | null;
  records_extracted: number | null;
  patterns_added: number | null;
  uploaded_by: string;
  uploaded_at: string;
  error_message: string | null;
  notes: string | null;
}

const PAGE_SIZE = 20;

function formatSize(kb: number) {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    PDF: "bg-blue-100 text-blue-700 border-blue-200",
    CSV: "bg-emerald-100 text-emerald-700 border-emerald-200",
    JSON: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return <Badge variant="outline" className={`text-xs ${colors[type] || ""}`}>{type}</Badge>;
}

function QualityBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>;
  if (score >= 80) return <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">High Quality</Badge>;
  if (score >= 50) return <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">Medium Quality</Badge>;
  return <Badge variant="outline" className="text-xs text-red-600 border-red-200">Low Quality</Badge>;
}

function StatusCell({ status }: { status: string }) {
  switch (status) {
    case "processing":
      return <span className="flex items-center gap-1.5 text-xs text-teal-600"><Loader2 className="h-3 w-3 animate-spin" />Processing</span>;
    case "completed":
      return <span className="flex items-center gap-1.5 text-xs text-emerald-600"><Check className="h-3 w-3" />Completed</span>;
    case "failed":
      return <span className="flex items-center gap-1.5 text-xs text-red-600"><X className="h-3 w-3" />Failed</span>;
    case "skipped":
      return <span className="text-xs text-muted-foreground">Skipped (duplicate)</span>;
    default:
      return <span className="text-xs text-muted-foreground">{status}</span>;
  }
}

export function TrainingHistory() {
  const [records, setRecords] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<UploadRecord | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { count } = await supabase
      .from("deep_learning_uploads" as any)
      .select("id", { count: "exact", head: true });

    setTotal(count ?? 0);

    const { data, error } = await supabase
      .from("deep_learning_uploads" as any)
      .select("*")
      .order("uploaded_at", { ascending: false })
      .range(from, to);

    if (!error && data) setRecords(data as unknown as UploadRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [page]);

  const { confirm: confirmDialog, dialogProps } = useConfirmDialog();

  const handleDelete = async (id: string, filename: string) => {
    const ok = await confirmDialog({
      title: "Delete Training Record?",
      description: `Delete "${filename}" from the training log? This does not remove learned patterns.`,
      confirmLabel: "Delete Record",
    });
    if (!ok) return;
    const { error } = await supabase.from("deep_learning_uploads" as any).delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Record removed");
      fetchRecords();
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Training History</h2>
        <p className="text-sm text-muted-foreground">
          All field reports uploaded to train Neural OS's diagnostic engine.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No training files uploaded yet.</p>
              <p className="text-xs text-muted-foreground">Upload field reports above to begin training.</p>
            </div>
          ) : (
            <>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Patterns</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">{r.filename}</TableCell>
                        <TableCell><TypeBadge type={r.file_type} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatSize(r.file_size_kb)}</TableCell>
                        <TableCell><QualityBadge score={r.quality_score} /></TableCell>
                        <TableCell className="text-xs">{r.records_extracted ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.patterns_added ?? "—"}</TableCell>
                        <TableCell><StatusCell status={r.status} /></TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(r.uploaded_at), { addSuffix: true })}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[120px]">{r.uploaded_by}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetail(r)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id, r.filename)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">{total} total records</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
                    <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={() => setDetail(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{detail?.filename}</SheetTitle>
            <SheetDescription>Upload details and processing results</SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">File Type</p>
                  <p className="font-medium">{detail.file_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Size</p>
                  <p className="font-medium">{formatSize(detail.file_size_kb)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusCell status={detail.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quality Score</p>
                  <p className="font-medium">{detail.quality_score != null ? `${detail.quality_score}/100` : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Records Extracted</p>
                  <p className="font-medium">{detail.records_extracted ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Patterns Added</p>
                  <p className="font-medium">{detail.patterns_added ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uploaded By</p>
                  <p className="font-medium">{detail.uploaded_by}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uploaded At</p>
                  <p className="font-medium">{new Date(detail.uploaded_at).toLocaleString()}</p>
                </div>
              </div>
              {detail.error_message && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Error Message</p>
                  <p className="text-sm text-red-600 bg-red-50 rounded p-2">{detail.error_message}</p>
                </div>
              )}
              {detail.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{detail.notes}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
    <ConfirmDialog {...dialogProps} />
    </>
  );
}
