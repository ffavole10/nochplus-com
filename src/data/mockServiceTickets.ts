import {
  ServiceTicket,
  WORKFLOW_STEPS_TEMPLATE,
  WorkflowStepInfo,
} from "@/types/serviceTicket";

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

// ── Parent 1: NP-1000, 3 chargers (GreenCharge Networks) ──
const parent1Children: ServiceTicket[] = [
  {
    id: "st-001",
    ticketId: "NP-1000/1",
    source: "campaign",
    sourceCampaignName: "BTC Q1 2025 Portfolio",
    customer: { name: "Michael Chen", company: "GreenCharge Networks", email: "mchen@greencharge.com", phone: "(415) 555-0142", address: "1200 Market St, San Francisco, CA 94103" },
    charger: { brand: "BTC", serialNumber: "BTC-2024-00842", type: "DC_L3", location: "1200 Market St, San Francisco, CA" },
    photos: [],
    issue: { description: "Station offline for 3+ weeks. CCS connector shows error code E-4412. Multiple customer complaints received. Charger fails to initiate session — screen freezes at 'Initializing' step." },
    priority: "Critical",
    status: "in_progress",
    currentStep: 5,
    workflowSteps: makeSteps(5),
    estimateId: "EST-2045",
    estimateAmount: 4250,
    swiMatchId: "swi_btc_dc_offline",
    swiConfidence: 92,
    assignedTo: "Joe Rose",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    history: [
      { id: "h1", timestamp: new Date(Date.now() - 15 * 86400000).toISOString(), action: "Ticket created from campaign assessment", performedBy: "System" },
      { id: "h2", timestamp: new Date(Date.now() - 14 * 86400000).toISOString(), action: "AutoHeal assessment completed — Critical risk", performedBy: "AI Engine" },
      { id: "h3", timestamp: new Date(Date.now() - 13 * 86400000).toISOString(), action: "SWI matched: BTC DC Offline Recovery (92%)", performedBy: "AI Engine" },
      { id: "h4", timestamp: new Date(Date.now() - 10 * 86400000).toISOString(), action: "Estimate created: $4,250.00", performedBy: "Joe Rose" },
      { id: "h5", timestamp: new Date(Date.now() - 9 * 86400000).toISOString(), action: "Estimate sent to mchen@greencharge.com", performedBy: "Joe Rose" },
      { id: "h6", timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), action: "Awaiting customer approval", performedBy: "System" },
    ],
    parentTicketId: "st-parent-001",
    childIndex: 1,
  },
  {
    id: "st-001b",
    ticketId: "NP-1000/2",
    source: "campaign",
    sourceCampaignName: "BTC Q1 2025 Portfolio",
    customer: { name: "Michael Chen", company: "GreenCharge Networks", email: "mchen@greencharge.com", phone: "(415) 555-0142", address: "1200 Market St, San Francisco, CA 94103" },
    charger: { brand: "BTC", serialNumber: "BTC-2024-00843", type: "DC_L3", location: "1200 Market St, San Francisco, CA" },
    photos: [],
    issue: { description: "CCS cable connector housing cracked. Cable sheath shows visible wear near plug end. Functional but poses safety risk during wet conditions." },
    priority: "High",
    status: "in_progress",
    currentStep: 3,
    workflowSteps: makeSteps(3),
    swiMatchId: "swi_cable_replacement",
    swiConfidence: 88,
    assignedTo: "Joe Rose",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    history: [
      { id: "h1", timestamp: new Date(Date.now() - 15 * 86400000).toISOString(), action: "Ticket created from campaign assessment", performedBy: "System" },
      { id: "h2", timestamp: new Date(Date.now() - 14 * 86400000).toISOString(), action: "AutoHeal assessment completed — High risk", performedBy: "AI Engine" },
      { id: "h3", timestamp: new Date(Date.now() - 13 * 86400000).toISOString(), action: "SWI matched: CCS Cable Replacement (88%)", performedBy: "AI Engine" },
    ],
    parentTicketId: "st-parent-001",
    childIndex: 2,
  },
  {
    id: "st-001c",
    ticketId: "NP-1000/3",
    source: "campaign",
    sourceCampaignName: "BTC Q1 2025 Portfolio",
    customer: { name: "Michael Chen", company: "GreenCharge Networks", email: "mchen@greencharge.com", phone: "(415) 555-0142", address: "1200 Market St, San Francisco, CA 94103" },
    charger: { brand: "BTC", serialNumber: "BTC-2024-00844", type: "DC_L3", location: "1200 Market St, San Francisco, CA" },
    photos: [],
    issue: { description: "Payment terminal RFID reader intermittent. Contactless card payments fail ~40% of the time. Screen displays 'Tap Again' repeatedly." },
    priority: "Medium",
    status: "pending_review",
    currentStep: 1,
    workflowSteps: makeSteps(1),
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    history: [
      { id: "h1", timestamp: new Date(Date.now() - 15 * 86400000).toISOString(), action: "Ticket created from campaign assessment", performedBy: "System" },
    ],
    parentTicketId: "st-parent-001",
    childIndex: 3,
  },
];

