import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ServiceTicket, WORKFLOW_STEPS_TEMPLATE, WorkflowStepInfo } from "@/types/serviceTicket";

function makeSteps(currentStep: number): WorkflowStepInfo[] {
  return WORKFLOW_STEPS_TEMPLATE.map((s) => ({
    ...s,
    status:
      s.number < currentStep
        ? "complete"
        : s.number === currentStep
        ? "in_progress"
        : "pending",
    completedAt:
      s.number < currentStep
        ? new Date(Date.now() - (currentStep - s.number) * 86400000 * 2).toISOString()
        : undefined,
  }));
}

interface ServiceTicketsStore {
  tickets: ServiceTicket[];
  addTicket: (ticket: ServiceTicket) => void;
  updateTicket: (id: string, updates: Partial<ServiceTicket>) => void;
  getTicketById: (id: string) => ServiceTicket | undefined;
  getNextTicketId: () => string;
  getChildrenOf: (parentId: string) => ServiceTicket[];
  getParentOf: (childId: string) => ServiceTicket | undefined;
  getSiblings: (childId: string) => ServiceTicket[];
  getParentTickets: () => ServiceTicket[];
  getStandaloneTickets: () => ServiceTicket[];
  createParentWithChildren: (
    customer: ServiceTicket["customer"],
    chargers: Array<{ charger: ServiceTicket["charger"]; issue: ServiceTicket["issue"] }>,
    source: ServiceTicket["source"],
    sourceCampaignName?: string,
  ) => string;
}

export const useServiceTicketsStore = create<ServiceTicketsStore>((set, get) => ({
  tickets: [],

  addTicket: (ticket) =>
    set((state) => ({ tickets: [ticket, ...state.tickets] })),

  updateTicket: (id, updates) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  getTicketById: (id) => get().tickets.find((t) => t.id === id),

  getNextTicketId: () => {
    const allTicketIds = get().tickets
      .filter((t) => !t.ticketId.includes("/"))
      .map((t) => {
        const num = parseInt(t.ticketId.replace("NP-", "").replace("T-", ""), 10);
        return isNaN(num) ? 0 : num;
      });
    const max = Math.max(0, ...allTicketIds);
    return `NP-${max + 1}`;
  },

  getChildrenOf: (parentId) => {
    const parent = get().tickets.find((t) => t.id === parentId);
    if (!parent?.childTicketIds) return [];
    return parent.childTicketIds
      .map((cid) => get().tickets.find((t) => t.id === cid))
      .filter(Boolean) as ServiceTicket[];
  },

  getParentOf: (childId) => {
    const child = get().tickets.find((t) => t.id === childId);
    if (!child?.parentTicketId) return undefined;
    return get().tickets.find((t) => t.id === child.parentTicketId);
  },

  getSiblings: (childId) => {
    const parent = get().getParentOf(childId);
    if (!parent) return [];
    return get().getChildrenOf(parent.id).filter((t) => t.id !== childId);
  },

  getParentTickets: () => get().tickets.filter((t) => t.isParent),

  getStandaloneTickets: () => get().tickets.filter((t) => !t.isParent && !t.parentTicketId),

  createParentWithChildren: (customer, chargers, source, sourceCampaignName) => {
    const now = new Date().toISOString();
    const nextId = get().getNextTicketId();
    const parentId = `st-parent-${Date.now()}`;

    const childTickets: ServiceTicket[] = chargers.map((c, i) => ({
      id: `st-child-${Date.now()}-${i}`,
      ticketId: `${nextId}/${i + 1}`,
      source,
      sourceCampaignName,
      customer,
      charger: c.charger,
      photos: [],
      issue: c.issue,
      priority: "Medium" as const,
      status: "pending_review" as const,
      currentStep: 1,
      workflowSteps: makeSteps(1),
      createdAt: now,
      updatedAt: now,
      history: [{ id: `h-${Date.now()}-${i}`, timestamp: now, action: "Child ticket created", performedBy: "System" }],
      parentTicketId: parentId,
      childIndex: i + 1,
    }));

    const parentTicket: ServiceTicket = {
      id: parentId,
      ticketId: nextId,
      source,
      sourceCampaignName,
      customer,
      charger: { brand: "", serialNumber: "", type: "", location: chargers[0]?.charger.location || "" },
      photos: [],
      issue: { description: `Customer request — ${chargers.length} charger${chargers.length > 1 ? "s" : ""} require service.` },
      priority: "Medium",
      status: "pending_review",
      currentStep: 1,
      workflowSteps: makeSteps(1),
      createdAt: now,
      updatedAt: now,
      history: [{ id: `h-${Date.now()}`, timestamp: now, action: `Parent ticket created — ${chargers.length} chargers`, performedBy: "Current User" }],
      isParent: true,
      childTicketIds: childTickets.map((c) => c.id),
    };

    set((state) => ({ tickets: [parentTicket, ...childTickets, ...state.tickets] }));
    return parentId;
  },
}));

export { makeSteps };
