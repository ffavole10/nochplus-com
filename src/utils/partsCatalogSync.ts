import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Upsert a single line item into the parts_catalog.
 * Returns the catalog part id or null on error.
 */
export async function upsertPartFromLineItem(lineItem: {
  description: string;
  unit_price: number;
  unit?: string;
  category?: string;
}): Promise<string | null> {
  try {
    const desc = lineItem.description?.trim();
    if (!desc || desc.length < 3) return null;

    // Search for existing part by exact description (case-insensitive)
    const { data: existing, error: searchErr } = await supabase
      .from("parts_catalog")
      .select("id, usage_count")
      .ilike("description", desc)
      .limit(1)
      .maybeSingle();

    if (searchErr) {
      console.error("parts_catalog search error:", searchErr);
      return null;
    }

    if (existing) {
      // Update existing entry
      const { error: updateErr } = await supabase
        .from("parts_catalog")
        .update({
          unit_price: lineItem.unit_price,
          usage_count: (existing.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(lineItem.unit ? { unit: lineItem.unit } : {}),
          ...(lineItem.category ? { category: lineItem.category } : {}),
        })
        .eq("id", existing.id);

      if (updateErr) {
        console.error("parts_catalog update error:", updateErr);
        return null;
      }
      return existing.id;
    }

    // Insert new entry
    const { data: inserted, error: insertErr } = await supabase
      .from("parts_catalog")
      .insert({
        description: desc,
        unit_price: lineItem.unit_price,
        unit: lineItem.unit || "each",
        category: lineItem.category || null,
        usage_count: 1,
        last_used_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("parts_catalog insert error:", insertErr);
      return null;
    }
    return inserted.id;
  } catch (err) {
    console.error("upsertPartFromLineItem error:", err);
    return null;
  }
}

/**
 * Sync all line items from a saved estimate into the parts catalog.
 * Called after estimate save or status change to sent/approved.
 */
export async function syncAllLineItemsToCatalog(
  estimateId: string
): Promise<void> {
  try {
    const { data: estimate, error } = await supabase
      .from("estimates")
      .select("line_items")
      .eq("id", estimateId)
      .single();

    if (error || !estimate) {
      console.error("Failed to fetch estimate for catalog sync:", error);
      return;
    }

    const lineItems = (estimate.line_items as any[]) || [];
    for (const item of lineItems) {
      await upsertPartFromLineItem({
        description: item.description || "",
        unit_price: Number(item.rate) || 0,
        unit: item.unit,
        category: item.category,
      });
    }
  } catch (err) {
    console.error("syncAllLineItemsToCatalog error:", err);
  }
}
