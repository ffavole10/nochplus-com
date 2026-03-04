const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();
    if (!domain) {
      return new Response(
        JSON.stringify({ error: "Domain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: Record<string, string> = {};

    // Try fetching the website and parsing meta tags
    try {
      const url = `https://${domain}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        redirect: "follow",
      });

      if (res.ok) {
        const html = await res.text();

        // Extract og:title or <title>
        const ogTitle = html.match(
          /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
        );
        const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (ogTitle?.[1]) result.name = ogTitle[1].trim();
        else if (titleTag?.[1]) {
          // Clean up title (remove " | Home", " - Official Site", etc.)
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