const parent1: ServiceTicket = {
  id: "st-parent-001",
  ticketId: "NP-1000",
  source: "campaign",
  sourceCampaignName: "BTC Q1 2025 Portfolio",
  customer: { name: "Michael Chen", company: "GreenCharge Networks", email: "mchen@greencharge.com", phone: "(415) 555-0142", address: "1200 Market St, San Francisco, CA 94103" },
  charger: { brand: "BTC", serialNumber: "", type: "", location: "1200 Market St, San Francisco, CA" },
  photos: [],
  issue: { description: "Multiple charger issues at Market St location — 3 chargers require service." },
  priority: "Critical",
  status: "in_progress",
  currentStep: 1,
  workflowSteps: makeSteps(1),
  createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  history: [
    { id: "h1", timestamp: new Date(Date.now() - 15 * 86400000).toISOString(), action: "Parent ticket created from campaign — 3 chargers", performedBy: "System" },
  ],
  isParent: true,
  childTicketIds: ["st-001", "st-001b", "st-001c"],
};

// ── Parent 2: NP-1001, 2 chargers (ChargePoint Plus) ──
const parent2Children: ServiceTicket[] = [
  {
    id: "st-002",
    ticketId: "NP-1001/1",
    source: "noch_plus",
    customer: { name: "Sarah Williams", company: "ChargePoint Plus", email: "swilliams@cpplus.com", phone: "(512) 555-0198", address: "4500 Guadalupe St, Austin, TX 78751" },
    charger: { brand: "ABB", serialNumber: "ABB-HPC-7821", type: "DC_L3", location: "4500 Guadalupe St, Austin, TX" },
    photos: [],
    issue: { description: "Payment terminal not accepting contactless cards. RFID reader intermittent. Screen shows 'Payment Error' after tap. Issue started after last firmware update 2 weeks ago." },
    priority: "High",
    status: "in_progress",
    currentStep: 3,
    workflowSteps: makeSteps(3),
    swiMatchId: "swi_payment_terminal",
    swiConfidence: 85,
    assignedTo: "Caitlin Romano",
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    history: [
      { id: "h1", timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), action: "Noch+ submission received", performedBy: "Customer Portal" },
      { id: "h2", timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), action: "Assessment complete — High priority", performedBy: "AI Engine" },
      { id: "h3", timestamp: new Date(Date.now() - 6 * 86400000).toISOString(), action: "SWI matched: Payment Terminal Repair (85%)", performedBy: "AI Engine" },
      { id: "h4", timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), action: "Estimate in progress", performedBy: "Caitlin Romano" },
    ],
    parentTicketId: "st-parent-002",
    childIndex: 1,
  },
  {
    id: "st-002b",
    ticketId: "NP-1001/2",
    source: "noch_plus",
    customer: { name: "Sarah Williams", company: "ChargePoint Plus", email: "swilliams@cpplus.com", phone: "(512) 555-0198", address: "4500 Guadalupe St, Austin, TX 78751" },
    charger: { brand: "ABB", serialNumber: "ABB-HPC-7822", type: "DC_L3", location: "4500 Guadalupe St, Austin, TX" },
    photos: [],
    issue: { description: "Screen display flickering and unresponsive to touch input. Users unable to start charging session via touchscreen. Physical buttons still work." },
    priority: "Medium",
    status: "in_progress",
    currentStep: 2,
    workflowSteps: makeSteps(2),
    swiMatchId: "swi_screen_repair",
    swiConfidence: 78,
    assignedTo: "Caitlin Romano",
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    history: [
      { id: "h1", timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), action: "Noch+ submission received", performedBy: "Customer Portal" },
      { id: "h2", timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), action: "Assessment complete — Medium priority", performedBy: "AI Engine" },
    ],
    parentTicketId: "st-parent-002",
    childIndex: 2,
  },
];

