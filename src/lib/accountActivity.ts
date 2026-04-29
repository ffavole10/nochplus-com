import { supabase } from "@/integrations/supabase/client";

export type AccountActivityAction =
  | "created"
  | "updated"
  | "status_changed"
  | "deleted"
  | "restored"
  | "merged"
  | "merge_target"
  | "contact_added"
  | "contact_updated"
  | "contact_removed"
  | "primary_contact_changed";

export interface LogAccountActivityArgs {
  customer_id: string;
  action: AccountActivityAction;
  field_changed?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  metadata?: Record<string, any>;
}

const FIELD_LABELS: Record<string, string> = {
  company: "Company name",
  customer_type: "Customer type",
  customer_type_other: "Customer type (other)",
  domain: "Domain",
  website_url: "Website",
  industry: "Industry",
  hq_city: "HQ City",
  hq_region: "HQ State / Country",
  relationship_type: "Relationship type",
  status: "Status",
  pricing_type: "Pricing type",
  contact_name: "Primary contact name",
  email: "Primary contact email",
  phone: "Primary contact phone",
  internal_notes: "Internal notes",
  source: "Source",
  logo_url: "Logo",
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] || key;
}

const TRACKED_FIELDS = Object.keys(FIELD_LABELS);

function normalize(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  return String(v);
}

export interface FieldDiff {
  field: string;
  oldValue: string;
  newValue: string;
}

export function diffAccountFields(before: Record<string, any>, after: Record<string, any>): FieldDiff[] {
  const out: FieldDiff[] = [];
  for (const key of TRACKED_FIELDS) {
    if (!(key in after)) continue;
    const a = normalize(before?.[key]);
    const b = normalize(after?.[key]);
    if (a !== b) {
      out.push({
        field: key,
        oldValue: a,
        newValue: b,
      });
    }
  }
  return out;
}

async function getActorName(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) return null;
    const meta = (u.user_metadata || {}) as any;
    return meta.full_name || meta.name || u.email || null;
  } catch {
    return null;
  }
}

export async function logAccountActivity(args: LogAccountActivityArgs): Promise<void> {
  const actor = await getActorName();
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("account_activity_log" as any).insert({
    customer_id: args.customer_id,
    actor,
    actor_user_id: u.user?.id ?? null,
    action: args.action,
    field_changed: args.field_changed ?? null,
    old_value: args.old_value ?? null,
    new_value: args.new_value ?? null,
    metadata: args.metadata ?? null,
  } as any);
}
