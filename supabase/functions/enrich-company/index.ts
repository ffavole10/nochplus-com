import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Only allow valid public domain names
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9.-]{0,253}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;

// Block private/internal hostnames and IP ranges
const BLOCKED_PATTERNS = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|fc|fd|fe80|::1|\[::1\]|metadata|internal)/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { domain } = await req.json();
    if (!domain || typeof domain !== "string") {
      return new Response(
        JSON.stringify({ error: "Domain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate domain format
    const cleanDomain = domain.trim().toLowerCase();
    if (!DOMAIN_REGEX.test(cleanDomain)) {
      return new Response(
        JSON.stringify({ error: "Invalid domain format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Block private/internal addresses
    if (BLOCKED_PATTERNS.test(cleanDomain)) {
      return new Response(
        JSON.stringify({ error: "Private addresses not allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: Record<string, string> = {};

    // Try fetching the website and parsing meta tags
    try {
      const url = `https://${cleanDomain}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();

        // Extract og:title or <title>
        const ogTitle = html.match(
          /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
        );
        const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (ogTitle?.[1]) result.name = ogTitle[1].trim();
        else if (titleTag?.[1]) {
          result.name = titleTag[1]
            .split(/[|\-–—]/)[0]
            .trim();
        }

        // Extract description
        const ogDesc = html.match(
          /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
        );
        const metaDesc = html.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
        );
        if (ogDesc?.[1]) result.description = ogDesc[1].trim();
        else if (metaDesc?.[1]) result.description = metaDesc[1].trim();

        // Try to find industry from keywords
        const keywords = html.match(
          /<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i
        );
        if (keywords?.[1]) {
          const kw = keywords[1].split(",").map((k: string) => k.trim());
          if (kw.length > 0) result.industry = kw[0];
        }
      }
    } catch {
      // Website fetch failed, that's ok
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Enrichment failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
