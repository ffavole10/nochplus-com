import { useState, useEffect } from "react";
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
  Users, Monitor, BadgePercent, Package, Wrench, Star, CreditCard, Shield,
  Hash, ImagePlus
} from "lucide-react";
import evChargerBg from "@/assets/ev-charger-bg.png";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

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

type FormStep = "landing" | "step1" | "step2" | "membership" | "step3";

export default function SubmitAssessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>("landing");
  const [locatingUser, setLocatingUser] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);

  // Customer fields
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Chargers
  const [chargers, setChargers] = useState<ChargerEntry[]>([createEmptyCharger()]);

  // Noch+
  const [nochPlus, setNochPlus] = useState(false);

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
      // Clean URL
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

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { "User-Agent": "NOCHPlusApp/1.0" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const road = [addr.house_number, addr.road].filter(Boolean).join(" ");
            if (road) setStreetAddress(road);
            if (addr.city || addr.town || addr.village) setCity(addr.city || addr.town || addr.village);
            if (addr.state) {
              const stateMap: Record<string, string> = {
                "alabama":"AL","alaska":"AK","arizona":"AZ","arkansas":"AR","california":"CA","colorado":"CO",
                "connecticut":"CT","delaware":"DE","florida":"FL","georgia":"GA","hawaii":"HI","idaho":"ID",
                "illinois":"IL","indiana":"IN","iowa":"IA","kansas":"KS","kentucky":"KY","louisiana":"LA",
                "maine":"ME","maryland":"MD","massachusetts":"MA","michigan":"MI","minnesota":"MN",
                "mississippi":"MS","missouri":"MO","montana":"MT","nebraska":"NE","nevada":"NV",
                "new hampshire":"NH","new jersey":"NJ","new mexico":"NM","new york":"NY",
                "north carolina":"NC","north dakota":"ND","ohio":"OH","oklahoma":"OK","oregon":"OR",
                "pennsylvania":"PA","rhode island":"RI","south carolina":"SC","south dakota":"SD",
                "tennessee":"TN","texas":"TX","utah":"UT","vermont":"VT","virginia":"VA",
                "washington":"WA","west virginia":"WV","wisconsin":"WI","wyoming":"WY",
                "district of columbia":"DC"
              };
              const matched = stateMap[addr.state.toLowerCase()] || "";
              if (matched) setState(matched);
            }
            if (addr.postcode) setZipCode(addr.postcode.split("-")[0]);
            toast.success("Location detected!");
          }
        } catch {
          toast.error("Could not determine your address.");
        } finally {
          setLocatingUser(false);
        }
      },
      () => {
        toast.error("Location access denied. Please enter your address manually.");
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Name is required";
    if (!companyName.trim()) e.companyName = "Company name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email is required";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) e.phone = "Valid phone number is required";
    if (!city.trim()) e.city = "City is required";
    if (!state) e.state = "State is required";
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
      setCurrentStep("membership");
      window.scrollTo(0, 0);
    } else {
      toast.error("Please fix the errors before continuing.");
    }
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
        // Save form state to sessionStorage before redirecting
        sessionStorage.setItem("submit-form-state", JSON.stringify({
          fullName, companyName, email, phone, streetAddress, city, state, zipCode,
          chargers: chargers.map(c => ({ ...c, photos: [], photoPreviewUrls: [] })),
          customerNotes, termsAgreed, contactConsent,
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
        setEmail(s.email || "");
        setPhone(s.phone || "");
        setStreetAddress(s.streetAddress || "");
        setCity(s.city || "");
        setState(s.state || "");
        setZipCode(s.zipCode || "");
        if (s.chargers?.length) setChargers(s.chargers);
        setCustomerNotes(s.customerNotes || "");
        setTermsAgreed(s.termsAgreed || false);
        setContactConsent(s.contactConsent || false);
        sessionStorage.removeItem("submit-form-state");
      } catch { /* ignore */ }
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    if (!validateStep3()) { toast.error("Please fix the errors before submitting."); return; }
    setSubmitting(true);

    try {
      const year = new Date().getFullYear();
      const seq = Math.floor(1000 + Math.random() * 9000);
      const submissionId = `NP-${year}-${seq}`;

      const { data: submission, error: subError } = await supabase
        .from("submissions")
        .insert({
          submission_id: submissionId,
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          street_address: streetAddress.trim() || city.trim(),
          city: city.trim(),
          state,
          zip_code: zipCode.trim() || "00000",
          referral_source: null,
          assessment_needs: null,
          service_urgency: null,
          customer_notes: customerNotes.trim() || null,
          noch_plus_member: nochPlus,
        })
        .select()
        .single();

      if (subError) throw subError;

      for (const charger of chargers) {
        const photoUrls: string[] = [];

        for (const photo of charger.photos) {
          const ext = photo.file.name.split(".").pop();
          const path = `${submission.id}/${charger.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("submission-photos")
            .upload(path, photo.file);
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from("submission-photos").getPublicUrl(path);
            photoUrls.push(urlData.publicUrl);
          }
        }

        await supabase.from("charger_submissions").insert({
          submission_id: submission.id,
          brand: charger.brand,
          serial_number: charger.serialNumber || null,
          charger_type: charger.chargerType,
          installation_location: charger.installationLocation || null,
          known_issues: charger.knownIssues || null,
          photo_urls: photoUrls,
        });
      }

      navigate(`/submit/confirmation/${submissionId}`, {
        state: {
          fullName,
          email,
          phone,
          companyName,
          chargerCount: chargers.length,
          submissionId,
          nochPlus,
          submittedAt: new Date().toISOString(),
        }
      });
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepNumber = currentStep === "step1" ? 1 : currentStep === "step2" ? 2 : currentStep === "membership" ? 2.5 : currentStep === "step3" ? 3 : 0;

  // ─── LANDING PAGE ───
  if (currentStep === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(170,40%,55%)] via-[hsl(170,35%,60%)] to-[hsl(175,30%,65%)] flex flex-col relative">
        <img
          src={evChargerBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
        />
        <header className="px-6 pt-8 pb-4">
          <div className="flex items-center gap-2 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">NOCH+</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col justify-center px-6 pb-8">
          <div className="max-w-lg mx-auto w-full">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
              Welcome to Noch Plus!
            </h1>
            <p className="text-white/80 text-lg mb-10">
              Let's assess your charging stations remotely
            </p>
          </div>

          <div className="max-w-lg mx-auto w-full space-y-3 mb-10">
            {[
              { icon: Clock, title: "Quick Process", desc: "2 minutes per charger" },
              { icon: Camera, title: "Photo-Based", desc: "Just snap a few photos" },
              { icon: CheckCircle2, title: "Fast Response", desc: "Review within 24 hours" },
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/30 backdrop-blur-sm rounded-2xl px-5 py-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <feat.icon className="h-6 w-6 text-white/90" />
                </div>
                <div>
                  <p className="font-semibold text-white">{feat.title}</p>
                  <p className="text-sm text-white/70">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-lg mx-auto w-full">
            <Button
              size="lg"
              className="w-full bg-white text-[hsl(170,40%,40%)] hover:bg-white/90 text-lg font-semibold rounded-2xl h-14 gap-2 shadow-lg"
              onClick={() => setCurrentStep("step1")}
            >
              <Zap className="h-5 w-5" />
              Start Assessment
            </Button>
          </div>
        </div>

        {/* Footer with copyright and admin access */}
        <div className="pb-6 flex justify-center items-center gap-3">
          <span className="text-white/40 text-sm">© 2026 Noch Power. All rights reserved.</span>
          <span className="text-white/30">|</span>
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-all text-sm"
            aria-label="Admin login"
          >
            <Monitor className="h-4 w-4" />
            <span>Admin Access</span>
          </button>
        </div>
      </div>
    );
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
        <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">Free Assessment</Badge>
      </div>
    </header>
  );

  // ─── STEP PROGRESS ───
  const StepProgress = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            s < stepNumber ? "bg-primary text-primary-foreground" :
            s === Math.floor(stepNumber) ? "bg-primary text-primary-foreground" :
            "bg-muted text-muted-foreground"
          }`}>
            {s < stepNumber ? <CheckCircle2 className="h-4 w-4" /> : s}
          </div>
          {s < 3 && <div className={`w-8 h-0.5 ${s < stepNumber ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );

  // ─── MEMBERSHIP UPSELL PAGE ───
  if (currentStep === "membership") {
    return (
      <div className="min-h-screen bg-background">
        <FormHeader />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-primary fill-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Unlock Noch+ Membership</h1>
            <p className="text-muted-foreground">Get exclusive benefits for your {chargers.length} charger{chargers.length > 1 ? "s" : ""}</p>
          </div>

          {/* Pricing */}
          <Card className="mb-6 border-primary shadow-lg">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-foreground">
                  $19<span className="text-lg font-normal text-muted-foreground">/mo per charger</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {chargers.length} charger{chargers.length > 1 ? "s" : ""} × $19 = <span className="font-semibold text-foreground">${chargers.length * 19}/mo</span>
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
                For less than a coffee a day, get peace of mind for your entire charging setup.
              </p>

              {/* Subscribe Button */}
              <Button
                size="lg"
                className="w-full text-lg gap-2 h-14"
                onClick={handleSubscribe}
                disabled={membershipLoading}
              >
                {membershipLoading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="h-5 w-5" /> Subscribe — ${chargers.length * 19}/mo</>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>Secure payment powered by Stripe</span>
              </div>
            </CardContent>
          </Card>

          {/* Skip */}
          <div className="text-center">
            <button
              onClick={handleSkipMembership}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
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

  // ─── FORM STEPS ───
  return (
    <div className="min-h-screen bg-background">
      <FormHeader />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Submit Your Chargers</h1>
          <p className="text-muted-foreground">Fill in the basics — takes about 2 minutes</p>
        </div>

        <StepProgress />

        {/* Step 1: Location & Contact */}
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
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Properties" />
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
                <div className="sm:col-span-2">
                  <Label>Street Address</Label>
                  <div className="flex gap-2">
                    <Input className="flex-1" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} placeholder="123 Main St (optional)" />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                      onClick={useCurrentLocation}
                      disabled={locatingUser}
                      title="Use my current location"
                    >
                      {locatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>City *</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Los Angeles" />
                  {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>State *</Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                      <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
                  </div>
                  <div>
                    <Label>ZIP Code</Label>
                    <Input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="90001" />
                  </div>
                </div>
              </div>

              <Button size="lg" className="w-full mt-6 gap-2" onClick={handleNextStep1}>
                Next <ArrowRight className="h-5 w-5" />
              </Button>
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
                          <Select value={charger.isWorking} onValueChange={v => updateCharger(charger.id, "isWorking", v)}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Is the charger under warranty? *</Label>
                          <Select value={charger.underWarranty} onValueChange={v => updateCharger(charger.id, "underWarranty", v)}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="unknown">I don't know</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Known Issues</Label>
                          <Textarea value={charger.knownIssues} onChange={e => updateCharger(charger.id, "knownIssues", e.target.value)} placeholder="Any problems or concerns?" rows={2} className="text-sm" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Photos (optional, up to 6)</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {/* Existing photos */}
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

                            {/* Prompt slots: Front View, Serial #, then Add More */}
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

              {nochPlus && (
                <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-primary fill-primary" />
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
                <Button variant="outline" size="lg" className="flex-1" onClick={() => { setCurrentStep("membership"); window.scrollTo(0, 0); }}>
                  Back
                </Button>
                <Button size="lg" className="flex-1 text-lg gap-2" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : <>Submit <ArrowRight className="h-5 w-5" /></>}
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-3">100% Free • No credit card required for assessment</p>
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
