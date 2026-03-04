import { useState, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, X, Camera, Image, CreditCard, Plus, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import CustomerAutoComplete, { type CustomerMatch } from "./CustomerAutoComplete";
import type {
  TicketData,
  TicketCustomerInfo,
  TicketChargerInfo,
  TicketPhoto,
  TicketIssueInfo,
  TicketSource,
  ChargerBrand,
  ChargerType,
} from "@/types/ticket";
import type {
  TicketData,
  TicketCustomerInfo,
  TicketChargerInfo,
  TicketPhoto,
  TicketIssueInfo,
  TicketSource,
  ChargerBrand,
  ChargerType,
} from "@/types/ticket";

interface Props {
  mode: "create" | "review";
  initialData?: Partial<TicketData>;
  source: TicketSource;
  onSubmit: (data: TicketData) => void;
  onCancel: () => void;
}

const CHARGER_BRANDS: { value: ChargerBrand; label: string }[] = [
  { value: "BTC", label: "BTC Power" },
  { value: "ABB", label: "ABB" },
  { value: "Delta", label: "Delta" },
  { value: "Tritium", label: "Tritium" },
  { value: "Signet", label: "Signet" },
  { value: "Other", label: "Other" },
];

const CHARGER_TYPES: { value: ChargerType; label: string }[] = [
  { value: "AC_L2", label: "AC | Level 2" },
  { value: "DC_L3", label: "DC | Level 3" },
];

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

// ─── Validation helpers ───
function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

interface TabErrors {
  customer: string[];
  charger: string[];
  photos: string[];
  issue: string[];
}

function validate(
  customer: TicketCustomerInfo,
  charger: TicketChargerInfo,
  photos: TicketPhoto[],
  issue: TicketIssueInfo
): TabErrors {
  const errors: TabErrors = { customer: [], charger: [], photos: [], issue: [] };

  if (!customer.name.trim()) errors.customer.push("Name is required");
  if (!customer.company.trim()) errors.customer.push("Company is required");
  if (!customer.email.trim()) errors.customer.push("Email is required");
  else if (!validateEmail(customer.email)) errors.customer.push("Invalid email format");
  if (!customer.phone.trim()) errors.customer.push("Phone is required");
  else if (!validatePhone(customer.phone)) errors.customer.push("Invalid US phone number");
  if (!customer.address.trim()) errors.customer.push("Address is required");

  if (!charger.brand) errors.charger.push("Brand is required");
  if (!charger.serialNumber.trim()) errors.charger.push("Serial number is required");
  if (!charger.type) errors.charger.push("Charger type is required");
  if (!charger.location.trim()) errors.charger.push("Location is required");

  if (issue.description.trim().length < 50 && photos.length === 0)
    errors.issue.push("Description must be at least 50 characters, or attach at least 1 photo");
  else if (issue.description.trim().length > 0 && issue.description.trim().length < 50 && photos.length > 0)
    errors.issue.push("Description must be at least 50 characters if provided");

  return errors;
}

function hasErrors(errors: TabErrors) {
  return Object.values(errors).some((arr) => arr.length > 0);
}

// ─── Component ───
export default function StandardizedTicketIntakeForm({
  mode,
  initialData,
  source,
  onSubmit,
  onCancel,
}: Props) {
  const [activeTab, setActiveTab] = useState("customer");
  const [submitted, setSubmitted] = useState(false);

  const [customer, setCustomer] = useState<TicketCustomerInfo>(
    initialData?.customer ?? { name: "", company: "", email: "", phone: "", address: "" }
  );
  const [charger, setCharger] = useState<TicketChargerInfo>(
    initialData?.charger ?? { brand: "", serialNumber: "", type: "", location: "" }
  );
  const [photos, setPhotos] = useState<TicketPhoto[]>(initialData?.photos ?? []);
  const [issue, setIssue] = useState<TicketIssueInfo>(initialData?.issue ?? { description: "" });

  const createdAt = initialData?.metadata?.createdAt ?? new Date().toISOString();

  const errors = submitted ? validate(customer, charger, photos, issue) : { customer: [], charger: [], photos: [], issue: [] };
  const isReview = mode === "review";

  const handleSubmit = () => {
    setSubmitted(true);
    const errs = validate(customer, charger, photos, issue);
    if (hasErrors(errs)) {
      // Navigate to first tab with errors
      const firstBad = (["customer", "charger", "photos", "issue"] as const).find((t) => errs[t].length > 0);
      if (firstBad) setActiveTab(firstBad);
      return;
    }

    onSubmit({
      customer,
      charger,
      photos,
      issue,
      metadata: {
        source,
        createdAt,
        ...(initialData?.metadata?.campaignId && { campaignId: initialData.metadata.campaignId }),
        ...(initialData?.metadata?.submissionId && { submissionId: initialData.metadata.submissionId }),
        ...(initialData?.metadata?.createdBy && { createdBy: initialData.metadata.createdBy }),
      },
    });
  };

  // Photo helpers
  const addPhotos = useCallback(
    (files: FileList | File[], label: TicketPhoto["label"]) => {
      const newPhotos: TicketPhoto[] = [];
      Array.from(files).forEach((file) => {
        if (file.size > MAX_PHOTO_SIZE) return; // silently skip oversized
        if (!file.type.startsWith("image/")) return;
        newPhotos.push({
          id: crypto.randomUUID(),
          file,
          label,
          preview: URL.createObjectURL(file),
        });
      });
      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    []
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const TabBadge = ({ tab }: { tab: keyof TabErrors }) => {
    if (!submitted) return null;
    if (errors[tab].length > 0)
      return <AlertCircle className="h-3.5 w-3.5 text-critical ml-1" />;
    return <Check className="h-3.5 w-3.5 text-low ml-1" />;
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customer" className="text-xs sm:text-sm flex items-center gap-1">
            Customer <TabBadge tab="customer" />
          </TabsTrigger>
          <TabsTrigger value="charger" className="text-xs sm:text-sm flex items-center gap-1">
            Charger <TabBadge tab="charger" />
          </TabsTrigger>
          <TabsTrigger value="photos" className="text-xs sm:text-sm flex items-center gap-1">
            Photos {photos.length > 0 && <span className="text-xs text-muted-foreground">({photos.length})</span>}
            <TabBadge tab="photos" />
          </TabsTrigger>
          <TabsTrigger value="issue" className="text-xs sm:text-sm flex items-center gap-1">
            Issue <TabBadge tab="issue" />
          </TabsTrigger>
        </TabsList>

        {/* ─── Customer Tab ─── */}
        <TabsContent value="customer" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldInput label="Name" required value={customer.name} disabled={isReview}
              onChange={(v) => setCustomer((p) => ({ ...p, name: v }))}
              error={errors.customer.find((e) => e.includes("Name"))} />
            <FieldInput label="Company" required value={customer.company} disabled={isReview}
              onChange={(v) => setCustomer((p) => ({ ...p, company: v }))}
              error={errors.customer.find((e) => e.includes("Company"))} />
            <FieldInput label="Email" required type="email" value={customer.email} disabled={isReview}
              onChange={(v) => setCustomer((p) => ({ ...p, email: v }))}
              error={errors.customer.find((e) => e.toLowerCase().includes("email"))} />
            <FieldInput label="Phone" required type="tel" value={customer.phone} disabled={isReview}
              onChange={(v) => setCustomer((p) => ({ ...p, phone: formatPhone(v) }))}
              error={errors.customer.find((e) => e.toLowerCase().includes("phone"))} />
            <div className="sm:col-span-2">
              <FieldInput label="Address" required value={customer.address} disabled={isReview}
                onChange={(v) => setCustomer((p) => ({ ...p, address: v }))}
                error={errors.customer.find((e) => e.includes("Address"))} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Submitted: {new Date(createdAt).toLocaleString()}
          </div>
        </TabsContent>

        {/* ─── Charger Tab ─── */}
        <TabsContent value="charger" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Brand <span className="text-critical">*</span></Label>
              <Select value={charger.brand} onValueChange={(v) => setCharger((p) => ({ ...p, brand: v as ChargerBrand }))} disabled={isReview}>
                <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>
                  {CHARGER_BRANDS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.charger.find((e) => e.includes("Brand")) && (
                <p className="text-xs text-critical">{errors.charger.find((e) => e.includes("Brand"))}</p>
              )}
            </div>

            <FieldInput label="Serial Number" required value={charger.serialNumber} disabled={isReview}
              onChange={(v) => setCharger((p) => ({ ...p, serialNumber: v }))}
              error={errors.charger.find((e) => e.includes("Serial"))} />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Type <span className="text-critical">*</span></Label>
              <Select value={charger.type} onValueChange={(v) => setCharger((p) => ({ ...p, type: v as ChargerType }))} disabled={isReview}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {CHARGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.charger.find((e) => e.includes("type")) && (
                <p className="text-xs text-critical">{errors.charger.find((e) => e.includes("type"))}</p>
              )}
            </div>

            <FieldInput label="Location" required value={charger.location} disabled={isReview}
              placeholder="Address or site name"
              onChange={(v) => setCharger((p) => ({ ...p, location: v }))}
              error={errors.charger.find((e) => e.includes("Location"))} />
          </div>
        </TabsContent>

        {/* ─── Photos Tab ─── */}
        <TabsContent value="photos" className="space-y-4 mt-4">
          {!isReview && <PhotoDropZone onDrop={(files) => addPhotos(files, "additional")} />}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PhotoUploadButton label="Front Photo" icon={Camera} photoLabel="front" photos={photos} onAdd={addPhotos} disabled={isReview} />
            <PhotoUploadButton label="Back Photo" icon={Camera} photoLabel="back" photos={photos} onAdd={addPhotos} disabled={isReview} />
            <PhotoUploadButton label="Serial Plate" icon={CreditCard} photoLabel="serial_plate" photos={photos} onAdd={addPhotos} disabled={isReview} />
            <PhotoUploadButton label="Additional" icon={Plus} photoLabel="additional" photos={photos} onAdd={addPhotos} disabled={isReview} multiple />
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-border aspect-square">
                  <img src={photo.preview} alt={photo.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] text-white font-medium bg-foreground/60 px-1.5 py-0.5 rounded">{photo.label}</span>
                  </div>
                  {!isReview && (
                    <button onClick={() => removePhoto(photo.id)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-critical text-critical-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">Max 5 MB per photo. Accepted: JPG, PNG, WebP</p>
        </TabsContent>

        {/* ─── Issue Tab ─── */}
        <TabsContent value="issue" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Issue Description <span className="text-critical">*</span>
            </Label>
            <Textarea
              value={issue.description}
              onChange={(e) => setIssue({ description: e.target.value })}
              disabled={isReview}
              placeholder="Describe issue, symptoms, service needed..."
              className="min-h-[160px] resize-y"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {issue.description.trim().length} / 50 min characters
              </p>
              {errors.issue.length > 0 && (
                <p className="text-xs text-critical">{errors.issue[0]}</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Actions ─── */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {!isReview && (
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
            Submit Ticket
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function FieldInput({
  label, required, value, onChange, error, disabled, type = "text", placeholder,
}: {
  label: string; required?: boolean; value: string;
  onChange: (v: string) => void; error?: string; disabled?: boolean;
  type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-critical">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(error && "border-critical")}
      />
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}

function PhotoDropZone({ onDrop }: { onDrop: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) onDrop(Array.from(e.dataTransfer.files));
      }}
    >
      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Drag & drop photos here</p>
    </div>
  );
}

function PhotoUploadButton({
  label, icon: Icon, photoLabel, photos, onAdd, disabled, multiple,
}: {
  label: string;
  icon: React.ElementType;
  photoLabel: TicketPhoto["label"];
  photos: TicketPhoto[];
  onAdd: (files: FileList | File[], label: TicketPhoto["label"]) => void;
  disabled?: boolean;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const count = photos.filter((p) => p.label === photoLabel).length;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) { onAdd(e.target.files, photoLabel); e.target.value = ""; } }}
      />
      <Button
        variant="outline"
        size="sm"
        className="w-full h-auto py-3 flex flex-col gap-1 text-xs"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
        {count > 0 && <span className="text-[10px] text-muted-foreground">{count} added</span>}
      </Button>
    </div>
  );
}
