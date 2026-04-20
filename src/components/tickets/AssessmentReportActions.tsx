import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServiceTicket } from "@/types/serviceTicket";
import { downloadAssessmentReport, getAssessmentReportBlob, generateAssessmentReportPDF } from "@/lib/assessmentReportPdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Eye, Send, Loader2, FileText, CheckCircle2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useTicketLifecycle,
  rpcMarkAssessmentSent,
  rpcResendAssessment,
  canOverrideTicketLifecycle,
} from "@/hooks/useTicketLifecycle";

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
        const viewport = page.getViewport({ scale: 1.5 });
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
    render().catch((err) => { console.error("PDF render error:", err); setLoading(false); });
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
  const { role } = useUserRole();
  const canResend = canOverrideTicketLifecycle(role);

  const { row: lifecycle, refetch } = useTicketLifecycle(ticket.id);
  const alreadySent = !!lifecycle?.sent_to_customer_at;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState(ticket.customer.email);
  const [sending, setSending] = useState(false);

  const [resendOpen, setResendOpen] = useState(false);
  const [resendNote, setResendNote] = useState("");
  const [resendEmail, setResendEmail] = useState(ticket.customer.email);
  const [resending, setResending] = useState(false);

  const handlePreview = () => {
    const doc = generateAssessmentReportPDF(ticket);
    setPdfData(doc.output("arraybuffer"));
    setPreviewOpen(true);
  };
  const handleClosePreview = (open: boolean) => { if (!open) setPdfData(null); setPreviewOpen(open); };
  const handleDownload = () => { downloadAssessmentReport(ticket); toast.success("Assessment report downloaded"); };

  async function pdfToBase64(): Promise<string> {
    const blob = getAssessmentReportBlob(ticket);
    const reader = new FileReader();
    return new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function emailReport(to: string) {
    const base64 = await pdfToBase64();
    const { error } = await supabase.functions.invoke("send-assessment-report", {
      body: {
        to,
        ticketId: ticket.ticketId,
        customerName: ticket.customer.name,
        customerCompany: ticket.customer.company,
        pdfBase64: base64,
      },
    });
    if (error) throw error;
  }

  const handleSend = async () => {
    if (!sendEmail.trim()) { toast.error("Please enter an email address"); return; }
    setSending(true);
    try {
      // Reserve the send first — RPC will throw if already sent (race protection)
      await rpcMarkAssessmentSent(ticket.id, sendEmail.trim());
      try {
        await emailReport(sendEmail.trim());
        toast.success(`Assessment report sent to ${sendEmail}`);
        setSendOpen(false);
        await refetch();
      } catch (mailErr: any) {
        // Email failed after we marked sent — surface clearly
        toast.error(`Marked as sent, but email failed: ${mailErr.message || "Unknown"}. Use Resend to retry.`);
        await refetch();
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Already sent")) {
        toast.error("This report was already sent. Refreshing...");
        await refetch();
      } else {
        toast.error(`Failed to send: ${msg || "Unknown error"}`);
      }
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (!resendNote.trim()) { toast.error("Please explain why you're resending"); return; }
    if (!resendEmail.trim()) { toast.error("Please enter an email address"); return; }
    setResending(true);
    try {
      await rpcResendAssessment(ticket.id, resendEmail.trim(), resendNote.trim());
      try {
        await emailReport(resendEmail.trim());
        toast.success(`Assessment report resent to ${resendEmail}`);
        setResendOpen(false);
        setResendNote("");
        await refetch();
      } catch (mailErr: any) {
        toast.error(`Resend logged but email delivery failed: ${mailErr.message || "Unknown"}`);
        await refetch();
      }
    } catch (err: any) {
      toast.error(err.message || "Resend failed");
    } finally {
      setResending(false);
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
          {!alreadySent && (
            <Button size="sm" className="text-xs h-7 gap-1.5" onClick={() => setSendOpen(true)}>
              <Send className="h-3 w-3" /> Send to Customer
            </Button>
          )}
        </div>

        {alreadySent && lifecycle && (
          <div className="mt-3 rounded-md border border-optimal/30 bg-optimal/5 px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-optimal flex-shrink-0" />
              <span className="text-foreground">
                Sent to <span className="font-medium">{lifecycle.sent_to_customer_email}</span>
                {" on "}
                <span className="font-medium">{format(new Date(lifecycle.sent_to_customer_at!), "MMM d, yyyy h:mm a")}</span>
              </span>
            </div>
            {canResend && (
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setResendOpen(true)}>
                <RefreshCw className="h-3 w-3" /> Resend
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
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
          <DialogHeader><DialogTitle>Send Assessment Report</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="report-email">Recipient Email</Label>
              <Input id="report-email" type="email" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} placeholder="customer@example.com" />
            </div>
            <p className="text-xs text-muted-foreground">
              The assessment report PDF for ticket {ticket.ticketId} will be attached. This send is permanent — only an admin or manager can resend.
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

      {/* Resend Dialog */}
      <AlertDialog open={resendOpen} onOpenChange={setResendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Assessment Report?</AlertDialogTitle>
            <AlertDialogDescription>
              {lifecycle?.sent_to_customer_at && (
                <>This assessment was already sent to <strong>{lifecycle.sent_to_customer_email}</strong> on{" "}
                <strong>{format(new Date(lifecycle.sent_to_customer_at), "MMM d, yyyy h:mm a")}</strong>. Resend anyway?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="resend-email" className="text-xs">Recipient Email</Label>
              <Input id="resend-email" type="email" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="resend-note" className="text-xs">Why are you resending? (required)</Label>
              <Textarea id="resend-note" value={resendNote} onChange={(e) => setResendNote(e.target.value)} placeholder="Customer requested a copy..." className="min-h-[70px] text-sm" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResend} disabled={resending}>
              {resending ? "Resending..." : "Confirm Resend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
