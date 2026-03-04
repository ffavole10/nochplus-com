import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CustomerLogo } from "@/components/CustomerLogo";
import { Loader2, Globe, ArrowLeft, Check, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Customer } from "@/hooks/useCustomers";

interface NewCustomerFormProps {
  onBack: () => void;
  onCreated: (customer: Customer) => void;
}

function extractDomain(url: string): string {
  try {
    let cleaned = url.trim();
    if (!cleaned.startsWith("http")) cleaned = `https://${cleaned}`;
    return new URL(cleaned).hostname.replace("www.", "");
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  }
}

export function NewCustomerForm({ onBack, onCreated }: NewCustomerFormProps) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [headquartersAddress, setHeadquartersAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Contact
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRole, setContactRole] = useState("");

  // Location
  const [addLocation, setAddLocation] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [siteState, setSiteState] = useState("");
  const [siteZip, setSiteZip] = useState("");

  const [enriching, setEnriching] = useState(false);
  const [enriched, setEnriched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoFields, setAutoFields] = useState<Set<string>>(new Set());

  const handleWebsiteBlur = useCallback(async () => {
    if (!websiteUrl.trim()) return;
    const domain = extractDomain(websiteUrl);
    if (!domain) return;

    setEnriching(true);
    const newAutoFields = new Set<string>();

    // Fetch logo
    const clearbitLogo = `https://logo.clearbit.com/${domain}`;
    try {
      const res = await fetch(clearbitLogo, { method: "HEAD" });
      if (res.ok) {
        setLogoUrl(clearbitLogo);
      } else {
        // Fallback to Google favicons
        setLogoUrl(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
      }
    } catch {
      setLogoUrl(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    }

    // Try to enrich by scraping meta tags via edge function
    try {
      const { data } = await supabase.functions.invoke("enrich-company", {
        body: { domain },
      });
      if (data) {
        if (data.name && !companyName) {
          setCompanyName(data.name);
          newAutoFields.add("companyName");
        }
        if (data.description && !description) {
          setDescription(data.description);
          newAutoFields.add("description");
        }
        if (data.industry && !industry) {
          setIndustry(data.industry);
          newAutoFields.add("industry");
        }
        if (data.address && !headquartersAddress) {
          setHeadquartersAddress(data.address);
          newAutoFields.add("headquartersAddress");
        }
      }
    } catch {
      // Enrichment failed silently
    }

    setAutoFields(newAutoFields);
    setEnriched(true);
    setEnriching(false);
  }, [websiteUrl, companyName, description, industry, headquartersAddress]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!contactName.trim() || !contactEmail.trim()) {
      toast.error("Primary contact name and email are required");
      return;
    }
    if (!phone.trim()) {
      toast.error("Company phone is required");
      return;
    }

    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;

      // Upload logo file if provided
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `logos/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, logoFile, { upsert: true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          finalLogoUrl = urlData.publicUrl;
        }
      }

      // Create customer
      const { data: newCustomer, error: custErr } = await supabase
        .from("customers" as any)
        .insert({
          company: companyName,
          contact_name: contactName,
          email: contactEmail,
          phone,
          address: headquartersAddress,
          website_url: websiteUrl,
          logo_url: finalLogoUrl,
          industry: industry || null,
          description: description || null,
          headquarters_address: headquartersAddress || null,
          notes: "",
          status: "active",
          pricing_type: "rate_card",
        } as any)
        .select()
        .single();

      if (custErr) throw custErr;
      const customer = newCustomer as unknown as Customer;

      // Create primary contact
      await supabase.from("contacts" as any).insert({
        customer_id: customer.id,
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        role: contactRole || null,
        is_primary: true,
      } as any);

      // Create location if provided
      if (addLocation && siteName.trim()) {
        await supabase.from("locations" as any).insert({
          customer_id: customer.id,
          site_name: siteName,
          address: siteAddress,
          city: siteCity,
          state: siteState,
          zip: siteZip,
        } as any);
      }

      toast.success("Customer created successfully");
      onCreated(customer);
    } catch (err: any) {
      toast.error("Failed to create customer: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to customer list
      </button>

      {/* Website URL */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" /> Website URL <span className="text-critical">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. evconnect.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            onBlur={handleWebsiteBlur}
          />
          {enriching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />}
          {enriched && !enriching && <Check className="h-5 w-5 text-optimal mt-2" />}
        </div>
        <p className="text-xs text-muted-foreground">
          We'll auto-fetch the company logo and try to fill in company details.
        </p>
      </div>

      {/* Logo preview + upload */}
      <div className="flex items-center gap-4">
        <CustomerLogo logoUrl={logoUrl} companyName={companyName || "?"} size="lg" />
        <div>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <span className="text-xs text-primary hover:underline flex items-center gap-1">
              <Upload className="h-3 w-3" /> Upload custom logo
            </span>
          </label>
          {logoUrl && <p className="text-xs text-muted-foreground mt-0.5">Auto-fetched from website</p>}
        </div>
      </div>

      {/* Company fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AutoField
          label="Company Name"
          required
          value={companyName}
          onChange={setCompanyName}
          isAuto={autoFields.has("companyName")}
        />
        <AutoField
          label="Industry"
          value={industry}
          onChange={setIndustry}
          isAuto={autoFields.has("industry")}
        />
        <div className="sm:col-span-2">
          <AutoField
            label="Description"
            value={description}
            onChange={setDescription}
            isAuto={autoFields.has("description")}
            textarea
          />
        </div>
        <AutoField label="Phone" required value={phone} onChange={setPhone} />
        <AutoField
          label="Headquarters Address"
          value={headquartersAddress}
          onChange={setHeadquartersAddress}
          isAuto={autoFields.has("headquartersAddress")}
        />
      </div>

      <Separator />

      {/* Primary Contact */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Primary Contact <span className="text-critical">*</span></h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AutoField label="Name" required value={contactName} onChange={setContactName} />
          <AutoField label="Email" required value={contactEmail} onChange={setContactEmail} />
          <AutoField label="Phone" value={contactPhone} onChange={setContactPhone} />
          <AutoField label="Role" value={contactRole} onChange={setContactRole} placeholder="e.g. Manager, Field Operations" />
        </div>
      </div>

      <Separator />

      {/* First Location */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-semibold">First Location</h4>
          <Button
            variant={addLocation ? "default" : "outline"}
            size="sm"
            className="text-xs h-7"
            onClick={() => setAddLocation(!addLocation)}
          >
            {addLocation ? "Remove" : "+ Add Location"}
          </Button>
        </div>
        {addLocation && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AutoField label="Site Name" value={siteName} onChange={setSiteName} placeholder="e.g. Payne Lane - Yreka" />
            <AutoField label="Address" value={siteAddress} onChange={setSiteAddress} />
            <AutoField label="City" value={siteCity} onChange={setSiteCity} />
            <div className="grid grid-cols-2 gap-2">
              <AutoField label="State" value={siteState} onChange={setSiteState} />
              <AutoField label="ZIP" value={siteZip} onChange={setSiteZip} />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Creating...</> : "Create Customer"}
        </Button>
      </div>
    </div>
  );
}

function AutoField({
  label,
  required,
  value,
  onChange,
  isAuto,
  textarea,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  isAuto?: boolean;
  textarea?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-critical">*</span>}
      </Label>
      <div className="relative">
        {textarea ? (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn("min-h-[60px] resize-y", isAuto && "bg-primary/5 border-primary/30")}
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(isAuto && "bg-primary/5 border-primary/30")}
          />
        )}
        {isAuto && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Auto</span>
          </div>
        )}
      </div>
    </div>
  );
}
