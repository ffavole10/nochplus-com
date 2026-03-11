import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  "OSHA Standards",
  "NEC Codes",
  "UL Certifications",
  "OEM Bulletins",
  "Technical Whitepapers",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const systemPrompt = `You are an EV charging station industry expert. For each category provided, return exactly 3 recent and relevant knowledge items related to EV charger maintenance, repair, and safety standards.

Return a JSON array where each item has:
- "category": the category name
- "title": a concise title for the knowledge item
- "summary": a 2-3 sentence summary of the standard, code, or bulletin
- "source_url": a plausible reference URL (use real domains like osha.gov, nfpa.org, ul.com)
- "relevance_score": a number between 0.5 and 1.0 indicating relevance to EV charger maintenance

Return ONLY the JSON array, no other text.`;

    const userPrompt = `Search for the latest knowledge across these categories for EV charging station maintenance and repair:\n\n${CATEGORIES.join("\n")}\n\nReturn 3 items per category (${CATEGORIES.length * 3} total).`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let items: any[];
    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      items = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    // Insert into database
    const rows = items.map((item: any) => ({
      category: item.category,
      title: item.title,
      summary: item.summary,
      source_url: item.source_url || null,
      relevance_score: item.relevance_score || 0.8,
      searched_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("ai_knowledge_sources")
      .insert(rows);

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save search results");
    }

    return new Response(
      JSON.stringify({ success: true, count: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("search-knowledge error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
