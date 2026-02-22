import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, ticketId, customerName, customerCompany, pdfBase64 } = await req.json();

    if (!to || !ticketId || !pdfBase64) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const filename = `${ticketId.replace(/[^a-zA-Z0-9-_]/g, "_")}-assessment-report.pdf`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e293b; padding: 24px; text-align: center;">
          <h1 style="color: #25b3a5; margin: 0; font-size: 24px;">NOCH Power</h1>
        </div>
        <div style="padding: 24px; background: #ffffff;">
          <h2 style="color: #1e293b; margin-top: 0;">Assessment Report</h2>
          <p style="color: #475569;">Dear ${customerName || "Customer"},</p>
          <p style="color: #475569;">
            Please find attached the assessment report for ticket <strong>${ticketId}</strong>
            ${customerCompany ? ` (${customerCompany})` : ""}.
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
        subject: `Assessment Report — ${ticketId}`,
        html: emailHtml,
        attachments: [
          {
            filename,
            content: pdfBase64,
          },
        ],
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-assessment-report error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
