import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  CheckCircle2, Shield, Clock, Star, Zap, Phone, Mail, ChevronRight,
  Plus, Trash2, Camera, Upload, Loader2, ArrowRight, X
} from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

const CHARGER_BRANDS = ["BTC", "ABB", "Delta", "Tritium", "Signet", "ChargePoint", "Other"];
const CHARGER_TYPES = ["AC | Level 2", "DC | Level 3"];
const REFERRAL_SOURCES = ["Google Search", "Referral", "Social Media", "Advertisement", "Other"];
const ASSESSMENT_NEEDS = [
  "Pre-purchase inspection",
  "Preventive maintenance assessment",
  "Troubleshooting existing issues",
  "Warranty verification",
  "General health check",
  "Preparing for activation/deployment",
];

interface ChargerEntry {
  id: string;
  brand: string;
  serialNumber: string;
  chargerType: string;
  installationLocation: string;
  knownIssues: string;
  photos: File[];
  photoPreviewUrls: string[];
}

const createEmptyCharger = (): ChargerEntry => ({
  id: crypto.randomUUID(),
  brand: "",
  serialNumber: "",
  chargerType: "",
  installationLocation: "",
  knownIssues: "",
  photos: [],
  photoPreviewUrls: [],
});

export default function SubmitAssessment() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // Customer fields
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [referralSource, setReferralSource] = useState("");

  // Chargers
  const [chargers, setChargers] = useState<ChargerEntry[]>([createEmptyCharger()]);

  // Assessment needs
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [otherNeed, setOtherNeed] = useState("");
  const [serviceUrgency, setServiceUrgency] = useState("");

  // Noch+
  const [nochPlus, setNochPlus] = useState(false);

  // Terms
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [contactConsent, setContactConsent] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handlePhotoUpload = (chargerId: string, files: FileList | null) => {
    if (!files) return;
    const fileArr = Array.from(files).filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith("image/"));
    if (fileArr.length === 0) { toast.error("Invalid file. Max 5MB, images only."); return; }
    setChargers(prev => prev.map(c => {
      if (c.id !== chargerId) return c;
      const newPhotos = [...c.photos, ...fileArr];
      const newPreviews = [...c.photoPreviewUrls, ...fileArr.map(f => URL.createObjectURL(f))];
      return { ...c, photos: newPhotos, photoPreviewUrls: newPreviews };
    }));
  };

  const removePhoto = (chargerId: string, index: number) => {
    setChargers(prev => prev.map(c => {
      if (c.id !== chargerId) return c;
      const photos = [...c.photos]; photos.splice(index, 1);
      const previews = [...c.photoPreviewUrls]; URL.revokeObjectURL(previews[index]); previews.splice(index, 1);
      return { ...c, photos, photoPreviewUrls: previews };
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Name is required";
    if (!companyName.trim()) e.companyName = "Company name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email is required";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) e.phone = "Valid phone number is required";
    if (!streetAddress.trim()) e.streetAddress = "Address is required";
    if (!city.trim()) e.city = "City is required";
    if (!state) e.state = "State is required";
    if (!zipCode.trim() || !/^\d{5}(-\d{4})?$/.test(zipCode)) e.zipCode = "Valid ZIP code is required";

    chargers.forEach((c, i) => {
      if (!c.brand) e[`charger_${i}_brand`] = "Brand is required";
      if (!c.chargerType) e[`charger_${i}_type`] = "Charger type is required";
    });

    if (!termsAgreed) e.terms = "You must agree to the terms";
    if (!contactConsent) e.consent = "You must consent to being contacted";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { toast.error("Please fix the errors before submitting."); return; }
    setSubmitting(true);

    try {
      // Generate submission ID
      const year = new Date().getFullYear();
      const seq = Math.floor(1000 + Math.random() * 9000);
      const submissionId = `NP-${year}-${seq}`;

      // Insert submission
      const { data: submission, error: subError } = await supabase
        .from("submissions")
        .insert({
          submission_id: submissionId,
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          street_address: streetAddress.trim(),
          city: city.trim(),
          state,
          zip_code: zipCode.trim(),
          referral_source: referralSource || null,
          assessment_needs: [...selectedNeeds, ...(otherNeed.trim() ? [`Other: ${otherNeed.trim()}`] : [])],
          service_urgency: serviceUrgency || null,
          customer_notes: customerNotes.trim() || null,
          noch_plus_member: nochPlus,
        })
        .select()
        .single();

      if (subError) throw subError;

      // Upload photos and insert charger records
      for (const charger of chargers) {
        const photoUrls: string[] = [];

        for (const photo of charger.photos) {
          const ext = photo.name.split(".").pop();
          const path = `${submission.id}/${charger.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("submission-photos")
            .upload(path, photo);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/images/noch-power-logo.png" alt="Noch" className="h-8" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Secure Submission</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <Badge variant="secondary" className="mb-4 text-sm px-4 py-1.5">100% Free — No Credit Card Required</Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-tight">
            Free Professional EV Charger Assessment
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Submit your charger information and get expert recommendations — no cost, no commitment
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-8">
            {["Completely FREE assessment", "No credit card required", "Expert recommendations", "Optional service scheduling", "Submit up to 50 chargers"].map(t => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</span>
            ))}
          </div>
          <Button size="lg" className="text-lg px-8 gap-2" onClick={() => document.getElementById("submission-form")?.scrollIntoView({ behavior: "smooth" })}>
            Get Your Free Assessment <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-card border-y border-border/50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Upload, title: "Submit Your Info", desc: "Tell us about your chargers with photos", time: "2 minutes" },
              { icon: Clock, title: "We Review", desc: "Our team reviews your submission", time: "24-48 hours" },
              { icon: Mail, title: "Get Recommendations", desc: "Receive expert assessment and next steps", time: "Email" },
              { icon: Zap, title: "Schedule Service", desc: "We'll help you get your chargers serviced", time: "Optional" },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-xs font-semibold text-primary mb-1">Step {i + 1}</div>
                <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
                <Badge variant="outline" className="mt-2 text-xs">{step.time}</Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Noch+ Membership Upsell */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2">Want Priority Service & Unlimited Assessments?</h2>
          <p className="text-center text-muted-foreground mb-8">Or submit for free assessment below — no membership required</p>
          <Card className="border-primary/30 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-5 w-5 text-primary fill-primary" />
                    <span className="text-xl font-bold">Noch+ Membership</span>
                  </div>
                  <p className="text-muted-foreground text-sm">Priority service and unlimited assessments</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">$199<span className="text-base font-normal text-muted-foreground">/month</span></div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {[
                  "Unlimited free assessments",
                  "Priority 24-hour response",
                  "15% discount on all repairs",
                  "Dedicated account manager",
                  "Monthly health reports",
                  "Cancel anytime",
                ].map(b => (
                  <div key={b} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" />{b}</div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline">Learn More</Button>
                <Button onClick={() => { setNochPlus(true); document.getElementById("submission-form")?.scrollIntoView({ behavior: "smooth" }); }}>
                  Sign Up Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Submission Form */}
      <section id="submission-form" className="py-16 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2">Free Assessment Submission</h2>
          <p className="text-center text-muted-foreground mb-10">Fill out the form below — it only takes about 2 minutes</p>

          {/* Customer Info */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
                Your Contact Details
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Smith" />
                  {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <Label>Company / Property Name *</Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Properties" />
                  {errors.companyName && <p className="text-xs text-destructive mt-1">{errors.companyName}</p>}
                </div>
                <div>
                  <Label>Email Address *</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                </div>
                <div>
                  <Label>Phone Number *</Label>
                  <Input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(555) 123-4567" />
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label>Street Address *</Label>
                  <Input value={streetAddress} onChange={e => setStreetAddress(e.target.value)} placeholder="123 Main St" />
                  {errors.streetAddress && <p className="text-xs text-destructive mt-1">{errors.streetAddress}</p>}
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
                    <Label>ZIP Code *</Label>
                    <Input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="90001" />
                    {errors.zipCode && <p className="text-xs text-destructive mt-1">{errors.zipCode}</p>}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label>How did you hear about us?</Label>
                  <Select value={referralSource} onValueChange={setReferralSource}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{REFERRAL_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chargers */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
                  Your Chargers
                </h3>
                <Badge variant="outline">{chargers.length} of 50 chargers</Badge>
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
                          <Label className="text-xs">Installation Location</Label>
                          <Input value={charger.installationLocation} onChange={e => updateCharger(charger.id, "installationLocation", e.target.value)} placeholder="e.g., Parking Garage Level 2" className="text-sm" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Known Issues or Concerns</Label>
                          <Textarea value={charger.knownIssues} onChange={e => updateCharger(charger.id, "knownIssues", e.target.value)} placeholder="Describe any problems, symptoms, or reasons for assessment" rows={2} className="text-sm" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Photos (optional but recommended)</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {charger.photoPreviewUrls.map((url, pi) => (
                              <div key={pi} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <button onClick={() => removePhoto(charger.id, pi)} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                              <Camera className="h-5 w-5 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground mt-0.5">Add Photo</span>
                              <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(charger.id, e.target.files)} />
                            </label>
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
            </CardContent>
          </Card>

          {/* Assessment Needs */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
                Assessment Needs <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
              </h3>
              <p className="text-sm text-muted-foreground mb-3">What are you looking for? (check all that apply)</p>
              <div className="grid sm:grid-cols-2 gap-2 mb-4">
                {ASSESSMENT_NEEDS.map(need => (
                  <label key={need} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedNeeds.includes(need)}
                      onCheckedChange={checked => {
                        setSelectedNeeds(prev => checked ? [...prev, need] : prev.filter(n => n !== need));
                      }}
                    />
                    {need}
                  </label>
                ))}
                <div className="sm:col-span-2">
                  <Input value={otherNeed} onChange={e => setOtherNeed(e.target.value)} placeholder="Other (please specify)" className="text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-sm">When do you need service?</Label>
                <Select value={serviceUrgency} onValueChange={setServiceUrgency}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent (within 1 week)</SelectItem>
                    <SelectItem value="soon">Soon (1-2 weeks)</SelectItem>
                    <SelectItem value="flexible">Flexible (no rush)</SelectItem>
                    <SelectItem value="exploring">Just exploring options</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Noch+ Opt-in */}
          <Card className={`mb-6 transition-all ${nochPlus ? "border-primary shadow-md" : ""}`}>
            <CardContent className="p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={nochPlus} onCheckedChange={v => setNochPlus(!!v)} className="mt-1" />
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary fill-primary" />
                    <span className="font-semibold">Upgrade to Noch+ Membership?</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Get priority service and unlimited assessments for $199/month</p>
                  {nochPlus && (
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg text-sm space-y-1">
                      <p>• This assessment processed in 24hrs</p>
                      <p>• Future assessments unlimited & free</p>
                      <p>• 15% off all repair services</p>
                      <p>• Dedicated support</p>
                      <p className="text-muted-foreground italic mt-2">Payment details will be collected after submission.</p>
                    </div>
                  )}
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Terms & Submit */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</span>
                Terms & Submit
              </h3>
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
              <div className="mb-4">
                <Label className="text-sm">Notes for our team (optional)</Label>
                <Textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} placeholder="Any additional information we should know?" rows={3} />
              </div>
              <Button size="lg" className="w-full text-lg gap-2" disabled={submitting} onClick={handleSubmit}>
                {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : <>Submit Free Assessment Request <ChevronRight className="h-5 w-5" /></>}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3">No payment required • Your information is secure</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50 bg-card">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Noch Power. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <a href="#" className="hover:text-foreground">Terms of Service</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
