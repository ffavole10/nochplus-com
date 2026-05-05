import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export type QbrQuarter = "Q1" | "Q2" | "Q3" | "Q4";
export type QbrStatus = "in_progress" | "prep_open" | "active" | "closed";
export type QbrEntryMode = "auto" | "document_upload" | "manual" | "hybrid";
export type QbrDataSource = "auto" | "document" | "manual" | "quickbooks";

export interface QuarterlyReview {
  id: string;
  quarter: QbrQuarter;
  year: number;
  start_date: string;
  end_date: string;
  status: QbrStatus;
  entry_mode: QbrEntryMode;
  created_retroactively: boolean;
  source_document_path: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QbrSection {
  id: string;
  qbr_id: string;
  section_key: string;
  content: any;
  data_source: QbrDataSource;
  last_updated_by: string | null;
  updated_at: string;
}

export interface QbrFinancial {
  id: string;
  qbr_id: string;
  quarterly_revenue: number | null;
  quarterly_expenses: number | null;
  net_income: number | null;
  cash_start: number | null;
  cash_end: number | null;
  avg_monthly_burn: number | null;
  runway_months: number | null;
  source: string | null;
  entered_by: string | null;
  entered_at: string | null;
  notes: string | null;
  supporting_document_path: string | null;
}

export interface QbrFocusAccount {
  id: string;
  qbr_id: string;
  account_name: string;
  strategy_id: string | null;
  why_it_mattered: string | null;
  what_we_achieved: string | null;
  end_of_quarter_state: string | null;
  order_index: number;
}

export const QBR_SECTION_KEYS = [
  "strategic_narrative",
  "operational_metrics",
  "team_org",
  "wins",
  "lessons",
  "decisions",
  "platform_progress",
  "carry_forward",
  "risks",
] as const;

export const QBR_SECTION_LABELS: Record<string, string> = {
  strategic_narrative: "Strategic Narrative",
  operational_metrics: "Operational Metrics",
  team_org: "Team & Organization",
  wins: "Top Wins",
  lessons: "Top Lessons",
  decisions: "Strategic Decisions",
  platform_progress: "Platform Progress",
  carry_forward: "Carry-Forward",
  risks: "Risks",
};

function quarterDates(q: QbrQuarter, year: number) {
  const map: Record<QbrQuarter, [number, number]> = {
    Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11],
  };
  const [sm, em] = map[q];
  const start = new Date(Date.UTC(year, sm, 1));
  const end = new Date(Date.UTC(year, em + 1, 0));
  return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10) };
}

export function currentQbrQuarter(): { quarter: QbrQuarter; year: number } {
  const d = new Date();
  const m = d.getMonth();
  const q: QbrQuarter = m < 3 ? "Q1" : m < 6 ? "Q2" : m < 9 ? "Q3" : "Q4";
  return { quarter: q, year: d.getFullYear() };
}

async function userInfo() {
  const { data } = await supabase.auth.getUser();
  return { id: data?.user?.id || null, email: data?.user?.email || "Unknown" };
}

