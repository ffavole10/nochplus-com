import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Upload, Trash2, ExternalLink } from "lucide-react";
import type { WorkOrder } from "@/types/fieldCapture";

interface Props {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function WorkOrderEditModal({
  workOrder,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [clientName, setClientName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [pocName, setPocName] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [jobNotes, setJobNotes] = useState("");
  const [sowUrl, setSowUrl] = useState<string | null>(null);
  const [sowName, setSowName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workOrder) return;
    setClientName(workOrder.client_name || "");
    setSiteName(workOrder.site_name || "");
    setSiteAddress(workOrder.site_address || "");
    setPocName(workOrder.poc_name || "");
    setPocPhone(workOrder.poc_phone || "");
    setPocEmail(workOrder.poc_email || "");
    setScheduledDate(workOrder.scheduled_date || "");
    setJobNotes(workOrder.job_notes || "");
    setSowUrl(workOrder.sow_document_url || null);
    setSowName(workOrder.sow_document_name || null);
  }, [workOrder]);

  if (!workOrder) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${workOrder.id}/sow-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("field-capture-docs")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      setSowUrl(path);
      setSowName(file.name);
      toast.success("Document uploaded");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveDoc = async () => {
    if (!sowUrl) return;
    try {
      await supabase.storage.from("field-capture-docs").remove([sowUrl]);
    } catch (err) {
      console.error(err);
    }
    setSowUrl(null);
    setSowName(null);
  };

  const openDoc = async () => {
    if (!sowUrl) return;
    const { data, error } = await supabase.storage
      .from("field-capture-docs")
      .createSignedUrl(sowUrl, 300);
    if (error || !data?.signedUrl) {
      toast.error("Could not open document");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleSave = async () => {
    if (!clientName || !siteName || !siteAddress || !pocName || !pocPhone) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({
          client_name: clientName,
          site_name: siteName,
          site_address: siteAddress,
          poc_name: pocName,
          poc_phone: pocPhone,
          poc_email: pocEmail || null,
          scheduled_date: scheduledDate,
          job_notes: jobNotes || null,
          sow_document_url: sowUrl,
          sow_document_name: sowName,
        })
        .eq("id", workOrder.id);
      if (error) throw error;
      toast.success("Work order updated");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Work Order</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {workOrder.work_order_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-3">
            <div>
              <Label>Client *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <Label>Site Name *</Label>
              <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>
            <div>
              <Label>Site Address *</Label>
              <Input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} />
            </div>
            <div>
              <Label>Scheduled Date *</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-semibold">Point of Contact</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={pocName} onChange={(e) => setPocName(e.target.value)} />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input value={pocPhone} onChange={(e) => setPocPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={pocEmail}
                onChange={(e) => setPocEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label htmlFor="notes">Comments / Job Notes</Label>
            <Textarea
              id="notes"
              value={jobNotes}
              onChange={(e) => setJobNotes(e.target.value)}
              placeholder="Add internal notes, instructions, or context for the technician…"
              rows={4}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label>SOW / Instructions Document</Label>
            {sowUrl ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {sowName || "Document"}
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={openDoc}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveDoc}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Uploading…" : "Attach PDF or document (max 10MB)"}
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf,.doc,.docx,image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
