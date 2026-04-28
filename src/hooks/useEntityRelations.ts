import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RelatedSubmission {
  id: string;
  submission_id: string | null;
  full_name: string | null;
  email: string | null;
  status: string | null;
  created_at: string;
}

export interface RelatedEstimate {
  id: string;
  estimate_number: string | null;
  total: number | null;
  status: string | null;
  created_at: string;
}

export interface RelatedWorkOrder {
  id: string;
  work_order_number: string | null;
  status: string;
  assigned_technician_id: string | null;
  technician_name?: string | null;
  created_at: string;
  site_name: string | null;
}

export interface TicketRelations {
  submission: RelatedSubmission | null;
  estimates: RelatedEstimate[];
  workOrders: RelatedWorkOrder[];
  loading: boolean;
}

/**
 * Fetches everything linked to a ticket:
 *  - Source submission (via service_tickets.submission_id)
 *  - Estimates (via estimates.ticket_id text == ticket.ticketId)
 *  - Work orders (soft match by site_name/site_address — no FK exists yet)
 */
export function useTicketRelations(opts: {
  ticketDbId?: string | null;
  ticketTextId?: string | null;
  submissionDbId?: string | null;
  siteName?: string | null;
  siteAddress?: string | null;
}): TicketRelations {
  const { ticketDbId, ticketTextId, submissionDbId, siteName, siteAddress } = opts;
  const [submission, setSubmission] = useState<RelatedSubmission | null>(null);
  const [estimates, setEstimates] = useState<RelatedEstimate[]>([]);
  const [workOrders, setWorkOrders] = useState<RelatedWorkOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!ticketDbId && !ticketTextId) {
      setSubmission(null);
      setEstimates([]);
      setWorkOrders([]);
      return;
    }
    setLoading(true);
    (async () => {
      // Submission
      const subRes = submissionDbId
        ? await supabase
            .from("submissions")
            .select("id, submission_id, full_name, email, status, created_at")
            .eq("id", submissionDbId)
            .maybeSingle()
        : { data: null };

      // Estimates
      const estRes = ticketTextId
        ? await supabase
            .from("estimates")
            .select("id, estimate_number, total, status, created_at")
            .eq("ticket_id", ticketTextId)
            .order("created_at", { ascending: false })
        : { data: [] };

      // Work Orders (soft match — site_name OR site_address exact)
      let woRes: { data: any[] | null } = { data: [] };
      if (siteName || siteAddress) {
        let q = supabase
          .from("work_orders")
          .select("id, work_order_number, status, assigned_technician_id, created_at, site_name")
          .order("created_at", { ascending: false })
          .limit(20);
        const orParts: string[] = [];
        if (siteName) orParts.push(`site_name.eq.${siteName}`);
        if (siteAddress) orParts.push(`site_address.eq.${siteAddress}`);
        if (orParts.length) q = q.or(orParts.join(","));
        woRes = await q;
      }

      if (cancelled) return;

      setSubmission((subRes?.data as RelatedSubmission) ?? null);
      setEstimates((estRes?.data as RelatedEstimate[]) ?? []);

      const wos = ((woRes?.data as any[]) ?? []) as RelatedWorkOrder[];
      // Resolve technician names
      const techIds = Array.from(
        new Set(wos.map((w) => w.assigned_technician_id).filter(Boolean) as string[]),
      );
      if (techIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", techIds);
        const nameMap = new Map(
          (profs ?? []).map((p: any) => [p.user_id, p.full_name || p.email]),
        );
        wos.forEach((w) => {
          if (w.assigned_technician_id) {
            w.technician_name = nameMap.get(w.assigned_technician_id) || null;
          }
        });
      }
      setWorkOrders(wos);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [ticketDbId, ticketTextId, submissionDbId, siteName, siteAddress]);

  return { submission, estimates, workOrders, loading };
}

export interface WorkOrderRelations {
  parentTicket: {
    id: string;
    ticket_id: string;
    status: string;
    assessment_status: string | null;
    site_name: string | null;
    city: string | null;
    state: string | null;
  } | null;
  loading: boolean;
}

/**
 * Fetches the parent ticket for a work order via soft match on site_name/address.
 * No FK exists between work_orders and service_tickets yet.
 */
export function useWorkOrderRelations(opts: {
  workOrderId?: string | null;
  siteName?: string | null;
  siteAddress?: string | null;
}): WorkOrderRelations {
  const { workOrderId, siteName, siteAddress } = opts;
  const [parentTicket, setParentTicket] = useState<WorkOrderRelations["parentTicket"]>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!workOrderId || (!siteName && !siteAddress)) {
      setParentTicket(null);
      return;
    }
    setLoading(true);
    (async () => {
      let q = supabase
        .from("service_tickets")
        .select("id, ticket_id, status, assessment_status, city, state, street_address, company_name")
        .order("created_at", { ascending: false })
        .limit(1);
      const orParts: string[] = [];
      if (siteName) orParts.push(`company_name.eq.${siteName}`);
      if (siteAddress) orParts.push(`street_address.eq.${siteAddress}`);
      if (orParts.length) q = q.or(orParts.join(","));
      const { data } = await q;
      if (cancelled) return;
      const row = (data?.[0] as any) ?? null;
      setParentTicket(
        row
          ? {
              id: row.id,
              ticket_id: row.ticket_id,
              status: row.status,
              assessment_status: row.assessment_status,
              site_name: row.company_name,
              city: row.city,
              state: row.state,
            }
          : null,
      );
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [workOrderId, siteName, siteAddress]);

  return { parentTicket, loading };
}
