import { useState } from "react";
import { AddressAutocomplete } from "./AddressAutocomplete";
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
  ArrowRight, ArrowLeft, CheckCircle2, Plus, Trash2, Loader2, LocateFixed, AlertTriangle,
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
  const [locatingUser, setLocatingUser] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftSubmissionId, setDraftSubmissionId] = useState<string | null>(null);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Step 2 fields
  const [chargers, setChargers] = useState<ChargerEntry[]>([createEmptyCharger()]);

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
    setStreetAddress(draft.streetAddress);
    setCity(draft.city);
    setState(draft.state);
    setZipCode(draft.zipCode);
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
    setFullName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setStreetAddress("");
    setCity("");
    setState("");
    setZipCode("");
    setChargers([createEmptyCharger()]);
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
          toast.error("Could not determine address.");
        } finally {
          setLocatingUser(false);
        }
      },
      () => {
        toast.error("Location access denied.");
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
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) e.phone = "Valid phone is required";
    if (!city.trim()) e.city = "City is required";
    if (!state) e.state = "State is required";
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

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const hex = crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
      const submissionId = `NP-${year}-${hex}`;

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
          referral_source: "manual_entry",
          assessment_needs: null,
          service_urgency: serviceUrgency || null,
          customer_notes: customerNotes.trim() || null,
          noch_plus_member: false,
        })
        .select()
        .single();

      if (subError) throw subError;

      for (const charger of chargers) {
        const { error: chError } = await supabase.from("charger_submissions").insert({
          submission_id: submission.id,
          brand: charger.brand,
          serial_number: charger.serialNumber || null,
          charger_type: charger.chargerType,
          installation_location: charger.installationLocation || null,
          known_issues: charger.knownIssues || null,
        });
        if (chError) throw chError;
      }

      toast.success(`Submission ${submissionId} created successfully.`);
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
    const hasContactInfo = !!(fullName || companyName || email || phone || streetAddress || city || state || zipCode);
    const hasChargerInfo = chargers.some(c => !!(c.brand || c.serialNumber || c.chargerType || c.installationLocation || c.knownIssues || c.isWorking || c.underWarranty));
    const hasNotes = !!(customerNotes || serviceUrgency);
    return hasContactInfo || hasChargerInfo || hasNotes;
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
    // If this was a persisted draft, delete it
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
        // Update existing draft
        await supabase.from("submissions").update({
          full_name: fullName.trim() || "Draft",
          company_name: companyName.trim() || "Draft",
          email: email.trim() || "draft@placeholder.com",
          phone: phone.trim() || "0000000000",
          street_address: streetAddress.trim() || "",
          city: city.trim() || "—",
          state: state || "—",
          zip_code: zipCode.trim() || "00000",
          customer_notes: customerNotes || null,
          service_urgency: serviceUrgency || null,
          status: "draft",
        }).eq("id", draftId);

        // Delete old chargers and re-insert
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
        // Create new draft
        const { data: submission, error } = await supabase.from("submissions").insert({
          submission_id: subId,
          full_name: fullName.trim() || "Draft",
          company_name: companyName.trim() || "Draft",
          email: email.trim() || "draft@placeholder.com",
          phone: phone.trim() || "0000000000",
          street_address: streetAddress.trim() || "",
          city: city.trim() || "—",
          state: state || "—",
          zip_code: zipCode.trim() || "00000",
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
            {step === 1 ? "Enter customer contact & location details" :
             step === 2 ? "Add charger information" :
             "Review & submit"}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator />

        {/* STEP 1: Contact & Location */}
        {step === 1 && (
          <div className="space-y-4">
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
                  <AddressAutocomplete
                    value={streetAddress}
                    onChange={setStreetAddress}
                    onSelect={(addr) => {
                      if (addr.city) setCity(addr.city);
                      if (addr.state) setState(addr.state);
                      if (addr.zip) setZipCode(addr.zip);
                    }}
                    placeholder="Start typing an address..."
                    className="flex-1"
                  />
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

            <Button size="lg" className="w-full gap-2" onClick={handleNext}>
              Next: Chargers <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* STEP 2: Chargers */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {chargers.length} charger{chargers.length > 1 ? "s" : ""} added
              </span>
              <Badge variant="outline">{chargers.length}/50</Badge>
            </div>

            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
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
            {/* Summary */}
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Submission Summary</h4>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{fullName}</span></div>
                  <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{companyName}</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{email}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{phone}</span></div>
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Location:</span> <span className="font-medium">{[streetAddress, city, state, zipCode].filter(Boolean).join(", ")}</span></div>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <span className="text-muted-foreground text-sm">Chargers:</span>{" "}
                  <span className="font-medium text-sm">{chargers.length}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {chargers.map((c, i) => (
                      <Badge key={c.id} variant="outline" className="text-xs">
                        {c.brand || "Unknown"} — {c.chargerType || "N/A"}
                      </Badge>
                    ))}
                  </div>
                </div>
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
                  <>Create Submission <CheckCircle2 className="h-4 w-4" /></>
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
