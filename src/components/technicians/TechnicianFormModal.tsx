import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Technician } from "@/hooks/useTechnicians";

const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

const DEFAULT_REGIONS = ["Southern California","Northern California","Orange County","San Diego","Los Angeles Metro","Bay Area","Central Valley","Pacific Northwest","Southwest","Mountain West"];

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technician: Technician | null;
  onSave: (data: any) => void;
  availableRegions?: string[];
}

export function TechnicianFormModal({ open, onOpenChange, technician, onSave, availableRegions }: Props) {
  const REGIONS = availableRegions && availableRegions.length > 0 ? availableRegions : DEFAULT_REGIONS;
  const isEdit = !!technician?.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const defaults = {
    first_name: "", last_name: "", email: "", phone: "",
    employee_type: "employee", level: "level_1",
    hourly_rate: 150, travel_rate: 75,
    status: "available", active: true,
    home_base_city: "", home_base_state: "",
    coverage_radius_miles: 120,
    service_regions: [] as string[],
    charger_types: ["AC | Level 2"] as string[],
    max_jobs_per_day: 3, preferred_contact: "phone",
    company_name: "", contract_terms: "", payment_terms: "",
    work_schedule: Object.fromEntries(DAYS.map(d => [d, { start: d === "saturday" || d === "sunday" ? "" : "08:00", end: d === "saturday" || d === "sunday" ? "" : "17:00" }])),
  };

  const [form, setForm] = useState(defaults);

  useEffect(() => {
    if (technician) {
      setPhotoUrl(technician.photo_url || null);
      setForm({
        first_name: technician.first_name,
        last_name: technician.last_name,
        email: technician.email,
        phone: technician.phone,
        employee_type: technician.employee_type,
        level: technician.level,
        hourly_rate: technician.hourly_rate,
        travel_rate: technician.travel_rate,
        status: technician.status,
        active: technician.active,
        home_base_city: technician.home_base_city,
        home_base_state: technician.home_base_state,
        coverage_radius_miles: technician.coverage_radius_miles,
        service_regions: technician.service_regions || [],
        charger_types: technician.charger_types || ["AC | Level 2"],
        max_jobs_per_day: technician.max_jobs_per_day,
        preferred_contact: technician.preferred_contact,
        company_name: technician.company_name || "",
        contract_terms: technician.contract_terms || "",
        payment_terms: technician.payment_terms || "",
        work_schedule: technician.work_schedule || defaults.work_schedule,
      });
    } else {
      setPhotoUrl(null);
      setForm(defaults);
    }
  }, [technician, open]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    setUploading(true);
    try {
      const techId = technician?.id || crypto.randomUUID();
      const ext = file.name.split(".").pop();
      const path = `technicians/${techId}/photo.${ext}`;

      const { data: existing } = await supabase.storage.from("avatars").list(`technicians/${techId}`);
      if (existing?.length) {
        await supabase.storage.from("avatars").remove(existing.map(f => `technicians/${techId}/${f.name}`));
      }

      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setPhotoUrl(`${urlData.publicUrl}?t=${Date.now()}`);
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleRegion = (r: string) => {
    setForm(prev => ({
      ...prev,
      service_regions: prev.service_regions.includes(r) ? prev.service_regions.filter(x => x !== r) : [...prev.service_regions, r],
    }));
  };

  const toggleChargerType = (t: string) => {
    setForm(prev => ({
      ...prev,
      charger_types: prev.charger_types.includes(t) ? prev.charger_types.filter(x => x !== t) : [...prev.charger_types, t],
    }));
  };

  const handleSubmit = () => {
    if (!form.first_name || !form.last_name || !form.email) return;
    onSave({ ...(isEdit ? { id: technician!.id } : {}), ...form, photo_url: photoUrl });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Technician" : "Add Technician"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="coverage">Coverage</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Profile Photo */}
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <Avatar className={`h-16 w-16 ${uploading ? "opacity-50" : ""}`}>
                  <AvatarImage src={photoUrl || undefined} alt="Technician" />
                  <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                    {form.first_name && form.last_name ? `${form.first_name[0]}${form.last_name[0]}` : <User className="w-6 h-6" />}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div>
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="text-xs text-muted-foreground">Click to upload (max 2MB)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input value={form.first_name} onChange={e => set("first_name", e.target.value)} />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={form.last_name} onChange={e => set("last_name", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(555) 123-4567" />
            </div>
          </TabsContent>

          <TabsContent value="employment" className="space-y-4 mt-4">
            <div>
              <Label>Employee Type</Label>
              <Select value={form.employee_type} onValueChange={v => set("employee_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level / Skill</Label>
              <Select value={form.level} onValueChange={v => set("level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="level_1">Level 1 - Field Techs</SelectItem>
                  <SelectItem value="level_2">Level 2 - Senior Field Techs</SelectItem>
                  <SelectItem value="level_3">Level 3 - Lead Techs</SelectItem>
                  <SelectItem value="level_4">Level 4 - Master Techs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hourly Rate ($)</Label>
                <Input type="number" value={form.hourly_rate} onChange={e => set("hourly_rate", Number(e.target.value))} />
              </div>
              <div>
                <Label>Travel Rate ($)</Label>
                <Input type="number" value={form.travel_rate} onChange={e => set("travel_rate", Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on_job">On Job</SelectItem>
                  <SelectItem value="off_duty">Off Duty</SelectItem>
                  <SelectItem value="on_vacation">On Vacation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.employee_type === "subcontractor" && (
              <>
                <div>
                  <Label>Company Name</Label>
                  <Input value={form.company_name} onChange={e => set("company_name", e.target.value)} />
                </div>
                <div>
                  <Label>Contract Terms</Label>
                  <Textarea value={form.contract_terms} onChange={e => set("contract_terms", e.target.value)} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="coverage" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Home Base City *</Label>
                <Input value={form.home_base_city} onChange={e => set("home_base_city", e.target.value)} />
              </div>
              <div>
                <Label>Home Base State *</Label>
                <Select value={form.home_base_state} onValueChange={v => set("home_base_state", v)}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Coverage Radius (miles)</Label>
              <Input type="number" value={form.coverage_radius_miles} onChange={e => set("coverage_radius_miles", Number(e.target.value))} />
            </div>
            <div>
              <Label className="mb-2 block">Service Regions</Label>
              <div className="grid grid-cols-2 gap-2">
                {REGIONS.map(r => (
                  <div key={r} className="flex items-center gap-2">
                    <Checkbox checked={form.service_regions.includes(r)} onCheckedChange={() => toggleRegion(r)} />
                    <span className="text-sm">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="capabilities" className="space-y-4 mt-4">
            <div>
              <Label className="mb-2 block">Charger Types</Label>
              {["AC | Level 2", "DC | Level 3"].map(t => (
                <div key={t} className="flex items-center gap-2 mb-2">
                  <Checkbox checked={form.charger_types.includes(t)} onCheckedChange={() => toggleChargerType(t)} />
                  <span className="text-sm">{t}</span>
                </div>
              ))}
            </div>
            <div>
              <Label>Max Jobs Per Day</Label>
              <Input type="number" value={form.max_jobs_per_day} onChange={e => set("max_jobs_per_day", Number(e.target.value))} />
            </div>
            <div>
              <Label>Preferred Contact</Label>
              <Select value={form.preferred_contact} onValueChange={v => set("preferred_contact", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="text">Text Message</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="app">Mobile App</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Work Schedule</Label>
              <div className="space-y-2">
                {DAYS.map(day => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-sm w-24 capitalize">{day}</span>
                    <Input
                      type="time"
                      value={form.work_schedule[day]?.start || ""}
                      onChange={e => setForm(prev => ({
                        ...prev,
                        work_schedule: { ...prev.work_schedule, [day]: { ...prev.work_schedule[day], start: e.target.value } }
                      }))}
                      className="w-28 h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={form.work_schedule[day]?.end || ""}
                      onChange={e => setForm(prev => ({
                        ...prev,
                        work_schedule: { ...prev.work_schedule, [day]: { ...prev.work_schedule[day], end: e.target.value } }
                      }))}
                      className="w-28 h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEdit ? "Save Changes" : "Add Technician"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
