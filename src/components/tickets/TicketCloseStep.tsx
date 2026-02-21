import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ServiceTicket } from "@/types/serviceTicket";
import { supabase } from "@/integrations/supabase/client";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import { Upload, FileText, CheckCircle, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TicketCloseStepProps {
  ticket: ServiceTicket;
}

export function TicketCloseStep({ ticket }: TicketCloseStepProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateTicket = useServiceTicketsStore((s) => s.updateTicket);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are accepted");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be under 20MB");
      return;
    }

    setUploading(true);
    try {
      const filePath = `${ticket.ticketId.replace(/\//g, "-")}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("field-reports")
        .upload(filePath, file, { contentType: "application/pdf" });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("field-reports")
        .getPublicUrl(filePath);

      updateTicket(ticket.id, { fieldReportUrl: urlData.publicUrl });
      toast.success("Field report uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!ticket.fieldReportUrl) return;
    setDeleting(true);
    try {
      // Extract path from URL
      const url = new URL(ticket.fieldReportUrl);
      const pathParts = url.pathname.split("/field-reports/");
      if (pathParts[1]) {
        await supabase.storage.from("field-reports").remove([decodeURIComponent(pathParts[1])]);
      }
      updateTicket(ticket.id, { fieldReportUrl: undefined });
      toast.success("Report removed");
    } catch {
      toast.error("Failed to remove report");
    } finally {
      setDeleting(false);
    }
  };

  if (ticket.fieldReportUrl) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-optimal" />
          <span className="text-xs font-medium text-foreground">Field report uploaded</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-xs text-foreground truncate flex-1">
            {ticket.ticketId}-report.pdf
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={() => window.open(ticket.fieldReportUrl, "_blank")}
          >
            <ExternalLink className="h-3 w-3" /> View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-destructive hover:text-destructive"
            onClick={handleRemove}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Upload the final field report PDF to close this ticket.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleUpload}
      />
      <Button
        size="sm"
        className="text-xs h-7 gap-1.5"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <Upload className="h-3 w-3" /> Upload Field Report
          </>
        )}
      </Button>
    </div>
  );
}
