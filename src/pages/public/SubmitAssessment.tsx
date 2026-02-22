import { useState } from "react";
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
  CheckCircle2, Clock, Zap, Camera,
  Plus, Trash2, Loader2, ArrowRight, X, MapPin, Navigation,
  Users, Monitor, BadgePercent, Package, Wrench, Star
} from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

const CHARGER_BRANDS = ["BTC", "ABB", "Delta", "Tritium", "Signet", "ChargePoint", "Other"];
const CHARGER_TYPES = ["AC | Level 2", "DC | Level 3"];

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
  const [started, setStarted] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);

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
              const stateAbbr = US_STATES.find(s => addr.state?.toLowerCase().includes(s.toLowerCase())) || "";
              // Try matching full state name to abbreviation
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
              const matched = stateMap[addr.state.toLowerCase()] || stateAbbr;
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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Name is required";
    if (!companyName.trim()) e.companyName = "Company name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email is required";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) e.phone = "Valid phone number is required";
    if (!city.trim()) e.city = "City is required";
    if (!state) e.state = "State is required";

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

  // ─── LANDING PAGE ───
  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(170,40%,55%)] via-[hsl(170,35%,60%)] to-[hsl(175,30%,65%)] flex flex-col">
        {/* Header */}
        <header className="px-6 pt-8 pb-4">
          <div className="flex items-center gap-2 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">NOCH+</span>
          </div>
        </header>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center px-6 pb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            Welcome to Noch Plus!
          </h1>
          <p className="text-white/80 text-lg mb-10">
            Let's assess your charging stations remotely
          </p>

          {/* Feature Cards */}
          <div className="space-y-3 mb-10">
            {[
              { icon: Clock, title: "Quick Process", desc: "2 minutes per charger" },
              { icon: Camera, title: "Photo-Based", desc: "Just snap a few photos" },
              { icon: CheckCircle2, title: "Fast Response", desc: "Review within 24 hours" },
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-4">
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

          {/* CTA Button */}
          <Button
            size="lg"
            className="w-full bg-white text-[hsl(170,40%,40%)] hover:bg-white/90 text-lg font-semibold rounded-2xl h-14 gap-2 shadow-lg"
            onClick={() => setStarted(true)}
          >
            <Zap className="h-5 w-5" />
            Start Assessment
          </Button>
        </div>
      </div>
    );
  }

  // ─── FORM PAGE ───
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Submit Your Chargers</h1>
          <p className="text-muted-foreground">Fill in the basics — takes about 2 minutes</p>
        </div>

        {/* Step 1: Location & Contact */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
              Your Location & Contact
            </h3>

            {/* Auto-locate button */}
            <Button
              variant="outline"
              className="w-full mb-4 gap-2 border-primary/30 text-primary hover:bg-primary/5"
              onClick={useCurrentLocation}
              disabled={locatingUser}
            >
              {locatingUser ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Detecting location...</>
              ) : (
                <><Navigation className="h-4 w-4" /> Use My Current Location</>
              )}
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or enter manually</span></div>
            </div>

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
                <Input value={streetAddress} onChange={e => setStreetAddress(e.target.value)} placeholder="123 Main St (optional)" />
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
          </CardContent>
        </Card>

        {/* Step 2: Chargers */}
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
                        <Label className="text-xs">Location on Site</Label>
                        <Input value={charger.installationLocation} onChange={e => updateCharger(charger.id, "installationLocation", e.target.value)} placeholder="e.g., Parking Garage Level 2" className="text-sm" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Known Issues</Label>
                        <Textarea value={charger.knownIssues} onChange={e => updateCharger(charger.id, "knownIssues", e.target.value)} placeholder="Any problems or concerns?" rows={2} className="text-sm" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Photos (optional)</Label>
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

        {/* Noch+ Membership */}
        <Card className={`mb-6 transition-all ${nochPlus ? "border-primary shadow-md" : ""}`}>
          <CardContent className="p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={nochPlus} onCheckedChange={v => setNochPlus(!!v)} className="mt-1" />
              <div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary fill-primary" />
                  <span className="font-semibold">Interested in Noch+ Membership?</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Unlock exclusive benefits for your charging operations</p>
                {nochPlus && (
                  <div className="mt-3 p-4 bg-[hsl(170,40%,55%)]/10 rounded-xl text-sm space-y-2.5">
                    <p className="font-semibold text-foreground mb-2">Noch+ Member Benefits</p>
                    <div className="flex items-center gap-2.5">
                      <Users className="h-4 w-4 text-primary shrink-0" />
                      <span>Dedicated account manager</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Monitor className="h-4 w-4 text-primary shrink-0" />
                      <span>Direct system access</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <BadgePercent className="h-4 w-4 text-primary shrink-0" />
                      <span>Member exclusive rate — 50% off</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Package className="h-4 w-4 text-primary shrink-0" />
                      <span>Parts discount — 20% off</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Wrench className="h-4 w-4 text-primary shrink-0" />
                      <span>Annual Preventive Maintenance — 50% off</span>
                    </div>
                    <p className="text-muted-foreground italic text-xs mt-2">For less than a Starbucks frappuccino and butter croissant, you get peace of mind for your entire charging setup.</p>
                    <p className="text-muted-foreground italic text-xs">Our team will contact you with membership details.</p>
                  </div>
                )}
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Submit */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
              Submit
            </h3>
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
            <Button size="lg" className="w-full text-lg gap-2" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : <>Submit Assessment Request <ArrowRight className="h-5 w-5" /></>}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">100% Free • No credit card required</p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-border/50 bg-card">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Noch Power. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
