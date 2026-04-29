// localStorage-backed pin & recent-search store for the global command palette.
// Shape mirrors the eventual `user_pins` table for trivial future migration.

export type EntityType =
  | "ticket"
  | "work_order"
  | "account"
  | "charger"
  | "estimate"
  | "member"
  | "contact";

export interface PinnedItem {
  entity_type: EntityType;
  entity_id: string;
  label: string;
  pinned_at: string;
  user_id: string | null; // placeholder for v1
}

export interface RecentSearch {
  query: string;
  searched_at: string;
}

const PINS_KEY = "noch_palette_pins";
const RECENT_KEY = "noch_palette_recent";

export const PIN_LIMIT = 10;
const RECENT_CAP = 20;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getPins(): PinnedItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<PinnedItem[]>(localStorage.getItem(PINS_KEY), []);
}

export function isPinned(type: EntityType, id: string): boolean {
  return getPins().some((p) => p.entity_type === type && p.entity_id === id);
}

/** Returns { ok: true, pins } or { ok: false, reason: 'limit' } */
export function togglePin(item: Omit<PinnedItem, "pinned_at" | "user_id">):
  | { ok: true; pins: PinnedItem[]; pinned: boolean }
  | { ok: false; reason: "limit" } {
  const pins = getPins();
  const existingIdx = pins.findIndex(
    (p) => p.entity_type === item.entity_type && p.entity_id === item.entity_id,
  );
  if (existingIdx >= 0) {
    pins.splice(existingIdx, 1);
    localStorage.setItem(PINS_KEY, JSON.stringify(pins));
    return { ok: true, pins, pinned: false };
  }
  if (pins.length >= PIN_LIMIT) {
    return { ok: false, reason: "limit" };
  }
  pins.unshift({
    ...item,
    pinned_at: new Date().toISOString(),
    user_id: null,
  });
  localStorage.setItem(PINS_KEY, JSON.stringify(pins));
  return { ok: true, pins, pinned: true };
}

export function getRecent(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  return safeParse<RecentSearch[]>(localStorage.getItem(RECENT_KEY), []);
}

export function pushRecent(query: string): RecentSearch[] {
  const q = query.trim();
  if (!q) return getRecent();
  const existing = getRecent().filter(
    (r) => r.query.toLowerCase() !== q.toLowerCase(),
  );
  const next = [{ query: q, searched_at: new Date().toISOString() }, ...existing].slice(
    0,
    RECENT_CAP,
  );
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

export function removeRecent(query: string): RecentSearch[] {
  const next = getRecent().filter((r) => r.query !== query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}
