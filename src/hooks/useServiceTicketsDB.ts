import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServiceTicketsStore, makeSteps } from "@/stores/serviceTicketsStore";
import { ServiceTicket } from "@/types/serviceTicket";
import { buildTicketRegulatoryContext } from "@/services/regulatorySync";
import type { ChargerBrand, ChargerType } from "@/types/ticket";

interface DBServiceTicket {
  id: string;
  ticket_id: string;
  source: string;
  status: string;
  company_name: string;
  company_id: string | null;
  location_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  street_address: string | null;
  city: string;
  state: string;
  zip_code: string | null;
  customer_notes: string | null;
  service_urgency: string | null;
  staff_notes: string | null;
  oem_ticket_exists: string | null;
  oem_ticket_number: string | null;
  created_at: string;
  updated_at: string;
  is_parent: boolean | null;
  parent_ticket_id: string | null;
  charger_count: number | null;
  submission_id: string | null;
}

interface DBTicketCharger {
  id: string;
  ticket_id: string;
  brand: string;
  charger_type: string;
  serial_number: string | null;
  known_issues: string | null;
  installation_location: string | null;
  location_descriptor: string | null;
  is_working: string | null;
  under_warranty: string | null;
}

function dbTicketToStore(
  ticket: DBServiceTicket,
  chargers: DBTicketCharger[],
  childDbIds?: string[],
): ServiceTicket {
  const charger = chargers[0];
  const validBrands: ChargerBrand[] = ["BTC", "ABB", "Delta", "Tritium", "Signet", "Other"];
  const brand = charger
    ? (validBrands.find((b) => charger.brand?.toUpperCase().includes(b.toUpperCase())) || "")
    : "";
  const chargerType: ChargerType | "" = charger
    ? (charger.charger_type?.includes("DC") ? "DC_L3" : "AC_L2")
    : "";

  return {
    id: ticket.id,
    ticketId: ticket.ticket_id,
    source: (ticket.source === "noch_plus" || ticket.source === "campaign" || ticket.source === "manual")
      ? ticket.source
      : "manual",
    customer: {
      name: ticket.full_name,
      company: ticket.company_name,
      email: ticket.email || "",
      phone: ticket.phone || "",
      address: [ticket.street_address, ticket.city, ticket.state, ticket.zip_code].filter(Boolean).join(", "),
    },
    charger: {
      brand,
      serialNumber: charger?.serial_number || "",
      type: chargerType,
      location: [ticket.city, ticket.state].filter(Boolean).join(", "),
    },
    photos: [],
    issue: {
      description: charger?.known_issues || ticket.customer_notes || "Service requested.",
    },
    priority: ticket.service_urgency === "critical" ? "Critical"
      : ticket.service_urgency === "high" ? "High"
      : ticket.service_urgency === "low" ? "Low"
      : "Medium",
    status: "pending_review",
    currentStep: 1,
    workflowSteps: makeSteps(1),
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    history: [
      {
        id: `h-db-${ticket.id}`,
        timestamp: ticket.created_at,
        action: `Ticket created from ${ticket.source} source`,
        performedBy: "System",
      },
    ],
    // Parent-child fields
    isParent: ticket.is_parent || false,
    parentTicketId: ticket.parent_ticket_id || undefined,
    childTicketIds: childDbIds,
  };
}

/**
 * Syncs service tickets from the database into the Zustand store on mount.
 * Only adds tickets that aren't already in the store.
 */
