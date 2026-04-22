import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { assertTicketUuid } from "@/lib/uuid";

export type AssessmentStatus = "pending_review" | "assessed" | "rejected";

export interface TicketLifecycleRow {
  id: string;
  ticket_id: string;
  assessment_status: AssessmentStatus;
  assessment_data: any | null;
  swi_match_data: any | null;
  assessed_at: string | null;
  assessed_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  reverted_at: string | null;
  reverted_by: string | null;
  revert_reason: string | null;
  sent_to_customer_at: string | null;
  sent_to_customer_by: string | null;
  sent_to_customer_email: string | null;
  updated_at: string;
}

export interface AuditEntry {
  id: string;
  ticket_id: string;
  action: string;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_at: string;
  notes: string | null;
  metadata: any | null;
}

const SELECT_COLS =
  "id, ticket_id, assessment_status, assessment_data, swi_match_data, " +
  "assessed_at, assessed_by, rejected_at, rejected_by, rejection_reason, " +
  "reverted_at, reverted_by, revert_reason, sent_to_customer_at, " +
  "sent_to_customer_by, sent_to_customer_email, updated_at";

/**
 * Subscribes to a single service_ticket row and its audit log.
 * Returns latest server-truth lifecycle state + audit entries with display names.
 */
export function useTicketLifecycle(ticketDbId: string | null | undefined) {
  const [row, setRow] = useState<TicketLifecycleRow | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!ticketDbId) return;
    setLoading(true);
    const [{ data: ticketData }, { data: auditData }] = await Promise.all([
      supabase.from("service_tickets").select(SELECT_COLS).eq("id", ticketDbId).maybeSingle() as any,
      supabase.from("ticket_audit_log").select("*").eq("ticket_id", ticketDbId).order("performed_at", { ascending: false }) as any,
    ]);
    if (ticketData) setRow(ticketData as TicketLifecycleRow);
    if (auditData) setAudit(auditData as AuditEntry[]);
    setLoading(false);
  }, [ticketDbId]);

  useEffect(() => {
    if (!ticketDbId) {
      setRow(null);
      setAudit([]);
      return;
    }
    refetch();

    const channel = supabase
      .channel(`ticket-lifecycle-${ticketDbId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "service_tickets", filter: `id=eq.${ticketDbId}` },
        (payload) => {
          const next = payload.new as any;
          setRow((prev) => ({ ...(prev || {}), ...next } as TicketLifecycleRow));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_audit_log", filter: `ticket_id=eq.${ticketDbId}` },
        (payload) => {
          const entry = payload.new as AuditEntry;
          setAudit((prev) => [entry, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketDbId, refetch]);

  return { row, audit, loading, refetch };
}

/* ────────────── RPC wrappers ────────────── */

export interface AssessmentPayload {
  assessment_data: any;
  swi_match_data: any | null;
}

async function getDisplayName(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const meta = session.user.user_metadata || {};
  return meta.full_name || meta.name || session.user.email || null;
}

export async function rpcApproveAndRunAssessment(ticketDbId: string, payload: AssessmentPayload, notes?: string) {
  assertTicketUuid(ticketDbId, "approve this ticket");
  const performer_name = await getDisplayName();
  const { data, error } = await supabase.rpc("approve_and_run_assessment", {
    _ticket_id: ticketDbId,
    _assessment_data: payload.assessment_data,
    _swi_match_data: payload.swi_match_data,
    _notes: notes || null,
    _performer_name: performer_name,
  });
  if (error) throw error;
  return data;
}

export async function rpcRerunAssessment(ticketDbId: string, payload: AssessmentPayload) {
  assertTicketUuid(ticketDbId, "re-run this assessment");
  const performer_name = await getDisplayName();
  const { data, error } = await supabase.rpc("rerun_assessment", {
    _ticket_id: ticketDbId,
    _assessment_data: payload.assessment_data,
    _swi_match_data: payload.swi_match_data,
    _performer_name: performer_name,
  });
  if (error) throw error;
  return data;
}

export async function rpcRejectTicket(ticketDbId: string, reason: string) {
  assertTicketUuid(ticketDbId, "reject this ticket");
  const performer_name = await getDisplayName();
  const { data, error } = await supabase.rpc("reject_ticket", {
    _ticket_id: ticketDbId,
    _reason: reason,
    _performer_name: performer_name,
  });
  if (error) throw error;
  return data;
}

export async function rpcRevertRejection(ticketDbId: string, revertReason: string) {
  assertTicketUuid(ticketDbId, "revert this rejection");
  const performer_name = await getDisplayName();
  const { data, error } = await supabase.rpc("revert_rejection", {
    _ticket_id: ticketDbId,
    _revert_reason: revertReason,
    _performer_name: performer_name,
  });
  if (error) throw error;
  return data;
}

export async function rpcMarkAssessmentSent(ticketDbId: string, email: string) {
  assertTicketUuid(ticketDbId, "send this assessment");
  const performer_name = await getDisplayName();
  const { data, error } = await supabase.rpc("mark_assessment_sent", {
    _ticket_id: ticketDbId,
    _email: email,
    _performer_name: performer_name,
  });
  if (error) throw error;
  return data;
}

export async function rpcResendAssessment(ticketDbId: string, email: string, note: string) {
  assertTicketUuid(ticketDbId, "resend this assessment");
  const performer_name = await getDisplayName();
  const { data, error } = await supabase.rpc("resend_assessment", {
    _ticket_id: ticketDbId,
    _email: email,
    _note: note,
    _performer_name: performer_name,
  });
  if (error) throw error;
  return data;
}

/** True if the role can re-run, revert rejection, or resend an assessment. */
export function canOverrideTicketLifecycle(role: string | null): boolean {
  return role === "super_admin" || role === "admin" || role === "manager";
}

/** Format an audit-log action for display in the history tab. */
export function formatAuditAction(entry: AuditEntry): string {
  const who = entry.performed_by_name || "User";
  switch (entry.action) {
    case "assessed":
      return `${who} approved & ran assessment`;
    case "re_assessed":
      return `${who} re-ran assessment`;
    case "rejected":
      return `${who} rejected ticket${entry.notes ? `: ${entry.notes}` : ""}`;
    case "reverted":
      return `${who} reverted rejection${entry.notes ? `: ${entry.notes}` : ""}`;
    case "sent_to_customer": {
      const email = entry.metadata?.email || "customer";
      return `${who} sent assessment report to ${email}`;
    }
    case "resent_to_customer": {
      const email = entry.metadata?.email || "customer";
      return `${who} resent report to ${email}${entry.notes ? ` — ${entry.notes}` : ""}`;
    }
    default:
      return `${who} • ${entry.action}`;
  }
}
