import { useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import {
  Loader2,
  Check,
  ChevronsUpDown,
  Plus,
  Copy,
  Download,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { useCreateCampaignReport } from "@/hooks/useCampaignReports";
import { renderCampaignReportPdf, ReportSnapshot } from "@/lib/campaignReportPdf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaignId: string;
  campaignName: string;
  campaignCustomerId?: string | null;
  snapshot: ReportSnapshot;
};

const SECTIONS = [
  { key: "dashboard", label: "Dashboard", desc: "Network Health, Risk Areas" },
  { key: "dataset", label: "Dataset", desc: "Total Chargers, Priority breakdown" },
  { key: "flagged", label: "Flagged", desc: "Open tickets, SLA, Aging, Geo" },
];

const PUBLIC_BASE = "https://nochplus.com";

export function GenerateCampaignReportModal({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  campaignCustomerId,
  snapshot,
}: Props) {
  const { session } = useAuth();
  const { data: customers = [] } = useCustomers();
  const createCustomer = useCreateCustomer();
  const createReport = useCreateCampaignReport();

  const [reportName, setReportName] = useState("");
  const [introNote, setIntroNote] = useState("");
  const [sections, setSections] = useState<string[]>(["dashboard", "dataset", "flagged"]);
  const [requireEmail, setRequireEmail] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerCompany, setNewCustomerCompany] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");

  const [phase, setPhase] = useState<"form" | "generating" | "done">("form");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{
    publicUrl: string;
    pdfBlob: Blob;
    reportId: string;
  } | null>(null);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) || null,
    [customers, customerId]
  );

  // Initialize form when opened
  useEffect(() => {
    if (open) {
      setReportName(`${campaignName} — Campaign Report`);
      setIntroNote("");
      setSections(["dashboard", "dataset", "flagged"]);
      setRequireEmail(false);
      setExpiresInDays("90");
      setCustomerId(campaignCustomerId || null);
      setShowAddCustomer(false);
      setPhase("form");
      setResult(null);
    }
  }, [open, campaignName, campaignCustomerId]);

  const toggleSection = (key: string) => {
    setSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleAddCustomer = async () => {
    if (!newCustomerCompany.trim() || !newCustomerEmail.trim()) {
      toast.error("Company and email are required");
      return;
    }
    try {
      const c = await createCustomer.mutateAsync({
        company: newCustomerCompany.trim(),
        contact_name: newCustomerName.trim() || newCustomerCompany.trim(),
        email: newCustomerEmail.trim(),
      });
      setCustomerId(c.id);
      setShowAddCustomer(false);
      setNewCustomerCompany("");
      setNewCustomerName("");
      setNewCustomerEmail("");
    } catch {
      // toast handled in hook
    }
  };

  const handleGenerate = async () => {
    if (!selectedCustomer) {
      toast.error("Select a customer first");
      return;
    }
    if (sections.length === 0) {
      toast.error("Select at least one section");
      return;
    }

    setPhase("generating");
    try {
      // Build snapshot with customer + campaign names
      const enrichedSnapshot: ReportSnapshot = {
        ...snapshot,
        customerName: selectedCustomer.company,
        campaignName,
      };

      // 1. AI summary
      setProgress("Generating executive summary...");
      let aiSummary = "";
      try {
        const { data, error } = await supabase.functions.invoke(
          "generate-report-summary",
          {
            body: {
              snapshot: enrichedSnapshot,
              customer_name: selectedCustomer.company,
              campaign_name: campaignName,
              sections,
            },
          }
        );
        if (error) throw error;
        aiSummary = (data as { summary?: string })?.summary || "";
      } catch (e) {
        console.warn("AI summary failed, continuing without:", e);
        aiSummary = `This report summarizes the current state of the ${selectedCustomer.company} fleet across ${enrichedSnapshot.totalChargers.toLocaleString()} chargers. Of these, ${enrichedSnapshot.critical} are flagged Critical and ${enrichedSnapshot.high} High, representing the most urgent service priorities.\n\nThe overall network health score stands at ${enrichedSnapshot.healthScore}, with ${enrichedSnapshot.serviced} chargers already serviced under this campaign. Open tickets and SLA breaches indicate where intervention is most needed in the immediate term.\n\nNoch+ recommends continued AI-driven prioritization, rapid-response dispatch on Critical assets, and certified field technician deployment to maintain network reliability and customer trust.`;
      }

      // 2. Render PDF
      setProgress("Building PDF...");
      const userMeta = session?.user?.user_metadata as
        | { full_name?: string; name?: string }
        | undefined;
      const preparedByName =
        userMeta?.full_name || userMeta?.name || session?.user?.email || "Noch+ Team";
      const preparedByEmail = session?.user?.email || "";

      const pdfBlob = await renderCampaignReportPdf({
        reportName,
        introNote: introNote.trim() || null,
        sectionsIncluded: sections,
        snapshot: enrichedSnapshot,
        aiSummary,
        preparedBy: { name: preparedByName, email: preparedByEmail },
        generatedAt: new Date(),
      });

      // 3. Save to DB + storage
      setProgress("Creating share link...");
      const created = await createReport.mutateAsync({
        campaign_id: campaignId,
        customer_id: selectedCustomer.id,
        report_name: reportName,
        intro_note: introNote.trim() || null,
        sections_included: sections,
        require_email_to_view: requireEmail,
        expires_in_days: parseInt(expiresInDays, 10),
        snapshot_data: enrichedSnapshot as unknown as Record<string, unknown>,
        ai_executive_summary: aiSummary,
        pdf_blob: pdfBlob,
        created_by_name: preparedByName,
        created_by_email: preparedByEmail,
      });

      const publicUrl = `${PUBLIC_BASE}/r/${created.public_token}`;
      setResult({ publicUrl, pdfBlob, reportId: created.id });
      setPhase("done");
      toast.success("Report generated");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
      setPhase("form");
    }
  };

  const handleCopyLink = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.publicUrl);
    toast.success("Link copied");
    await supabase.from("report_audit_log").insert({
      report_id: result.reportId,
      action: "link_copied",
    });
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportName.replace(/[^a-z0-9]+/gi, "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {phase === "done" && result ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <DialogTitle>Report Ready</DialogTitle>
              </div>
              <DialogDescription>
                Your branded report has been generated and is ready to share.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Shareable Link
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input value={result.publicUrl} readOnly className="font-mono text-sm" />
                  <Button onClick={handleCopyLink} variant="outline">
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  No login required. The link expires in {expiresInDays} days.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleDownload} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" /> Download PDF
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href={result.publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Open Link
                  </a>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : phase === "generating" ? (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <div>
              <p className="font-medium text-foreground">Generating Report</p>
              <p className="text-sm text-muted-foreground mt-1">{progress}</p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Generate Campaign Report</DialogTitle>
              <DialogDescription>
                Create a branded PDF and shareable link for {campaignName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Customer */}
              <div>
                <Label>Customer</Label>
                {showAddCustomer ? (
                  <div className="space-y-2 mt-1 p-3 border border-border rounded-md bg-muted/30">
                    <Input
                      placeholder="Company name *"
                      value={newCustomerCompany}
                      onChange={(e) => setNewCustomerCompany(e.target.value)}
                    />
                    <Input
                      placeholder="Contact name"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                    />
                    <Input
                      placeholder="Email *"
                      type="email"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddCustomer}
                        disabled={createCustomer.isPending}
                      >
                        {createCustomer.isPending && (
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        )}
                        Save customer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAddCustomer(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between mt-1 font-normal"
                      >
                        {selectedCustomer?.company || "Select customer..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                      <Command>
                        <CommandInput placeholder="Search customers..." />
                        <CommandList>
                          <CommandEmpty>No customer found.</CommandEmpty>
                          <CommandGroup>
                            {customers.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.company}
                                onSelect={() => {
                                  setCustomerId(c.id);
                                  setCustomerPickerOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    customerId === c.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {c.company}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup>
                            <CommandItem
                              value="__add_new__"
                              onSelect={() => {
                                setCustomerPickerOpen(false);
                                setShowAddCustomer(true);
                              }}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add new customer
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Report name */}
              <div>
                <Label htmlFor="report-name">Report name</Label>
                <Input
                  id="report-name"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Intro note */}
              <div>
                <Label htmlFor="intro-note">
                  Intro note <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="intro-note"
                  placeholder='e.g. "Prepared for the CARB fleet review, April 2026."'
                  value={introNote}
                  onChange={(e) => setIntroNote(e.target.value)}
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>

              {/* Sections */}
              <div>
                <Label>Sections to include</Label>
                <div className="space-y-2 mt-2">
                  {SECTIONS.map((s) => (
                    <label
                      key={s.key}
                      className="flex items-start gap-3 p-2.5 rounded-md border border-border hover:bg-muted/40 cursor-pointer"
                    >
                      <Checkbox
                        checked={sections.includes(s.key)}
                        onCheckedChange={() => toggleSection(s.key)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Email gate + expiration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border border-border rounded-md">
                  <div>
                    <Label htmlFor="email-gate" className="cursor-pointer">
                      Require email to view
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Capture viewer emails</p>
                  </div>
                  <Switch
                    id="email-gate"
                    checked={requireEmail}
                    onCheckedChange={setRequireEmail}
                  />
                </div>

                <div>
                  <Label>Link expires in</Label>
                  <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!selectedCustomer || sections.length === 0}>
                Generate Report
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