export function useServiceTicketsSync() {
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;

    async function loadFromDB() {
      const { data: dbTickets, error } = await supabase
        .from("service_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return;

      // If DB is empty, clear the store to remove stale localStorage data
      if (!dbTickets?.length) {
        useServiceTicketsStore.setState({ tickets: [] });
        return;
      }

      // Load all chargers for these tickets
      const ticketIds = dbTickets.map((t: any) => t.id);
      const { data: dbChargers } = await supabase
        .from("ticket_chargers")
        .select("*")
        .in("ticket_id", ticketIds);

      const chargersByTicket: Record<string, DBTicketCharger[]> = {};
      (dbChargers || []).forEach((c: any) => {
        if (!chargersByTicket[c.ticket_id]) chargersByTicket[c.ticket_id] = [];
        chargersByTicket[c.ticket_id].push(c);
      });

      // Build parent→children map from DB relationships
      const childrenByParent: Record<string, string[]> = {};
      for (const t of dbTickets) {
        const dt = t as any;
        if (dt.parent_ticket_id) {
          if (!childrenByParent[dt.parent_ticket_id]) childrenByParent[dt.parent_ticket_id] = [];
          childrenByParent[dt.parent_ticket_id].push(dt.id);
        }
      }

      // Replace store with DB data (DB is source of truth)
      const newTickets: ServiceTicket[] = [];
      for (const dbTicket of dbTickets) {
        const dt = dbTicket as any as DBServiceTicket;
        const childIds = dt.is_parent ? (childrenByParent[dt.id] || []) : undefined;
        newTickets.push(dbTicketToStore(dt, chargersByTicket[dt.id] || [], childIds));
      }
      
      useServiceTicketsStore.setState({ tickets: newTickets });
    }

    loadFromDB();
  }, []);
}

/**
 * Persist a service ticket to the database.
 * Call this alongside store.addTicket() to ensure DB persistence.
 */
export async function persistTicketToDB(ticket: ServiceTicket, opts?: {
  submissionId?: string;
  parentTicketDbId?: string;
  isParent?: boolean;
  chargerCount?: number;
}): Promise<string | null> {
  const { data, error: ticketError } = await supabase.from("service_tickets").insert({
    ticket_id: ticket.ticketId,
    source: ticket.source,
    status: "New",
    company_name: ticket.customer.company,
    full_name: ticket.customer.name,
    email: ticket.customer.email,
    phone: ticket.customer.phone,
    city: ticket.customer.address?.split(",").slice(-2, -1)[0]?.trim() || "Unknown",
    state: ticket.customer.address?.split(",").slice(-1)[0]?.trim() || "Unknown",
    street_address: ticket.customer.address?.split(",").slice(0, -2).join(",").trim() || null,
    customer_notes: ticket.issue.description,
    service_urgency: ticket.priority === "Critical" ? "critical"
      : ticket.priority === "High" ? "high"
      : ticket.priority === "Low" ? "low"
      : "standard",
    submission_id: opts?.submissionId || null,
    parent_ticket_id: opts?.parentTicketDbId || null,
    is_parent: opts?.isParent || false,
    charger_count: opts?.chargerCount || 1,
  } as any).select("id").single();

  if (ticketError) {
    console.error("Failed to persist ticket to DB:", ticketError);
    return null;
  }

  const dbId = (data as any)?.id as string;

  // Insert charger record (skip for parent tickets which have no individual charger data)
  if (!opts?.isParent) {
    await supabase.from("ticket_chargers").insert({
      ticket_id: dbId,
      brand: ticket.charger.brand || "Unknown",
      charger_type: ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2",
      serial_number: ticket.charger.serialNumber || null,
      known_issues: ticket.issue.description || null,
    });
  }

  // Build regulatory context for the ticket based on location state/city
  try {
    const state = ticket.customer.address?.split(",").slice(-1)[0]?.trim() || "";
    const city = ticket.customer.address?.split(",").slice(-2, -1)[0]?.trim() || "";
    if (state && dbId) {
      buildTicketRegulatoryContext(dbId, state, city).catch(err =>
        console.warn("Regulatory context build failed:", err)
      );
    }
  } catch (err) {
    console.warn("Regulatory context setup failed:", err);
  }

  return dbId;
}

/**
 * Check if tickets already exist for a given submission.
 */
export async function checkDuplicateTickets(submissionId: string): Promise<{ exists: boolean; ticketId?: string }> {
  const { data } = await supabase
    .from("service_tickets")
    .select("id, ticket_id")
    .eq("submission_id", submissionId)
    .not("status", "in", '("cancelled","closed")')
    .limit(1);

  if (data && data.length > 0) {
    return { exists: true, ticketId: (data[0] as any).ticket_id };
  }
  return { exists: false };
}
