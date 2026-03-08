import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Plus, Trash2, Loader2, AlertTriangle, X, Camera, ImagePlus,
} from "lucide-react";
import { CompanySearchDropdown } from "@/components/shared/CompanySearchDropdown";
import { SiteSearchDropdown } from "@/components/shared/SiteSearchDropdown";

const CHARGER_BRANDS = ["BTC", "ABB", "Delta", "Tritium", "Signet", "ChargePoint", "Other"];
const CHARGER_TYPES = ["AC | Level 2", "DC | Level 3"];

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS = 10;

interface PhotoEntry {
  file: File;
  previewUrl: string;
}

interface ChargerEntry {
  id: string;
  brand: string;
  serialNumber: string;
  chargerType: string;
  installationLocation: string;
  knownIssues: string;
  isWorking: string;
  underWarranty: string;
}

const createEmptyCharger = (): ChargerEntry => ({
  id: crypto.randomUUID(),
  brand: "",
  serialNumber: "",
  chargerType: "",
  installationLocation: "",
  knownIssues: "",
  isWorking: "",
  underWarranty: "",
});

type Step = 1 | 2 | 3;
type InternalSubmissionType = "assessment" | "repair";

interface DraftData {
  id: string;
  submissionId: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  chargers: ChargerEntry[];
  customerNotes: string;
  serviceUrgency: string;
  step: Step;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
  draftData?: DraftData | null;
}

