export type TicketSource = "campaign" | "noch_plus" | "manual";

export type ChargerBrand = "BTC" | "ABB" | "Delta" | "Tritium" | "Signet" | "Other";
export type ChargerType = "AC_L2" | "DC_L3";

export interface TicketCustomerInfo {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
}

export interface TicketChargerInfo {
  brand: ChargerBrand | "";
  serialNumber: string;
  type: ChargerType | "";
  location: string;
}

export interface TicketPhoto {
  id: string;
  file: File;
  label: "front" | "back" | "serial_plate" | "additional";
  preview: string;
}

export interface TicketIssueInfo {
  description: string;
}

export interface TicketMetadata {
  source: TicketSource;
  campaignId?: string;
  submissionId?: string;
  createdBy?: string;
  createdAt: string;
}

export interface TicketData {
  customer: TicketCustomerInfo;
  charger: TicketChargerInfo;
  photos: TicketPhoto[];
  issue: TicketIssueInfo;
  metadata: TicketMetadata;
}
