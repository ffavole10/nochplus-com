import { useState, useMemo, useEffect } from "react";
import { Search, Eye, Camera, CameraOff, FileText, ChevronLeft, ChevronRight, Save, Mail, Download, CheckCircle, XCircle, MessageSquare, Loader2, Clock, Archive, Pencil } from "lucide-react";
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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Submission>>({});
  const [editChargers, setEditChargers] = useState<ChargerSubmission[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

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
    setIsEditing(false);
    setEditForm({});
    setEditChargers([]);
  };

  const startEditing = () => {
    if (!selectedSubmission) return;
    setEditForm({
      full_name: selectedSubmission.full_name,
      company_name: selectedSubmission.company_name,
      email: selectedSubmission.email,
      phone: selectedSubmission.phone,
      street_address: selectedSubmission.street_address,
      city: selectedSubmission.city,
      state: selectedSubmission.state,
      zip_code: selectedSubmission.zip_code,
    });
    setEditChargers(selectedSubmission.chargers.map(c => ({ ...c })));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSubmission) return;
    setSavingEdit(true);
    try {
      const { error: subError } = await supabase
        .from("submissions")
        .update({
          full_name: editForm.full_name,
          company_name: editForm.company_name,
          email: editForm.email,
          phone: editForm.phone,
          street_address: editForm.street_address,
          city: editForm.city,
          state: editForm.state,
          zip_code: editForm.zip_code,
        })
        .eq("id", selectedSubmission.id);

      if (subError) throw subError;

      for (const ch of editChargers) {
        const { error: chError } = await supabase
          .from("charger_submissions")
          .update({
            brand: ch.brand,
            serial_number: ch.serial_number,
            charger_type: ch.charger_type,
            installation_location: ch.installation_location,
            known_issues: ch.known_issues,
          })
          .eq("id", ch.id);
        if (chError) throw chError;
      }

      const updated: Submission = {
        ...selectedSubmission,
        ...editForm as any,
        chargers: editChargers,
      };

      setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelectedSubmission(updated);
      setIsEditing(false);
      toast.success("Submission updated");
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const updateEditField = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditCharger = (index: number, field: string, value: string) => {
    setEditChargers((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  // Detail view
  const charger = selectedSubmission?.chargers[activeChargerIndex];
  const photoLabels = ["Front", "Back", "Serial"];

  if (selectedSubmission) {
    return (
      <div className="p-6 space-y-5">
        {/* Header row: back + title + action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedSubmission(null); setIsEditing(false); }}
              className="h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <h2 className="text-xl font-bold text-foreground">
              Submission {selectedSubmission.submission_id}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("Email feature coming soon")}>
              <Mail className="h-4 w-4" />
              Email Customer
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("PDF export coming soon")}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* LEFT SIDEBAR */}
          <div className="space-y-4">
            {/* Customer Info */}
            <Card className="border border-border/60">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Customer Info</h3>
                  <span className="text-sm font-mono text-primary">{selectedSubmission.submission_id}</span>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Full Name</Label>
                        <Input value={editForm.full_name || ""} onChange={(e) => updateEditField("full_name", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Company</Label>
                        <Input value={editForm.company_name || ""} onChange={(e) => updateEditField("company_name", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Street Address</Label>
                      <Input value={editForm.street_address || ""} onChange={(e) => updateEditField("street_address", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">City</Label>
                        <Input value={editForm.city || ""} onChange={(e) => updateEditField("city", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">State</Label>
                        <Input value={editForm.state || ""} onChange={(e) => updateEditField("state", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">ZIP</Label>
                        <Input value={editForm.zip_code || ""} onChange={(e) => updateEditField("zip_code", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Email</Label>
                        <Input type="email" value={editForm.email || ""} onChange={(e) => updateEditField("email", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Phone</Label>
                        <Input value={editForm.phone || ""} onChange={(e) => updateEditField("phone", e.target.value)} />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="gap-2" onClick={handleSaveEdit} disabled={savingEdit}>
                        {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {savingEdit ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0 mt-0.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                      <div>
                        <p className="font-medium text-foreground">{selectedSubmission.full_name}</p>
                        <p className="text-muted-foreground">{selectedSubmission.company_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0 mt-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      <div>
                        <p className="text-foreground">{selectedSubmission.street_address}</p>
                        <p className="text-muted-foreground">{selectedSubmission.city}, {selectedSubmission.state} {selectedSubmission.zip_code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${selectedSubmission.email}`} className="text-primary hover:underline truncate">{selectedSubmission.email}</a>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <a href={`tel:${selectedSubmission.phone}`} className="text-primary hover:underline">{selectedSubmission.phone}</a>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                      <p className="text-foreground">{format(new Date(selectedSubmission.created_at), "MMMM d, yyyy 'at' h:mm a")}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status */}
            <Card className="border border-border/60">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-foreground">Status</h3>
                <div className="flex items-center gap-3">
                  <Badge className={STATUS_STYLES[selectedSubmission.status] || ""}>
                    {STATUS_LABELS[selectedSubmission.status] || selectedSubmission.status}
                  </Badge>
                  <Select
                    value={selectedSubmission.status}
                    onValueChange={(v) => handleStatusChange(selectedSubmission.id, v)}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending_review">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border border-border/60">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-foreground">Notes</h3>
                <div className="flex items-center gap-2">
                  <Input
                    value={staffNotes}
                    onChange={(e) => setStaffNotes(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveNotes(); }}
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                  >
                    {savingNotes ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT CONTENT */}
          <div className="space-y-0">
            {/* Charger Tabs */}
            {selectedSubmission.chargers.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  {selectedSubmission.chargers.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveChargerIndex(i)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        i === activeChargerIndex
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-foreground hover:bg-accent"
                      }`}
                    >
                      Charger {i + 1}
                    </button>
                  ))}
                </div>

                {/* Charger Details Card */}
                <Card className="border border-border/60">
                  <CardContent className="p-6 space-y-6">
                    {/* Charger header with edit + nav */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">
                        Charger {activeChargerIndex + 1} Details
                      </h3>
                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <Button variant="outline" size="icon" className="h-9 w-9" onClick={startEditing}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" className="gap-2" onClick={handleSaveEdit} disabled={savingEdit}>
                              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              Save
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={activeChargerIndex === 0}
                          onClick={() => setActiveChargerIndex((p) => p - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          disabled={activeChargerIndex === selectedSubmission.chargers.length - 1}
                          onClick={() => setActiveChargerIndex((p) => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {charger && (
                      <>
                        {/* Brand & Serial */}
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <Label className="text-xs text-muted-foreground">Brand</Label>
                              <Input value={editChargers[activeChargerIndex]?.brand || ""} onChange={(e) => updateEditCharger(activeChargerIndex, "brand", e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Serial Number</Label>
                              <Input value={editChargers[activeChargerIndex]?.serial_number || ""} onChange={(e) => updateEditCharger(activeChargerIndex, "serial_number", e.target.value)} />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-sm text-muted-foreground mb-0.5">Brand</p>
                              <p className="font-medium text-foreground">{charger.brand || "Not specified"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-0.5">Serial Number</p>
                              <p className="font-medium text-foreground font-mono">{charger.serial_number || "Not provided"}</p>
                            </div>
                          </div>
                        )}

                        {/* Photos */}
                        <div>
                          <p className="text-sm text-muted-foreground mb-3">Photos</p>
                          {charger.photo_urls && charger.photo_urls.length > 0 ? (
                            <div className="flex gap-3">
                              {charger.photo_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-24 h-24 rounded-lg overflow-hidden border border-border bg-muted hover:opacity-80 transition-opacity">
                                  <img src={url} alt={photoLabels[i] || `Photo ${i + 1}`} className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              {photoLabels.map((label) => (
                                <div key={label} className="w-24 h-24 rounded-lg border-2 border-dashed border-border/60 flex flex-col items-center justify-center text-muted-foreground/50">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                  <span className="text-xs">{label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Internal Notes */}
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Internal Notes</p>
                          <p className="text-sm text-foreground">{charger.known_issues || "No notes"}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border border-border/60">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No chargers submitted
                </CardContent>
              </Card>
            )}
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
