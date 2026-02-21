import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, FileText } from "lucide-react";

interface SWIPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  title: string;
  filename: string;
}

export function SWIPreviewDialog({ open, onOpenChange, fileUrl, title, filename }: SWIPreviewDialogProps) {
  if (!fileUrl) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = filename || "swi-document.pdf";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <DialogTitle className="text-base truncate">{title}</DialogTitle>
                <p className="text-xs text-muted-foreground truncate">{filename}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={`SWI Preview: ${title}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
