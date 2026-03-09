import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServiceTicketsStore, makeSteps } from "@/stores/serviceTicketsStore";
import { ServiceTicket } from "@/types/serviceTicket";
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

function dbTicketToStore(ticket: DBServiceTicket, chargers: DBTicketCharger[]): ServiceTicket {
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

      if (error || !dbTickets?.length) return;

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

      const store = useServiceTicketsStore.getState();
      const existingIds = new Set(store.tickets.map((t) => t.id));

      for (const dbTicket of dbTickets) {
        if (existingIds.has(dbTicket.id)) continue;
        const storeTicket = dbTicketToStore(dbTicket as any, chargersByTicket[dbTicket.id] || []);
        store.addTicket(storeTicket);
      }
    }

    loadFromDB();
  }, []);
}

/**
 * Persist a service ticket to the database.
 * Call this alongside store.addTicket() to ensure DB persistence.
 */
export async function persistTicketToDB(ticket: ServiceTicket, submissionId?: string) {
  const { error: ticketError } = await supabase.from("service_tickets").insert({
    id: ticket.id,
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
  });

  if (ticketError) {
    console.error("Failed to persist ticket to DB:", ticketError);
    return;
  }

  // Insert charger record
  if (ticket.charger.serialNumber || ticket.charger.brand) {
    await supabase.from("ticket_chargers").insert({
      ticket_id: ticket.id,
      brand: ticket.charger.brand || "Unknown",
      charger_type: ticket.charger.type === "DC_L3" ? "DC | Level 3" : "AC | Level 2",
      serial_number: ticket.charger.serialNumber || null,
      known_issues: ticket.issue.description || null,
    });
  }
}
