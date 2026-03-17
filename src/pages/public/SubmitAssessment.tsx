import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  CheckCircle2, Clock, Zap, Camera,
  Plus, Trash2, Loader2, ArrowRight, X, LocateFixed,
  Users, Monitor, BadgePercent, Package, Wrench, CreditCard, Shield,
  Hash, ImagePlus, Search
} from "lucide-react";
import evChargerBg from "@/assets/ev-charger-bg.png";
import medalBadge from "@/assets/medal-badge.png";
import AnimatedLandingPage from "@/components/public/AnimatedLandingPage";

import { SiteSearchDropdown } from "@/components/shared/SiteSearchDropdown";

const CHARGER_BRANDS = ["BTC", "ABB", "Delta", "Tritium", "Signet", "ChargePoint", "Other"];
const CHARGER_TYPES = ["AC | Level 2", "DC | Level 3"];

interface ChargerPhoto {
  file: File;
  previewUrl: string;
  label: "front_view" | "serial_number" | "additional";
}

interface ChargerEntry {
  id: string;
  brand: string;
  serialNumber: string;
  chargerType: string;
  installationLocation: string;
  knownIssues: string;
  photos: ChargerPhoto[];
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
  photos: [],
  isWorking: "",
  underWarranty: "",
});

type FormStep = "landing" | "step0" | "step1" | "step2" | "oem_question" | "membership" | "step3";
type SubmissionType = "assessment" | "repair" | "";

