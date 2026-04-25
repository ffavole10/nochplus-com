import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SowViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storagePath: string | null;
  filename: string | null;
}

export default function SowViewerDialog({
  open,
  onOpenChange,
  storagePath,
  filename,
}: SowViewerDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    if (!open || !storagePath) {
      setSignedUrl(null);
      setPdfBlobUrl(null);
      setRenderError(false);
      return;
    }
    let cancelled = false;
    let createdBlobUrl: string | null = null;
    (async () => {
      setLoading(true);
      setRenderError(false);
      const { data, error } = await supabase.storage
        .from("field-capture-docs")
        .createSignedUrl(storagePath, 3600);
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setLoading(false);
        toast.error("Could not load document");
        onOpenChange(false);
        return;
      }
      setSignedUrl(data.signedUrl);

      // Fetch as blob and create object URL — browsers render same-origin
      // blob: URLs reliably, bypassing Chrome's block on cross-origin PDFs.
      try {
        const res = await fetch(data.signedUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        createdBlobUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(createdBlobUrl);
      } catch (e) {
        if (!cancelled) setRenderError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [open, storagePath, onOpenChange]);

  const displayName = filename || "Scope of Work";
  const iframeSrc = pdfBlobUrl || signedUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[98vw] h-[95vh] sm:h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="h-5 w-5 text-fc-primary flex-shrink-0" />
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base truncate">
                  Scope of Work
                </DialogTitle>
                <p className="text-[11px] text-fc-muted truncate">{displayName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {signedUrl && (
                <>
                  <Button asChild variant="outline" size="sm" className="gap-1.5 h-8">
                    <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Open</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-1.5 h-8">
                    <a href={pdfBlobUrl || signedUrl} download={displayName}>
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-fc-bg">
          {loading && (
            <div className="h-full flex items-center justify-center text-fc-muted text-sm">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading document…
            </div>
          )}
          {!loading && renderError && signedUrl && (
            <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertCircle className="h-10 w-10 text-fc-muted" />
              <p className="text-sm text-fc-text font-medium">
                Inline preview unavailable
              </p>
              <p className="text-xs text-fc-muted max-w-sm">
                Your browser blocked the inline PDF preview. Open in a new tab or
                download to view.
              </p>
              <div className="flex gap-2 mt-2">
                <Button asChild size="sm" variant="default">
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Open in new tab
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={signedUrl} download={displayName}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          )}
          {!loading && !renderError && iframeSrc && (
            <iframe
              src={iframeSrc}
              className="w-full h-full border-0"
              title={`SOW: ${displayName}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
