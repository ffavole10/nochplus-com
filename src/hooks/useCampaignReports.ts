import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CampaignReport = {
  id: string;
  campaign_id: string;
  customer_id: string | null;
  report_name: string;
  intro_note: string | null;
  sections_included: string[];
  require_email_to_view: boolean;
  public_token: string;
  expires_at: string;
  status: "active" | "revoked" | "expired";
  pdf_storage_path: string | null;
  ai_executive_summary: string | null;
  snapshot_data: Record<string, unknown>;
  created_at: string;
  created_by_name: string | null;
};

function generateToken(len = 24) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => alphabet[n % alphabet.length]).join("");
}

export function useCampaignReports(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaign_reports", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("campaign_reports")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CampaignReport[];
    },
    enabled: !!campaignId,
  });
}

type CreateReportArgs = {
  campaign_id: string;
  customer_id: string | null;
  report_name: string;
  intro_note: string | null;
  sections_included: string[];
  require_email_to_view: boolean;
  expires_in_days: number;
  snapshot_data: Record<string, unknown>;
  ai_executive_summary: string | null;
  pdf_blob: Blob;
  created_by_name: string | null;
  created_by_email: string | null;
};

export function useCreateCampaignReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: CreateReportArgs) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const token = generateToken(24);
      const expiresAt = new Date(
        Date.now() + args.expires_in_days * 24 * 60 * 60 * 1000
      ).toISOString();

      // 1. Insert report row
      const { data: inserted, error: insertErr } = await supabase
        .from("campaign_reports")
        .insert({
          campaign_id: args.campaign_id,
          customer_id: args.customer_id,
          created_by: userId,
          created_by_name: args.created_by_name,
          created_by_email: args.created_by_email,
          report_name: args.report_name,
          intro_note: args.intro_note,
          sections_included: args.sections_included,
          require_email_to_view: args.require_email_to_view,
          public_token: token,
          expires_at: expiresAt,
          snapshot_data: args.snapshot_data,
          ai_executive_summary: args.ai_executive_summary,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;
      const report = inserted as unknown as CampaignReport;

      // 2. Upload PDF
      const path = `${report.id}/v1.pdf`;
      const { error: upErr } = await supabase.storage
        .from("campaign-reports")
        .upload(path, args.pdf_blob, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (upErr) throw upErr;

      // 3. Update path
      await supabase
        .from("campaign_reports")
        .update({ pdf_storage_path: path })
        .eq("id", report.id);

      // 4. Audit log
      await supabase.from("report_audit_log").insert({
        report_id: report.id,
        action: "generated",
        performed_by: userId,
        performed_by_name: args.created_by_name,
      });

      return { ...report, pdf_storage_path: path, public_token: token };
    },
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: ["campaign_reports", report.campaign_id] });
    },
    onError: (e: Error) => toast.error(`Report creation failed: ${e.message}`),
  });
}

export function useRevokeReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("campaign_reports")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revoked_by: userData.user?.id,
        })
        .eq("id", reportId);
      if (error) throw error;
      await supabase.from("report_audit_log").insert({
        report_id: reportId,
        action: "revoked",
        performed_by: userData.user?.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaign_reports"] });
      toast.success("Report link revoked");
    },
  });
}
