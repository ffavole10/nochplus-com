import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServiceTicket } from "@/types/serviceTicket";
import { AssessmentReport } from "./AssessmentReport";
import { buildReportDataFromTicket } from "./AssessmentReportData";
import { generateAssessmentReportPDF, downloadAssessmentReport, getAssessmentReportBlob } from "@/lib/assessmentReportPdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Send, Printer, Loader2, Copy, FileText } from "lucide-react";

interface AssessmentReportTabProps {
  ticket: ServiceTicket;
}

export function AssessmentReportTab({ ticket }: AssessmentReportTabProps) {
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState(ticket.customer.email);
  const [sending, setSending] = useState(false);

  const reportData = buildReportDataFromTicket(ticket);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadAssessmentReport(ticket);
    toast.success("Assessment report downloaded");
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/assessment/${reportData.assessmentId}`;
    navigator.clipboard.writeText(url);
    toast.success("Assessment link copied to clipboard");
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
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5" /> Print Report
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5" /> Download PDF
        </Button>
        <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => setSendOpen(true)}>
          <Send className="h-3.5 w-3.5" /> Email to Customer
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-8 gap-1.5" onClick={handleCopyLink}>
          <Copy className="h-3.5 w-3.5" /> Copy Link
        </Button>
      </div>

      {/* Full Report Inline */}
      <AssessmentReport data={reportData} />

      {/* Send Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Assessment Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="report-email-tab">Recipient Email</Label>
              <Input
                id="report-email-tab"
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The AutoHeal™ assessment report for {ticket.ticketId} will be attached as a PDF.
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
    </div>
  );
}
