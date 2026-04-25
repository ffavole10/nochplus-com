import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

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
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !storagePath) {
      setSignedUrl(null);
      setRenderError(false);
      setPageCount(0);
      if (canvasContainerRef.current) canvasContainerRef.current.innerHTML = "";
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setRenderError(false);
      setPageCount(0);
      if (canvasContainerRef.current) canvasContainerRef.current.innerHTML = "";
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

      try {
        const res = await fetch(data.signedUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const pdfData = await res.arrayBuffer();
        if (cancelled) return;
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        setPageCount(pdf.numPages);
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || !canvasContainerRef.current) return;
          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const availableWidth = Math.max(canvasContainerRef.current.clientWidth - 32, 320);
          const scale = Math.min(2, Math.max(0.75, availableWidth / baseViewport.width));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "mx-auto mb-4 block max-w-full rounded border border-fc-border bg-white shadow-sm";
          canvas.setAttribute("aria-label", `Page ${pageNumber} of ${pdf.numPages}`);
          canvasContainerRef.current.appendChild(canvas);
          const canvasContext = canvas.getContext("2d");
          if (!canvasContext) throw new Error("Canvas rendering is unavailable");
          await page.render({ canvasContext, viewport, canvas }).promise;
        }
      } catch (e) {
        if (!cancelled) {
          setRenderError(true);
          toast.error("Could not preview document");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (canvasContainerRef.current) canvasContainerRef.current.innerHTML = "";
    };
  }, [open, storagePath, onOpenChange]);

  const displayName = filename || "Scope of Work";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[98vw] h-[95vh] sm:h-[90vh] flex flex-col p-0 gap-0 hide-default-close">
        <div className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="h-5 w-5 text-fc-primary flex-shrink-0" />
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base truncate">
                  Scope of Work
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Preview the attached Scope of Work document. Use Open or Download if the preview is unavailable.
                </DialogDescription>
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
                    <a href={signedUrl} download={displayName}>
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden bg-fc-bg">
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
          {!renderError && (
            <div
              ref={canvasContainerRef}
              className="h-full overflow-auto px-3 py-4"
              aria-label={pageCount ? `PDF preview with ${pageCount} pages` : "PDF preview"}
            />
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-fc-bg text-fc-muted text-sm">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading document…
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
