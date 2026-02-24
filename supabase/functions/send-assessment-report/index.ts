import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB base64

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, ticketId, customerName, customerCompany, pdfBase64 } = await req.json();

    // Validate inputs
    if (!to || typeof to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ticketId || typeof ticketId !== "string" || ticketId.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid ticket ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pdfBase64 || typeof pdfBase64 !== "string" || pdfBase64.length > MAX_PDF_SIZE) {
      return new Response(JSON.stringify({ error: "Invalid or oversized PDF attachment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (customerName && (typeof customerName !== "string" || customerName.length > 200)) {
      return new Response(JSON.stringify({ error: "Invalid customer name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("Email service not configured");
    }

    const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const safeName = escHtml(customerName || "Customer");
    const safeTicketId = escHtml(ticketId);
    const safeCompany = customerCompany ? escHtml(customerCompany) : "";
    const filename = `${ticketId.replace(/[^a-zA-Z0-9-_]/g, "_")}-assessment-report.pdf`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e293b; padding: 24px; text-align: center;">
          <h1 style="color: #25b3a5; margin: 0; font-size: 24px;">NOCH Power</h1>
        </div>
        <div style="padding: 24px; background: #ffffff;">
          <h2 style="color: #1e293b; margin-top: 0;">Assessment Report</h2>
          <p style="color: #475569;">Dear ${safeName},</p>
          <p style="color: #475569;">
            Please find attached the assessment report for ticket <strong>${safeTicketId}</strong>
            ${safeCompany ? ` (${safeCompany})` : ""}.
          </p>
          <p style="color: #475569;">
            This report includes a detailed analysis of the charger assessment, 
            service work instruction recommendations, and any warranty or compliance notes.
          </p>
          <p style="color: #475569;">
            If you have any questions, please don't hesitate to reach out to your account manager.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            This email was sent by NOCH Power Platform. The attached PDF contains confidential information.
          </p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Noch Campaigns <noreply@nochcampaigns.com>",
        to: [to],
        subject: `Assessment Report — ${safeTicketId}`,
        html: emailHtml,
        attachments: [{ filename, content: pdfBase64 }],
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend error:", result);
      throw new Error("Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-assessment-report error:", err);
    return new Response(JSON.stringify({ error: "Failed to send report" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
