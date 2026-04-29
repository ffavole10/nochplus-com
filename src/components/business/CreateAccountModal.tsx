import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CustomerLogo } from "@/components/CustomerLogo";
import { CUSTOMER_TYPE_OPTIONS, type CustomerType } from "@/components/business/CustomerTypeBadge";
import { useCustomers, useCreateCustomer, type Customer } from "@/hooks/useCustomers";
import { findAccountMatches, extractDomain, nameSimilarity } from "@/lib/accountSimilarity";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCE_OPTIONS: { value: NonNullable<Customer["source"]>; label: string }[] = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
  { value: "referral", label: "Referral" },
  { value: "conference", label: "Conference" },
  { value: "investor_network", label: "Investor Network" },
  { value: "other", label: "Other" },
];

const RELATIONSHIP_OPTIONS: { value: NonNullable<Customer["relationship_type"]>; label: string }[] = [
  { value: "partner", label: "Partner" },
  { value: "customer", label: "Customer" },
  { value: "prospect", label: "Prospect" },
  { value: "both", label: "Both" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialCompanyName?: string;
  onCreated?: (customer: Customer) => void;
}

export function CreateAccountModal({ open, onOpenChange, initialCompanyName = "", onCreated }: Props) {
  const { data: existing = [] } = useCustomers();
  const createCustomer = useCreateCustomer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [company, setCompany] = useState("");
  const [customerType, setCustomerType] = useState<CustomerType | "">("");
  const [customerTypeOther, setCustomerTypeOther] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [hqCity, setHqCity] = useState("");
  const [hqRegion, setHqRegion] = useState("");
  const [relationshipType, setRelationshipType] = useState<NonNullable<Customer["relationship_type"]>>("prospect");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [source, setSource] = useState<NonNullable<Customer["source"]>>("inbound");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [autoLogo, setAutoLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setCompany(initialCompanyName);
      setCustomerType("");
      setCustomerTypeOther("");
      setDomain("");
      setIndustry("");
      setHqCity("");
      setHqRegion("");
      setRelationshipType("prospect");
      setStatus("active");
      setContactName("");
      setContactTitle("");
      setContactEmail("");
      setContactPhone("");
      setInternalNotes("");
      setSource("inbound");
      setLogoFile(null);
      setLogoPreview(null);
      setAutoLogo(null);
    }
  }, [open, initialCompanyName]);

  // Derive domain from email if user hasn't set it
  useEffect(() => {
    if (!domain && contactEmail.includes("@")) {
      const d = extractDomain(contactEmail);
      if (d) setDomain(d);
    }
  }, [contactEmail]); // eslint-disable-line

  // Auto-fetch logo from domain
  useEffect(() => {
    const d = (domain || extractDomain(contactEmail) || "").trim();
    if (!d || logoFile) {
      setAutoLogo(null);
      return;
    }
    setAutoLogo(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`);
  }, [domain, contactEmail, logoFile]);

  // Real-time inline duplicate warning while typing company name
  const inlineDuplicates = useMemo(() => {
    if (!company.trim() || company.trim().length < 2) return [];
    const matches = findAccountMatches(company, existing, {
      similarThreshold: 0.7,
      emailDomain: extractDomain(contactEmail) || domain || null,
    });
    return matches.slice(0, 3);
  }, [company, existing, contactEmail, domain]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) {
      toast.error("Logo must be PNG, JPG, SVG, or WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  const handleSubmit = async () => {
    if (!company.trim()) { toast.error("Company name required"); return; }
    if (!customerType) { toast.error("Customer type required"); return; }
    if (customerType === "other" && !customerTypeOther.trim()) { toast.error("Specify the customer type"); return; }
    if (!contactName.trim()) { toast.error("Primary contact name required"); return; }
    if (!contactEmail.trim()) { toast.error("Primary contact email required"); return; }

    setUploading(true);
    let uploadedLogoUrl: string | null = null;
    try {
      // Upload logo if file provided
      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `logos/new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, logoFile, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
        uploadedLogoUrl = pub.publicUrl;
      } else if (autoLogo) {
        uploadedLogoUrl = autoLogo;
      }

      const created = await createCustomer.mutateAsync({
        company: company.trim(),
        contact_name: contactName.trim(),
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
        customer_type: customerType || null,
        customer_type_other: customerType === "other" ? customerTypeOther.trim() : null,
        website_url: domain.trim(),
        domain: (domain.trim() || extractDomain(contactEmail) || "").toLowerCase() || null,
        industry: industry.trim() || null,
        hq_city: hqCity.trim() || null,
        hq_region: hqRegion.trim() || null,
        relationship_type: relationshipType,
        source,
        internal_notes: internalNotes.trim() || null,
        status,
        logo_url: uploadedLogoUrl,
        notes: contactTitle.trim() ? `Primary contact title: ${contactTitle.trim()}` : "",
      } as any);

      onCreated?.(created);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create account");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Visual Identity */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visual Identity</h3>
            <div className="flex items-start gap-4">
              <div className="relative">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-md object-contain bg-background border border-border" />
                ) : autoLogo ? (
                  <img src={autoLogo} alt="Auto logo" className="h-16 w-16 rounded-md object-contain bg-background border border-border" />
                ) : (
                  <CustomerLogo logoUrl={null} companyName={company || "?"} size="lg" />
                )}
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center"
                    aria-label="Remove logo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Upload logo
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  {autoLogo && !logoFile
                    ? "Auto-detected logo from domain — confirm or upload your own"
                    : "PNG, JPG, SVG, or WebP. Max 2MB."}
                </p>
              </div>
            </div>
          </section>

          {/* Company Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company Details</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Company Name *</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Charging" />
              {inlineDuplicates.length > 0 && (
                <div className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded px-2 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Similar account exists:</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {inlineDuplicates.map((m) => (
                        <li key={m.account.id}>
                          <span className="font-semibold">{m.account.company}</span>
                          <span className="text-muted-foreground"> — {m.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Type *</Label>
                <Select value={customerType || ""} onValueChange={(v) => setCustomerType(v as CustomerType)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent className="z-[2100]">
                    {CUSTOMER_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.full}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {customerType === "other" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Specify Type *</Label>
                  <Input value={customerTypeOther} onChange={(e) => setCustomerTypeOther(e.target.value)} placeholder="e.g. Utility" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Domain / Website</Label>
                <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Industry</Label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. EV Charging" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">HQ City</Label>
                <Input value={hqCity} onChange={(e) => setHqCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">HQ State / Country</Label>
                <Input value={hqRegion} onChange={(e) => setHqRegion(e.target.value)} />
              </div>
            </div>
          </section>

          {/* Relationship */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relationship</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Relationship Type *</Label>
                <RadioGroup value={relationshipType} onValueChange={(v) => setRelationshipType(v as any)} className="flex flex-wrap gap-3">
                  {RELATIONSHIP_OPTIONS.map((o) => (
                    <div key={o.value} className="flex items-center gap-1.5">
                      <RadioGroupItem id={`rel-${o.value}`} value={o.value} />
                      <Label htmlFor={`rel-${o.value}`} className="text-xs cursor-pointer">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[2100]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Primary Contact */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primary Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Contact Name *</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Contact Title</Label><Input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Contact Email *</Label><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Contact Phone</Label><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
            </div>
          </section>

          {/* Internal Context */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal Context</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[2100]">
                  {SOURCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Internal Notes (NOCH+ team only)</Label>
              <Textarea rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading || createCustomer.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={uploading || createCustomer.isPending} className={cn("gap-1.5")}>
            {(uploading || createCustomer.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
