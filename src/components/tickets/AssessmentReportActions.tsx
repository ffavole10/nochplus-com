import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServiceTicket } from "@/types/serviceTicket";
import { downloadAssessmentReport, getAssessmentReportBlob, generateAssessmentReportPDF } from "@/lib/assessmentReportPdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Eye, Send, Loader2, FileText } from "lucide-react";

interface AssessmentReportActionsProps {
  ticket: ServiceTicket;
}

function PdfCanvasPreview({ pdfData }: { pdfData: ArrayBuffer }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      if (cancelled || !containerRef.current) return;

      containerRef.current.innerHTML = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.style.marginBottom = "8px";
        canvas.style.borderRadius = "4px";
        canvas.style.border = "1px solid hsl(var(--border))";

        containerRef.current.appendChild(canvas);

        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      }

      setLoading(false);
    }

    render().catch((err) => {
      console.error("PDF render error:", err);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [pdfData]);

  return (
    <div>
      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Rendering PDF...</span>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}

export function AssessmentReportActions({ ticket }: AssessmentReportActionsProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState(ticket.customer.email);
  const [sending, setSending] = useState(false);

  const handlePreview = () => {
    const doc = generateAssessmentReportPDF(ticket);
    const arrayBuf = doc.output("arraybuffer");
    setPdfData(arrayBuf);
    setPreviewOpen(true);
  };

  const handleClosePreview = (open: boolean) => {
    if (!open) setPdfData(null);
    setPreviewOpen(open);
  };

  const handleDownload = () => {
    downloadAssessmentReport(ticket);
    toast.success("Assessment report downloaded");
  };

  const handleSend = async () => {
    if (!sendEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    setSending(true);
    try {
      const blob = getAssessmentReportBlob(ticket);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const { error } = await supabase.functions.invoke("send-assessment-report", {
        body: {
          to: sendEmail.trim(),
          ticketId: ticket.ticketId,
          customerName: ticket.customer.name,
          customerCompany: ticket.customer.company,
          pdfBase64: base64,
        },
      });

      if (error) throw error;
      toast.success(`Assessment report sent to ${sendEmail}`);
      setSendOpen(false);
    } catch (err: any) {
      console.error("Send report error:", err);
      toast.error(`Failed to send: ${err.message || "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="border-t pt-3">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2 uppercase tracking-wide">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Assessment Report
        </h4>
        <p className="text-xs text-muted-foreground mb-2">
          Generated report with assessment data, SWI match, and recommendations.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={handlePreview}>
            <Eye className="h-3 w-3" /> Preview
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={handleDownload}>
            <Download className="h-3 w-3" /> Download
          </Button>
          <Button size="sm" className="text-xs h-7 gap-1.5" onClick={() => setSendOpen(true)}>
            <Send className="h-3 w-3" /> Send to Customer
          </Button>
        </div>
      </div>

      {/* Preview Dialog — renders PDF pages as canvas */}
      <Dialog open={previewOpen} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between">
            <DialogTitle>Assessment Report — {ticket.ticketId}</DialogTitle>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleDownload}>
              <Download className="h-3 w-3" /> Download
            </Button>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {pdfData && <PdfCanvasPreview pdfData={pdfData} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Assessment Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="report-email">Recipient Email</Label>
              <Input
                id="report-email"
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The assessment report PDF for ticket {ticket.ticketId} will be attached to the email.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSendOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSend} disabled={sending} className="gap-1.5">
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {sending ? "Sending..." : "Send Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
