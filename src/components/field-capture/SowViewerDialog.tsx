import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, ExternalLink, Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !storagePath) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from("field-capture-docs")
        .createSignedUrl(storagePath, 3600);
      if (cancelled) return;
      setLoading(false);
      if (error || !data?.signedUrl) {
        toast.error("Could not load document");
        onOpenChange(false);
        return;
      }
      setSignedUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, storagePath, onOpenChange]);

  const displayName = filename || "Scope of Work";

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
                    <a href={signedUrl} download={displayName}>
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
          {!loading && signedUrl && (
            <iframe
              src={signedUrl}
              className="w-full h-full border-0"
              title={`SOW: ${displayName}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
