import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { createHmac } from "node:crypto";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const appBase = "https://nochplus-com.lovable.app";

  try {
    const url = new URL(req.url);
    const payload = url.searchParams.get("payload");
    const sig = url.searchParams.get("sig");

    // Validate HMAC signature
    if (!payload || !sig) {
      return redirect(appBase + "/estimate-status?status=error&message=Invalid+approval+link");
    }

    const secret = Deno.env.get("APPROVAL_SECRET");
    if (!secret) {
      console.error("APPROVAL_SECRET not configured");
      return redirect(appBase + "/estimate-status?status=error&message=Server+configuration+error");
    }

    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (!timingSafeEqual(sig, expected)) {
      return redirect(appBase + "/estimate-status?status=error&message=Invalid+approval+link");
    }

    // Parse payload: estimateId:expiresTimestamp
    const parts = payload.split(":");
    if (parts.length !== 2) {
      return redirect(appBase + "/estimate-status?status=error&message=Invalid+approval+link");
    }

    const [estimateId, expiresStr] = parts;
    const expires = parseInt(expiresStr, 10);

    if (isNaN(expires) || Date.now() > expires) {
      return redirect(appBase + "/estimate-status?status=error&message=This+approval+link+has+expired");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the estimate
    const { data: estimate, error: fetchErr } = await supabase
      .from("estimates")
      .select("*")
      .eq("id", estimateId)
      .single();

    if (fetchErr || !estimate) {
      return redirect(appBase + "/estimate-status?status=error&message=Estimate+not+found");
    }

    if (estimate.status === "approved") {
      return redirect(appBase + "/estimate-status?status=already-approved");
    }

    const { error: updateErr } = await supabase
      .from("estimates")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", estimateId);

    if (updateErr) {
      console.error("Update error:", updateErr);
      return redirect(appBase + "/estimate-status?status=error&message=Failed+to+update+estimate");
    }

    // Send confirmation email
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && estimate.account_manager) {
      try {
        const ticketId = estimate.ticket_id || estimate.station_id || "N/A";
        const siteName = estimate.site_name || "N/A";
        const total =
          typeof estimate.total === "number"
            ? "$" + estimate.total.toFixed(2)
            : "N/A";

        const confirmHtml = buildConfirmationEmail(ticketId, siteName, total);

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Noch Power <noreply@nochplus.com>",
            to: [estimate.account_manager],
            subject: "Estimate Approved - Ticket #" + ticketId + " | " + siteName,
            html: confirmHtml,
          }),
        });
      } catch (emailErr) {
        console.error("Failed to send confirmation email:", emailErr);
      }
    }

    // Create notification
    try {
      await supabase.from("notifications").insert({
        title: "Estimate Approved",
        message: "Customer approved estimate for ticket #" + (estimate.ticket_id || estimate.station_id || "N/A") + " - " + (estimate.site_name || "Unknown site") + " ($" + (estimate.total?.toFixed(2) || "0.00") + ")",
        type: "estimate_approved",
        reference_id: estimateId,
      });
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr);
    }

    return redirect(appBase + "/estimate-status?status=approved");
  } catch (error) {
    console.error("approve-estimate error:", error);
    return redirect(appBase + "/estimate-status?status=error&message=Unexpected+error");
  }
});

function redirect(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  });
}

function buildConfirmationEmail(ticketId: string, siteName: string, total: string): string {
  return '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
    '<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
    '<div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">' +
    '<div style="background:#1e293b;padding:28px 32px;text-align:center;">' +
    '<img src="https://qmlhfmqizxxafkuxxynr.supabase.co/storage/v1/object/public/email-assets/noch-power-logo-white-2.png" alt="Noch Power" style="height:40px;">' +
    '</div>' +
    '<div style="padding:32px;">' +
    '<div style="text-align:center;margin-bottom:24px;">' +
    '<div style="display:inline-block;background:#dcfce7;border-radius:50%;padding:16px;margin-bottom:12px;">' +
    '<span style="font-size:32px;color:#16a34a;">&#10003;</span>' +
    '</div>' +
    '<h2 style="margin:0;font-size:22px;color:#1e293b;">Estimate Approved</h2>' +
    '</div>' +
    '<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">The customer has approved the service estimate for the following ticket:</p>' +
    '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">' +
    '<table style="width:100%;border-collapse:collapse;">' +
    '<tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:100px;">Ticket</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#1e293b;">#' + ticketId + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Site</td><td style="padding:6px 0;font-size:14px;color:#1e293b;">' + siteName + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Total</td><td style="padding:6px 0;font-size:16px;font-weight:700;color:#3b82f6;">' + total + '</td></tr>' +
    '</table>' +
    '</div>' +
    '<p style="color:#475569;font-size:14px;line-height:1.5;margin:0;">You can now proceed with dispatching the service team.</p>' +
    '</div>' +
    '<div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">' +
    '<p style="margin:0;color:#94a3b8;font-size:12px;">This notification was sent by Noch Power</p>' +
    '</div>' +
    '</div>' +
    '</body></html>';
}
