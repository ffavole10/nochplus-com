// Work order activity log helpers.
// Append-only audit trail of admin/tech actions on a work order.

import { supabase } from "@/integrations/supabase/client";
import type { WorkOrder, WorkOrderActivity } from "@/types/fieldCapture";

export type WorkOrderActivityAction =
  | "created"
  | "edited"
  | "reassigned"
  | "duplicated"
  | "duplicated_from"
  | "cancelled"
  | "archived"
  | "unarchived"
  | "deleted"
  | "status_changed"
  | "started"
  | "submitted"
  | "charger_completed";

interface LogParams {
  work_order_id: string;
  action: WorkOrderActivityAction | string;
  details?: Record<string, unknown>;
  actor_id?: string | null;
  actor_label?: string | null;
}

export async function logWorkOrderActivity(params: LogParams): Promise<void> {
  let actor_id = params.actor_id;
  if (actor_id === undefined) {
    const { data } = await supabase.auth.getUser();
    actor_id = data.user?.id ?? null;
  }
  let actor_label = params.actor_label ?? null;
  if (!actor_label && actor_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", actor_id)
      .maybeSingle();
    actor_label =
      (prof as any)?.display_name || (prof as any)?.email || actor_id;
  }

  const { error } = await supabase.from("work_order_activity").insert({
    work_order_id: params.work_order_id,
    actor_id: actor_id ?? null,
    actor_label,
    action: params.action,
    details: (params.details ?? {}) as never,
  });
  if (error) {
    // Non-fatal — log to console so the action itself isn't blocked.
    console.error("[workOrderActivity] log failed", error);
  }
}

/**
 * Returns a merged timeline: explicit activity rows + derived events
 * synthesized from the work order's own timestamps (so older WOs without
 * activity history still show meaningful events).
 */
export async function fetchActivityTimeline(
  wo: WorkOrder,
): Promise<WorkOrderActivity[]> {
  const { data: rows } = await supabase
    .from("work_order_activity")
    .select("*")
    .eq("work_order_id", wo.id)
    .order("created_at", { ascending: true });

  const explicit = ((rows || []) as unknown as WorkOrderActivity[]).map((r) => ({
    ...r,
    details: (r.details as Record<string, unknown>) ?? {},
  }));

  const derived: WorkOrderActivity[] = [];
  const seen = new Set(explicit.map((e) => e.action + ":" + e.created_at));

  const push = (
    action: string,
    created_at: string,
    details: Record<string, unknown> = {},
    actor_id: string | null = null,
    actor_label: string | null = null,
  ) => {
    const key = action + ":" + created_at;
    if (seen.has(key)) return;
    seen.add(key);
    derived.push({
      id: `derived-${action}-${created_at}`,
      work_order_id: wo.id,
      actor_id,
      actor_label,
      action,
      details,
      created_at,
    });
  };

  // created — always present
  if (wo.created_at) {
    push("created", wo.created_at, {
      derived: true,
      work_order_number: wo.work_order_number,
    }, wo.created_by);
  }
  if (wo.arrival_timestamp) {
    push("started", wo.arrival_timestamp, {
      derived: true,
      gps_location: wo.gps_location,
    }, wo.assigned_technician_id);
  }
  if (wo.departure_timestamp) {
    push("submitted", wo.departure_timestamp, {
      derived: true,
    }, wo.assigned_technician_id);
  }

  return [...explicit, ...derived].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
}