export function NewSubmissionModal({ open, onOpenChange, onSubmitted, draftData }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftSubmissionId, setDraftSubmissionId] = useState<string | null>(null);

  // Submission type
  const [submissionType, setSubmissionType] = useState<InternalSubmissionType>("assessment");

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Site fields
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [siteState, setSiteState] = useState("");
  const [siteZip, setSiteZip] = useState("");
  const [locationDescriptor, setLocationDescriptor] = useState("");

  // Step 2 fields
  const [chargers, setChargers] = useState<ChargerEntry[]>([createEmptyCharger()]);

  // Photos (submission-level)
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);

  // Step 3 fields
  const [customerNotes, setCustomerNotes] = useState("");
  const [serviceUrgency, setServiceUrgency] = useState("");

  // Load draft data when provided
  const loadDraft = (draft: DraftData) => {
    setDraftId(draft.id);
    setDraftSubmissionId(draft.submissionId);
    setFullName(draft.fullName);
    setCompanyName(draft.companyName);
    setEmail(draft.email);
    setPhone(draft.phone);
    setChargers(draft.chargers.length > 0 ? draft.chargers : [createEmptyCharger()]);
    setCustomerNotes(draft.customerNotes);
    setServiceUrgency(draft.serviceUrgency);
    setStep(draft.step || 1);
  };

  // When modal opens with draft data, populate fields
  useState(() => {
    if (draftData && open) loadDraft(draftData);
  });

  // Watch for draftData changes
  if (draftData && open && draftId !== draftData.id) {
    loadDraft(draftData);
  }

  const resetForm = () => {
    setStep(1);
    setSubmissionType("assessment");
    setFullName("");
    setCompanyName("");
    setCompanyId(null);
    setEmail("");
    setPhone("");
    setSiteId(null);
    setSiteName("");
    setSiteAddress("");
    setSiteCity("");
    setSiteState("");
    setSiteZip("");
    setChargers([createEmptyCharger()]);
    setPhotos([]);
    setCustomerNotes("");
    setServiceUrgency("");
    setErrors({});
    setDraftId(null);
    setDraftSubmissionId(null);
  };

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const updateCharger = (id: string, field: keyof ChargerEntry, value: string) => {
    setChargers(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addCharger = () => {
    if (chargers.length >= 50) return;
    setChargers(prev => [...prev, createEmptyCharger()]);
  };

  const removeCharger = (id: string) => {
    if (chargers.length <= 1) return;
    setChargers(prev => prev.filter(c => c.id !== id));
  };

  // Photo handlers
  const handlePhotoAdd = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => {
      if (!ALLOWED_PHOTO_TYPES.includes(f.type)) {
        toast.error(`${f.name}: Invalid format. Use JPG, PNG, WebP, or HEIC.`);
        return false;
      }
      if (f.size > MAX_PHOTO_SIZE) {
        toast.error(`${f.name}: Too large. Max 10MB per photo.`);
        return false;
      }
      return true;
    });
    if (photos.length + valid.length > MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }
    const newEntries: PhotoEntry[] = valid.map(f => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setPhotos(prev => [...prev, ...newEntries]);
  };

  const removeSubmissionPhoto = (index: number) => {
    setPhotos(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Name is required";
    if (!companyName.trim()) e.companyName = "Company name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email is required";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) e.phone = "Valid phone is required";
    if (!siteId && !siteName.trim()) e.site = "Please select or add a site";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    chargers.forEach((c, i) => {
      if (!c.brand) e[`charger_${i}_brand`] = "Brand is required";
      if (!c.chargerType) e[`charger_${i}_type`] = "Type is required";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  /** Create a new customer if no companyId, return the ID */
  const resolveCompanyId = async (): Promise<string | null> => {
    if (companyId) return companyId;
    if (!companyName.trim()) return null;
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          company: companyName.trim(),
          contact_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
        })
        .select("id")
        .single();
      if (error) { console.error("Customer creation error:", error); return null; }
      return data?.id || null;
    } catch { return null; }
  };

  /** Create a new location if no siteId exists */
  const resolveSiteId = async (custId: string): Promise<string | null> => {
    if (siteId) return siteId;
    if (!siteName.trim()) return null;
    try {
      const { data, error } = await supabase
        .from("locations" as any)
        .insert({
          customer_id: custId,
          site_name: siteName.trim(),
          address: siteAddress.trim(),
          city: siteCity.trim(),
          state: siteState,
          zip: siteZip.trim(),
        } as any)
        .select("id")
        .single();
      if (error) { console.error("Location creation error:", error); return null; }
      return (data as any)?.id || null;
    } catch { return null; }
  };

  /** Upload submission-level photos to storage */
  const uploadPhotos = async (recordId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const photo of photos) {
      try {
        const ext = photo.file.name.split(".").pop() || "jpg";
        const path = `${recordId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("submission-photos")
          .upload(path, photo.file, { contentType: photo.file.type, upsert: false });
        if (!error) urls.push(path);
      } catch (err) {
        console.error("Photo upload error:", err);
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const resolvedCompanyId = await resolveCompanyId();
      const resolvedSiteId = resolvedCompanyId ? await resolveSiteId(resolvedCompanyId) : null;

      if (draftId) {
        // Update existing draft → pending_review (legacy path for old drafts)
        await supabase.from("submissions").update({
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          street_address: siteAddress.trim() || siteName.trim(),
          city: siteCity.trim() || siteName.trim(),
          state: siteState || "—",
          zip_code: siteZip.trim() || "00000",
          service_urgency: serviceUrgency || null,
          customer_notes: customerNotes.trim() || null,
          status: "pending_review",
        }).eq("id", draftId);

        await supabase.from("charger_submissions").delete().eq("submission_id", draftId);
        for (const charger of chargers) {
          await supabase.from("charger_submissions").insert({
            submission_id: draftId,
            brand: charger.brand,
            serial_number: charger.serialNumber || null,
            charger_type: charger.chargerType,
            installation_location: charger.installationLocation || null,
            known_issues: charger.knownIssues || null,
          });
        }

        toast.success(`Submission ${draftSubmissionId} submitted successfully.`);
      } else {
        const year = new Date().getFullYear();
        const hex = crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
        const submissionId = `NP-${year}-${hex}`;

        if (submissionType === "repair") {
          const { data: ticket, error: ticketError } = await supabase
            .from("service_tickets")
            .insert({
              ticket_id: submissionId,
              source: "manual_entry",
              status: "New",
              company_id: resolvedCompanyId,
              company_name: companyName.trim(),
              full_name: fullName.trim(),
              email: email.trim().toLowerCase(),
              phone: phone.trim(),
              street_address: siteAddress.trim() || null,
              city: siteCity.trim() || siteName.trim(),
              state: siteState || "—",
              zip_code: siteZip.trim() || null,
              customer_notes: customerNotes.trim() || null,
              service_urgency: serviceUrgency || null,
              location_id: resolvedSiteId,
            } as any)
            .select()
            .single();

          if (ticketError) throw ticketError;

          // Upload photos and store URLs
          const photoUrls = await uploadPhotos(ticket.id);

          for (const charger of chargers) {
            await supabase.from("ticket_chargers").insert({
              ticket_id: ticket.id,
              brand: charger.brand,
              charger_type: charger.chargerType,
              serial_number: charger.serialNumber || null,
              installation_location: charger.installationLocation || null,
              known_issues: charger.knownIssues || null,
              is_working: charger.isWorking || null,
              under_warranty: charger.underWarranty || null,
              photo_urls: photoUrls,
            });
          }

          toast.success(`Repair ticket ${submissionId} created successfully.`);
        } else {
          const { data: submission, error: subError } = await supabase
            .from("noch_plus_submissions")
            .insert({
              submission_id: submissionId,
              submission_type: "assessment",
              company_id: resolvedCompanyId,
              full_name: fullName.trim(),
              company_name: companyName.trim(),
              email: email.trim().toLowerCase(),
              phone: phone.trim(),
              street_address: siteAddress.trim() || siteName.trim(),
              city: siteCity.trim() || siteName.trim(),
              state: siteState || "—",
              zip_code: siteZip.trim() || "00000",
              referral_source: "manual_entry",
              service_urgency: serviceUrgency || null,
              customer_notes: customerNotes.trim() || null,
              noch_plus_member: false,
              location_id: resolvedSiteId,
            } as any)
            .select()
            .single();

          if (subError) throw subError;

          // Upload photos and store URLs
          const photoUrls = await uploadPhotos(submission.id);

          for (const charger of chargers) {
            await supabase.from("assessment_chargers").insert({
              submission_id: submission.id,
              brand: charger.brand,
              charger_type: charger.chargerType,
              serial_number: charger.serialNumber || null,
              installation_location: charger.installationLocation || null,
              known_issues: charger.knownIssues || null,
              photo_urls: photoUrls,
            });
          }

          toast.success(`Assessment ${submissionId} created successfully.`);
        }
      }

      resetForm();
      onOpenChange(false);
      onSubmitted();
    } catch (err: any) {
      console.error("Manual submission error:", err);
      toast.error(`Failed to create submission: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isFormDirty = () => {
    const hasContactInfo = !!(fullName || companyName || email || phone || siteName);
    const hasChargerInfo = chargers.some(c => !!(c.brand || c.serialNumber || c.chargerType || c.installationLocation || c.knownIssues || c.isWorking || c.underWarranty));
    const hasNotes = !!(customerNotes || serviceUrgency);
    const hasPhotos = photos.length > 0;
    return hasContactInfo || hasChargerInfo || hasNotes || hasPhotos;
  };

  const handleOpenChange = (val: boolean) => {
    if (!val && isFormDirty()) {
      setShowCloseWarning(true);
      return;
    }
    if (!val) resetForm();
    onOpenChange(val);
  };

  const handleDiscard = async () => {
    setShowCloseWarning(false);
    if (draftId) {
      await supabase.from("charger_submissions").delete().eq("submission_id", draftId);
      await supabase.from("submissions").delete().eq("id", draftId);
    }
    resetForm();
    onOpenChange(false);
    onSubmitted();
  };

  const handleSaveDraft = async () => {
    setShowCloseWarning(false);
    try {
      const subId = draftSubmissionId || (() => {
        const year = new Date().getFullYear();
        const hex = crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
        return `NP-${year}-${hex}`;
      })();

      if (draftId) {
        await supabase.from("submissions").update({
          full_name: fullName.trim() || "Draft",
          company_name: companyName.trim() || "Draft",
          email: email.trim() || "draft@placeholder.com",
          phone: phone.trim() || "0000000000",
          street_address: siteAddress.trim() || "",
          city: siteCity.trim() || "—",
          state: siteState || "—",
          zip_code: siteZip.trim() || "00000",
          customer_notes: customerNotes || null,
          service_urgency: serviceUrgency || null,
          status: "draft",
        }).eq("id", draftId);

        await supabase.from("charger_submissions").delete().eq("submission_id", draftId);
        for (const ch of chargers) {
          await supabase.from("charger_submissions").insert({
            submission_id: draftId,
            brand: ch.brand || "Unknown",
            charger_type: ch.chargerType || "AC | Level 2",
            serial_number: ch.serialNumber || null,
            installation_location: ch.installationLocation || null,
            known_issues: ch.knownIssues || null,
          });
        }
      } else {
        const { data: submission, error } = await supabase.from("submissions").insert({
          submission_id: subId,
          full_name: fullName.trim() || "Draft",
          company_name: companyName.trim() || "Draft",
          email: email.trim() || "draft@placeholder.com",
          phone: phone.trim() || "0000000000",
          street_address: siteAddress.trim() || "",
          city: siteCity.trim() || "—",
          state: siteState || "—",
          zip_code: siteZip.trim() || "00000",
          referral_source: "manual_entry",
          customer_notes: customerNotes || null,
          service_urgency: serviceUrgency || null,
          status: "draft",
        }).select("id").single();

        if (error) throw error;

        for (const ch of chargers) {
          await supabase.from("charger_submissions").insert({
            submission_id: submission.id,
            brand: ch.brand || "Unknown",
            charger_type: ch.chargerType || "AC | Level 2",
            serial_number: ch.serialNumber || null,
            installation_location: ch.installationLocation || null,
            known_issues: ch.knownIssues || null,
          });
        }
      }

      resetForm();
      onOpenChange(false);
      onSubmitted();
      toast.success("Draft saved — you can resume it anytime.");
    } catch (err: any) {
      console.error("Draft save error:", err);
      toast.error(`Failed to save draft: ${err.message}`);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            s < step ? "bg-primary text-primary-foreground" :
            s === step ? "bg-primary text-primary-foreground" :
            "bg-muted text-muted-foreground"
          }`}>
            {s < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
          </div>
          {s < 3 && <div className={`w-6 h-0.5 ${s < step ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto pointer-events-auto z-[2200]">
        <DialogHeader>
          <DialogTitle>New Submission</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Enter customer contact & site details" :
             step === 2 ? "Add charger information & photos" :
             "Review & submit"}
          </DialogDescription>
        </DialogHeader>

        {/* Submission Type Toggle */}
        <div className="mb-2">
          <Label className="text-sm mb-1.5 block">Submission Type</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={submissionType === "assessment" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setSubmissionType("assessment")}
            >
              Assessment
            </Button>
            <Button
              type="button"
              size="sm"
              variant={submissionType === "repair" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setSubmissionType("repair")}
            >
              Repair
            </Button>
          </div>
        </div>

        <StepIndicator />

        {/* STEP 1: Contact & Site */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Smith" />
                {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <CompanySearchDropdown
                  value={companyName}
                  companyId={companyId}
                  onChange={(name, id) => { setCompanyName(name); setCompanyId(id); }}
                  usePublicEndpoint={false}
                  error={errors.companyName}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div>
                <Label>Phone *</Label>
                <Input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(555) 123-4567" />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>

              {/* Site Selector */}
              <div className="sm:col-span-2">
                <SiteSearchDropdown
                  companyId={companyId}
                  selectedSiteId={siteId}
                  onSiteChange={(site) => {
                    setSiteId(site.id);
                    setSiteName(site.siteName);
                    setSiteAddress(site.address);
                    setSiteCity(site.city);
                    setSiteState(site.state);
                    setSiteZip(site.zip);
                  }}
                  usePublicEndpoint={false}
                  error={errors.site}
                  descriptor={locationDescriptor}
                  onDescriptorChange={setLocationDescriptor}
                />
              </div>
            </div>

            <Button size="lg" className="w-full gap-2" onClick={handleNext}>
              Next: Chargers <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* STEP 2: Chargers + Photos */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {chargers.length} charger{chargers.length > 1 ? "s" : ""} added
              </span>
              <Badge variant="outline">{chargers.length}/50</Badge>
            </div>

            <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
              {chargers.map((charger, idx) => (
                <Card key={charger.id} className="border-border/70">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm">Charger {idx + 1}</span>
                      {chargers.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeCharger(charger.id)} className="text-destructive hover:text-destructive h-7 px-2">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Brand *</Label>
                        <Select value={charger.brand} onValueChange={v => updateCharger(charger.id, "brand", v)}>
                          <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                          <SelectContent>{CHARGER_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                        </Select>
                        {errors[`charger_${idx}_brand`] && <p className="text-xs text-destructive mt-1">{errors[`charger_${idx}_brand`]}</p>}
                      </div>
                      <div>
                        <Label className="text-xs">Charger Type *</Label>
                        <Select value={charger.chargerType} onValueChange={v => updateCharger(charger.id, "chargerType", v)}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>{CHARGER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                        {errors[`charger_${idx}_type`] && <p className="text-xs text-destructive mt-1">{errors[`charger_${idx}_type`]}</p>}
                      </div>
                      <div>
                        <Label className="text-xs">Serial Number</Label>
                        <Input value={charger.serialNumber} onChange={e => updateCharger(charger.id, "serialNumber", e.target.value)} placeholder="If visible" className="text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Company Name</Label>
                        <Input value={charger.installationLocation} onChange={e => updateCharger(charger.id, "installationLocation", e.target.value)} placeholder="e.g., Acme Corp" className="text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Is the charger working?</Label>
                        <div className="flex gap-2 mt-1">
                          <Button type="button" size="sm" variant={charger.isWorking === "yes" ? "default" : "outline"} className="flex-1" onClick={() => updateCharger(charger.id, "isWorking", "yes")}>Yes</Button>
                          <Button type="button" size="sm" variant={charger.isWorking === "no" ? "default" : "outline"} className="flex-1" onClick={() => updateCharger(charger.id, "isWorking", "no")}>No</Button>
                        </div>
                        <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer text-xs text-muted-foreground">
                          <Checkbox checked={charger.isWorking === "unknown"} onCheckedChange={(checked) => updateCharger(charger.id, "isWorking", checked ? "unknown" : "")} className="h-3.5 w-3.5 rounded-full" />
                          I don't know
                        </label>
                      </div>
                      <div>
                        <Label className="text-xs">Under warranty?</Label>
                        <div className="flex gap-2 mt-1">
                          <Button type="button" size="sm" variant={charger.underWarranty === "yes" ? "default" : "outline"} className="flex-1" onClick={() => updateCharger(charger.id, "underWarranty", "yes")}>Yes</Button>
                          <Button type="button" size="sm" variant={charger.underWarranty === "no" ? "default" : "outline"} className="flex-1" onClick={() => updateCharger(charger.id, "underWarranty", "no")}>No</Button>
                        </div>
                        <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer text-xs text-muted-foreground">
                          <Checkbox checked={charger.underWarranty === "unknown"} onCheckedChange={(checked) => updateCharger(charger.id, "underWarranty", checked ? "unknown" : "")} className="h-3.5 w-3.5 rounded-full" />
                          I don't know
                        </label>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Known Issues</Label>
                        <Textarea value={charger.knownIssues} onChange={e => updateCharger(charger.id, "knownIssues", e.target.value)} placeholder="Any problems or concerns?" rows={2} className="text-sm" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {chargers.length < 50 && (
              <Button variant="outline" className="w-full gap-2" onClick={addCharger}>
                <Plus className="h-4 w-4" /> Add Another Charger
              </Button>
            )}

            {/* Photo Upload Section */}
            <Card className="border-border/70">
              <CardContent className="p-4">
                <div className="mb-2">
                  <Label className="text-sm font-medium">Photos (Optional)</Label>
                  <p className="text-xs text-muted-foreground">Upload photos of the charger, damage, or any relevant issues</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                      <img src={photo.previewUrl} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeSubmissionPhoto(i)}
                        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground mt-0.5">Add Photo</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        multiple
                        className="hidden"
                        onChange={e => handlePhotoAdd(e.target.files)}
                      />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  JPG, PNG, WebP, HEIC • Max 10MB each • Up to {MAX_PHOTOS} photos
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1 gap-2" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button size="lg" className="flex-1 gap-2" onClick={handleNext}>
                Next: Review <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-4">
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Submission Summary</h4>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{submissionType}</span></div>
                  <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{fullName}</span></div>
                  <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{companyName}</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{email}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{phone}</span></div>
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Site:</span> <span className="font-medium">{siteName || "—"} {siteCity && `— ${siteCity}, ${siteState}`}</span></div>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <span className="text-muted-foreground text-sm">Chargers:</span>{" "}
                  <span className="font-medium text-sm">{chargers.length}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {chargers.map((c) => (
                      <Badge key={c.id} variant="outline" className="text-xs">
                        {c.brand || "Unknown"} — {c.chargerType || "N/A"}
                      </Badge>
                    ))}
                  </div>
                </div>
                {photos.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-muted-foreground text-sm">Photos:</span>{" "}
                    <span className="font-medium text-sm">{photos.length}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div>
              <Label className="text-sm">Service Urgency</Label>
              <Select value={serviceUrgency} onValueChange={setServiceUrgency}>
                <SelectTrigger><SelectValue placeholder="Select urgency (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — No rush</SelectItem>
                  <SelectItem value="medium">Medium — Within a week</SelectItem>
                  <SelectItem value="high">High — ASAP</SelectItem>
                  <SelectItem value="critical">Critical — Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Internal Notes (optional)</Label>
              <Textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} placeholder="Notes about this submission..." rows={3} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1 gap-2" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button size="lg" className="flex-1 gap-2" disabled={submitting} onClick={handleSubmit}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                ) : (
                  <>Create {submissionType === "repair" ? "Repair Ticket" : "Assessment"} <CheckCircle2 className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
      <AlertDialogContent className="z-[2500]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            You have unsaved information in this submission. Would you like to keep it as a draft and continue later, or discard everything?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowCloseWarning(false)}>
            Go Back
          </AlertDialogCancel>
          <Button variant="destructive" onClick={handleDiscard}>
            Discard
          </Button>
          <AlertDialogAction onClick={handleSaveDraft}>
            Save as Draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
