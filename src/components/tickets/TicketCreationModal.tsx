import { useState, useCallback, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload, X, Camera, CreditCard, Plus, Check, ChevronDown, MapPin, Zap,
  User, Building2, ArrowLeft, Image, LocateFixed
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CustomerLogo } from "@/components/CustomerLogo";
import { CompanyGrid } from "./CompanyGrid";
import { NewCustomerForm } from "./NewCustomerForm";
import { useLocations, useCreateLocation, type Location } from "@/hooks/useLocations";
import { useContacts, useCreateContact, type Contact } from "@/hooks/useContacts";
import { toast } from "sonner";
import type { Customer } from "@/hooks/useCustomers";
import type { TicketPhoto } from "@/types/ticket";

interface TicketCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TicketCreationData) => void;
}

export interface TicketCreationData {
  customerId: string;
  customerName: string;
  customerCompany: string;
  locationId?: string;
  locationName?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  chargerBrand: string;
  chargerSerial: string;
  chargerType: string;
  chargerLocation: string;
  stationId: string;
  issueDescription: string;
  photos: TicketPhoto[];
}

type Phase = "select_company" | "new_customer" | "ticket_details";

const CHARGER_BRANDS = [
  { value: "BTC", label: "BTC Power" },
  { value: "ABB", label: "ABB" },
  { value: "Delta", label: "Delta" },
  { value: "Tritium", label: "Tritium" },
  { value: "Signet", label: "Signet" },
  { value: "Other", label: "Other" },
];

