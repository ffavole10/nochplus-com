import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is a super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is super_admin
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin");

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, email, role, display_name, company, user_id } = body;

    if (action === "create_user") {
      // Generate a secure invite link instead of using plaintext passwords
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (createError) throw createError;

      await supabaseAdmin
        .from("profiles")
        .update({ display_name, company })
        .eq("user_id", newUser.user.id);

      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role });

      // Generate a password reset link so the user can set their own password
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

      if (linkError) {
        console.warn("Failed to generate setup link:", linkError.message);
      }

      const rawUrl = linkData?.properties?.action_link;
      const setupUrl = rawUrl ? rawUrl.replace(/redirect_to=[^&]*/, 'redirect_to=' + encodeURIComponent('/reset-password')) : null;

      // Send invite email via Resend
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const safeName = (display_name || email).replace(/[&<>"]/g, (c: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));

        const inviteHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1e293b; padding: 24px; text-align: center;">
              <h1 style="color: #25b3a5; margin: 0; font-size: 24px;">NOCH Power</h1>
            </div>
            <div style="padding: 32px 24px; background: #ffffff;">
              <h2 style="color: #1e293b; margin-top: 0;">Welcome to NOCH Power Platform</h2>
              <p style="color: #475569;">Hi ${safeName},</p>
              <p style="color: #475569;">
                You've been invited to join the NOCH Power platform${company ? ` as part of <strong>${company}</strong>` : ""}.
              </p>
              <p style="color: #475569;">Click the button below to set up your password and access your account:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${setupUrl || '#'}" style="display: inline-block; background-color: #25b3a5; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: bold;">
                  Set Up Your Account
                </a>
              </div>
              <p style="color: #64748b; font-size: 13px;">This link will expire in 24 hours. If you didn't expect this invitation, please disregard this email.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px;">
                This is an automated message from the NOCH Power Platform.
              </p>
            </div>
          </div>
        `;

        const sendInvite = async (fromAddr: string) => {
          return await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: fromAddr,
              to: [email],
              subject: "You've been invited to NOCH Power Platform",
              html: inviteHtml,
            }),
          });
        };

        let inviteRes = await sendInvite("Noch Power <noreply@nochplus.com>");
        if (!inviteRes.ok && inviteRes.status === 403) {
          inviteRes = await sendInvite("Noch Power <noreply@send.nochplus.com>");
        }
        if (!inviteRes.ok) {
          console.warn("Failed to send invite email:", await inviteRes.text());
        }
      }

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id);

      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id, role });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add_role") {
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id, role });

      if (insertError) {
        if (insertError.code === "23505") {
          return new Response(JSON.stringify({ error: "User already has this role" }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw insertError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove_role") {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("role", role);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_reset") {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

      if (linkError) throw linkError;

      const rawRecoveryUrl = linkData?.properties?.action_link;
      const recoveryUrl = rawRecoveryUrl ? rawRecoveryUrl.replace(/redirect_to=[^&]*/, 'redirect_to=' + encodeURIComponent('/reset-password')) : null;
      if (!recoveryUrl) {
        throw new Error("Failed to generate recovery link");
      }

      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) {
        throw new Error("Email provider is not configured");
      }

      const safeEmail = (email || "").replace(/[&<>\"]/g, (c: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
      const resetHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e293b; padding: 24px; text-align: center;">
            <h1 style="color: #25b3a5; margin: 0; font-size: 24px;">NOCH Power</h1>
          </div>
          <div style="padding: 32px 24px; background: #ffffff;">
            <h2 style="color: #1e293b; margin-top: 0;">Reset your password</h2>
            <p style="color: #475569;">A password reset was requested for <strong>${safeEmail}</strong>.</p>
            <p style="color: #475569;">Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${recoveryUrl}" style="display: inline-block; background-color: #25b3a5; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `;

      const sendReset = async (fromAddr: string) => {
        return await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: fromAddr,
            to: [email],
            subject: "Reset your NOCH Power password",
            html: resetHtml,
          }),
        });
      };

      let resetRes = await sendReset("Noch Power <noreply@nochplus.com>");
      if (!resetRes.ok && resetRes.status === 403) {
        resetRes = await sendReset("Noch Power <noreply@send.nochplus.com>");
      }

      if (!resetRes.ok) {
        const errorText = await resetRes.text();
        throw new Error(`Failed to send password reset email: ${errorText}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      await supabaseAdmin.auth.admin.deleteUser(user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_users") {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("*");

      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("*");

      // Group roles by user_id
      const rolesByUser: Record<string, string[]> = {};
      for (const r of roles || []) {
        if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
        rolesByUser[r.user_id].push(r.role);
      }

      const users = (profiles || []).map((p: any) => ({
        ...p,
        roles: rolesByUser[p.user_id] || [],
        // Keep backward compat
        role: (rolesByUser[p.user_id] || ["employee"])[0],
      }));

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[manage-users] Error:", error?.message || error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
