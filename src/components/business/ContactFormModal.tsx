import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateContact, useUpdateContact, type Contact, type ContactType } from "@/hooks/useContacts";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const TYPE_OPTIONS: { value: ContactType; label: string }[] = [
  { value: "primary", label: "Primary" },
  { value: "decision_maker", label: "Decision maker" },
  { value: "technical", label: "Technical" },
  { value: "billing", label: "Billing" },
  { value: "operations", label: "Operations" },
  { value: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerId: string;
  contact?: Contact | null;
  /** When true, the only existing contact — force is_primary on. */
  forcePrimary?: boolean;
}

export function ContactFormModal({ open, onOpenChange, customerId, contact = null, forcePrimary = false }: Props) {
  const isEdit = !!contact;
  const create = useCreateContact();
  const update = useUpdateContact();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactType, setContactType] = useState<ContactType>("other");
  const [notes, setNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (contact) {
      setName(contact.name || "");
      setTitle(contact.title || "");
      setEmail(contact.email || "");
      setPhone(contact.phone || "");
      setContactType((contact.contact_type as ContactType) || "other");
      setNotes(contact.notes || "");
      setIsPrimary(!!contact.is_primary);
    } else {
      setName(""); setTitle(""); setEmail(""); setPhone("");
      setContactType("other"); setNotes("");
      setIsPrimary(forcePrimary);
    }
  }, [open, contact, forcePrimary]);

  const submit = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    if (!email.trim()) { toast.error("Email required"); return; }
    const payload = {
      customer_id: customerId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      title: title.trim() || null,
      contact_type: contactType,
      notes: notes.trim() || null,
      is_primary: isPrimary || forcePrimary,
      role: title.trim() || null,
    };
    try {
      if (isEdit && contact) {
        await update.mutateAsync({ id: contact.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {/* toast handled in hook */}
  };

  const submitting = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contact Type</Label>
            <Select value={contactType} onValueChange={(v) => setContactType(v as ContactType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[2100]">
                {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Primary contact</p>
              <p className="text-[11px] text-muted-foreground">Only one contact per account can be primary.</p>
            </div>
            <Switch checked={isPrimary || forcePrimary} disabled={forcePrimary} onCheckedChange={setIsPrimary} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="gap-1.5">
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
