import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ServiceTicket } from "@/types/serviceTicket";
import { downloadAssessmentReport, getAssessmentReportBlob, getAssessmentReportDataUri } from "@/lib/assessmentReportPdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Eye, Send, Loader2, FileText } from "lucide-react";

interface AssessmentReportActionsProps {
  ticket: ServiceTicket;
}

export function AssessmentReportActions({ ticket }: AssessmentReportActionsProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState(ticket.customer.email);
  const [sending, setSending] = useState(false);

  const handlePreview = () => {
    const dataUri = getAssessmentReportDataUri(ticket);
    setPreviewUrl(dataUri);
    setPreviewOpen(true);
  };

  const handleClosePreview = (open: boolean) => {
    if (!open) setPreviewUrl(null);
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-4xl h-[85vh]">
          <DialogHeader>
            <DialogTitle>Assessment Report — {ticket.ticketId}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe src={previewUrl} className="w-full flex-1 rounded-lg border" style={{ minHeight: "70vh" }} />
          )}
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
