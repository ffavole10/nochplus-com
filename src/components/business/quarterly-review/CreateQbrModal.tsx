import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText, Sparkles, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateQbr, useExtractQbr, uploadQbrDocument,
  type QbrQuarter, type QbrEntryMode, useQuarterlyReviews,
} from "@/hooks/useQbr";
import { extractTextFromFile } from "@/lib/qbrDocumentParser";

type Mode = "auto" | "document_upload" | "manual";
type Step = "mode" | "quarter" | "upload" | "review" | "financial" | "manual_form";

const QUARTERS: QbrQuarter[] = ["Q1", "Q2", "Q3", "Q4"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateQbrModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { data: existing = [] } = useQuarterlyReviews();
  const createQbr = useCreateQbr();
  const extract = useExtractQbr();

  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<Mode>("document_upload");
  const [quarter, setQuarter] = useState<QbrQuarter>("Q1");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState<any>({});
  const [financial, setFinancial] = useState<any>({
    quarterly_revenue: "", quarterly_expenses: "", net_income: "",
    cash_start: "", cash_end: "", avg_monthly_burn: "", runway_months: "",
    source: "QuickBooks", notes: "",
  });
  const [docPath, setDocPath] = useState<string | null>(null);

  const reset = () => {
    setStep("mode"); setMode("document_upload");
    setQuarter("Q1"); setYear(new Date().getFullYear());
    setFile(null); setExtracted({}); setDocPath(null);
    setFinancial({
      quarterly_revenue: "", quarterly_expenses: "", net_income: "",
      cash_start: "", cash_end: "", avg_monthly_burn: "", runway_months: "",
      source: "QuickBooks", notes: "",
    });
  };

  const close = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const duplicate = existing.some((q) => q.quarter === quarter && q.year === year);

  // ------- Steps -------
  const renderModeStep = () => (
    <div className="space-y-3">
      <ModeCard
        icon={Sparkles}
        title="Auto-tracked"
        badge="Current quarter"
        desc="System populates from NOCH+ data. Best for live cycles."
        selected={mode === "auto"}
        onClick={() => setMode("auto")}
      />
      <ModeCard
        icon={FileText}
        title="Document upload"
        badge="Recommended"
        desc="Upload a Q-retrospective (PDF, TXT, MD). AI extracts into the QBR template."
        selected={mode === "document_upload"}
        onClick={() => setMode("document_upload")}
      />
      <ModeCard
        icon={Pencil}
        title="Manual form"
        desc="9-step wizard with text inputs for each section. Use as a fallback."
        selected={mode === "manual"}
        onClick={() => setMode("manual")}
      />
    </div>
  );

  const renderQuarterStep = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Quarter</Label>
          <Select value={quarter} onValueChange={(v) => setQuarter(v as QbrQuarter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUARTERS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Year</Label>
          <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value || "0", 10))} />
        </div>
      </div>
      {duplicate && (
        <div className="text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> A QBR for {quarter} {year} already exists.
        </div>
      )}
    </div>
  );

  const handleUploadAndExtract = async () => {
    if (!file) { toast.error("Please choose a file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max file size is 5MB"); return; }
    setUploading(true);
    try {
      const path = await uploadQbrDocument(file);
      setDocPath(path);
      const text = await extractTextFromFile(file);
      const result = await extract.mutateAsync({ document_text: text, quarter, year });
      setExtracted(result || {});
      setStep("review");
    } catch (e: any) {
      toast.error(e.message || "Extraction failed");
    } finally {
      setUploading(false);
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Upload your {quarter} retrospective document. The system will extract structured information into the QBR template.
        Accepted: PDF, TXT, MD (max 5MB).
      </p>
      <Input
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      {file && <div className="text-xs text-muted-foreground">Selected: {file.name} ({Math.round(file.size / 1024)} KB)</div>}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
      <SectionEditor label="Strategic Narrative"
        value={extracted.strategic_narrative || ""}
        onChange={(v) => setExtracted({ ...extracted, strategic_narrative: v })}
        multiline placeholder="2-3 paragraphs describing the quarter…" />

      <ListEditor label="Top Wins" items={extracted.wins || []}
        onChange={(v) => setExtracted({ ...extracted, wins: v })} />
      <ListEditor label="Top Lessons" items={extracted.lessons || []}
        onChange={(v) => setExtracted({ ...extracted, lessons: v })} />
      <ListEditor label="Strategic Decisions" items={extracted.decisions || []}
        onChange={(v) => setExtracted({ ...extracted, decisions: v })} />

      <SectionEditor label="Carry-Forward"
        value={extracted.carry_forward || ""}
        onChange={(v) => setExtracted({ ...extracted, carry_forward: v })} multiline />

      <JsonEditor label="Operational Metrics" value={extracted.operational_metrics || {}}
        onChange={(v) => setExtracted({ ...extracted, operational_metrics: v })} />
      <JsonEditor label="Team & Organization" value={extracted.team_org || {}}
        onChange={(v) => setExtracted({ ...extracted, team_org: v })} />
      <JsonEditor label="Platform Progress" value={extracted.platform_progress || {}}
        onChange={(v) => setExtracted({ ...extracted, platform_progress: v })} />
      <JsonEditor label="Risks" value={extracted.risks || []}
        onChange={(v) => setExtracted({ ...extracted, risks: v })} />
      <JsonEditor label="Focus Accounts" value={extracted.focus_accounts || []}
        onChange={(v) => setExtracted({ ...extracted, focus_accounts: v })} />

      <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          Financial data must be entered manually — never auto-extracted for accuracy.
          You'll enter it on the next step.
        </div>
      </div>
    </div>
  );

  const renderFinancialStep = () => (
    <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
      <p className="text-sm text-muted-foreground">
        Enter directly from your QuickBooks {quarter} P&amp;L Report. This data is never auto-pulled to ensure accuracy.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["quarterly_revenue", "Quarterly Revenue ($) *"],
          ["quarterly_expenses", "Quarterly Expenses ($)"],
          ["net_income", "Net Income / Loss ($)"],
          ["cash_start", "Cash at start of quarter ($)"],
          ["cash_end", "Cash at end of quarter ($)"],
          ["avg_monthly_burn", "Avg monthly burn ($)"],
          ["runway_months", "Runway (months)"],
        ].map(([key, label]) => (
          <div key={key}>
            <Label>{label}</Label>
            <Input type="number" value={financial[key] ?? ""}
              onChange={(e) => setFinancial({ ...financial, [key]: e.target.value })} />
          </div>
        ))}
      </div>
      <div>
        <Label>Source</Label>
        <Input value={financial.source} onChange={(e) => setFinancial({ ...financial, source: e.target.value })} />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea placeholder="e.g. Per Q1 P&L Report dated Apr 15, 2026"
          value={financial.notes} onChange={(e) => setFinancial({ ...financial, notes: e.target.value })} />
      </div>
    </div>
  );

  const renderManualForm = () => (
    <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
      <SectionEditor label="Strategic Narrative" value={extracted.strategic_narrative || ""}
        onChange={(v) => setExtracted({ ...extracted, strategic_narrative: v })} multiline />
      <ListEditor label="Top Wins" items={extracted.wins || []}
        onChange={(v) => setExtracted({ ...extracted, wins: v })} />
      <ListEditor label="Top Lessons" items={extracted.lessons || []}
        onChange={(v) => setExtracted({ ...extracted, lessons: v })} />
      <ListEditor label="Strategic Decisions" items={extracted.decisions || []}
        onChange={(v) => setExtracted({ ...extracted, decisions: v })} />
      <SectionEditor label="Carry-Forward" value={extracted.carry_forward || ""}
        onChange={(v) => setExtracted({ ...extracted, carry_forward: v })} multiline />
      <JsonEditor label="Operational Metrics" value={extracted.operational_metrics || {}}
        onChange={(v) => setExtracted({ ...extracted, operational_metrics: v })} />
      <JsonEditor label="Team & Organization" value={extracted.team_org || {}}
        onChange={(v) => setExtracted({ ...extracted, team_org: v })} />
      <JsonEditor label="Platform Progress" value={extracted.platform_progress || {}}
        onChange={(v) => setExtracted({ ...extracted, platform_progress: v })} />
      <JsonEditor label="Risks" value={extracted.risks || []}
        onChange={(v) => setExtracted({ ...extracted, risks: v })} />
      <JsonEditor label="Focus Accounts" value={extracted.focus_accounts || []}
        onChange={(v) => setExtracted({ ...extracted, focus_accounts: v })} />
    </div>
  );

  // -------- Save --------
  const save = async () => {
    if (!financial.quarterly_revenue) {
      toast.error("Quarterly Revenue is required");
      return;
    }
    const sections: Record<string, any> = {};
    [
      "strategic_narrative", "operational_metrics", "team_org",
      "wins", "lessons", "decisions",
      "platform_progress", "carry_forward", "risks",
    ].forEach((k) => {
      if (extracted[k] !== undefined && extracted[k] !== null) sections[k] = extracted[k];
    });

    const focus_accounts = Array.isArray(extracted.focus_accounts)
      ? extracted.focus_accounts.map((a: any, i: number) => ({ ...a, order_index: i }))
      : [];

    const numOrNull = (v: any) => v === "" || v == null ? null : Number(v);
    const fin = {
      quarterly_revenue: numOrNull(financial.quarterly_revenue),
      quarterly_expenses: numOrNull(financial.quarterly_expenses),
      net_income: numOrNull(financial.net_income),
      cash_start: numOrNull(financial.cash_start),
      cash_end: numOrNull(financial.cash_end),
      avg_monthly_burn: numOrNull(financial.avg_monthly_burn),
      runway_months: numOrNull(financial.runway_months),
      source: financial.source || "QuickBooks",
      notes: financial.notes || null,
    };

    try {
      const qbr = await createQbr.mutateAsync({
        quarter, year,
        entry_mode: mode === "auto" ? "auto" : mode === "manual" ? "manual" : "document_upload",
        source_document_path: docPath,
        sections,
        financial: fin,
        focus_accounts,
        status: "closed",
      });
      close(false);
      navigate(`/business/strategy?tab=quarterly_review&qbr=${qbr.id}`);
    } catch {/* toast in mutation */}
  };

  // -------- Footer --------
  const footer = () => {
    if (step === "mode") return (
      <Button onClick={() => setStep("quarter")}>Continue</Button>
    );
    if (step === "quarter") return (
      <>
        <Button variant="ghost" onClick={() => setStep("mode")}>Back</Button>
        <Button disabled={duplicate} onClick={() => {
          if (mode === "document_upload") setStep("upload");
          else if (mode === "manual") setStep("manual_form");
          else setStep("review");
        }}>Continue</Button>
      </>
    );
    if (step === "upload") return (
      <>
        <Button variant="ghost" onClick={() => setStep("quarter")}>Back</Button>
        <Button onClick={handleUploadAndExtract} disabled={!file || uploading}>
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {uploading ? "Extracting…" : "Extract & continue"}
        </Button>
      </>
    );
    if (step === "review" || step === "manual_form") return (
      <>
        <Button variant="ghost" onClick={() => setStep(step === "review" ? "upload" : "quarter")}>Back</Button>
        <Button onClick={() => setStep("financial")}>Continue to financial</Button>
      </>
    );
    if (step === "financial") return (
      <>
        <Button variant="ghost" onClick={() => setStep(mode === "manual" ? "manual_form" : "review")}>Back</Button>
        <Button onClick={save} disabled={createQbr.isPending}>
          {createQbr.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save QBR
        </Button>
      </>
    );
    return null;
  };

  const stepTitle: Record<Step, string> = {
    mode: "How do you want to build this QBR?",
    quarter: "Select quarter",
    upload: "Upload retrospective document",
    review: "Review extracted data",
    financial: "Financial data (manual)",
    manual_form: "Enter QBR details",
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Build QBR · {quarter} {year}</DialogTitle>
          <DialogDescription>{stepTitle[step]}</DialogDescription>
        </DialogHeader>
        {step === "mode" && renderModeStep()}
        {step === "quarter" && renderQuarterStep()}
        {step === "upload" && renderUploadStep()}
        {step === "review" && renderReviewStep()}
        {step === "manual_form" && renderManualForm()}
        {step === "financial" && renderFinancialStep()}
        <DialogFooter>{footer()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({ icon: Icon, title, desc, badge, selected, onClick }: any) {
  return (
    <Card className={`cursor-pointer transition ${selected ? "ring-2 ring-primary" : "hover:bg-accent/30"}`} onClick={onClick}>
      <CardContent className="p-4 flex gap-3 items-start">
        <Icon className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">{title}</div>
            {badge && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">{badge}</span>}
          </div>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionEditor({ label, value, onChange, multiline, placeholder }: any) {
  return (
    <div>
      <Label>{label}</Label>
      {multiline
        ? <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        : <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
      {!value && <div className="text-xs text-muted-foreground mt-1">Add details — currently empty.</div>}
    </div>
  );
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const text = (items || []).join("\n");
  return (
    <div>
      <Label>{label} <span className="text-xs text-muted-foreground">(one per line)</span></Label>
      <Textarea rows={Math.min(8, Math.max(3, items.length + 1))} value={text}
        onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
    </div>
  );
}

function JsonEditor({ label, value, onChange }: { label: string; value: any; onChange: (v: any) => void }) {
  const [draft, setDraft] = useState(JSON.stringify(value ?? {}, null, 2));
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <Label>{label}</Label>
      <Textarea rows={6} className="font-mono text-xs" value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          try { onChange(JSON.parse(e.target.value)); setErr(null); }
          catch (er: any) { setErr(er.message); }
        }} />
      {err && <div className="text-xs text-destructive mt-1">Invalid JSON: {err}</div>}
    </div>
  );
}