export default function SubmitAssessment() {
  usePageTitle('Submit a Request');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>("landing");
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [submissionType, setSubmissionType] = useState<SubmissionType>("");

  // Customer fields
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

  // Chargers
  const [chargers, setChargers] = useState<ChargerEntry[]>([createEmptyCharger()]);

  // Noch+
  const [nochPlus, setNochPlus] = useState(false);

  // OEM ticket (repair only)
  const [oemTicketExists, setOemTicketExists] = useState<"yes" | "no" | "unknown" | "">("");
  const [oemTicketNumber, setOemTicketNumber] = useState("");

  // Terms
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [contactConsent, setContactConsent] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle return from Stripe checkout
  useEffect(() => {
    const membership = searchParams.get("membership");
    if (membership === "success") {
      setNochPlus(true);
      setCurrentStep("step3");
      toast.success("Membership payment successful! Complete your submission below.");
      window.history.replaceState({}, "", "/submit");
    } else if (membership === "cancelled") {
      setCurrentStep("membership");
      toast.info("Membership signup was cancelled. You can still submit your assessment.");
      window.history.replaceState({}, "", "/submit");
    }
  }, [searchParams]);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const updateCharger = (id: string, field: keyof ChargerEntry, value: any) => {
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

  const handlePhotoUpload = (chargerId: string, files: FileList | null, label: ChargerPhoto["label"]) => {
    if (!files) return;
    const fileArr = Array.from(files).filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith("image/"));
    if (fileArr.length === 0) { toast.error("Invalid file. Max 5MB, images only."); return; }
    setChargers(prev => prev.map(c => {
      if (c.id !== chargerId) return c;
      if (c.photos.length + fileArr.length > 6) {
        toast.error("Maximum 6 photos per charger.");
        return c;
      }
      const newPhotos: ChargerPhoto[] = fileArr.map(f => ({ file: f, previewUrl: URL.createObjectURL(f), label }));
      return { ...c, photos: [...c.photos, ...newPhotos] };
    }));
  };

  const removePhoto = (chargerId: string, index: number) => {
    setChargers(prev => prev.map(c => {
      if (c.id !== chargerId) return c;
      const photos = [...c.photos];
      URL.revokeObjectURL(photos[index].previewUrl);
      photos.splice(index, 1);
      return { ...c, photos };
    }));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Name is required";
    if (!companyName.trim()) e.companyName = "Company name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email is required";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) e.phone = "Valid phone number is required";
    if (!siteId && !siteName.trim()) e.site = "Please select or add a site";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    chargers.forEach((c, i) => {
      if (!c.brand) e[`charger_${i}_brand`] = "Brand is required";
      if (!c.chargerType) e[`charger_${i}_type`] = "Charger type is required";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!termsAgreed) e.terms = "You must agree to the terms";
    if (!contactConsent) e.consent = "You must consent to being contacted";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNextStep1 = () => {
    if (validateStep1()) {
      setCurrentStep("step2");
      window.scrollTo(0, 0);
    } else {
      toast.error("Please fix the errors before continuing.");
    }
  };

  const handleNextStep2 = () => {
    if (validateStep2()) {
      if (submissionType === "repair") {
        setCurrentStep("oem_question");
      } else {
        setCurrentStep("membership");
      }
      window.scrollTo(0, 0);
    } else {
      toast.error("Please fix the errors before continuing.");
    }
  };

  const handleNextOem = () => {
    setCurrentStep("step3");
    window.scrollTo(0, 0);
  };

  const handleSubscribe = async () => {
    setMembershipLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-membership-checkout", {
        body: {
          email: email.trim().toLowerCase(),
          chargerCount: chargers.length,
          fullName: fullName.trim(),
          companyName: companyName.trim(),
        },
      });

      if (error) throw error;
      if (data?.url) {
        sessionStorage.setItem("submit-form-state", JSON.stringify({
          fullName, companyName, companyId, email, phone,
          siteId, siteName, siteAddress, siteCity, siteState, siteZip,
          chargers: chargers.map(c => ({ ...c, photos: [], photoPreviewUrls: [] })),
          customerNotes, termsAgreed, contactConsent, submissionType,
        }));
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Membership checkout error:", err);
      toast.error("Could not start membership checkout. Please try again.");
    } finally {
      setMembershipLoading(false);
    }
  };

  const handleSkipMembership = () => {
    setNochPlus(false);
    setCurrentStep("step3");
    window.scrollTo(0, 0);
  };

  // Restore form state after Stripe redirect
  useEffect(() => {
    const saved = sessionStorage.getItem("submit-form-state");
    if (saved && (searchParams.get("membership") === "success" || searchParams.get("membership") === "cancelled")) {
      try {
        const s = JSON.parse(saved);
        setFullName(s.fullName || "");
        setCompanyName(s.companyName || "");
        setCompanyId(s.companyId || null);
        setEmail(s.email || "");
        setPhone(s.phone || "");
        setSiteId(s.siteId || null);
        setSiteName(s.siteName || "");
        setSiteAddress(s.siteAddress || "");
        setSiteCity(s.siteCity || "");
        setSiteState(s.siteState || "");
        setSiteZip(s.siteZip || "");
        if (s.chargers?.length) setChargers(s.chargers);
        setCustomerNotes(s.customerNotes || "");
        setTermsAgreed(s.termsAgreed || false);
        setContactConsent(s.contactConsent || false);
        if (s.submissionType) setSubmissionType(s.submissionType);
        sessionStorage.removeItem("submit-form-state");
      } catch { /* ignore */ }
    }
  }, [searchParams]);

  /** Create a new customer if no companyId exists, return the company ID */
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

      if (error) {
        console.error("Customer creation error:", error);
        return null;
      }
      return data?.id || null;
    } catch {
      return null;
    }
  };

  /** Create a new location if no siteId exists, return the location ID */
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

      if (error) {
        console.error("Location creation error:", error);
        return null;
      }
      return (data as any)?.id || null;
    } catch {
      return null;
    }
  };

  /** Save descriptor to charger_locations for future auto-suggest */
  const saveDescriptor = async (locId: string | null, desc: string) => {
    if (!locId || !desc.trim()) return;
    try {
      await supabase.from("charger_locations" as any).upsert(
        { location_id: locId, descriptor: desc.trim() } as any,
        { onConflict: "location_id,descriptor" }
      );
    } catch { /* ignore duplicates */ }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) { toast.error("Please fix the errors before submitting."); return; }
    setSubmitting(true);

    try {
      const year = new Date().getFullYear();
      const hex = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
      const submissionId = `NP-${year}-${hex}`;

      const resolvedCompanyId = await resolveCompanyId();
      const resolvedSiteId = resolvedCompanyId ? await resolveSiteId(resolvedCompanyId) : null;

      if (submissionType === "repair") {
        const { data: ticket, error: ticketError } = await supabase
          .from("service_tickets")
          .insert({
            ticket_id: submissionId,
            source: "customer_submission",
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
            oem_ticket_exists: oemTicketExists || null,
            oem_ticket_number: oemTicketNumber.trim() || null,
            customer_notes: customerNotes.trim() || null,
            location_id: resolvedSiteId,
          } as any)
          .select()
          .single();

        if (ticketError) throw ticketError;

        for (const charger of chargers) {
          const photoUrls: string[] = [];
          for (const photo of charger.photos) {
            try {
              const formData = new FormData();
              formData.append("file", photo.file);
              formData.append("submission_id", ticket.id);
              formData.append("charger_id", charger.id);
              const uploadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-submission-photo`;
              const res = await fetch(uploadUrl, { method: "POST", body: formData });
              if (res.ok) {
                const result = await res.json();
                if (result.path) photoUrls.push(result.path);
              }
            } catch (photoErr) { console.error("Photo upload error:", photoErr); }
          }

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
            location_descriptor: locationDescriptor.trim() || null,
          });
        }

        await saveDescriptor(resolvedSiteId, locationDescriptor);

        navigate(`/submit/confirmation/${submissionId}`, {
          state: {
            fullName, email, phone, companyName,
            chargerCount: chargers.length,
            submissionId,
            nochPlus: false,
            submittedAt: new Date().toISOString(),
            submissionType: "repair",
          }
        });
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
            referral_source: null,
            assessment_needs: null,
            service_urgency: null,
            customer_notes: customerNotes.trim() || null,
            noch_plus_member: nochPlus,
            location_id: resolvedSiteId,
          } as any)
          .select()
          .single();

        if (subError) throw subError;

        for (const charger of chargers) {
          const photoUrls: string[] = [];
          for (const photo of charger.photos) {
            try {
              const formData = new FormData();
              formData.append("file", photo.file);
              formData.append("submission_id", submission.id);
              formData.append("charger_id", charger.id);
              const uploadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-submission-photo`;
              const res = await fetch(uploadUrl, { method: "POST", body: formData });
              if (res.ok) {
                const result = await res.json();
                if (result.path) photoUrls.push(result.path);
              }
            } catch (photoErr) { console.error("Photo upload error:", photoErr); }
          }

          await supabase.from("assessment_chargers").insert({
            submission_id: submission.id,
            brand: charger.brand,
            charger_type: charger.chargerType,
            serial_number: charger.serialNumber || null,
            installation_location: charger.installationLocation || null,
            known_issues: charger.knownIssues || null,
            photo_urls: photoUrls,
            location_descriptor: locationDescriptor.trim() || null,
          });
        }

        await saveDescriptor(resolvedSiteId, locationDescriptor);

        navigate(`/submit/confirmation/${submissionId}`, {
          state: {
            fullName, email, phone, companyName,
            chargerCount: chargers.length,
            submissionId,
            nochPlus,
            submittedAt: new Date().toISOString(),
            submissionType: "assessment",
          }
        });
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "step0": return 1;
      case "step1": return 2;
      case "step2": return 3;
      case "oem_question": return 3.5;
      case "membership": return 3.5;
      case "step3": return 4;
      default: return 0;
    }
  };
  const stepNumber = getStepNumber();

  // ─── LANDING PAGE ───
  if (currentStep === "landing") {
    return <AnimatedLandingPage onStart={() => setCurrentStep("step0")} />;
  }

  // ─── FORM HEADER ───
  const FormHeader = () => (
    <header className="border-b border-border/50 bg-gradient-to-r from-[hsl(170,40%,55%)] to-[hsl(175,35%,60%)]">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white">NOCH+</span>
        </div>
        <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
          {submissionType === "repair" ? "Repair Request" : "Free Assessment"}
        </Badge>
      </div>
    </header>
  );

  // ─── STEP PROGRESS ───
  const StepProgress = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            s < stepNumber ? "bg-primary text-primary-foreground" :
            s === Math.floor(stepNumber) ? "bg-primary text-primary-foreground" :
            "bg-muted text-muted-foreground"
          }`}>
            {s < stepNumber ? <CheckCircle2 className="h-4 w-4" /> : s}
          </div>
          {s < 4 && <div className={`w-8 h-0.5 ${s < stepNumber ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );

  // ─── STEP 0: SERVICE TYPE SELECTION ───
  if (currentStep === "step0") {
    return (
      <div className="min-h-screen bg-background">
        <FormHeader />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <StepProgress />
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">How can we help?</h1>
            <p className="text-muted-foreground">Select the type of service you need</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => { setSubmissionType("assessment"); setCurrentStep("step1"); window.scrollTo(0, 0); }}
              className="group flex flex-col items-center text-center gap-4 p-8 rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Search className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Site Assessment</h2>
                <p className="text-sm text-muted-foreground">Get a professional evaluation of your EV charging setup. Identify issues and explore upgrade options.</p>
              </div>
            </button>
            <button
              onClick={() => { setSubmissionType("repair"); setCurrentStep("step1"); window.scrollTo(0, 0); }}
              className="group flex flex-col items-center text-center gap-4 p-8 rounded-xl border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Wrench className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Request a Repair</h2>
                <p className="text-sm text-muted-foreground">Report a known issue with one or more of your chargers. Our team will dispatch a technician.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── MEMBERSHIP UPSELL PAGE (assessment only) ───
  if (currentStep === "membership") {
    return (
      <div className="min-h-screen bg-background">
        <FormHeader />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <img src={medalBadge} alt="Noch+ Badge" className="h-16 w-16" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Unlock Noch+ Membership</h1>
            <p className="text-muted-foreground">Get exclusive benefits for your {chargers.length} charger{chargers.length > 1 ? "s" : ""}</p>
          </div>

          <Card className="mb-6 border-primary shadow-lg">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-foreground">
                  $9<span className="text-lg font-normal text-muted-foreground">/mo per charger</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {chargers.length} charger{chargers.length > 1 ? "s" : ""} × $9 = <span className="font-semibold text-foreground">${chargers.length * 9}/mo</span>
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {[
                  { icon: Users, text: "Dedicated account manager" },
                  { icon: BadgePercent, text: "Member exclusive rate — 50% off" },
                  { icon: Package, text: "Parts discount — 20% off" },
                  { icon: Wrench, text: "Annual Preventive Maintenance — 50% off" },
                  { icon: Monitor, text: "Direct system access" },
                  { icon: Shield, text: "Priority support & response" },
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <benefit.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{benefit.text}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center mb-6 italic">
                For less than $0.30 a day, get peace of mind for your entire charging setup.
              </p>

              <Button size="lg" className="w-full text-lg gap-2 h-14" onClick={handleSubscribe} disabled={membershipLoading}>
                {membershipLoading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="h-5 w-5" /> Subscribe — ${chargers.length * 9}/mo</>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>Secure payment powered by Stripe</span>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <button onClick={handleSkipMembership} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors">
              Skip for now — continue with free assessment
            </button>
          </div>
        </div>

        <footer className="py-6 border-t border-border/50 bg-card">
          <div className="max-w-3xl mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Noch Power. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // ─── OEM TICKET QUESTION (repair path) ───
  if (currentStep === "oem_question") {
    return (
      <div className="min-h-screen bg-background">
        <FormHeader />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <StepProgress />
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">OEM Ticket Information</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Does this issue have an open ticket with the charger manufacturer (OEM)?
              </p>

              <div className="flex gap-3 mb-6">
                {(["yes", "no", "unknown"] as const).map((val) => (
                  <Button
                    key={val}
                    type="button"
                    size="lg"
                    variant={oemTicketExists === val ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setOemTicketExists(val)}
                  >
                    {val === "yes" ? "Yes" : val === "no" ? "No" : "I don't know"}
                  </Button>
                ))}
              </div>

              {oemTicketExists === "yes" && (
                <div className="mb-6">
                  <Label>OEM Ticket Number (optional)</Label>
                  <Input
                    value={oemTicketNumber}
                    onChange={(e) => setOemTicketNumber(e.target.value)}
                    placeholder="e.g. BTC-2024-00123"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => { setCurrentStep("step2"); window.scrollTo(0, 0); }}>
                  Back
                </Button>
                <Button size="lg" className="flex-1 gap-2" onClick={handleNextOem}>
                  Next <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <footer className="py-6 border-t border-border/50 bg-card">
          <div className="max-w-3xl mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Noch Power. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // ─── FORM STEPS ───
  return (
    <div className="min-h-screen bg-background">
      <FormHeader />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {submissionType === "repair" ? "Report a Repair" : "Submit Your Chargers"}
          </h1>
          <p className="text-muted-foreground">Fill in the basics — takes about 2 minutes</p>
        </div>

        <StepProgress />

        {/* Step 1: Contact & Site */}
        {currentStep === "step1" && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
                Your Information
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Smith" />
                  {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <Label>Company / Property *</Label>
                  <Input
                    value={companyName}
                    onChange={e => { setCompanyName(e.target.value); setCompanyId(null); }}
                    placeholder="Enter your company or property name"
                  />
                  {errors.companyName && <p className="text-xs text-destructive mt-1">{errors.companyName}</p>}
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
                    usePublicEndpoint={true}
                    error={errors.site}
                    descriptor={locationDescriptor}
                    onDescriptorChange={setLocationDescriptor}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => { setCurrentStep("step0"); window.scrollTo(0, 0); }}>
                  Back
                </Button>
                <Button size="lg" className="flex-1 gap-2" onClick={handleNextStep1}>
                  Next <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Chargers */}
        {currentStep === "step2" && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
                  Your Chargers
                </h3>
                <Badge variant="outline">{chargers.length} charger{chargers.length > 1 ? "s" : ""}</Badge>
              </div>

              <div className="space-y-4">
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
                          <Input value={charger.serialNumber} onChange={e => updateCharger(charger.id, "serialNumber", e.target.value)} placeholder="If visible on charger" className="text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Company Name</Label>
                          <Input value={charger.installationLocation} onChange={e => updateCharger(charger.id, "installationLocation", e.target.value)} placeholder="e.g., Acme Corp" className="text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Is the charger working? *</Label>
                          <div className="flex gap-2 mt-1">
                            <Button type="button" size="sm" variant={charger.isWorking === "yes" ? "default" : "outline"} className="flex-1" onClick={() => updateCharger(charger.id, "isWorking", "yes")}>Yes</Button>
                            <Button type="button" size="sm" variant={charger.isWorking === "no" ? "default" : "outline"} className="flex-1" onClick={() => updateCharger(charger.id, "isWorking", "no")}>No</Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Is the charger under warranty? *</Label>
                          <div className="flex gap-2 mt-1">
                            <Button type="button" size="sm" variant={charger.underWarranty === "yes" ? "default" : "outline"} className="flex-1" onClick={() => updateCharger(charger.id, "underWarranty", "yes")}>Yes</Button>
                            <Button type="button" size="sm" variant={charger.underWarranty === "no" ? "default" : "outline"} className="flex-1" onClick={() => updateCharger(charger.id, "underWarranty", "no")}>No</Button>
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Known Issues</Label>
                          <Textarea value={charger.knownIssues} onChange={e => updateCharger(charger.id, "knownIssues", e.target.value)} placeholder="Any problems or concerns?" rows={2} className="text-sm" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Photos (optional, up to 6)</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {charger.photos.map((photo, pi) => (
                              <div key={pi} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                                <img src={photo.previewUrl} alt={photo.label} className="w-full h-full object-cover" />
                                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center py-0.5 truncate">
                                  {photo.label === "front_view" ? "Front" : photo.label === "serial_number" ? "Serial #" : "Photo"}
                                </span>
                                <button onClick={() => removePhoto(charger.id, pi)} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}

                            {!charger.photos.some(p => p.label === "front_view") && charger.photos.length < 6 && (
                              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                                <Camera className="h-5 w-5 text-muted-foreground" />
                                <span className="text-[9px] text-muted-foreground mt-0.5 text-center leading-tight">Front View</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(charger.id, e.target.files, "front_view")} />
                              </label>
                            )}
                            {!charger.photos.some(p => p.label === "serial_number") && charger.photos.length < 6 && (
                              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                                <Hash className="h-5 w-5 text-muted-foreground" />
                                <span className="text-[9px] text-muted-foreground mt-0.5 text-center leading-tight">Serial #</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(charger.id, e.target.files, "serial_number")} />
                              </label>
                            )}
                            {charger.photos.length < 6 && (
                              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                                <span className="text-[9px] text-muted-foreground mt-0.5 text-center leading-tight">Add More</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(charger.id, e.target.files, "additional")} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {chargers.length < 50 && (
                <Button variant="outline" className="w-full mt-4 gap-2" onClick={addCharger}>
                  <Plus className="h-4 w-4" /> Add Another Charger
                </Button>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => { setCurrentStep("step1"); window.scrollTo(0, 0); }}>
                  Back
                </Button>
                <Button size="lg" className="flex-1 gap-2" onClick={handleNextStep2}>
                  Next <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Submit */}
        {currentStep === "step3" && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
                Submit
              </h3>

              {nochPlus && submissionType === "assessment" && (
                <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center gap-2 text-sm">
                  <img src={medalBadge} alt="Noch+" className="h-4 w-4" />
                  <span className="font-medium">Noch+ Membership active</span>
                  <Badge className="ml-auto bg-primary text-primary-foreground text-xs">Member</Badge>
                </div>
              )}

              <div className="mb-4">
                <Label className="text-sm">Notes for our team (optional)</Label>
                <Textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} placeholder="Anything else we should know?" rows={2} />
              </div>
              <div className="space-y-3 mb-4">
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox checked={termsAgreed} onCheckedChange={v => setTermsAgreed(!!v)} className="mt-0.5" />
                  <span>I agree to the <a href="#" className="text-primary underline">Terms of Service</a> and <a href="#" className="text-primary underline">Privacy Policy</a></span>
                </label>
                {errors.terms && <p className="text-xs text-destructive ml-6">{errors.terms}</p>}
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox checked={contactConsent} onCheckedChange={v => setContactConsent(!!v)} className="mt-0.5" />
                  <span>I consent to being contacted about my submission</span>
                </label>
                {errors.consent && <p className="text-xs text-destructive ml-6">{errors.consent}</p>}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => {
                  if (submissionType === "repair") {
                    setCurrentStep("oem_question");
                  } else {
                    setCurrentStep("membership");
                  }
                  window.scrollTo(0, 0);
                }}>
                  Back
                </Button>
                <Button size="lg" className="flex-1 text-lg gap-2" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : <>Submit <ArrowRight className="h-5 w-5" /></>}
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-3">
                {submissionType === "repair"
                  ? "Our team will review and contact you to schedule a technician."
                  : "100% Free • No credit card required for assessment"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <footer className="py-6 border-t border-border/50 bg-card">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Noch Power. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
