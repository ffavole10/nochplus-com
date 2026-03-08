import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { FolderOpen, Plus, Download, Eye, Search, FileText, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useChargerRecords } from "@/hooks/useCampaigns";
import { Database } from "lucide-react";
import { toast } from "sonner";
import { format, isThisWeek, isThisMonth } from "date-fns";

interface FieldReport {
  id: string;
  fileName: string;
  ticketId: string | null;
  technician: string;
  uploadDate: string;
  notes: string;
  fileSize: string;
}

const DEMO_REPORTS: FieldReport[] = [];

export default function FieldReports() {
  const { selectedCampaignId } = useCampaignContext();
  const { data: chargerRecords = [] } = useChargerRecords(selectedCampaignId || null);

  const [reports, setReports] = useState<FieldReport[]>(DEMO_REPORTS);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [linkedTicket, setLinkedTicket] = useState("");
  const [techName, setTechName] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const ticketOptions = useMemo(() => {
    return chargerRecords
      .filter(r => r.ticket_id)
      .map(r => ({ id: r.ticket_id!, label: `#${r.ticket_id} — ${r.station_id}` }));
  }, [chargerRecords]);

  const technicians = useMemo(() => {
    const names = new Set(reports.map(r => r.technician).filter(Boolean));
    return Array.from(names).sort();
  }, [reports]);

  const filtered = useMemo(() => {
    let result = [...reports];
    if (timeFilter === "week") result = result.filter(r => isThisWeek(new Date(r.uploadDate)));
    else if (timeFilter === "month") result = result.filter(r => isThisMonth(new Date(r.uploadDate)));
    if (techFilter !== "all") result = result.filter(r => r.technician === techFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.fileName.toLowerCase().includes(q) ||
        r.ticketId?.toLowerCase().includes(q) ||
        r.technician.toLowerCase().includes(q)
      );
    }
    return result;
  }, [reports, timeFilter, techFilter, search]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setUploadFile(file);
    } else {
      toast.error("Only PDF files are supported");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setUploadFile(file);
    } else {
      toast.error("Only PDF files are supported");
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadFile) {
      toast.error("Please select a PDF file");
      return;
    }
    if (!techName.trim()) {
      toast.error("Technician name is required");
      return;
    }

    const newReport: FieldReport = {
      id: crypto.randomUUID(),
      fileName: uploadFile.name,
      ticketId: linkedTicket || null,
      technician: techName,
      uploadDate: new Date().toISOString(),
      notes: uploadNotes,
      fileSize: `${(uploadFile.size / 1024).toFixed(0)} KB`,
    };

    setReports(prev => [newReport, ...prev]);
    toast.success("Report uploaded successfully");
    setUploadOpen(false);
    setUploadFile(null);
    setLinkedTicket("");
    setTechName("");
    setUploadNotes("");
  };

  if (!selectedCampaignId) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Database className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h2 className="text-lg font-medium text-muted-foreground">No Campaign Selected</h2>
          <p className="text-sm text-muted-foreground/70 max-w-xs">
            Select a partner and campaign from the sidebar to view field reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Field Reports</h1>
          <p className="text-sm text-muted-foreground">Campaign field reports and service documentation</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Upload Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket ID, charger, or technician..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={timeFilter} onValueChange={setTimeFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
        {technicians.length > 0 && (
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="By Technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {technicians.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Report List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-muted-foreground gap-4">
          <FolderOpen className="h-16 w-16 text-primary/40" />
          <p className="text-sm">
            {reports.length === 0
              ? "No field reports uploaded yet. Click \"Upload Report\" to add one."
              : "No reports match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(report => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">{report.fileName}</span>
                    {report.ticketId && (
                      <Badge variant="outline" className="text-xs">
                        Ticket #{report.ticketId}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {report.technician}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(report.uploadDate), "MMM d, yyyy")}
                    </span>
                    <span className="text-xs">{report.fileSize}</span>
                  </div>
                  {report.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{report.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="View">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Field Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onClick={() => document.getElementById("report-file-input")?.click()}
            >
              <input
                id="report-file-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">{uploadFile.name}</span>
                  <span className="text-xs text-muted-foreground">({(uploadFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <FolderOpen className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a PDF file, or click to browse
                  </p>
                </div>
              )}
            </div>

            {/* Link to ticket */}
            <div className="space-y-1.5">
              <Label>Link to Ticket (optional)</Label>
              <Select value={linkedTicket} onValueChange={setLinkedTicket}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a ticket..." />
                </SelectTrigger>
                <SelectContent>
                  {ticketOptions.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Technician */}
            <div className="space-y-1.5">
              <Label>Technician Name *</Label>
              <Input
                placeholder="Enter technician name"
                value={techName}
                onChange={e => setTechName(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Optional notes about this report..."
                value={uploadNotes}
                onChange={e => setUploadNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button onClick={handleUploadSubmit}>Upload Report</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
