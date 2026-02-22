import { useState, useMemo, useRef, useEffect } from "react";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import { ServiceTicket } from "@/types/serviceTicket";
import { generateAssessmentReportPDF, downloadAssessmentReport, getAssessmentReportBlob } from "@/lib/assessmentReportPdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Download, Eye, Send, Loader2, FileText, AlertTriangle,
  Filter, SortAsc, SortDesc, ChevronLeft, ChevronRight,
} from "lucide-react";

const ITEMS_PER_PAGE = 15;

const RISK_COLORS: Record<string, string> = {
  Critical: "bg-destructive text-destructive-foreground",
  High: "bg-orange-500 text-white",
  Medium: "bg-yellow-500 text-white",
  Low: "bg-green-600 text-white",
};

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
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
      setLoading(false);
    }
    render().catch(() => setLoading(false));
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

type SortField = "date" | "customer" | "risk" | "ticketId";
type SortDir = "asc" | "desc";

export default function NochPlusAssessments() {
  const { tickets } = useServiceTicketsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  // Preview & send state
  const [previewTicket, setPreviewTicket] = useState<ServiceTicket | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [sendTicket, setSendTicket] = useState<ServiceTicket | null>(null);
  const [sendEmail, setSendEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Only tickets with assessmentData
  const assessedTickets = useMemo(() =>
    tickets.filter(t => t.assessmentData),
    [tickets]
  );

  // Filtered & sorted
  const filtered = useMemo(() => {
    let list = assessedTickets;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.ticketId.toLowerCase().includes(q) ||
        t.customer.name.toLowerCase().includes(q) ||
        t.customer.company.toLowerCase().includes(q) ||
        t.charger.brand.toLowerCase().includes(q) ||
        t.charger.serialNumber?.toLowerCase().includes(q)
      );
    }

    if (riskFilter !== "all") {
      list = list.filter(t => t.assessmentData?.riskLevel === riskFilter);
    }

    if (sourceFilter !== "all") {
      list = list.filter(t => t.source === sourceFilter);
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "customer":
          cmp = a.customer.company.localeCompare(b.customer.company);
          break;
        case "risk": {
          const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
          cmp = (order[a.assessmentData!.riskLevel] || 4) - (order[b.assessmentData!.riskLevel] || 4);
          break;
        }
        case "ticketId":
          cmp = a.ticketId.localeCompare(b.ticketId, undefined, { numeric: true });
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [assessedTickets, searchQuery, riskFilter, sourceFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [searchQuery, riskFilter, sourceFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <SortAsc className="h-3 w-3 ml-1 inline" /> : <SortDesc className="h-3 w-3 ml-1 inline" />;
  };

  const handlePreview = (ticket: ServiceTicket) => {
    const doc = generateAssessmentReportPDF(ticket);
    setPdfData(doc.output("arraybuffer"));
    setPreviewTicket(ticket);
  };

  const handleDownload = (ticket: ServiceTicket) => {
    downloadAssessmentReport(ticket);
    toast.success("Report downloaded");
  };

  const handleOpenSend = (ticket: ServiceTicket) => {
    setSendTicket(ticket);
    setSendEmail(ticket.customer.email);
  };

  const handleSend = async () => {
    if (!sendTicket || !sendEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    setSending(true);
    try {
      const blob = getAssessmentReportBlob(sendTicket);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const { error } = await supabase.functions.invoke("send-assessment-report", {
        body: {
          to: sendEmail.trim(),
          ticketId: sendTicket.ticketId,
          customerName: sendTicket.customer.name,
          customerCompany: sendTicket.customer.company,
          pdfBase64: base64,
        },
      });

      if (error) throw error;
      toast.success(`Report sent to ${sendEmail}`);
      setSendTicket(null);
    } catch (err: any) {
      console.error("Send error:", err);
      toast.error(`Failed to send: ${err.message || "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const byRisk = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    assessedTickets.forEach(t => {
      if (t.assessmentData?.riskLevel) {
        byRisk[t.assessmentData.riskLevel as keyof typeof byRisk]++;
      }
    });
    return { total: assessedTickets.length, ...byRisk };
  }, [assessedTickets]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard for Assessments</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Reports</p>
          </CardContent>
        </Card>
        {(["Critical", "High", "Medium", "Low"] as const).map(level => (
          <Card key={level}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats[level]}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <span className={`w-2 h-2 rounded-full ${
                  level === "Critical" ? "bg-destructive" :
                  level === "High" ? "bg-orange-500" :
                  level === "Medium" ? "bg-yellow-500" : "bg-green-600"
                }`} />
                {level}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket, customer, company, brand..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="campaign">Campaign</SelectItem>
            <SelectItem value="noch_plus">Noch+</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground ml-auto">
          {filtered.length} report{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("ticketId")}>
                  Ticket <SortIcon field="ticketId" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("customer")}>
                  Customer <SortIcon field="customer" />
                </TableHead>
                <TableHead>Charger</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("risk")}>
                  Risk <SortIcon field="risk" />
                </TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("date")}>
                  Date <SortIcon field="date" />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No assessment reports found</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map(ticket => (
                  <TableRow key={ticket.id} className="group">
                    <TableCell className="font-mono text-sm font-medium">{ticket.ticketId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{ticket.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{ticket.customer.company}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{ticket.charger.brand || "—"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{ticket.charger.serialNumber || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${RISK_COLORS[ticket.assessmentData!.riskLevel]} text-xs`}>
                        {ticket.assessmentData!.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {ticket.source === "noch_plus" ? "Noch+" : ticket.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ticket.assessmentData!.timestamp), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handlePreview(ticket)} title="Preview">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownload(ticket)} title="Download">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenSend(ticket)} title="Send">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewTicket} onOpenChange={open => { if (!open) { setPreviewTicket(null); setPdfData(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between">
            <DialogTitle>Assessment Report — {previewTicket?.ticketId}</DialogTitle>
            <div className="flex gap-2">
              {previewTicket && (
                <>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleDownload(previewTicket)}>
                    <Download className="h-3 w-3" /> Download
                  </Button>
                  <Button size="sm" className="text-xs gap-1.5" onClick={() => { setPreviewTicket(null); setPdfData(null); handleOpenSend(previewTicket); }}>
                    <Send className="h-3 w-3" /> Send
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {pdfData && <PdfCanvasPreview pdfData={pdfData} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={!!sendTicket} onOpenChange={open => { if (!open) setSendTicket(null); }}>
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
                onChange={e => setSendEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The assessment report PDF for ticket {sendTicket?.ticketId} will be attached.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSendTicket(null)}>Cancel</Button>
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
