/**
 * UUID v1-v5 validator. Used to guard RPC calls that expect a real Postgres UUID
 * before they're sent to Supabase, preventing
 * "invalid input syntax for type uuid" errors from leaking to the UI.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Throws a clear error if the supplied id is not a valid UUID.
 * Use this at the top of any handler that calls a Supabase RPC.
 */
export function assertTicketUuid(id: unknown, action = "perform this action"): asserts id is string {
  if (!isUuid(id)) {
    throw new Error(
      `Ticket is not persisted yet, cannot ${action}. Please refresh the page and try again.`,
    );
  }
}
