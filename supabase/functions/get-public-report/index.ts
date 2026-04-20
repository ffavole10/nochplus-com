import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: report, error } = await supabase
      .from("campaign_reports")
      .select(
        "id, report_name, intro_note, sections_included, snapshot_data, ai_executive_summary, status, expires_at, created_at, customer_id, pdf_storage_path, require_email_to_view, created_by_name, created_by_email"
      )
      .eq("public_token", token)
      .maybeSingle();

    if (error || !report) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (report.status === "revoked") {
      return new Response(JSON.stringify({ error: "revoked" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(report.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let customerName: string | null = null;
    if (report.customer_id) {
      const { data: c } = await supabase
        .from("customers")
        .select("company")
        .eq("id", report.customer_id)
        .maybeSingle();
      customerName = (c as { company?: string } | null)?.company || null;
    }

    let pdfUrl: string | null = null;
    if (report.pdf_storage_path) {
      const { data: signed } = await supabase.storage
        .from("campaign-reports")
        .createSignedUrl(report.pdf_storage_path, 60 * 60); // 1 hour
      pdfUrl = signed?.signedUrl || null;
    }

    return new Response(
      JSON.stringify({
        id: report.id,
        report_name: report.report_name,
        intro_note: report.intro_note,
        sections_included: report.sections_included,
        snapshot_data: report.snapshot_data,
        ai_executive_summary: report.ai_executive_summary,
        require_email_to_view: report.require_email_to_view,
        customer_name: customerName,
        created_at: report.created_at,
        created_by_name: report.created_by_name,
        created_by_email: report.created_by_email,
        pdf_url: pdfUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-public-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
