import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  sessionId: z.string().min(1),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data } = await supabaseAnon.auth.getUser(token);
    if (!data.user) throw new Error("User not authenticated");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid session ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sessionId } = parsed.data;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.status !== "complete") {
      return new Response(
        JSON.stringify({ error: "Payment not completed", status: session.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const meta = session.metadata || {};
    const subscription = session.subscription as Stripe.Subscription;
    const memberStatus = "active";
    const planId = meta.plan_id || null;

    // Check if member already exists for this subscription
    const { data: existing } = await supabaseClient
      .from("noch_plus_members")
      .select("id")
      .eq("stripe_subscription_id", subscription?.id || "")
      .maybeSingle();

    if (existing) {
      // Make sure the partnership plan is also flagged activated even on a retry
      if (planId) {
        await supabaseClient
          .from("noch_plus_partnership_plans")
          .update({ status: "activated", activated_at: new Date().toISOString(), member_id: existing.id })
          .eq("id", planId);
      }
      return new Response(
        JSON.stringify({ success: true, memberId: existing.id, alreadyExists: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create membership record
    const { data: member, error: memberError } = await supabaseClient
      .from("noch_plus_members")
      .insert({
        company_name: meta.company_name || "",
        contact_name: meta.contact_name || "",
        email: meta.email || "",
        phone: meta.phone || "",
        status: memberStatus,
        tier: meta.tier || "priority",
        billing_cycle: meta.billing_cycle || "monthly",
        monthly_amount: parseFloat(meta.monthly_amount || "0"),
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription?.id || null,
      })
      .select()
      .single();

    if (memberError) {
      console.error("[VERIFY-NOCH-PAYMENT] Member insert error:", memberError);
      throw new Error(`Failed to create membership: ${memberError.message}`);
    }

    // Create site records
    const sites = JSON.parse(meta.sites || "[]");
    if (sites.length > 0 && member) {
      const siteRows = sites.map((s: any) => {
        const tier = s.tier || meta.tier || "priority";
        const l2 = Number(s.l2Count) || 0;
        const dc = Number(s.dcCount) || 0;
        // Recompute monthly_cost defensively from the trusted tier table on the client side later if needed
        return {
          member_id: member.id,
          site_name: s.name || "",
          l2_charger_count: l2,
          dc_charger_count: dc,
          tier,
          monthly_cost: 0,
        };
      });
      await supabaseClient.from("noch_plus_sites").insert(siteRows);
    }

    // Mark partnership plan as activated and link member
    if (planId && member) {
      await supabaseClient
        .from("noch_plus_partnership_plans")
        .update({
          status: "activated",
          activated_at: new Date().toISOString(),
          member_id: member.id,
        })
        .eq("id", planId);
    }

    return new Response(
      JSON.stringify({ success: true, memberId: member?.id, status: memberStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[VERIFY-NOCH-PAYMENT] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
