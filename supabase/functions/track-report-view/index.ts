import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      token,
      session_id,
      event, // 'init' | 'heartbeat' | 'download' | 'email'
      session_duration_seconds,
      sections_viewed,
      max_scroll_depth_percent,
      viewer_email,
    } = body;

    if (!token || !session_id || !event) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the report
    const { data: report, error: reportErr } = await supabase
      .from("campaign_reports")
      .select("id, status, expires_at")
      .eq("public_token", token)
      .maybeSingle();

    if (reportErr || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (report.status !== "active" || new Date(report.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Report unavailable" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "init") {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("cf-connecting-ip") ||
        "unknown";
      const ipHash = await sha256(ip + ":noch+");
      const ua = req.headers.get("user-agent") || "";
      const country = req.headers.get("cf-ipcountry") || null;

      // Upsert (no-op if session already exists)
      const { error } = await supabase.from("report_views").upsert(
        {
          report_id: report.id,
          session_id,
          viewer_ip_hash: ipHash,
          user_agent: ua,
          country,
          viewed_at: new Date().toISOString(),
          last_heartbeat_at: new Date().toISOString(),
        },
        { onConflict: "report_id,session_id", ignoreDuplicates: true }
      );
      if (error) console.error("init upsert error:", error);
    } else {
      const updates: Record<string, unknown> = {
        last_heartbeat_at: new Date().toISOString(),
      };
      if (typeof session_duration_seconds === "number")
        updates.session_duration_seconds = session_duration_seconds;
      if (sections_viewed) updates.sections_viewed = sections_viewed;
      if (typeof max_scroll_depth_percent === "number")
        updates.max_scroll_depth_percent = max_scroll_depth_percent;
      if (event === "download") updates.downloaded_pdf = true;
      if (event === "email" && viewer_email) updates.viewer_email = viewer_email;

      const { error } = await supabase
        .from("report_views")
        .update(updates)
        .eq("report_id", report.id)
        .eq("session_id", session_id);
      if (error) console.error("update error:", error);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-report-view error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
