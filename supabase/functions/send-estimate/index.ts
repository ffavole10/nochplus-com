import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  const lineItemRows = est.lineItems
    .map(
      (li) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${li.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${li.qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;">${li.unit}</td>
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
    
    <!-- Header -->
    <div style="background:#1a1a2e;padding:28px 32px;text-align:center;">
      <img src="https://qmlhfmqizxxafkuxxynr.supabase.co/storage/v1/object/public/email-assets/noch-power-logo.png" alt="Noch Power" style="height:40px;" />
    </div>
    
    <!-- Title -->
    <div style="padding:28px 32px 16px;">
      <h2 style="margin:0;font-size:20px;color:#1e293b;">Service Estimate</h2>
      <p style="margin:6px 0 0;color:#64748b;font-size:14px;">Ticket #${est.ticketId}</p>
    </div>
    
    <!-- Details -->
    <div style="padding:0 32px 20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;width:120px;">Account</td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;color:#1e293b;">${est.accountName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;">Charger</td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;color:#1e293b;">${est.chargerName} (${est.chargerType})</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;">Location</td>
          <td style="padding:6px 0;font-size:14px;color:#1e293b;">${est.location}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;">SWI</td>
          <td style="padding:6px 0;font-size:14px;color:#3b82f6;font-weight:600;">${est.swiTitle}</td>
        </tr>
      </table>
    </div>
    
    <!-- Line Items -->
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
        <tbody>
          ${lineItemRows}
        </tbody>
      </table>
    </div>
    
    <!-- Totals -->
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
    <!-- Notes -->
    <div style="padding:0 32px 24px;">
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;">
        <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;color:#92400e;font-weight:600;letter-spacing:0.5px;">Notes</p>
        <p style="margin:0;font-size:14px;color:#78350f;line-height:1.5;">${est.notes}</p>
      </div>
    </div>
    ` : ""}
    
    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">This estimate was generated by Noch Campaigns</p>
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const payload: EstimatePayload = await req.json();

    if (!payload.to || !payload.to.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = buildEmailHtml(payload);

    const emailPayload: Record<string, unknown> = {
      from: "Noch Campaigns <noreply@nochcampaigns.com>",
      to: [payload.to],
      subject: `Service Estimate — Ticket #${payload.ticketId} | ${payload.chargerName}`,
      html,
    };

    if (payload.cc && payload.cc.length > 0) {
      emailPayload.cc = payload.cc;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", JSON.stringify(data));
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending estimate email:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
