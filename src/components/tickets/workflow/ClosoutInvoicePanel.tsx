import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Upload, FileText, RefreshCw, CheckCircle2, AlertTriangle, OctagonAlert, Loader2, Lock, Slash } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ServiceTicket } from "@/types/serviceTicket";
import type { RelatedWorkOrder } from "@/hooks/useEntityRelations";
import { WorkflowStepStatus, WorkflowStepState } from "@/lib/ticketWorkflow";
import { NeuralOsInvoiceModal } from "./NeuralOsInvoiceModal";
import { ManualInvoiceUploadModal } from "./ManualInvoiceUploadModal";

interface ClosoutInvoicePanelProps {
  ticket: ServiceTicket;
  step: WorkflowStepStatus;
  workOrders: RelatedWorkOrder[];
}

export interface TicketInvoice {
  id: string;
  ticket_text_id: string;
  invoice_number: string;
  total_amount: number | null;
  invoice_date: string | null;
  source: "neural_os" | "uploaded";
  source_label: string | null;
  status: "draft" | "attached";
  pdf_path: string | null;
  created_at: string;
}

const STATE_BADGE: Record<WorkflowStepState, { label: string; className: string; Icon: any }> = {
  active: { label: "Active", className: "bg-primary/15 text-primary border-primary/30", Icon: Loader2 },
  completed: { label: "Completed", className: "bg-optimal/15 text-optimal border-optimal/30", Icon: CheckCircle2 },
  locked: { label: "Locked", className: "bg-muted text-muted-foreground border-border", Icon: Lock },
  skipped: { label: "Skipped", className: "bg-muted text-muted-foreground border-border", Icon: Slash },
  blocked: { label: "Blocked", className: "bg-medium/15 text-medium border-medium/30", Icon: AlertTriangle },
  failed: { label: "Escalated", className: "bg-critical/15 text-critical border-critical/30", Icon: OctagonAlert },
};

export function ClosoutInvoicePanel({ ticket, step, workOrders }: ClosoutInvoicePanelProps) {
  const [invoice, setInvoice] = useState<TicketInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [neuralModalOpen, setNeuralModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const meta = STATE_BADGE[step.state];
  const StateIcon = meta.Icon;

  // Latest work order (used for line item seeds + field report status)
  const latestWO = useMemo(
    () =>
      [...workOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0],
    [workOrders],
  );

  const refreshInvoice = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ticket_invoices" as any)
      .select("*")
      .eq("ticket_text_id", ticket.ticketId)
      .order("created_at", { ascending: false })
      .limit(1);
    setInvoice(((data as any[]) ?? [])[0] ?? null);
    setLoading(false);
  };

  useEffect(() => {
    refreshInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.ticketId]);

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    setPendingFile(file);
    setUploadModalOpen(true);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">
            Step {step.def.number} · {step.def.label}
          </h3>
          <Badge variant="outline" className={cn("gap-1.5 text-xs", meta.className)}>
            <StateIcon className={cn("h-3 w-3", step.state === "active" && "animate-spin")} />
            {meta.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Submit field report and finalize invoice to close this ticket.
        </p>
      </div>

      {/* Sub-section 1: Field Report */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Field Report
        </h4>
        <Card className="border-dashed">
          <CardContent className="p-5 text-center">
            <p className="text-sm font-medium text-foreground">
              Field report not submitted
            </p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting field execution</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-section 2: Invoice (dual-path or attached state) */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Invoice
        </h4>

        {loading ? (
          <Card>
            <CardContent className="p-5 text-center text-xs text-muted-foreground">
              Loading invoice…
            </CardContent>
          </Card>
        ) : invoice ? (
          <AttachedInvoiceCard
            invoice={invoice}
            onReplace={() => setInvoice(null)}
          />
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Choose how to create the invoice for this ticket.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {/* Card 1 — Neural OS */}
              <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-teal-600" />
                    </div>
                    <h5 className="text-sm font-semibold text-foreground">
                      Create with Neural OS
                    </h5>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-generate invoice from labor hours, parts used, travel, and rate card.
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal lowercase bg-teal-500/5 text-teal-600 border-teal-500/20 gap-1"
                  >
                    <Brain className="h-2.5 w-2.5" />
                    neural os · resolution layer
                  </Badge>
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => setNeuralModalOpen(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate Draft
                  </Button>
                </CardContent>
              </Card>

              {/* Card 2 — Upload Invoice */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Upload className="h-4 w-4 text-foreground" />
                    </div>
                    <h5 className="text-sm font-semibold text-foreground">Upload Invoice</h5>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Drag in a PDF from QuickBooks or other source. Metadata captured for reconciliation.
                  </p>
                  <div
                    onDrop={onDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="border border-dashed border-border rounded-md p-4 text-center text-xs text-muted-foreground"
                  >
                    Drag PDF here
                  </div>
                  <label className="block">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelect(f);
                        e.target.value = "";
                      }}
                    />
                    <Button asChild size="sm" variant="outline" className="w-full gap-1.5 cursor-pointer">
                      <span>
                        <Upload className="h-3.5 w-3.5" />
                        Browse files
                      </span>
                    </Button>
                  </label>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {neuralModalOpen && (
        <NeuralOsInvoiceModal
          open={neuralModalOpen}
          onOpenChange={setNeuralModalOpen}
          ticket={ticket}
          workOrder={latestWO}
          onAttached={() => {
            setNeuralModalOpen(false);
            refreshInvoice();
          }}
        />
      )}

      {uploadModalOpen && pendingFile && (
        <ManualInvoiceUploadModal
          open={uploadModalOpen}
          onOpenChange={(o) => {
            setUploadModalOpen(o);
            if (!o) setPendingFile(null);
          }}
          ticket={ticket}
          file={pendingFile}
          onAttached={() => {
            setUploadModalOpen(false);
            setPendingFile(null);
            refreshInvoice();
          }}
        />
      )}
    </div>
  );
}

function AttachedInvoiceCard({
  invoice,
  onReplace,
}: {
  invoice: TicketInvoice;
  onReplace: () => void;
}) {
  const sourceLabel =
    invoice.source === "neural_os"
      ? "Neural OS"
      : invoice.source_label
      ? `Uploaded · ${invoice.source_label}`
      : "Uploaded";

  return (
    <Card className="border-optimal/30 bg-optimal/5">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-optimal/15 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-optimal" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {invoice.status === "draft" ? "Draft pending confirmation" : "Invoice attached"}
              </p>
              <p className="text-xs text-muted-foreground">
                {invoice.invoice_number}
                {invoice.total_amount != null && (
                  <>
                    {" · "}
                    ${Number(invoice.total_amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </>
                )}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {sourceLabel}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span>
            Attached {format(new Date(invoice.created_at), "MMM d, yyyy")}
          </span>
          <button
            type="button"
            onClick={onReplace}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            Replace invoice
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
