import { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Download, Eye, Send, Loader2, FileText,
  SortAsc, SortDesc, ChevronLeft, ChevronRight,
} from "lucide-react";

const ITEMS_PER_PAGE = 15;

const RISK_COLORS: Record<string, string> = {
  Critical: "bg-destructive text-destructive-foreground",
  High: "bg-orange-500 text-white",
  Medium: "bg-yellow-500 text-white",
  Low: "bg-green-600 text-white",
};

interface AssessmentReport {
  id: string;
  submission_id: string;
  submission_display_id: string;
  customer_name: string;
  company_name: string;
  city: string;
  state: string;
  ai_summary: string;
  risk_level: string;
  charger_count: number;
  pdf_storage_path: string | null;
  created_at: string;
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

type SortField = "date" | "customer" | "risk" | "submission";
type SortDir = "asc" | "desc";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function NochPlusAssessments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const [previewReport, setPreviewReport] = useState<AssessmentReport | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const [sendReport, setSendReport] = useState<AssessmentReport | null>(null);
  const [sendEmail, setSendEmail] = useState("");
  const [sending, setSending] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["assessment_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_reports" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AssessmentReport[];
    },
  });

  const filtered = useMemo(() => {
    let list = [...reports];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.submission_display_id.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.company_name.toLowerCase().includes(q)
      );
    }
    if (riskFilter !== "all") {
      list = list.filter(r => r.risk_level === riskFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date": cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case "customer": cmp = a.company_name.localeCompare(b.company_name); break;
        case "risk": {
          const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
          cmp = (order[a.risk_level] ?? 4) - (order[b.risk_level] ?? 4);
          break;
        }
        case "submission": cmp = a.submission_display_id.localeCompare(b.submission_display_id); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [reports, searchQuery, riskFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [searchQuery, riskFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <SortAsc className="h-3 w-3 ml-1 inline" /> : <SortDesc className="h-3 w-3 ml-1 inline" />;
  };

  const fetchPdf = async (report: AssessmentReport): Promise<ArrayBuffer | null> => {
    if (!report.pdf_storage_path) return null;
    const { data, error } = await supabase.storage
      .from("field-reports")
      .download(report.pdf_storage_path);
    if (error || !data) { console.error("PDF download error:", error); return null; }
    return await data.arrayBuffer();
  };

  const handlePreview = async (report: AssessmentReport) => {
    setPreviewReport(report);
    setLoadingPdf(true);
    const buf = await fetchPdf(report);
    setPdfData(buf);
    setLoadingPdf(false);
  };

  const handleDownload = async (report: AssessmentReport) => {
    const buf = await fetchPdf(report);
    if (!buf) { toast.error("Could not download PDF"); return; }
    const blob = new Blob([buf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.submission_display_id}-assessment.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const handleSend = async () => {
    if (!sendReport || !sendEmail.trim()) { toast.error("Please enter an email"); return; }
    setSending(true);
    try {
      const buf = await fetchPdf(sendReport);
      if (!buf) throw new Error("PDF not found");
      const blob = new Blob([buf], { type: "application/pdf" });
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { error } = await supabase.functions.invoke("send-assessment-report", {
        body: {
          to: sendEmail.trim(),
          ticketId: sendReport.submission_display_id,
          customerName: sendReport.customer_name,
          customerCompany: sendReport.company_name,
          pdfBase64: base64,
        },
      });
      if (error) throw error;
      toast.success(`Report sent to ${sendEmail}`);
      setSendReport(null);
    } catch (err: any) {
      toast.error(`Failed to send: ${err.message || "Unknown error"}`);
    } finally { setSending(false); }
  };

  const stats = useMemo(() => {
    const byRisk = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    reports.forEach(r => {
      if (r.risk_level in byRisk) byRisk[r.risk_level as keyof typeof byRisk]++;
    });
    return { total: reports.length, ...byRisk };
  }, [reports]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading assessment reports...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Reports</p></CardContent></Card>
        {(["Critical", "High", "Medium", "Low"] as const).map(level => (
          <Card key={level}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats[level]}</p><p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><span className={`w-2 h-2 rounded-full ${level === "Critical" ? "bg-destructive" : level === "High" ? "bg-orange-500" : level === "Medium" ? "bg-yellow-500" : "bg-green-600"}`} />{level}</p></CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by submission, customer, company..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Risk Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground ml-auto">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("submission")}>Submission <SortIcon field="submission" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("customer")}>Customer <SortIcon field="customer" /></TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("risk")}>Risk <SortIcon field="risk" /></TableHead>
                <TableHead>Chargers</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("date")}>Date <SortIcon field="date" /></TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No assessment reports found</p></TableCell></TableRow>
              ) : paginated.map(report => (
                <TableRow key={report.id} className="group">
                  <TableCell className="font-mono text-sm font-medium">{report.submission_display_id}</TableCell>
                  <TableCell><div><p className="text-sm font-medium">{report.customer_name}</p><p className="text-xs text-muted-foreground">{report.company_name}</p></div></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{report.city}, {report.state}</TableCell>
                  <TableCell><Badge className={`${RISK_COLORS[report.risk_level] || ""} text-xs`}>{report.risk_level}</Badge></TableCell>
                  <TableCell className="text-sm">{report.charger_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(report.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handlePreview(report)} title="Preview"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownload(report)} title="Download"><Download className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSendReport(report); setSendEmail(""); }} title="Send"><Send className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm px-2">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewReport} onOpenChange={open => { if (!open) { setPreviewReport(null); setPdfData(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between">
            <DialogTitle>Assessment Report — {previewReport?.submission_display_id}</DialogTitle>
            <div className="flex gap-2">
              {previewReport && (
                <>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleDownload(previewReport)}><Download className="h-3 w-3" /> Download</Button>
                  <Button size="sm" className="text-xs gap-1.5" onClick={() => { const r = previewReport; setPreviewReport(null); setPdfData(null); setSendReport(r); setSendEmail(""); }}><Send className="h-3 w-3" /> Send</Button>
                </>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {loadingPdf && <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading PDF...</span></div>}
            {pdfData && <PdfCanvasPreview pdfData={pdfData} />}
            {!loadingPdf && !pdfData && <p className="text-center text-muted-foreground py-12">PDF not available</p>}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={!!sendReport} onOpenChange={open => { if (!open) setSendReport(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send Assessment Report</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input type="email" placeholder="customer@example.com" value={sendEmail} onChange={e => setSendEmail(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Report for submission {sendReport?.submission_display_id} will be attached as PDF.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSendReport(null)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !sendEmail.trim()} className="gap-2">{sending && <Loader2 className="h-4 w-4 animate-spin" />}{sending ? "Sending..." : "Send Report"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
