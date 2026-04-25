import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Upload, FileText, X, Copy } from "lucide-react";
import { logWorkOrderActivity } from "@/lib/workOrderActivity";
import {
  PartnerPicker,
  SitePicker,
  PocPicker,
  LockedField,
  type PartnerOption,
  type SiteOption,
  type PocOption,
} from "@/components/field-capture/PartnerSitePocPicker";

interface ChargerInput {
  make_model: string;
  serial_number: string;
}

interface TechnicianOption {
  user_id: string;
  label: string;
}

export default function CreateTestJob() {
  usePageTitle("Create Work Order");
  const navigate = useNavigate();
  const location = useLocation();
  const duplicateFromId = (location.state as { duplicateFrom?: string } | null)
    ?.duplicateFrom;
  const { session } = useAuth();
  const [duplicateSource, setDuplicateSource] = useState<{
    id: string;
    work_order_number: string | null;
    sow_document_url: string | null;
    sow_document_name: string | null;
  } | null>(null);

  const [clientName, setClientName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [pocName, setPocName] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [technicianId, setTechnicianId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [chargers, setChargers] = useState<ChargerInput[]>([
    { make_model: "", serial_number: "" },
  ]);
  const [jobNotes, setJobNotes] = useState("");
  const [sowFile, setSowFile] = useState<File | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ wo_number: string; id: string } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      // Fetch users with role=technician.
      const { data: rows, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "technician");
      if (error) {
        console.error("[CreateTestJob] load technicians failed", error);
        return;
      }
      const userIds = (rows || []).map((r) => r.user_id).filter(Boolean);
      if (userIds.length === 0) {
        setTechnicians([]);
        return;
      }
      // Get email/name from profiles.
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", userIds);
      const opts: TechnicianOption[] = (profs || []).map((p: any) => ({
        user_id: p.user_id,
        label: p.display_name || p.email || p.user_id,
      }));
      // Include any tech without a profile row, fall back to id.
      for (const id of userIds) {
        if (!opts.find((o) => o.user_id === id)) {
          opts.push({ user_id: id, label: id });
        }
      }
      setTechnicians(opts);
    })();
  }, []);

  // Pre-populate from a duplicate source if requested via navigation state.
  useEffect(() => {
    if (!duplicateFromId) return;
    (async () => {
      const { data: src, error } = await supabase
        .from("work_orders")
        .select("*, work_order_chargers(make_model, serial_number, charger_position)")
        .eq("id", duplicateFromId)
        .maybeSingle();
      if (error || !src) {
        toast.error("Could not load source work order");
        return;
      }
      setDuplicateSource({
        id: src.id,
        work_order_number: src.work_order_number,
        sow_document_url: src.sow_document_url,
        sow_document_name: src.sow_document_name,
      });
      setClientName(src.client_name ?? "");
      setSiteName(src.site_name ?? "");
      setSiteAddress(src.site_address ?? "");
      setPocName(src.poc_name ?? "");
      setPocPhone(src.poc_phone ?? "");
      setPocEmail(src.poc_email ?? "");
      setJobNotes(src.job_notes ?? "");
      // Default scheduled date: next business day
      const next = new Date();
      next.setDate(next.getDate() + 1);
      if (next.getDay() === 6) next.setDate(next.getDate() + 2);
      else if (next.getDay() === 0) next.setDate(next.getDate() + 1);
      setScheduledDate(next.toISOString().slice(0, 10));
      // Chargers
      const sortedChargers = ((src as any).work_order_chargers ?? [])
        .sort((a: any, b: any) => a.charger_position - b.charger_position)
        .map((c: any) => ({
          make_model: c.make_model ?? "",
          serial_number: c.serial_number ?? "",
        }));
      if (sortedChargers.length > 0) setChargers(sortedChargers);
    })();
  }, [duplicateFromId]);

  const updateCharger = (idx: number, field: keyof ChargerInput, value: string) => {
    setChargers((arr) => {
      const next = [...arr];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addCharger = () => {
    if (chargers.length >= 20) return;
    setChargers((arr) => [...arr, { make_model: "", serial_number: "" }]);
  };

  const removeCharger = (idx: number) => {
    if (chargers.length <= 1) return;
    setChargers((arr) => arr.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !siteName || !siteAddress || !technicianId) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!pocName || !pocPhone) {
      toast.error("Point of Contact name and phone are required");
      return;
    }
    if (chargers.length < 1) {
      toast.error("Add at least one charger");
      return;
    }

    setSubmitting(true);
    try {
      const { data: wo, error: woErr } = await supabase
        .from("work_orders")
        .insert({
          client_name: clientName,
          site_name: siteName,
          site_address: siteAddress,
          poc_name: pocName,
          poc_phone: pocPhone,
          poc_email: pocEmail || null,
          assigned_technician_id: technicianId,
          scheduled_date: scheduledDate,
          status: "scheduled",
          job_notes: jobNotes || null,
          created_by: session?.user?.id ?? null,
        })
        .select()
        .single();
      if (woErr) throw woErr;

      // Upload SOW document if provided
      if (sowFile) {
        const ext = sowFile.name.split(".").pop() || "pdf";
        const path = `${wo.id}/sow-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("field-capture-docs")
          .upload(path, sowFile, { contentType: sowFile.type });
        if (upErr) {
          console.error("[CreateTestJob] SOW upload failed", upErr);
          toast.error("Work order created, but SOW upload failed");
        } else {
          await supabase
            .from("work_orders")
            .update({ sow_document_url: path, sow_document_name: sowFile.name })
            .eq("id", wo.id);
        }
      }

      const chargerRows = chargers.map((c, idx) => ({
        work_order_id: wo.id,
        charger_position: idx + 1,
        make_model: c.make_model || null,
        serial_number: c.serial_number || null,
        status: "not_started" as const,
        added_on_site: false,
      }));
      const { error: chargersErr } = await supabase
        .from("work_order_chargers")
        .insert(chargerRows);
      if (chargersErr) throw chargersErr;

      setSuccess({ wo_number: wo.work_order_number ?? "(pending)", id: wo.id });
      toast.success(`Created ${wo.work_order_number}`);

      // Activity logs: created (and duplicated_from / duplicated source link)
      await logWorkOrderActivity({
        work_order_id: wo.id,
        action: "created",
        details: { work_order_number: wo.work_order_number },
      });
      if (duplicateSource) {
        await Promise.all([
          logWorkOrderActivity({
            work_order_id: wo.id,
            action: "duplicated_from",
            details: {
              source_work_order_id: duplicateSource.id,
              source_work_order_number: duplicateSource.work_order_number,
            },
          }),
          logWorkOrderActivity({
            work_order_id: duplicateSource.id,
            action: "duplicated",
            details: {
              new_work_order_id: wo.id,
              new_work_order_number: wo.work_order_number,
            },
          }),
        ]);
        // If source had a SOW, copy the reference (same file, no re-upload).
        if (duplicateSource.sow_document_url && !sowFile) {
          await supabase
            .from("work_orders")
            .update({
              sow_document_url: duplicateSource.sow_document_url,
              sow_document_name: duplicateSource.sow_document_name,
            })
            .eq("id", wo.id);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create work order");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setClientName("");
    setSiteName("");
    setSiteAddress("");
    setPocName("");
    setPocPhone("");
    setPocEmail("");
    setTechnicianId("");
    setScheduledDate(new Date().toISOString().slice(0, 10));
    setChargers([{ make_model: "", serial_number: "" }]);
    setJobNotes("");
    setSowFile(null);
    setSuccess(null);
  };

  if (success) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-1">Work order created</h1>
          <p className="text-sm text-muted-foreground mb-6">
            <span className="font-mono font-semibold text-foreground">
              {success.wo_number}
            </span>{" "}
            has been assigned and is now visible to the technician.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={reset} variant="outline">
              Create Another
            </Button>
            <Button onClick={() => navigate("/field-capture/admin/work-orders")}>
              View Work Orders
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {duplicateSource ? "Duplicate Work Order" : "Create Test Work Order"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manually scaffold a work order and assign it to a technician for
          field testing.
        </p>
        {duplicateSource && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <Copy className="h-3.5 w-3.5 text-primary" />
            <span>
              Creating from template:{" "}
              <span className="font-mono font-semibold">
                {duplicateSource.work_order_number}
              </span>
              . Scheduled date and technician have been reset.
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="client">Client Name *</Label>
            <Input
              id="client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
            />
          </div>
          <div>
            <Label htmlFor="site">Site Name *</Label>
            <Input
              id="site"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. Acme HQ — North Lot"
              required
            />
          </div>
          <div>
            <Label htmlFor="address">Site Address *</Label>
            <Input
              id="address"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="123 Main St, City, State"
              required
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Point of Contact</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Technician will call this person when en route.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="poc-name">POC Name *</Label>
              <Input
                id="poc-name"
                value={pocName}
                onChange={(e) => setPocName(e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>
            <div>
              <Label htmlFor="poc-phone">POC Phone *</Label>
              <Input
                id="poc-phone"
                type="tel"
                value={pocPhone}
                onChange={(e) => setPocPhone(e.target.value)}
                placeholder="(555) 123-4567"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="poc-email">POC Email (optional)</Label>
            <Input
              id="poc-email"
              type="email"
              value={pocEmail}
              onChange={(e) => setPocEmail(e.target.value)}
              placeholder="john@client.com"
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Assigned Technician *</Label>
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician…" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No users with the technician role yet. Assign the role in
                      Settings → Access Control.
                    </div>
                  )}
                  {technicians.map((t) => (
                    <SelectItem key={t.user_id} value={t.user_id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Scheduled Date *</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold">Chargers</h2>
              <p className="text-xs text-muted-foreground">
                {chargers.length} of max 20
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCharger}
              disabled={chargers.length >= 20}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Charger
            </Button>
          </div>
          <div className="space-y-3">
            {chargers.map((c, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end p-3 rounded-lg border border-border bg-muted/20"
              >
                <div>
                  <Label className="text-xs">Make / Model #{idx + 1}</Label>
                  <Input
                    value={c.make_model}
                    onChange={(e) =>
                      updateCharger(idx, "make_model", e.target.value)
                    }
                    placeholder="e.g. ChargePoint CT4000"
                  />
                </div>
                <div>
                  <Label className="text-xs">Serial Number</Label>
                  <Input
                    value={c.serial_number}
                    onChange={(e) =>
                      updateCharger(idx, "serial_number", e.target.value)
                    }
                    placeholder="e.g. SN-12345"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCharger(idx)}
                  disabled={chargers.length <= 1}
                  aria-label="Remove charger"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Comments & Instructions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Internal notes for the technician and an optional Scope of Work attachment.
            </p>
          </div>

          <div>
            <Label htmlFor="job-notes">Comments / Job Notes</Label>
            <Textarea
              id="job-notes"
              value={jobNotes}
              onChange={(e) => setJobNotes(e.target.value)}
              placeholder="Special instructions, access info, parking notes, etc."
              rows={4}
            />
          </div>

          <div>
            <Label>SOW / Instructions Document (PDF, DOC, image — max 10MB)</Label>
            {sowFile ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{sowFile.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(sowFile.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSowFile(null)}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to attach SOW or instructions
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf,.doc,.docx,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 10 * 1024 * 1024) {
                      toast.error("File must be under 10MB");
                      return;
                    }
                    setSowFile(f);
                  }}
                />
              </label>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={submitting} size="lg">
            {submitting ? "Creating…" : "Create Work Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
