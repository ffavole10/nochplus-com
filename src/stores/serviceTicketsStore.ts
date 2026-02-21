import { create } from "zustand";
import { ServiceTicket, WORKFLOW_STEPS_TEMPLATE, WorkflowStepInfo } from "@/types/serviceTicket";
import { MOCK_SERVICE_TICKETS } from "@/data/mockServiceTickets";

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
}

export const useServiceTicketsStore = create<ServiceTicketsStore>((set, get) => ({
  tickets: MOCK_SERVICE_TICKETS,

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
    const max = get().tickets.reduce((m, t) => {
      const num = parseInt(t.ticketId.replace("T-", ""), 10);
      return isNaN(num) ? m : Math.max(m, num);
    }, 10000);
    return `T-${max + 1}`;
  },
}));

export { makeSteps };