export function useQuarterlyReviews() {
  return useQuery({
    queryKey: ["quarterly-reviews"],
    queryFn: async (): Promise<QuarterlyReview[]> => {
      const { data, error } = await sb
        .from("quarterly_reviews")
        .select("*")
        .order("year", { ascending: false })
        .order("quarter", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export interface QbrMonthlyBreakdown {
  id: string;
  qbr_id: string;
  month_index: number;
  month_label: string;
  revenue: number | null;
  net_income: number | null;
  annotation: string | null;
}

export function useQuarterlyReview(id?: string) {
  return useQuery({
    queryKey: ["quarterly-reviews", id],
    enabled: !!id,
    queryFn: async () => {
      const [qbrR, sectionsR, finR, focusR, monthlyR] = await Promise.all([
        sb.from("quarterly_reviews").select("*").eq("id", id).maybeSingle(),
        sb.from("qbr_sections").select("*").eq("qbr_id", id),
        sb.from("qbr_financial_data").select("*").eq("qbr_id", id).maybeSingle(),
        sb.from("qbr_focus_accounts").select("*").eq("qbr_id", id).order("order_index"),
        sb.from("qbr_monthly_breakdown").select("*").eq("qbr_id", id).order("month_index"),
      ]);
      if (qbrR.error) throw qbrR.error;
      const sections: Record<string, QbrSection> = {};
      (sectionsR.data || []).forEach((s: QbrSection) => { sections[s.section_key] = s; });
      return {
        qbr: qbrR.data as QuarterlyReview,
        sections,
        financial: (finR.data as QbrFinancial) || null,
        focus_accounts: (focusR.data as QbrFocusAccount[]) || [],
        monthly: (monthlyR.data as QbrMonthlyBreakdown[]) || [],
      };
    },
  });
}

export function useUpdateMonthlyAnnotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, qbr_id, annotation }: { id: string; qbr_id: string; annotation: string }) => {
      const { error } = await sb.from("qbr_monthly_breakdown").update({ annotation }).eq("id", id);
      if (error) throw error;
      return { qbr_id };
    },
    onSuccess: ({ qbr_id }) => {
      qc.invalidateQueries({ queryKey: ["quarterly-reviews", qbr_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateQbr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      quarter: QbrQuarter; year: number; entry_mode: QbrEntryMode;
      source_document_path?: string | null;
      sections?: Record<string, any>;
      financial?: Partial<QbrFinancial> | null;
      focus_accounts?: Array<Partial<QbrFocusAccount>>;
      status?: QbrStatus;
    }) => {
      const u = await userInfo();
      const dates = quarterDates(input.quarter, input.year);
      const today = new Date().toISOString().slice(0, 10);
      const created_retroactively = dates.end_date < today;

      const { data: qbr, error } = await sb.from("quarterly_reviews").insert({
        quarter: input.quarter,
        year: input.year,
        start_date: dates.start_date,
        end_date: dates.end_date,
        entry_mode: input.entry_mode,
        status: input.status || "closed",
        created_retroactively,
        source_document_path: input.source_document_path || null,
        created_by: u.id,
        closed_at: input.status === "closed" || !input.status ? new Date().toISOString() : null,
        closed_by: input.status === "closed" || !input.status ? u.email : null,
      }).select().single();
      if (error) throw error;

      // Sections
      if (input.sections) {
        const rows = Object.entries(input.sections)
          .filter(([, v]) => v != null)
          .map(([section_key, content]) => ({
            qbr_id: qbr.id,
            section_key,
            content,
            data_source: input.entry_mode === "document_upload" ? "document" : input.entry_mode === "auto" ? "auto" : "manual",
            last_updated_by: u.email,
          }));
        if (rows.length) {
          const { error: sErr } = await sb.from("qbr_sections").insert(rows);
          if (sErr) throw sErr;
        }
      }

      // Financial
      if (input.financial) {
        const { error: fErr } = await sb.from("qbr_financial_data").insert({
          qbr_id: qbr.id,
          ...input.financial,
          source: input.financial.source || "QuickBooks",
          entered_by: u.email,
          entered_at: new Date().toISOString(),
        });
        if (fErr) throw fErr;
      }

      // Focus accounts
      if (input.focus_accounts && input.focus_accounts.length) {
        const fa = input.focus_accounts.map((a, i) => ({
          qbr_id: qbr.id,
          account_name: a.account_name || "Untitled",
          strategy_id: a.strategy_id || null,
          why_it_mattered: a.why_it_mattered || null,
          what_we_achieved: a.what_we_achieved || null,
          end_of_quarter_state: a.end_of_quarter_state || null,
          order_index: a.order_index ?? i,
        }));
        const { error: faErr } = await sb.from("qbr_focus_accounts").insert(fa);
        if (faErr) throw faErr;
      }

      return qbr as QuarterlyReview;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quarterly-reviews"] });
      toast.success("QBR saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useExtractQbr() {
  return useMutation({
    mutationFn: async (input: { document_text: string; quarter: QbrQuarter; year: number }) => {
      const { data, error } = await supabase.functions.invoke("qbr-extract", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any).extracted || {};
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export async function uploadQbrDocument(file: File): Promise<string> {
  const u = await userInfo();
  const path = `${u.id || "anon"}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const { error } = await supabase.storage.from("qbr-documents").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export function quarterLabel(q: QbrQuarter, year: number) {
  return `${q} ${year}`;
}