const CHARGER_TYPES = [
  { value: "AC_L2", label: "AC | Level 2" },
  { value: "DC_L3", label: "DC | Level 3" },
];

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export function TicketCreationModal({ open, onOpenChange, onSubmit }: TicketCreationModalProps) {
  const [phase, setPhase] = useState<Phase>("select_company");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Phase 2 state
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);

  // New location inline
  const [newLocName, setNewLocName] = useState("");
  const [newLocAddress, setNewLocAddress] = useState("");
  const [newLocCity, setNewLocCity] = useState("");
  const [newLocState, setNewLocState] = useState("");
  const [newLocZip, setNewLocZip] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  // New contact inline
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRole, setNewContactRole] = useState("");

  // Charger
  const [chargerBrand, setChargerBrand] = useState("");
  const [chargerSerial, setChargerSerial] = useState("");
  const [chargerType, setChargerType] = useState("");
  const [stationId, setStationId] = useState("");

  // Issue
  const [issueDescription, setIssueDescription] = useState("");
  const [photos, setPhotos] = useState<TicketPhoto[]>([]);

  // Queries
  const { data: locations = [] } = useLocations(selectedCustomer?.id);
  const { data: contacts = [] } = useContacts(selectedCustomer?.id);
  const createLocation = useCreateLocation();
  const createContact = useCreateContact();

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  const fallbackContact = useMemo<Contact | null>(() => {
    if (!selectedCustomer || contacts.length > 0) return null;
    const hasAny = selectedCustomer.contact_name?.trim() || selectedCustomer.email?.trim() || selectedCustomer.phone?.trim();
    if (!hasAny) return null;
    const now = new Date().toISOString();
    return {
      id: "__customer_primary__",
      customer_id: selectedCustomer.id,
      name: selectedCustomer.contact_name || selectedCustomer.company,
      email: selectedCustomer.email || "",
      phone: selectedCustomer.phone || "",
      role: "Primary Contact",
      is_primary: true,
      created_at: now,
      updated_at: now,
    };
  }, [selectedCustomer, contacts.length]);

  const contactOptions = contacts.length > 0 ? contacts : (fallbackContact ? [fallbackContact] : []);
  const selectedContact = contactOptions.find((c) => c.id === selectedContactId);

  const resetForm = useCallback(() => {
    setPhase("select_company");
    setSelectedCustomer(null);
    setSelectedLocationId(null);
    setSelectedContactId(null);
    setShowNewLocation(false);
    setShowNewContact(false);
    setNewLocName(""); setNewLocAddress(""); setNewLocCity(""); setNewLocState(""); setNewLocZip("");
    setNewContactName(""); setNewContactEmail(""); setNewContactPhone(""); setNewContactRole("");
    setChargerBrand(""); setChargerSerial(""); setChargerType(""); setStationId("");
    setIssueDescription("");
    setPhotos([]);
  }, []);

  const handleCompanySelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPhase("ticket_details");
  };

  const handleCustomerCreated = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPhase("ticket_details");
  };

  const handleUseCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "User-Agent": "NOCHPlatform/1.0" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const road = [addr.house_number, addr.road].filter(Boolean).join(" ");
            if (road) setNewLocAddress(road);
            if (addr.city || addr.town || addr.village) setNewLocCity(addr.city || addr.town || addr.village);
            if (addr.state) setNewLocState(addr.state);
            if (addr.postcode) setNewLocZip(addr.postcode);
            toast.success("Location auto-filled");
          }
        } catch {
          toast.error("Could not resolve address");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        toast.error("Location access denied");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSaveNewLocation = async () => {
    if (!newLocName.trim() || !selectedCustomer) return;
    const result = await createLocation.mutateAsync({
      customer_id: selectedCustomer.id,
      site_name: newLocName,
      address: newLocAddress,
      city: newLocCity,
      state: newLocState,
      zip: newLocZip,
      country: "United States",
    });
    setSelectedLocationId(result.id);
    setShowNewLocation(false);
    setNewLocName(""); setNewLocAddress(""); setNewLocCity(""); setNewLocState(""); setNewLocZip("");
  };

  const handleSaveNewContact = async () => {
    if (!newContactName.trim() || !newContactEmail.trim() || !selectedCustomer) return;
    const result = await createContact.mutateAsync({
      customer_id: selectedCustomer.id,
      name: newContactName,
      email: newContactEmail,
      phone: newContactPhone,
      role: newContactRole || null,
      is_primary: contacts.length === 0,
    });
    setSelectedContactId(result.id);
    setShowNewContact(false);
    setNewContactName(""); setNewContactEmail(""); setNewContactPhone(""); setNewContactRole("");
  };

  const addPhotos = useCallback((files: FileList | File[]) => {
    const newPhotos: TicketPhoto[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > MAX_PHOTO_SIZE || !file.type.startsWith("image/")) return;
      newPhotos.push({
        id: crypto.randomUUID(),
        file,
        label: "additional",
        preview: URL.createObjectURL(file),
      });
    });
    setPhotos((prev) => [...prev, ...newPhotos]);
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleSubmit = () => {
    if (!selectedCustomer) return;
    if (!chargerSerial.trim()) {
      toast.error("Charger serial number is required");
      return;
    }
    if (!issueDescription.trim() || issueDescription.trim().length < 20) {
      toast.error("Issue description must be at least 20 characters");
      return;
    }

    const loc = selectedLocation;
    const con = selectedContact;

    onSubmit({
      customerId: selectedCustomer.id,
      customerName: con?.name || selectedCustomer.contact_name,
      customerCompany: selectedCustomer.company,
      locationId: loc?.id,
      locationName: loc?.site_name,
      contactId: con?.id,
      contactName: con?.name,
      contactEmail: con?.email,
      contactPhone: con?.phone,
      chargerBrand,
      chargerSerial,
      chargerType,
      chargerLocation: loc ? `${loc.site_name}, ${loc.address}` : "",
      stationId,
      issueDescription,
      photos,
    });

    resetForm();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {phase === "select_company" && "Select Customer"}
            {phase === "new_customer" && "New Customer"}
            {phase === "ticket_details" && "Create Service Ticket"}
          </DialogTitle>
        </DialogHeader>

        {/* Phase 1: Company Grid */}
        {phase === "select_company" && (
          <CompanyGrid
            onSelect={handleCompanySelect}
            onNewCustomer={() => setPhase("new_customer")}
          />
        )}

        {/* Phase 1 Alt: New Customer Form */}
        {phase === "new_customer" && (
          <NewCustomerForm
            onBack={() => setPhase("select_company")}
            onCreated={handleCustomerCreated}
          />
        )}

        {/* Phase 2: Ticket Details */}
        {phase === "ticket_details" && selectedCustomer && (
          <div className="space-y-5">
            {/* Selected company banner */}
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-3 border border-border">
              <CustomerLogo
                logoUrl={selectedCustomer.logo_url}
                companyName={selectedCustomer.company}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{selectedCustomer.company}</p>
                <p className="text-xs text-muted-foreground">{selectedCustomer.contact_name}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSelectedCustomer(null);
                  setPhase("select_company");
                }}
              >
                Change
              </Button>
            </div>

            {/* Step 1: Location */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Location
              </Label>
              {!showNewLocation ? (
                <div className="space-y-2">
                  <Select
                    value={selectedLocationId || ""}
                    onValueChange={(v) => setSelectedLocationId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{loc.site_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {[loc.address, loc.city, loc.state].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 text-primary"
                    onClick={() => setShowNewLocation(true)}
                  >
                    <Plus className="h-3 w-3" /> Add New Location
                  </Button>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">New Location</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={handleUseCurrentLocation}
                            disabled={geoLoading}
                          >
                            <LocateFixed className={cn("h-4 w-4", geoLoading && "animate-pulse")} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Use current location</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Input placeholder="Site name" value={newLocName} onChange={(e) => setNewLocName(e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <Input placeholder="Address" value={newLocAddress} onChange={(e) => setNewLocAddress(e.target.value)} />
                      </div>
                      <Input placeholder="City" value={newLocCity} onChange={(e) => setNewLocCity(e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="State" value={newLocState} onChange={(e) => setNewLocState(e.target.value)} />
                        <Input placeholder="ZIP" value={newLocZip} onChange={(e) => setNewLocZip(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNewLocation} disabled={!newLocName.trim() || createLocation.isPending}>
                        Save Location
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewLocation(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Step 2: Charger */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Charger Details
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={chargerBrand} onValueChange={setChargerBrand}>
                  <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
                  <SelectContent>
                    {CHARGER_BRANDS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={chargerType} onValueChange={setChargerType}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    {CHARGER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Serial Number *"
                  value={chargerSerial}
                  onChange={(e) => setChargerSerial(e.target.value)}
                />
                <Input
                  placeholder="Station ID"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Step 3: Contact */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Contact
              </Label>
              {!showNewContact ? (
                <div className="space-y-2">
                  <Select
                    value={selectedContactId || ""}
                    onValueChange={(v) => setSelectedContactId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a contact..." />
                    </SelectTrigger>
                    <SelectContent className="pointer-events-auto z-[2200]">
                      {contacts.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          No contacts found. Add one below.
                        </div>
                      )}
                      {contacts.map((con) => (
                        <SelectItem key={con.id} value={con.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {con.name}
                              {con.is_primary && " (Primary)"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {[con.role, con.email].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 text-primary"
                    onClick={() => setShowNewContact(true)}
                  >
                    <Plus className="h-3 w-3" /> Add New Contact
                  </Button>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Name *" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
                      <Input placeholder="Email *" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} />
                      <Input placeholder="Phone" value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} />
                      <Input placeholder="Role" value={newContactRole} onChange={(e) => setNewContactRole(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNewContact} disabled={!newContactName.trim() || !newContactEmail.trim() || createContact.isPending}>
                        Save Contact
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewContact(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Step 4: Photos & Issue */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Photos</Label>
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("ticket-photo-input")?.click()}
              >
                <Camera className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Click or drag photos here</p>
                <input
                  id="ticket-photo-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addPhotos(e.target.files); e.target.value = ""; }}
                />
              </div>
              {photos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {photos.map((p) => (
                    <div key={p.id} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                      <img src={p.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(p.id)}
                        className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-critical text-critical-foreground flex items-center justify-center"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Issue Description <span className="text-critical">*</span>
              </Label>
              <Textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe the issue, symptoms, and service needed..."
                className="min-h-[120px] resize-y"
              />
              <p className="text-xs text-muted-foreground">{issueDescription.trim().length} / 20 min characters</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Create Ticket
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
