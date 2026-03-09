import { useState, useMemo, useEffect, useCallback } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Search, Eye, Camera, CameraOff, FileText, ChevronLeft, ChevronRight, Save, Mail, Download, CheckCircle, XCircle, MessageSquare, Loader2, Clock, Archive, Pencil, X, Play, FileDown, Plus } from "lucide-react";
import { useServiceTicketsStore, makeSteps } from "@/stores/serviceTicketsStore";
import type { TicketChargerInfo, ChargerBrand } from "@/types/ticket";
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
import { NewSubmissionModal } from "@/components/submissions/NewSubmissionModal";

type SubmissionSource = "legacy" | "assessment";

interface ChargerSubmission {
  id: string;
  brand: string;
  serial_number: string | null;
  charger_type: string;
  installation_location: string | null;
  photo_urls: string[] | null;
  known_issues: string | null;
  /** Charger-level workflow status (legacy used pending_review; new assessments use pending) */
  status: string;
  /** Legacy-only fields (not stored for assessment_chargers) */
  service_needed: boolean | null;
  staff_notes: string | null;
}

interface Submission {
  id: string;
  submission_id: string;
  /** Submission-level status */
  status: string;
  /** Present only for noch_plus_submissions (assessment/repair) */
  submission_type?: string | null;
  source: SubmissionSource;

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
  draft: "bg-secondary/15 text-secondary border-secondary/30",
  pending_review: "bg-medium/15 text-medium border-medium/30",
  // Alias for assessment_chargers default status
  pending: "bg-medium/15 text-medium border-medium/30",
  approved: "bg-optimal/15 text-optimal border-optimal/30",
  archived: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending",
  pending: "Pending",
  approved: "Approved",
  archived: "Archived",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/** Resolve a photo path to a public storage URL. If already a full URL, return as-is. */
function getPublicPhotoUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/submission-photos/${path}`;
}

/** Thumbnail with loading skeleton and error fallback */
function SubmissionPhotoThumb({ path, alt, onClick }: { path: string; alt: string; onClick: (url: string) => void }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const url = getPublicPhotoUrl(path);

  return (
    <button
      onClick={() => status === "loaded" && onClick(url)}
      className="w-24 h-24 rounded-lg overflow-hidden border border-border bg-muted hover:opacity-80 transition-opacity cursor-zoom-in relative"
    >
      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
      {status === "error" ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-1">
          <CameraOff className="h-5 w-5" />
          <span className="text-[10px] leading-tight text-center">Photo unavailable</span>
        </div>
      ) : (
        <img
          src={url}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}
    </button>
  );
}

  export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [activeChargerIndex, setActiveChargerIndex] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Submission>>({});
  const [editChargers, setEditChargers] = useState<ChargerSubmission[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [newSubmissionOpen, setNewSubmissionOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<any>(null);

  // Assessment state
  const [assessmentStatus, setAssessmentStatus] = useState<"idle" | "running" | "done">("idle");
  const [assessmentPdfBlob, setAssessmentPdfBlob] = useState<Blob | null>(null);

  // Per-charger editable fields
  const [chargerStatuses, setChargerStatuses] = useState<Record<string, string>>({});
  const [chargerServiceNeeded, setChargerServiceNeeded] = useState<Record<string, boolean | null>>({});
  const [chargerNotes, setChargerNotes] = useState<Record<string, string>>({});

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectChargerIdx, setRejectChargerIdx] = useState<number | null>(null);

  // Request info dialog
  const [requestInfoOpen, setRequestInfoOpen] = useState(false);
  const [requestInfoMessage, setRequestInfoMessage] = useState("");

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const [legacyRes, assessmentRes] = await Promise.all([
        supabase.from("submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("noch_plus_submissions").select("*").order("created_at", { ascending: false }),
      ]);

      if (legacyRes.error || assessmentRes.error) {
        throw legacyRes.error || assessmentRes.error;
      }

      const legacySubs = legacyRes.data || [];
      const assessmentSubs = assessmentRes.data || [];

      const legacyIds = legacySubs.map((s) => s.id);
      const assessmentIds = assessmentSubs.map((s) => s.id);

      const [legacyChargersRes, assessmentChargersRes] = await Promise.all([
        legacyIds.length
          ? supabase.from("charger_submissions").select("*").in("submission_id", legacyIds)
          : Promise.resolve({ data: [] as any[] }),
        assessmentIds.length
          ? supabase.from("assessment_chargers").select("*").in("submission_id", assessmentIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const legacyChargers = (legacyChargersRes as any).data || [];
      const assessmentChargers = (assessmentChargersRes as any).data || [];

      const mergedLegacy: Submission[] = legacySubs.map((s: any) => {
        const chargers = legacyChargers
          .filter((c: any) => c.submission_id === s.id)
          .map((c: any) => ({
            ...c,
            status: c.status === "pending_review" ? "pending" : c.status || "pending",
            service_needed: c.service_needed ?? null,
            staff_notes: c.staff_notes || null,
          }));

        const derivedStatus =
          chargers.length > 0 && chargers.every((c: any) => c.status === "approved")
            ? "approved"
            : s.status;

        return {
          ...s,
          status: derivedStatus,
          source: "legacy" as const,
          submission_type: null,
          chargers,
        };
      });

      const mergedAssessments: Submission[] = assessmentSubs.map((s: any) => {
        const chargers = assessmentChargers
          .filter((c: any) => c.submission_id === s.id)
          .map((c: any) => ({
            ...c,
            status: c.status || "pending",
            service_needed: null,
            staff_notes: null,
          }));

        const derivedStatus =
          chargers.length > 0 && chargers.every((c: any) => c.status === "approved")
            ? "approved"
            : s.status;

        return {
          ...s,
          status: derivedStatus,
          source: "assessment" as const,
          chargers,
        };
      });

      const mergedAll = [...mergedLegacy, ...mergedAssessments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setSubmissions(mergedAll);
    } catch (e) {
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
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
    drafts: submissions.filter((s) => s.status === "draft").length,
    pending: submissions.filter((s) => s.status === "pending_review").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    totalChargers: submissions.reduce((acc, s) => acc + s.chargers.length, 0),
  }), [submissions]);

  const hasPhotos = (s: Submission) => s.chargers.some((c) => c.photo_urls && c.photo_urls.length > 0);

  const syncSubmissionStatusFromChargers = async (
    sub: Submission,
    nextStatuses: Record<string, string>
  ) => {
    const allApproved =
      sub.chargers.length > 0 &&
      sub.chargers.every((ch) => (nextStatuses[ch.id] || "pending") === "approved");

    const nextSubmissionStatus = allApproved ? "approved" : "pending_review";
    if (sub.status === nextSubmissionStatus) return;

    const submissionTable = sub.source === "assessment" ? "noch_plus_submissions" : "submissions";
    const { error } = await supabase
      .from(submissionTable)
      .update({ status: nextSubmissionStatus } as any)
      .eq("id", sub.id);

    if (error) {
      toast.error("Failed to sync submission status");
      return;
    }

    setSelectedSubmission((prev) =>
      prev && prev.id === sub.id ? { ...prev, status: nextSubmissionStatus } : prev
    );
    setSubmissions((prev) =>
      prev.map((item) => (item.id === sub.id ? { ...item, status: nextSubmissionStatus } : item))
    );
  };

  const openDetail = (sub: Submission) => {
    // If draft, open the modal for editing instead
    if (sub.status === "draft") {
      openDraftForEditing(sub);
      return;
    }
    setSelectedSubmission(sub);
    setActiveChargerIndex(0);
    setIsEditing(false);
    setEditForm({});
    setEditChargers([]);
    setAssessmentStatus("idle");
    setAssessmentPdfBlob(null);
    const statuses: Record<string, string> = {};
    const serviceNeeded: Record<string, boolean | null> = {};
    const notes: Record<string, string> = {};
    sub.chargers.forEach((c) => {
      statuses[c.id] = c.status || "pending";
      serviceNeeded[c.id] = c.service_needed;
      notes[c.id] = c.staff_notes || "";
    });
    setChargerStatuses(statuses);
    setChargerServiceNeeded(serviceNeeded);
    setChargerNotes(notes);
  };

  const openDraftForEditing = (sub: Submission) => {
    setEditingDraft({
      id: sub.id,
      submissionId: sub.submission_id,
      fullName: sub.full_name === "Draft" ? "" : sub.full_name,
      companyName: sub.company_name === "Draft" ? "" : sub.company_name,
      email: sub.email === "draft@placeholder.com" ? "" : sub.email,
      phone: sub.phone === "0000000000" ? "" : sub.phone,
      streetAddress: sub.street_address,
      city: sub.city === "—" ? "" : sub.city,
      state: sub.state === "—" ? "" : sub.state,
      zipCode: sub.zip_code === "00000" ? "" : sub.zip_code,
      chargers: sub.chargers.map(c => ({
        id: c.id,
        brand: c.brand === "Unknown" ? "" : c.brand,
        serialNumber: c.serial_number || "",
        chargerType: c.charger_type || "",
        installationLocation: c.installation_location || "",
        knownIssues: c.known_issues || "",
        isWorking: "",
        underWarranty: "",
      })),
      customerNotes: sub.customer_notes || "",
      serviceUrgency: sub.service_urgency || "",
      step: 1,
    });
    setNewSubmissionOpen(true);
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
      const submissionTable =
        selectedSubmission.source === "assessment" ? "noch_plus_submissions" : "submissions";
      const chargerTable =
        selectedSubmission.source === "assessment" ? "assessment_chargers" : "charger_submissions";

      // Save customer info
      const { error: subError } = await supabase
        .from(submissionTable)
        .update({
          full_name: editForm.full_name,
          company_name: editForm.company_name,
          email: editForm.email,
          phone: editForm.phone,
          street_address: editForm.street_address,
          city: editForm.city,
          state: editForm.state,
          zip_code: editForm.zip_code,
        } as any)
        .eq("id", selectedSubmission.id);

      if (subError) throw subError;

      // Save each charger's details + per-charger status
      for (const ch of editChargers) {
        const chargerUpdate: Record<string, any> = {
          brand: ch.brand,
          serial_number: ch.serial_number,
          charger_type: ch.charger_type,
          installation_location: ch.installation_location,
          known_issues: ch.known_issues,
          status: chargerStatuses[ch.id] || "pending",
        };

        // Legacy-only fields (assessment_chargers does not store these)
        if (selectedSubmission.source !== "assessment") {
          chargerUpdate.service_needed = chargerServiceNeeded[ch.id] ?? null;
          chargerUpdate.staff_notes = chargerNotes[ch.id] || null;
        }

        const { error: chError } = await supabase
          .from(chargerTable)
          .update(chargerUpdate as any)
          .eq("id", ch.id);
        if (chError) throw chError;
      }

      // Update submission-level status based on charger statuses
      const allApproved = editChargers.every(
        (ch) => (chargerStatuses[ch.id] || "pending") === "approved"
      );
      const anyApproved = editChargers.some(
        (ch) => (chargerStatuses[ch.id] || "pending") === "approved"
      );
      let newSubStatus = selectedSubmission.status;
      if (allApproved) newSubStatus = "approved";
      else if (anyApproved) newSubStatus = "approved";

      if (newSubStatus !== selectedSubmission.status) {
        await supabase
          .from(submissionTable)
          .update({ status: newSubStatus } as any)
          .eq("id", selectedSubmission.id);
      }

      const updatedChargers = editChargers.map((ch) => ({
        ...ch,
        status: chargerStatuses[ch.id] || "pending",
        service_needed:
          selectedSubmission.source === "assessment"
            ? null
            : (chargerServiceNeeded[ch.id] ?? null),
        staff_notes:
          selectedSubmission.source === "assessment" ? null : chargerNotes[ch.id] || null,
      }));

      const updated: Submission = {
        ...selectedSubmission,
        ...(editForm as any),
        status: newSubStatus,
        chargers: updatedChargers,
      };

      setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelectedSubmission(updated);
      setIsEditing(false);

      if (selectedSubmission.source !== "assessment") {
        // Create service tickets for chargers flagged with service_needed=true
        // Only create tickets for chargers that are newly flagged (weren't already flagged before)
        const serviceChargers = updatedChargers.filter((ch) => ch.service_needed === true);
        const previouslyFlagged = selectedSubmission.chargers
          .filter((ch) => ch.service_needed === true)
          .map((ch) => ch.id);
        const newServiceChargers = serviceChargers.filter((ch) => !previouslyFlagged.includes(ch.id));

        if (newServiceChargers.length > 0) {
          const store = useServiceTicketsStore.getState();
          const customerInfo = {
            name: updated.full_name,
            company: updated.company_name,
            email: updated.email,
            phone: updated.phone,
            address: `${updated.street_address}, ${updated.city}, ${updated.state} ${updated.zip_code}`,
          };

          const validBrands: ChargerBrand[] = ["BTC", "ABB", "Delta", "Tritium", "Signet", "Other"];
          const mapBrand = (b: string): ChargerBrand | "" => {
            const upper = b?.toUpperCase() || "";
            const found = validBrands.find((v) => upper.includes(v.toUpperCase()));
            return found || (b ? "Other" : "");
          };

          const chargerData = newServiceChargers.map((ch) => ({
            charger: {
              brand: mapBrand(ch.brand),
              serialNumber: ch.serial_number || "",
              type: (
                ch.charger_type === "DC" || ch.charger_type === "DC | Level 3" ? "DC_L3" : "AC_L2"
              ) as TicketChargerInfo["type"],
              location: `${updated.city}, ${updated.state}`,
            },
            issue: {
              description:
                ch.known_issues || chargerNotes[ch.id] || "Service requested via Noch+ submission.",
            },
          }));

          if (chargerData.length === 1) {
            // Single charger → standalone ticket
            const now = new Date().toISOString();
            const ticketId = store.getNextTicketId();
            const cd = chargerData[0];
            store.addTicket({
              id: `st-${Date.now()}`,
              ticketId,
              source: "noch_plus",
              customer: customerInfo,
              charger: cd.charger,
              photos: [],
              issue: cd.issue,
              priority: "Medium",
              status: "pending_review",
              currentStep: 1,
              workflowSteps: makeSteps(1),
              createdAt: now,
              updatedAt: now,
              history: [
                {
                  id: `h-${Date.now()}`,
                  timestamp: now,
                  action: "Ticket created from Noch+ submission",
                  performedBy: "System",
                },
              ],
              metadata: { campaignName: `Submission ${updated.submission_id}` },
            });
            toast.success(`Service ticket ${ticketId} created in Service Desk.`, { duration: 5000 });
          } else {
            // Multiple chargers → parent-child
            const parentId = store.createParentWithChildren(
              customerInfo,
              chargerData,
              "noch_plus",
              `Submission ${updated.submission_id}`
            );
            const parent = store.getTicketById(parentId);
            toast.success(
              `${newServiceChargers.length} service tickets created under ${parent?.ticketId || "new parent"}.`,
              { duration: 5000 }
            );
          }
        } else if (serviceChargers.length > 0) {
          toast.success("Changes saved (service tickets already created for flagged chargers).");
        } else {
          toast.success("Changes saved");
        }
      } else {
        toast.success("Changes saved");
      }
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
    const currentChargerId = charger?.id || "";

    return (
      <div className="p-6 space-y-5">
        {/* Header row */}
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
            {/* Run Assessment */}
            {(() => {
              const allApproved = selectedSubmission.chargers.length > 0 &&
                selectedSubmission.chargers.every(ch => chargerStatuses[ch.id] === "approved");
              return (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!allApproved || assessmentStatus === "running"}
                    onClick={async () => {
                      setAssessmentStatus("running");
                      try {
                        const { data, error } = await supabase.functions.invoke("ai-chat", {
                          body: {
                            messages: [
                              {
                                role: "user",
                                content: `Generate a brief EV charger assessment report summary for this submission:\n\nCustomer: ${selectedSubmission.full_name} (${selectedSubmission.company_name})\nLocation: ${selectedSubmission.street_address}, ${selectedSubmission.city}, ${selectedSubmission.state} ${selectedSubmission.zip_code}\n\nChargers:\n${selectedSubmission.chargers.map((ch, i) => `${i + 1}. ${ch.brand} ${ch.charger_type} (SN: ${ch.serial_number || "N/A"}) — Issues: ${ch.known_issues || "None reported"} — Location: ${ch.installation_location || "N/A"}`).join("\n")}\n\nProvide: 1) Overall risk assessment 2) Per-charger recommendations 3) Priority actions. Keep it professional and concise.`
                              }
                            ]
                          }
                        });
                        if (error) throw error;
                        const aiText = data?.reply || data?.content || "Assessment complete.";
                        const { default: jsPDF } = await import("jspdf");
                        const doc = new jsPDF();
                        doc.setFontSize(18);
                        doc.setTextColor(30, 41, 59);
                        doc.text("NOCH Power — Assessment Report", 20, 25);
                        doc.setFontSize(10);
                        doc.setTextColor(100);
                        doc.text(`Submission: ${selectedSubmission.submission_id}`, 20, 35);
                        doc.text(`Customer: ${selectedSubmission.full_name} — ${selectedSubmission.company_name}`, 20, 41);
                        doc.text(`Location: ${selectedSubmission.city}, ${selectedSubmission.state}`, 20, 47);
                        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 53);
                        doc.setDrawColor(200);
                        doc.line(20, 57, 190, 57);
                        doc.setFontSize(11);
                        doc.setTextColor(30, 41, 59);
                        const lines = doc.splitTextToSize(aiText, 170);
                        doc.text(lines, 20, 65);
                        const blob = doc.output("blob");
                        setAssessmentPdfBlob(blob);
                        setAssessmentStatus("done");
                        toast.success("Assessment report generated");
                      } catch (err: any) {
                        console.error("Assessment error:", err);
                        toast.error(`Assessment failed: ${err.message}`);
                        setAssessmentStatus("idle");
                      }
                    }}
                  >
                    {assessmentStatus === "running" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {assessmentStatus === "running" ? "Running..." : "Run Assessment"}
                  </Button>
                  {assessmentStatus === "done" && assessmentPdfBlob && (
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(assessmentPdfBlob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${selectedSubmission.submission_id}-assessment.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="h-8 w-8 rounded-md border border-border bg-card flex items-center justify-center hover:bg-accent transition-colors"
                      title="Download Assessment Report"
                    >
                      <FileDown className="h-4 w-4 text-primary" />
                    </button>
                  )}
                </div>
              );
            })()}

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                if (assessmentStatus === "done" && assessmentPdfBlob) {
                  try {
                    const reader = new FileReader();
                    const base64 = await new Promise<string>((resolve, reject) => {
                      reader.onload = () => resolve((reader.result as string).split(",")[1]);
                      reader.onerror = reject;
                      reader.readAsDataURL(assessmentPdfBlob);
                    });
                    const { error } = await supabase.functions.invoke("send-assessment-report", {
                      body: {
                        to: selectedSubmission.email,
                        ticketId: selectedSubmission.submission_id,
                        customerName: selectedSubmission.full_name,
                        customerCompany: selectedSubmission.company_name,
                        pdfBase64: base64,
                      },
                    });
                    if (error) throw error;
                    toast.success(`Assessment report emailed to ${selectedSubmission.email}`);
                  } catch (err: any) {
                    toast.error(`Failed to send: ${err.message}`);
                  }
                } else {
                  toast.info("Run the assessment first to attach the report to the email.");
                }
              }}
            >
              <Mail className="h-4 w-4" />
              Email Customer
              {assessmentStatus === "done" && <FileText className="h-3 w-3 text-primary ml-1" />}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("PDF export coming soon")}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* LEFT SIDEBAR - Customer Info only */}
          <div className="space-y-4">
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
                    {selectedSubmission.noch_plus_member && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">Noch+ Member</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Charger selector buttons in sidebar */}
            {selectedSubmission.chargers.length > 0 && (
              <div className="flex flex-col gap-2">
                {selectedSubmission.chargers.map((ch, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveChargerIndex(i)}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      i === activeChargerIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground hover:bg-accent"
                    }`}
                  >
                    Charger {i + 1}
                    {ch.brand && <span className="ml-1 opacity-70">— {ch.brand}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT CONTENT */}
          <div className="space-y-4">
            {selectedSubmission.chargers.length > 0 ? (
              <>

                {/* Charger Details Card */}
                <Card className="border border-border/60">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">
                        Charger {activeChargerIndex + 1} Details
                      </h3>
                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <Button variant="outline" size="icon" className="h-9 w-9" onClick={startEditing}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
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
                                <SubmissionPhotoThumb
                                  key={i}
                                  path={url}
                                  alt={photoLabels[i] || `Photo ${i + 1}`}
                                  onClick={(resolvedUrl) => setLightboxUrl(resolvedUrl)}
                                />
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

                        {/* Customer-submitted notes */}
                        {charger.known_issues && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Customer Notes</p>
                            <p className="text-sm text-foreground">{charger.known_issues}</p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Per-charger Status + Service Request row */}
                <div className="grid gap-4 grid-cols-2">
                  {/* Status */}
                  <Card className="border border-border/60">
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-semibold text-foreground text-sm">Status</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={STATUS_STYLES[chargerStatuses[currentChargerId] || "pending"] || ""}>
                          {STATUS_LABELS[chargerStatuses[currentChargerId] || "pending"] || "Pending"}
                        </Badge>
                        {chargerStatuses[currentChargerId] !== "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-green-600/30 text-green-600 hover:bg-green-600/10"
                            onClick={async () => {
                              const newStatuses = { ...chargerStatuses, [currentChargerId]: "approved" };
                              setChargerStatuses(newStatuses);
                              // Persist charger status immediately
                              const table = selectedSubmission.source === "assessment" ? "assessment_chargers" : "charger_submissions";
                              await supabase.from(table).update({ status: "approved" }).eq("id", currentChargerId);
                              // Check if all chargers are now approved → update submission status
                              const allNowApproved = selectedSubmission.chargers.every(ch => (newStatuses[ch.id] || "pending") === "approved");
                              if (allNowApproved && selectedSubmission.status !== "approved") {
                                const subTable = selectedSubmission.source === "assessment" ? "noch_plus_submissions" : "submissions";
                                await supabase.from(subTable).update({ status: "approved" } as any).eq("id", selectedSubmission.id);
                                setSelectedSubmission(prev => prev ? { ...prev, status: "approved" } : prev);
                                setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? { ...s, status: "approved" } : s));
                              }
                              toast.success(`Charger ${activeChargerIndex + 1} approved`);
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                        )}
                        {chargerStatuses[currentChargerId] !== "archived" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setChargerStatuses((prev) => ({ ...prev, [currentChargerId]: "archived" }));
                              const table = selectedSubmission.source === "assessment" ? "assessment_chargers" : "charger_submissions";
                              supabase.from(table).update({ status: "archived" }).eq("id", currentChargerId);
                              toast.success(`Charger ${activeChargerIndex + 1} archived`);
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        )}
                        {chargerStatuses[currentChargerId] !== "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-muted-foreground"
                            onClick={() => {
                              setChargerStatuses((prev) => ({ ...prev, [currentChargerId]: "pending" }));
                              const table = selectedSubmission.source === "assessment" ? "assessment_chargers" : "charger_submissions";
                              supabase.from(table).update({ status: "pending" }).eq("id", currentChargerId);
                            }}
                          >
                            <Clock className="h-4 w-4" />
                            Reset
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Service Request */}
                  <Card className="border border-border/60">
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-semibold text-foreground text-sm">Service Request</h3>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant={chargerServiceNeeded[currentChargerId] === true ? "default" : "outline"}
                          className={`gap-1.5 ${chargerServiceNeeded[currentChargerId] === true ? "bg-optimal text-optimal-foreground hover:bg-optimal/90" : ""}`}
                          onClick={async () => {
                            setChargerServiceNeeded((prev) => ({ ...prev, [currentChargerId]: true }));
                            // Create service ticket immediately
                            const store = useServiceTicketsStore.getState();
                            const validBrands: ChargerBrand[] = ["BTC", "ABB", "Delta", "Tritium", "Signet", "Other"];
                            const mapBrand = (b: string): ChargerBrand | "" => {
                              const upper = b?.toUpperCase() || "";
                              const found = validBrands.find((v) => upper.includes(v.toUpperCase()));
                              return found || (b ? "Other" : "");
                            };
                            const ch = selectedSubmission.chargers.find(c => c.id === currentChargerId);
                            if (ch) {
                              const now = new Date().toISOString();
                              const ticketId = store.getNextTicketId();
                              store.addTicket({
                                id: `st-${Date.now()}`,
                                ticketId,
                                source: "noch_plus",
                                customer: {
                                  name: selectedSubmission.full_name,
                                  company: selectedSubmission.company_name,
                                  email: selectedSubmission.email,
                                  phone: selectedSubmission.phone,
                                  address: `${selectedSubmission.street_address}, ${selectedSubmission.city}, ${selectedSubmission.state} ${selectedSubmission.zip_code}`,
                                },
                                charger: {
                                  brand: mapBrand(ch.brand),
                                  serialNumber: ch.serial_number || "",
                                  type: (ch.charger_type === "DC" || ch.charger_type === "DC | Level 3" ? "DC_L3" : "AC_L2") as TicketChargerInfo["type"],
                                  location: `${selectedSubmission.city}, ${selectedSubmission.state}`,
                                },
                                photos: [],
                                issue: { description: ch.known_issues || chargerNotes[currentChargerId] || "Service requested via Noch+ submission." },
                                priority: "Medium",
                                status: "pending_review",
                                currentStep: 1,
                                workflowSteps: makeSteps(1),
                                createdAt: now,
                                updatedAt: now,
                                history: [{ id: `h-${Date.now()}`, timestamp: now, action: "Ticket created from Noch+ submission", performedBy: "System" }],
                                metadata: { campaignName: `Submission ${selectedSubmission.submission_id}` },
                              });
                              toast.success(`Service ticket ${ticketId} created in Service Desk.`, { duration: 5000 });
                            }
                          }}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Yes — Open Ticket
                        </Button>
                        <Button
                          size="sm"
                          variant={chargerServiceNeeded[currentChargerId] === false ? "default" : "outline"}
                          className={`gap-1.5 ${chargerServiceNeeded[currentChargerId] === false ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
                          onClick={() =>
                            setChargerServiceNeeded((prev) => ({ ...prev, [currentChargerId]: false }))
                          }
                        >
                          <XCircle className="h-4 w-4" />
                          No
                        </Button>
                      </div>
                      {chargerServiceNeeded[currentChargerId] === true && (
                        <Badge className="bg-optimal/15 text-optimal border-optimal/30 gap-1">
                          <CheckCircle className="h-3 w-3" /> Ticket Created
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Per-charger Notes */}
                {(
                  <Card className="border border-border/60">
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-semibold text-foreground text-sm">
                        Notes — Charger {activeChargerIndex + 1}
                      </h3>
                      {isEditing ? (
                        <Textarea
                          value={chargerNotes[currentChargerId] || ""}
                          onChange={(e) =>
                            setChargerNotes((prev) => ({ ...prev, [currentChargerId]: e.target.value }))
                          }
                          placeholder="Add notes for this charger..."
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm text-foreground">{chargerNotes[currentChargerId] || "No notes"}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Save / Cancel bar when editing */}
                {isEditing && (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button className="gap-2" onClick={handleSaveEdit} disabled={savingEdit}>
                      {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
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

        {/* Photo Lightbox */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxUrl(null)}
          >
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-card/80 flex items-center justify-center hover:bg-card transition-colors"
            >
              <X className="h-6 w-6 text-foreground" />
            </button>
            <img
              src={lightboxUrl}
              alt="Charger photo"
              className="max-w-[90vw] max-h-[85vh] rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
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
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
            <TabsTrigger value="draft">Drafts{stats.drafts > 0 ? ` (${stats.drafts})` : ""}</TabsTrigger>
            <TabsTrigger value="pending_review">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button className="gap-2 ml-auto" onClick={() => setNewSubmissionOpen(true)}>
          <Plus className="h-4 w-4" /> New Submission
        </Button>
      </div>

      <NewSubmissionModal
        open={newSubmissionOpen}
        onOpenChange={(val) => {
          setNewSubmissionOpen(val);
          if (!val) setEditingDraft(null);
        }}
        onSubmitted={fetchSubmissions}
        draftData={editingDraft}
      />

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
                      {sub.status === "draft" ? (
                        <><Pencil className="h-4 w-4" />Resume</>
                      ) : (
                        <><Eye className="h-4 w-4" />View</>
                      )}
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
