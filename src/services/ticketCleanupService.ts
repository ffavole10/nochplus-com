import { supabase } from "@/integrations/supabase/client";

interface CleanupResult {
  duplicatesRemoved: number;
  groupedTicketsCreated: number;
}

/**
 * Finds all noch_plus_submissions that have multiple ungrouped service_tickets
 * (parent_ticket_id IS NULL, is_parent IS NOT true) and consolidates them:
 *   - Keep the ticket with the lowest ticket_id as the parent
 *   - Delete all other duplicates
 *   - Update the kept ticket with is_parent=true and charger_count
 *
 * Optionally filter to a single submission_id for targeted cleanup.
 */
export async function cleanupDuplicateSubmissionTickets(
  targetSubmissionId?: string
): Promise<CleanupResult> {
  // 1. Find submission_ids that have >1 ungrouped top-level ticket
  let query = supabase
    .from("service_tickets")
    .select("id, ticket_id, submission_id, is_parent, parent_ticket_id, charger_count")
    .not("status", "in", '("cancelled","closed")')
    .not("submission_id", "is", null)
    .is("parent_ticket_id", null);

  if (targetSubmissionId) {
    // Look up the noch_plus_submissions UUID for this submission_id string
    const { data: sub } = await supabase
      .from("noch_plus_submissions")
      .select("id")
      .eq("submission_id", targetSubmissionId)
      .limit(1);
    if (sub && sub.length > 0) {
      query = query.eq("submission_id", sub[0].id);
    } else {
      return { duplicatesRemoved: 0, groupedTicketsCreated: 0 };
    }
  }

  const { data: tickets, error } = await query;
  if (error || !tickets?.length) {
    console.error("Cleanup query error:", error);
    return { duplicatesRemoved: 0, groupedTicketsCreated: 0 };
  }

  // Group by submission_id
  const groups: Record<string, typeof tickets> = {};
  for (const t of tickets) {
    const sid = t.submission_id as string;
    if (!groups[sid]) groups[sid] = [];
    groups[sid].push(t);
  }

  let duplicatesRemoved = 0;
  let groupedTicketsCreated = 0;

  for (const [submissionId, group] of Object.entries(groups)) {
    // Skip if already properly grouped or only 1 ticket
    const ungrouped = group.filter((t) => !t.is_parent);
    if (ungrouped.length <= 1) continue;

    // Count total chargers from assessment_chargers for this submission
    const { count: chargerCount } = await supabase
      .from("assessment_chargers")
      .select("id", { count: "exact", head: true })
      .eq("submission_id", submissionId);

    // Use the full group size (including the one we keep as parent)
    const totalChargers = chargerCount || ungrouped.length;

    // Sort by ticket_id to find the lowest (natural string sort works for NP-XXXX format)
    ungrouped.sort((a, b) => {
      const numA = parseInt(a.ticket_id.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.ticket_id.replace(/\D/g, "")) || 0;
      return numA - numB;
    });

    const keeper = ungrouped[0];
    const toDelete = ungrouped.slice(1);

    // Update the keeper to be the parent
    await supabase
      .from("service_tickets")
      .update({
        is_parent: true,
        charger_count: totalChargers,
        customer_notes: `Customer request — ${totalChargers} chargers require service`,
      })
      .eq("id", keeper.id);

    // Delete duplicates (ticket_chargers will cascade or we delete manually)
    const deleteIds = toDelete.map((t) => t.id);

    // Delete linked ticket_chargers first
    await supabase
      .from("ticket_chargers")
      .delete()
      .in("ticket_id", deleteIds);

    // Delete the duplicate tickets
    const { error: delError } = await supabase
      .from("service_tickets")
      .delete()
      .in("id", deleteIds);

    if (!delError) {
      duplicatesRemoved += deleteIds.length;
      groupedTicketsCreated += 1;
    } else {
      console.error("Failed to delete duplicates for submission", submissionId, delError);
    }

    // Mark the submission as tickets_created
    await supabase
      .from("noch_plus_submissions")
      .update({ tickets_created: true, tickets_created_at: new Date().toISOString() })
      .eq("id", submissionId);
  }

  return { duplicatesRemoved, groupedTicketsCreated };
}
