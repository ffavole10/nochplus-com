import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_STRING = 500;
const MAX_NOTE = 2000;
const MAX_LINE_ITEMS = 50;

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validatePayload(payload: any): string | null {
  if (!payload.to || !validateEmail(payload.to)) return "Invalid recipient email";
  if (payload.cc) {
    if (!Array.isArray(payload.cc) || payload.cc.length > 10) return "CC must be an array of at most 10 emails";
    for (const cc of payload.cc) {
      if (!validateEmail(cc)) return `Invalid CC email: ${cc}`;
    }
  }
  if (!payload.ticketId || typeof payload.ticketId !== "string" || payload.ticketId.length > 100) return "Invalid ticketId";
  if (!payload.accountName || typeof payload.accountName !== "string" || payload.accountName.length > MAX_STRING) return "Invalid accountName";
  if (payload.chargerName && typeof payload.chargerName !== "string") return "Invalid chargerName";
  if (!Array.isArray(payload.lineItems) || payload.lineItems.length === 0 || payload.lineItems.length > MAX_LINE_ITEMS) return "lineItems must be 1-50 items";
  for (const li of payload.lineItems) {
    if (typeof li.description !== "string" || li.description.length > MAX_STRING) return "Invalid line item description";
    if (typeof li.qty !== "number" || li.qty < 0 || li.qty > 10000) return "Invalid line item qty";
    if (typeof li.rate !== "number" || li.rate < -1000000 || li.rate > 1000000) return "Invalid line item rate";
  }
  if (typeof payload.subtotal !== "number" || payload.subtotal < -10000000 || payload.subtotal > 10000000) return "Invalid subtotal";
  if (typeof payload.total !== "number" || payload.total < -10000000 || payload.total > 10000000) return "Invalid total";
  if (payload.notes && (typeof payload.notes !== "string" || payload.notes.length > MAX_NOTE)) return "Notes must be under 2000 characters";
  return null;
}

interface LineItem {
  description: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  category: string;
}

interface EstimatePayload {
  to: string;
  cc?: string[];
  estimateId: string;
  ticketId: string;
  accountName: string;
  chargerName: string;
  chargerType: string;
  location: string;
  swiTitle: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
}

function buildEmailHtml(est: EstimatePayload): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const approveUrl = `${supabaseUrl}/functions/v1/approve-estimate?id=${encodeURIComponent(est.estimateId)}&action=approve`;

  const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const lineItemRows = est.lineItems
    .map(
      (li) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escHtml(li.description)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${li.qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${escHtml(li.unit || "")}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;">$${li.rate.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;font-weight:600;">$${li.amount.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:680px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#1e293b;padding:28px 32px;text-align:center;">
      <img src="${supabaseUrl}/storage/v1/object/public/email-assets/noch-power-logo-white-2.png" alt="Noch Power" style="height:40px;" />
    </div>
    <div style="padding:28px 32px 16px;">
      <h2 style="margin:0;font-size:20px;color:#1e293b;">Service Estimate</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:14px;">Ticket #${escHtml(est.ticketId)}</p>
    </div>
    <div style="padding:0 32px 20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:120px;">Account</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#1e293b;">${escHtml(est.accountName)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Charger</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#1e293b;">${escHtml(est.chargerName)} (${escHtml(est.chargerType || "")})</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Location</td><td style="padding:6px 0;font-size:14px;color:#1e293b;">${escHtml(est.location || "")}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">SWI</td><td style="padding:6px 0;font-size:14px;color:#3b82f6;font-weight:600;">${escHtml(est.swiTitle || "")}</td></tr>
      </table>
    </div>
    <div style="padding:0 32px 20px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;">Description</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;text-transform:uppercase;color:#64748b;">Qty</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;text-transform:uppercase;color:#64748b;">Unit</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#64748b;">Rate</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#64748b;">Amount</th>
          </tr>
        </thead>
        <tbody>${lineItemRows}</tbody>
      </table>
    </div>
    <div style="padding:0 32px 24px;">
      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;border:1px solid #e5e7eb;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#64748b;font-size:14px;">Subtotal</span>
          <span style="font-size:14px;font-weight:600;color:#1e293b;">$${est.subtotal.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#64748b;font-size:14px;">Tax</span>
          <span style="font-size:14px;color:#1e293b;">$${est.tax.toFixed(2)}</span>
        </div>
        <div style="border-top:2px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between;">
          <span style="font-size:16px;font-weight:700;color:#1e293b;">Total</span>
          <span style="font-size:18px;font-weight:700;color:#3b82f6;">$${est.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
    ${est.notes ? `
    <div style="padding:0 32px 24px;">
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;">
        <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;color:#92400e;font-weight:600;letter-spacing:0.5px;">Notes</p>
        <p style="margin:0;font-size:14px;color:#78350f;line-height:1.5;">${escHtml(est.notes)}</p>
      </div>
    </div>
    ` : ""}
    <div style="padding:0 32px 28px;text-align:center;">
      <a href="${approveUrl}" target="_blank" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:16px;font-weight:700;padding:14px 48px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
        ✓ Approve Estimate
      </a>
      <p style="margin:10px 0 0;color:#94a3b8;font-size:12px;">Click the button above to approve this estimate and schedule service.</p>
    </div>
    <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">This estimate was generated by Noch Power</p>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Questions? Contact your service representative.</p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("Email service not configured");
    }

    const payload: EstimatePayload = await req.json();

    // Validate input
    const validationError = validatePayload(payload);
    if (validationError) {
      return new Response(
        JSON.stringify({ success: false, error: validationError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = buildEmailHtml(payload);

    const emailPayload: Record<string, unknown> = {
      from: "Noch Power <noreply@nochplus.com>",
      to: [payload.to],
      subject: `Service Estimate — Ticket #${payload.ticketId} | ${payload.chargerName}`,
      html,
    };

    if (payload.cc && payload.cc.length > 0) {
      emailPayload.cc = payload.cc;
    }

    const sendViaResend = async (fromAddress: string) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...emailPayload, from: fromAddress }),
      });

      const result = await response.json();
      return { response, result };
    };

    let { response: resendResponse, result: resendResult } = await sendViaResend(
      "Noch Power <noreply@nochplus.com>"
    );

    // Fallback while root domain authorization is still propagating in Resend
    if (
      !resendResponse.ok &&
      resendResponse.status === 403 &&
      typeof resendResult?.message === "string" &&
      resendResult.message.includes("Not authorized to send emails from nochplus.com")
    ) {
      console.warn("Resend root-domain sender not authorized yet. Retrying with verified subdomain sender.");
      ({ response: resendResponse, result: resendResult } = await sendViaResend(
        "Noch Power <noreply@send.nochplus.com>"
      ));
    }

    if (!resendResponse.ok) {
      console.error("Resend API error:", JSON.stringify(resendResult));
      throw new Error("Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, id: resendResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending estimate email:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to send estimate" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