const parent2: ServiceTicket = {
  id: "st-parent-002",
  ticketId: "NP-1001",
  source: "noch_plus",
  customer: { name: "Sarah Williams", company: "ChargePoint Plus", email: "swilliams@cpplus.com", phone: "(512) 555-0198", address: "4500 Guadalupe St, Austin, TX 78751" },
  charger: { brand: "ABB", serialNumber: "", type: "", location: "4500 Guadalupe St, Austin, TX" },
  photos: [],
  issue: { description: "Multiple charger issues at Guadalupe St location — 2 chargers require service." },
  priority: "High",
  status: "in_progress",
  currentStep: 1,
  workflowSteps: makeSteps(1),
  createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  history: [
    { id: "h1", timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), action: "Parent ticket created from Noch+ — 2 chargers", performedBy: "Customer Portal" },
  ],
  isParent: true,
  childTicketIds: ["st-002", "st-002b"],
};

// ── Standalone tickets (single charger = parent with 1 child) ──

// NP-1002: single charger - rendered as standalone
const standalone1: ServiceTicket = {
  id: "st-003",
  ticketId: "NP-1002",
  source: "manual",
  customer: { name: "David Park", company: "EV Solutions Inc", email: "dpark@evsolutions.com", phone: "(305) 555-0167", address: "789 Brickell Ave, Miami, FL 33131" },
  charger: { brand: "Delta", serialNumber: "DLT-L2-4490", type: "AC_L2", location: "789 Brickell Ave, Miami, FL" },
  photos: [],
  issue: { description: "Level 2 charger displays 'Ground Fault' error on startup. Unit powers on but refuses to start charging session. Breaker trips occasionally under load." },
  priority: "Medium",
  status: "pending_review",
  currentStep: 1,
  workflowSteps: makeSteps(1),
  createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  history: [
    { id: "h1", timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), action: "Manual ticket created", performedBy: "Fernando Favole" },
    { id: "h2", timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), action: "Assessment in progress", performedBy: "AI Engine" },
  ],
};

const standalone2: ServiceTicket = {
  id: "st-004",
  ticketId: "NP-1003",
  source: "campaign",
  sourceCampaignName: "BTC Q4 2024 Northeast",
  customer: { name: "Jennifer Liu", company: "Metro EV Hub", email: "jliu@metroev.com", phone: "(212) 555-0234", address: "350 5th Ave, New York, NY 10118" },
  charger: { brand: "Tritium", serialNumber: "TRT-RT50-1192", type: "DC_L3", location: "350 5th Ave, New York, NY" },
  photos: [],
  issue: { description: "Routine preventive maintenance — annual inspection due. No active faults reported. Unit operating normally but approaching 12-month service interval." },
  priority: "Low",
  status: "completed",
  currentStep: 10,
  workflowSteps: makeSteps(10),
  estimateId: "EST-1987",
  estimateAmount: 1200,
  swiMatchId: "swi_preventive_maint",
  swiConfidence: 98,
  assignedTo: "Joe Rose",
  createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  history: [
    { id: "h1", timestamp: new Date(Date.now() - 45 * 86400000).toISOString(), action: "Ticket created from campaign", performedBy: "System" },
    { id: "h2", timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), action: "Ticket closed — service complete", performedBy: "Joe Rose" },
  ],
};

const standalone3: ServiceTicket = {
  id: "st-005",
  ticketId: "NP-1004",
  source: "noch_plus",
  customer: { name: "Robert Taylor", company: "Suncoast Charging", email: "rtaylor@suncoast.com", phone: "(813) 555-0189", address: "2100 N Dale Mabry Hwy, Tampa, FL 33607" },
  charger: { brand: "Signet", serialNumber: "SGN-FC-0823", type: "DC_L3", location: "2100 N Dale Mabry Hwy, Tampa, FL" },
  photos: [],
  issue: { description: "CCS cable showing visible wear. Connector housing cracked. Cable jacket has small tears near the connector end. Still functional but safety concern." },
  priority: "High",
  status: "in_progress",
  currentStep: 4,
  workflowSteps: makeSteps(4),
  estimateId: "EST-2051",
  estimateAmount: 3100,
  swiMatchId: "swi_cable_replacement",
  swiConfidence: 88,
  assignedTo: "Fernando Favole",
  createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  history: [
    { id: "h1", timestamp: new Date(Date.now() - 6 * 86400000).toISOString(), action: "Noch+ submission received", performedBy: "Customer Portal" },
    { id: "h2", timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), action: "Assessment complete", performedBy: "AI Engine" },
    { id: "h3", timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), action: "SWI matched: CCS Cable Replacement (88%)", performedBy: "AI Engine" },
    { id: "h4", timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), action: "Estimate created: $3,100.00", performedBy: "Fernando Favole" },
    { id: "h5", timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), action: "Estimate sent to customer", performedBy: "Fernando Favole" },
  ],
};

export const MOCK_SERVICE_TICKETS: ServiceTicket[] = [
  parent1,
  ...parent1Children,
  parent2,
  ...parent2Children,
  standalone1,
  standalone2,
  standalone3,
];
