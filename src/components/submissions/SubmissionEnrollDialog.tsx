import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, BadgeCheck, Building2, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { findAccountMatches, extractDomain } from "@/lib/accountSimilarity";
import {
  setEnrollPrefill,
  mapSubmissionChargerTypeToLine,
  type EnrollPrefillLine,
} from "@/lib/submissionEnrollPrefill";

type Submission = {
  id: string;
  submission_id: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  customer_notes: string | null;
  company_id?: string | null;
  chargers: Array<{ charger_type: string }>;
};

type Step = "loading" | "match" | "create" | "submitting";

export function SubmissionEnrollDialog({
  open,
  onOpenChange,
  submission,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  submission: Submission;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("loading");
  const [matchAccountId, setMatchAccountId] = useState<string | null>(null);

  // Create-account form state
  const [form, setForm] = useState({
    company: submission.company_name || "",
    contact_name: submission.full_name || "",
    email: submission.email || "",
    phone: submission.phone || "",
    address: [
      submission.street_address,
      submission.city,
      submission.state,
      submission.zip_code,
    ]
      .filter(Boolean)
      .join(", "),
  });

  // Load all (non-deleted) accounts to run match logic; also fetch active membership state for linked account
  const { data: accounts = [] } = useQuery({
    queryKey: ["customers-for-enroll-match"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, company, email, domain, membership_status, membership_tier")
        .is("deleted_at", null);
      if (error) throw error;
      return data || [];
    },
  });

  const linkedAccount = useMemo(() => {
    if (!submission.company_id) return null;
    return accounts.find((a: any) => a.id === submission.company_id) || null;
  }, [accounts, submission.company_id]);

  const matchAccount = useMemo(
    () => accounts.find((a: any) => a.id === matchAccountId) || null,
    [accounts, matchAccountId]
  );

  // Build enrollment prefill from submission and proceed to /business/accounts/:id?tab=membership
  const proceedToEnrollment = (
    accountId: string,
    isAlreadyEnrolled: boolean
  ) => {
    // Aggregate chargers by type
    const grouped = new Map<EnrollPrefillLine["charger_type"], EnrollPrefillLine>();
    for (const ch of submission.chargers) {
      const t = mapSubmissionChargerTypeToLine(ch.charger_type);
      const existing = grouped.get(t);
      if (existing) {
        existing.connector_count += 1;
      } else {
        grouped.set(t, {
          charger_type: t,
          connector_count: 1,
          notes: `From submission ${submission.submission_id}`,
        });
      }
    }

    const notes = [
      `Enrolled from Submission ${submission.submission_id}`,
      submission.customer_notes ? `Customer notes: ${submission.customer_notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    setEnrollPrefill({
      account_id: accountId,
      source_submission_id: submission.id,
      source_submission_display_id: submission.submission_id,
      lines: Array.from(grouped.values()),
      notes,
      billing_contact_email: submission.email || null,
      billing_contact_name: submission.full_name || null,
      mode: isAlreadyEnrolled ? "add_lines" : "enroll",
    });

    onOpenChange(false);
    navigate(
      `/business/accounts/${accountId}?tab=membership&enroll=1${
        isAlreadyEnrolled ? "&mode=add" : ""
      }`
    );
  };

  // Run linking logic when modal opens
  useEffect(() => {
    if (!open) return;
    if (accounts.length === 0) {
      setStep("loading");
      return;
    }

    // Scenario A: already linked
    if (submission.company_id && linkedAccount) {
      const enrolled =
        linkedAccount.membership_status === "active" ||
        linkedAccount.membership_status === "demo" ||
        linkedAccount.membership_status === "paused";
      proceedToEnrollment(submission.company_id, enrolled);
      return;
    }

    // Scenario B: try fuzzy match
    const submissionDom = extractDomain(submission.email);
    const matches = findAccountMatches(submission.company_name, accounts as any, {
      similarThreshold: 0.8,
      emailDomain: submissionDom,
    });
    const exactEmailDomMatch = matches.find(
      (m) =>
        submissionDom &&
        ((m.account as any).domain || "").toLowerCase() === submissionDom
    );
    const top = exactEmailDomMatch || matches[0];
    if (top && top.score >= 0.8) {
      setMatchAccountId(top.account.id);
      setStep("match");
    } else {
      setStep("create");
    }
  }, [open, accounts, linkedAccount, submission.company_id]);

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!matchAccountId) throw new Error("No account selected");
      const { error } = await supabase
        .from("noch_plus_submissions")
        .update({ company_id: matchAccountId } as any)
        .eq("id", submission.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      const enrolled =
        matchAccount &&
        ((matchAccount as any).membership_status === "active" ||
          (matchAccount as any).membership_status === "demo" ||
          (matchAccount as any).membership_status === "paused");
      proceedToEnrollment(matchAccountId!, !!enrolled);
    },
    onError: (e: any) => toast.error(e.message || "Failed to link account"),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        company: form.company.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        domain: extractDomain(form.email),
      };
      const { data, error } = await supabase
        .from("customers")
        .insert(payload as any)
        .select("id")
        .single();
      if (error) throw error;
      const accountId = (data as any).id as string;

      // Create primary contact
      await supabase.from("contacts").insert({
        customer_id: accountId,
        name: form.contact_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        is_primary: true,
        contact_type: "champion",
      } as any);

      // Link submission
      await supabase
        .from("noch_plus_submissions")
        .update({ company_id: accountId } as any)
        .eq("id", submission.id);

      return accountId;
    },
    onSuccess: (accountId: string) => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Account created and linked");
      proceedToEnrollment(accountId, false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to create account"),
  });

  const createValid =
    form.company.trim().length > 0 &&
    form.contact_name.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(form.email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === "loading" && (
          <div className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {step === "match" && matchAccount && (
          <>
            <DialogHeader>
              <DialogTitle>Link to existing account?</DialogTitle>
              <DialogDescription>
                We found a possible match for this submission.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-border p-4 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-bold">{(matchAccount as any).company}</span>
                {((matchAccount as any).membership_status === "active" ||
                  (matchAccount as any).membership_status === "demo") && (
                  <Badge className="bg-optimal/15 text-optimal border-optimal/30 text-[10px] gap-1">
                    <BadgeCheck className="h-3 w-3" /> NOCH+
                  </Badge>
                )}
              </div>
              {(matchAccount as any).email && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  {(matchAccount as any).email}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("create")}
                disabled={linkMutation.isPending}
              >
                Create New Account
              </Button>
              <Button
                onClick={() => linkMutation.mutate()}
                disabled={linkMutation.isPending}
              >
                {linkMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                )}
                Link & Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "create" && (
          <>
            <DialogHeader>
              <DialogTitle>Create account from submission</DialogTitle>
              <DialogDescription>
                Review the customer details captured in submission{" "}
                {submission.submission_id}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Business name *</Label>
                <Input
                  value={form.company}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Primary contact *</Label>
                  <Input
                    value={form.contact_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contact_name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Address</Label>
                <Textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!createValid || createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                )}
                Create Account & Continue
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
