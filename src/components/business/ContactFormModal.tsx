import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useCreateContact, useUpdateContact, type Contact } from "@/hooks/useContacts";
import { CONTACT_TYPE_ORDER, CONTACT_TYPE_LABELS, CONTACT_TYPE_PILL, type ContactType } from "@/lib/contactTypes";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerId: string;
  contact?: Contact | null;
  /** When true, the only existing contact — force is_primary on. */
  forcePrimary?: boolean;
  /** Pre-select a contact type when adding from a section "+ Add" link. */
  defaultType?: ContactType;
  /** Pass the existing primary contact (if any, excluding the one being edited)
   *  so we can warn before replacement. */
  existingPrimary?: Contact | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactFormModal({
  open, onOpenChange, customerId, contact = null,
  forcePrimary = false, defaultType, existingPrimary = null,
}: Props) {
  const isEdit = !!contact;
  const create = useCreateContact();
  const update = useUpdateContact();
  const { confirm, dialogProps } = useConfirmDialog();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactType, setContactType] = useState<ContactType>("champion");
  const [notes, setNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (contact) {
      setName(contact.name || "");
      setTitle(contact.title || "");
      setEmail(contact.email || "");
      setPhone(contact.phone || "");
      const t = (contact.contact_type as ContactType) || "champion";
      setContactType(CONTACT_TYPE_ORDER.includes(t) ? t : "champion");
      setNotes(contact.notes || "");
      setIsPrimary(!!contact.is_primary);
    } else {
      setName(""); setTitle(""); setEmail(""); setPhone("");
      setContactType(defaultType || "champion");
      setNotes("");
      setIsPrimary(forcePrimary);
    }
  }, [open, contact, forcePrimary, defaultType]);

  const submit = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      toast.error("Valid email required"); return;
    }

    let finalIsPrimary = isPrimary || forcePrimary;

    // If user is trying to make this primary and another primary exists,
    // confirm the swap. If they cancel, save without changing primary.
    if (finalIsPrimary && existingPrimary && (!contact || existingPrimary.id !== contact.id)) {
      const ok = await confirm({
        title: "Replace primary contact?",
        description: `${existingPrimary.name} is currently primary. Replace them with ${name.trim()}?`,
        confirmLabel: "Replace",
      });
      if (!ok) {
        finalIsPrimary = false;
        setIsPrimary(false);
      }
    }

    const payload = {
      customer_id: customerId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      title: title.trim() || null,
      contact_type: contactType,
      notes: notes.trim() || null,
      is_primary: finalIsPrimary,
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
    <>
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
            <Label className="text-xs">Contact Type *</Label>
            <Select value={contactType} onValueChange={(v) => setContactType(v as ContactType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[2100]">
                {CONTACT_TYPE_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="inline-flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${CONTACT_TYPE_PILL[t].split(" ")[0]}`} />
                      {CONTACT_TYPE_LABELS[t]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Set as Primary</p>
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
    <ConfirmDialog {...dialogProps} />
    </>
  );
}
