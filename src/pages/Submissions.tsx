import { useState, useMemo, useEffect } from "react";
import { Search, Eye, Camera, CameraOff, FileText, ChevronLeft, ChevronRight, Save, Mail, Download, CheckCircle, XCircle, MessageSquare, Loader2, Clock, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ChargerSubmission {
  id: string;
  brand: string;
  serial_number: string | null;
  charger_type: string;
  installation_location: string | null;
  photo_urls: string[] | null;
  known_issues: string | null;
}

interface Submission {
  id: string;
  submission_id: string;
  status: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  referral_source: string | null;
  assessment_needs: string[] | null;
  service_urgency: string | null;
  customer_notes: string | null;
  staff_notes: string | null;
  noch_plus_member: boolean;
  created_at: string;
  updated_at: string;
  chargers: ChargerSubmission[];
}

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-medium/15 text-medium border-medium/30",
  approved: "bg-optimal/15 text-optimal border-optimal/30",
  archived: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending",
  approved: "Approved",
  archived: "Archived",
};

export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [activeChargerIndex, setActiveChargerIndex] = useState(0);
  const [staffNotes, setStaffNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectChargerIdx, setRejectChargerIdx] = useState<number | null>(null);

  // Request info dialog
  const [requestInfoOpen, setRequestInfoOpen] = useState(false);
  const [requestInfoMessage, setRequestInfoMessage] = useState("");

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data: subs, error } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load submissions");
      setLoading(false);
      return;
    }

    // Fetch charger submissions for all
    const subIds = (subs || []).map((s) => s.id);
    const { data: chargers } = subIds.length
      ? await supabase.from("charger_submissions").select("*").in("submission_id", subIds)
      : { data: [] };

    const merged: Submission[] = (subs || []).map((s) => ({
      ...s,
      chargers: (chargers || []).filter((c) => c.submission_id === s.id),
    }));

    setSubmissions(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const filtered = useMemo(() => {
    let result = [...submissions];
    if (statusFilter !== "all") result = result.filter((s) => s.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          s.submission_id.toLowerCase().includes(q) ||
          s.company_name.toLowerCase().includes(q) ||
          `${s.city}, ${s.state}`.toLowerCase().includes(q)
      );
    }
    return result;
  }, [submissions, statusFilter, search]);

  // Stats
  const stats = useMemo(() => ({
    total: submissions.length,
    pending: submissions.filter((s) => s.status === "pending_review").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    totalChargers: submissions.reduce((acc, s) => acc + s.chargers.length, 0),
  }), [submissions]);

  const hasPhotos = (s: Submission) => s.chargers.some((c) => c.photo_urls && c.photo_urls.length > 0);

  const handleStatusChange = async (submissionId: string, newStatus: string) => {
    setUpdatingStatus(true);
    const { error } = await supabase.from("submissions").update({ status: newStatus }).eq("id", submissionId);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Status updated to ${STATUS_LABELS[newStatus] || newStatus}`);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, status: newStatus } : s))
      );
      if (selectedSubmission?.id === submissionId) {
        setSelectedSubmission((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    }
    setUpdatingStatus(false);
  };

  const handleSaveNotes = async () => {
    if (!selectedSubmission) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from("submissions")
      .update({ staff_notes: staffNotes })
      .eq("id", selectedSubmission.id);
    if (error) {
      toast.error("Failed to save notes");
    } else {
      toast.success("Notes saved");
      setSubmissions((prev) =>
        prev.map((s) => (s.id === selectedSubmission.id ? { ...s, staff_notes: staffNotes } : s))
      );
      setSelectedSubmission((prev) => prev ? { ...prev, staff_notes: staffNotes } : null);
    }
    setSavingNotes(false);
  };

  const openDetail = (sub: Submission) => {
    setSelectedSubmission(sub);
    setActiveChargerIndex(0);
    setStaffNotes(sub.staff_notes || "");
  };

  // Detail view
  const charger = selectedSubmission?.chargers[activeChargerIndex];

  if (selectedSubmission) {
    return (
      <div className="p-6 space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => setSelectedSubmission(null)} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Submissions
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  Customer Info
                  <Badge className={STATUS_STYLES[selectedSubmission.status] || ""}>
                    {STATUS_LABELS[selectedSubmission.status] || selectedSubmission.status}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground font-mono">{selectedSubmission.submission_id}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">👤</span>
                  <div>
                    <p className="font-medium">{selectedSubmission.full_name}</p>
                    <p className="text-muted-foreground">{selectedSubmission.company_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">📍</span>
                  <div>
                    <p>{selectedSubmission.street_address}</p>
                    <p>{selectedSubmission.city}, {selectedSubmission.state} {selectedSubmission.zip_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📧</span>
                  <p className="truncate">{selectedSubmission.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📞</span>
                  <p>{selectedSubmission.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">📅</span>
                  <p>{format(new Date(selectedSubmission.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                {selectedSubmission.noch_plus_member && (
                  <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30">Noch+ Member</Badge>
                )}
              </CardContent>
            </Card>

            {/* Status Management */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={selectedSubmission.status}
                  onValueChange={(v) => handleStatusChange(selectedSubmission.id, v)}
                  disabled={updatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_review">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  rows={4}
                />
                <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes} className="gap-2">
                  <Save className="h-3.5 w-3.5" />
                  {savingNotes ? "Saving..." : "Save Note"}
                </Button>
              </CardContent>
            </Card>

            {/* Additional Info */}
            {(selectedSubmission.referral_source || selectedSubmission.service_urgency || (selectedSubmission.assessment_needs && selectedSubmission.assessment_needs.length > 0)) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {selectedSubmission.referral_source && (
                    <div>
                      <p className="text-muted-foreground text-xs">How they found us</p>
                      <p>{selectedSubmission.referral_source}</p>
                    </div>
                  )}
                  {selectedSubmission.service_urgency && (
                    <div>
                      <p className="text-muted-foreground text-xs">Service urgency</p>
                      <p className="capitalize">{selectedSubmission.service_urgency.replace(/_/g, " ")}</p>
                    </div>
                  )}
                  {selectedSubmission.assessment_needs && selectedSubmission.assessment_needs.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Assessment needs</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedSubmission.assessment_needs.map((n, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{n}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedSubmission.customer_notes && (
                    <div>
                      <p className="text-muted-foreground text-xs">Customer notes</p>
                      <p className="text-sm">{selectedSubmission.customer_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={() => toast.info("Email feature coming soon")}>
                <Mail className="h-4 w-4" />
                Email Customer
              </Button>
              <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={() => toast.info("PDF export coming soon")}>
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-2 space-y-4">
            {/* Charger Navigation */}
            {selectedSubmission.chargers.length > 0 ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Charger {activeChargerIndex + 1} of {selectedSubmission.chargers.length}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={activeChargerIndex === 0}
                          onClick={() => setActiveChargerIndex((p) => p - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {/* Charger tabs */}
                        <div className="flex gap-1">
                          {selectedSubmission.chargers.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveChargerIndex(i)}
                              className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                                i === activeChargerIndex
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={activeChargerIndex === selectedSubmission.chargers.length - 1}
                          onClick={() => setActiveChargerIndex((p) => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {charger && (
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Brand</p>
                          <p className="font-medium">{charger.brand}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Serial Number</p>
                          <p className="font-medium">{charger.serial_number || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Charger Type</p>
                          <p className="font-medium">{charger.charger_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Installation Location</p>
                          <p className="font-medium">{charger.installation_location || "—"}</p>
                        </div>
                      </div>

                      {/* Photos */}
                      {charger.photo_urls && charger.photo_urls.length > 0 ? (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Photos ({charger.photo_urls.length})</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {charger.photo_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden border bg-muted hover:opacity-80 transition-opacity">
                                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CameraOff className="h-4 w-4" />
                          No photos uploaded
                        </div>
                      )}

                      {/* Known Issues */}
                      {charger.known_issues && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Known Issues / Concerns</p>
                          <p className="text-sm bg-muted/50 rounded-md p-3">{charger.known_issues}</p>
                        </div>
                      )}

                      <Separator />

                      {/* Charger Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => toast.info("Ticket creation coming soon")}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve & Create Ticket
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            setRejectChargerIdx(activeChargerIndex);
                            setRejectReason("");
                            setRejectOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            setRequestInfoMessage("");
                            setRequestInfoOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Request More Info
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No chargers submitted
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <TimelineItem
                    icon={<CheckCircle className="h-4 w-4 text-optimal" />}
                    label="Submitted"
                    time={format(new Date(selectedSubmission.created_at), "MMM d, yyyy 'at' h:mm a")}
                    active
                  />
                  {selectedSubmission.status !== "pending_review" && (
                    <TimelineItem
                      icon={<CheckCircle className="h-4 w-4 text-optimal" />}
                      label={`Status changed to ${STATUS_LABELS[selectedSubmission.status] || selectedSubmission.status}`}
                      time={format(new Date(selectedSubmission.updated_at), "MMM d, yyyy 'at' h:mm a")}
                      active
                    />
                  )}
                  {selectedSubmission.status === "pending_review" && (
                    <TimelineItem
                      icon={<Clock className="h-4 w-4 text-medium" />}
                      label="Under Review"
                      time="In progress"
                      active={false}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reject Dialog */}
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Charger</DialogTitle>
              <DialogDescription>Why are you rejecting this charger?</DialogDescription>
            </DialogHeader>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                toast.success("Charger rejected");
                setRejectOpen(false);
              }}>
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Request Info Dialog */}
        <Dialog open={requestInfoOpen} onOpenChange={setRequestInfoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request More Information</DialogTitle>
              <DialogDescription>What information do you need from the customer?</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                {["Better photos needed", "Serial number required", "More details about issue", "Installation date needed"].map((opt) => (
                  <div key={opt} className="flex items-center gap-2">
                    <Checkbox id={opt} onCheckedChange={(checked) => {
                      if (checked) setRequestInfoMessage((p) => p ? `${p}\n• ${opt}` : `• ${opt}`);
                    }} />
                    <Label htmlFor={opt} className="text-sm cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </div>
              <Textarea
                value={requestInfoMessage}
                onChange={(e) => setRequestInfoMessage(e.target.value)}
                placeholder="Additional message to customer..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRequestInfoOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                toast.success("Information request sent");
                setRequestInfoOpen(false);
              }}>
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Submissions</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-medium">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-medium">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-optimal">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-optimal">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-secondary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Chargers</p>
            <p className="text-2xl font-bold text-secondary">{stats.totalChargers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending_review">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-muted-foreground gap-4">
          <FileText className="h-16 w-16 text-primary/40" />
          <p className="text-sm">No submissions found.</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Chargers</TableHead>
                <TableHead className="text-center">Photos</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(sub)}>
                  <TableCell className="font-mono text-xs">{sub.submission_id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{sub.full_name}</p>
                      <p className="text-xs text-muted-foreground">{sub.company_name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{sub.city}, {sub.state}</TableCell>
                  <TableCell className="text-center font-medium">{sub.chargers.length}</TableCell>
                  <TableCell className="text-center">
                    {hasPhotos(sub) ? (
                      <Camera className="h-4 w-4 text-optimal mx-auto" />
                    ) : (
                      <CameraOff className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(sub.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLES[sub.status] || ""}>{STATUS_LABELS[sub.status] || sub.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); openDetail(sub); }}>
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function TimelineItem({ icon, label, time, active }: { icon: React.ReactNode; label: string; time: string; active: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className={`text-sm ${active ? "font-medium" : "text-muted-foreground"}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  );
}
