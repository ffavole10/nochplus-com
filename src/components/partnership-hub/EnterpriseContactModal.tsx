import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EnterpriseContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnterpriseContactModal({ open, onOpenChange }: EnterpriseContactModalProps) {
  const [partnerName, setPartnerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [chargerCount, setChargerCount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setPartnerName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setChargerCount("");
    setMessage("");
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!partnerName.trim() || !companyName.trim() || !email.trim()) {
      toast.error("Please fill in name, company, and email.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("noch_plus_enterprise_inquiries" as any)
        .insert({
          partner_name: partnerName.trim(),
          company_name: companyName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          estimated_charger_count: chargerCount ? parseInt(chargerCount, 10) : null,
          message: message.trim() || null,
        } as any);
      if (error) throw error;
      setSuccess(true);
      toast.success("Thanks! We'll be in touch within 1 business day.");
    } catch (err: any) {
      console.error("Enterprise inquiry error:", err);
      toast.error("Could not submit inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTimeout(reset, 200);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact NOCH+ Enterprise</DialogTitle>
          <DialogDescription>
            Tell us about your operation. We'll build a custom reliability program for your fleet.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="font-semibold">Inquiry received</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Our enterprise team will reach out to {email} within one business day.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Your Name *</Label>
                <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Company *</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Charging" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Estimated charger count</Label>
                <Input
                  type="number"
                  min={0}
                  value={chargerCount}
                  onChange={(e) => setChargerCount(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Tell us about your needs</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Number of sites, regions, current pain points, timeline..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending...</>
                ) : (
                  "Send Inquiry"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
