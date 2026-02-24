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
    const { submission_id } = await req.json();

    if (!submission_id || typeof submission_id !== "string") {
      return new Response(
        JSON.stringify({ error: "submission_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: submission, error } = await supabase
      .from("submissions")
      .select("id, submission_id, status, full_name, company_name, city, state, noch_plus_member, staff_notes, created_at, updated_at")
      .eq("submission_id", submission_id.trim().toUpperCase())
      .single();

    if (error || !submission) {
      return new Response(
        JSON.stringify({ error: "not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch chargers - return only non-sensitive fields
    const { data: chargers } = await supabase
      .from("charger_submissions")
      .select("id, brand, serial_number, charger_type, photo_urls")
      .eq("submission_id", submission.id);

    // Return limited data - exclude email, phone, street_address, zip_code
    return new Response(
      JSON.stringify({
        submission: {
          submission_id: submission.submission_id,
          status: submission.status,
          full_name: submission.full_name,
          company_name: submission.company_name,
          city: submission.city,
          state: submission.state,
          noch_plus_member: submission.noch_plus_member,
          staff_notes: submission.staff_notes,
          created_at: submission.created_at,
          updated_at: submission.updated_at,
        },
        chargers: (chargers || []).map((c: any) => ({
          id: c.id,
          brand: c.brand,
          serial_number: c.serial_number,
          charger_type: c.charger_type,
          photo_count: c.photo_urls?.length || 0,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
