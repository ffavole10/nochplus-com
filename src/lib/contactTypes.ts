// Shared metadata for the 6 internal contact types.
// Used by ContactFormModal, ContactsTab, Decision Map picker, and any
// summary view that needs to render a typed pill.

export const CONTACT_TYPES = [
  "primary",
  "decision_maker",
  "champion",
  "technical_buyer",
  "operations_contact",
  "billing_procurement",
] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  primary: "Primary",
  decision_maker: "Decision Maker",
  champion: "Champion",
  technical_buyer: "Technical Buyer",
  operations_contact: "Operations Contact",
  billing_procurement: "Billing / Procurement",
};

export const CONTACT_TYPE_SHORT: Record<ContactType, string> = {
  primary: "PRIMARY",
  decision_maker: "DECISION MAKER",
  champion: "CHAMPION",
  technical_buyer: "TECHNICAL BUYER",
  operations_contact: "OPERATIONS CONTACT",
  billing_procurement: "BILLING / PROCUREMENT",
};

// Tailwind class string for the colored pill background + text.
// Spec: primary uses amber 50/800 (the "teal" descriptor in the brief is a
// historical note — the actual tokens requested are amber).
export const CONTACT_TYPE_PILL: Record<ContactType, string> = {
  primary: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  decision_maker: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900",
  champion: "bg-pink-50 text-pink-800 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900",
  technical_buyer: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  operations_contact: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900",
  billing_procurement: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
};

// Display order on the Contacts tab.
export const CONTACT_TYPE_ORDER: ContactType[] = [
  "primary",
  "decision_maker",
  "champion",
  "technical_buyer",
  "operations_contact",
  "billing_procurement",
];

export function isContactType(v: unknown): v is ContactType {
  return typeof v === "string" && (CONTACT_TYPES as readonly string[]).includes(v);
}
