import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Sparkles, Pencil, ExternalLink } from "lucide-react";
import { useQuarterlyReview, QBR_SECTION_LABELS } from "@/hooks/useQbr";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { QbrHeadlineBanner } from "./QbrHeadlineBanner";
import { QbrMonthlyTrajectory } from "./QbrMonthlyTrajectory";
import { QbrInsightsColumns } from "./QbrInsightsColumns";

const ENTRY_BADGE: Record<string, { label: string; icon: any; color: string }> = {
  document_upload: { label: "Document upload", icon: FileText, color: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200" },
  auto: { label: "Auto-tracked", icon: Sparkles, color: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200" },
  manual: { label: "Manual", icon: Pencil, color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200" },
  hybrid: { label: "Hybrid", icon: Sparkles, color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200" },
};

export function QbrDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading } = useQuarterlyReview(id);
  const [docUrl, setDocUrl] = useState<string | null>(null);

  if (isLoading || !data) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading QBR…</div>;
  }
  const { qbr, sections, financial, focus_accounts, monthly } = data;
  const badge = ENTRY_BADGE[qbr.entry_mode] || ENTRY_BADGE.manual;
  const Icon = badge.icon;

  const openDoc = async () => {
    if (!qbr.source_document_path) return;
    const { data: signed } = await supabase.storage.from("qbr-documents")
      .createSignedUrl(qbr.source_document_path, 3600);
    if (signed?.signedUrl) {
      setDocUrl(signed.signedUrl);
      window.open(signed.signedUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-1">
            <ArrowLeft className="h-4 w-4" /> Back to quarters
          </Button>
          <h2 className="text-2xl font-bold">{qbr.quarter} {qbr.year} Quarterly Review</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline">{qbr.status}</Badge>
            <Badge variant="outline" className={badge.color}>
              <Icon className="h-3 w-3 mr-1" /> {badge.label}
            </Badge>
            {qbr.created_retroactively && <Badge variant="outline">Retroactive</Badge>}
            {qbr.source_document_path && (
              <Button variant="link" size="sm" className="h-auto p-0" onClick={openDoc}>
                Source document <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Closed {qbr.closed_at ? new Date(qbr.closed_at).toLocaleDateString() : "—"}
            {qbr.closed_by && ` by ${qbr.closed_by}`}
          </div>
        </div>
      </div>

      <SectionBlock title="Strategic Narrative" source="document">
        <p className="whitespace-pre-wrap text-sm">{sections.strategic_narrative?.content || <Empty />}</p>
      </SectionBlock>

      <SectionBlock title="Financial Data" source="quickbooks"
        attribution={financial?.notes ? `Source: ${financial.source} · ${financial.notes}` : `Source: ${financial?.source || "QuickBooks"}`}>
        {financial ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Revenue" value={fmt(financial.quarterly_revenue)} />
            <Stat label="Expenses" value={fmt(financial.quarterly_expenses)} />
            <Stat label="Net Income" value={fmt(financial.net_income)} />
            <Stat label="Cash Start" value={fmt(financial.cash_start)} />
            <Stat label="Cash End" value={fmt(financial.cash_end)} />
            <Stat label="Avg Monthly Burn" value={fmt(financial.avg_monthly_burn)} />
            <Stat label="Runway" value={financial.runway_months != null ? `${financial.runway_months} mo` : "—"} />
          </div>
        ) : <Empty />}
      </SectionBlock>

      <SectionBlock title="Operational Metrics" source={sections.operational_metrics?.data_source || "manual"}>
        <KeyValueGrid value={sections.operational_metrics?.content} />
      </SectionBlock>

      <SectionBlock title="Team & Organization" source={sections.team_org?.data_source || "manual"}>
        <KeyValueGrid value={sections.team_org?.content} />
      </SectionBlock>

      <BulletBlock title="Top Wins" items={sections.wins?.content} source={sections.wins?.data_source} />
      <BulletBlock title="Top Lessons" items={sections.lessons?.content} source={sections.lessons?.data_source} />
      <BulletBlock title="Strategic Decisions" items={sections.decisions?.content} source={sections.decisions?.data_source} />

      <SectionBlock title="Focus Accounts" source="manual">
        {focus_accounts.length === 0 ? <Empty /> : (
          <div className="space-y-3">
            {focus_accounts.map((a) => (
              <div key={a.id} className="rounded border p-3">
                <div className="font-medium">{a.account_name}</div>
                {a.why_it_mattered && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Why it mattered:</span> {a.why_it_mattered}</p>}
                {a.what_we_achieved && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">What we achieved:</span> {a.what_we_achieved}</p>}
                {a.end_of_quarter_state && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">End-of-quarter state:</span> {a.end_of_quarter_state}</p>}
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock title="Platform Progress" source={sections.platform_progress?.data_source || "manual"}>
        <KeyValueGrid value={sections.platform_progress?.content} />
      </SectionBlock>

      <SectionBlock title="Carry-Forward" source={sections.carry_forward?.data_source || "manual"}>
        <p className="whitespace-pre-wrap text-sm">{sections.carry_forward?.content || <Empty />}</p>
      </SectionBlock>

      <SectionBlock title="Risks" source={sections.risks?.data_source || "manual"}>
        {Array.isArray(sections.risks?.content) && sections.risks.content.length > 0 ? (
          <div className="space-y-2">
            {sections.risks.content.map((r: any, i: number) => (
              <div key={i} className="rounded border p-3 text-sm">
                <div className="font-medium">{r.risk_text || "(unnamed risk)"}</div>
                {r.mitigation && <div className="text-xs text-muted-foreground mt-1">Mitigation: {r.mitigation}</div>}
              </div>
            ))}
          </div>
        ) : <Empty />}
      </SectionBlock>
    </div>
  );
}

function fmt(v: any) { return v == null ? "—" : formatCurrency(Number(v)); }

function Empty() { return <span className="text-xs text-muted-foreground italic">No content</span>; }

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-semibold mt-1">{value}</div>
    </div>
  );
}

function SectionBlock({ title, children, source, attribution }: { title: string; children: React.ReactNode; source?: string; attribution?: string }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">{title}</h3>
          {source && <Badge variant="outline" className="text-[10px]">{source}</Badge>}
        </div>
        {attribution && <div className="text-xs text-muted-foreground">{attribution}</div>}
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}

function BulletBlock({ title, items, source }: { title: string; items?: string[]; source?: string }) {
  return (
    <SectionBlock title={title} source={source}>
      {Array.isArray(items) && items.length > 0 ? (
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {items.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      ) : <Empty />}
    </SectionBlock>
  );
}

function KeyValueGrid({ value }: { value: any }) {
  if (!value || typeof value !== "object") return <Empty />;
  const entries = Object.entries(value);
  if (entries.length === 0) return <Empty />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded border p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.replace(/_/g, " ")}</div>
          <div className="mt-0.5">{renderVal(v)}</div>
        </div>
      ))}
    </div>
  );
}

function renderVal(v: any): React.ReactNode {
  if (v == null || v === "") return <Empty />;
  if (Array.isArray(v)) return <ul className="list-disc pl-4">{v.map((x, i) => <li key={i}>{String(x)}</li>)}</ul>;
  if (typeof v === "object") return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>;
  return String(v);
}
