/**
 * Reliability Operating System metrics service.
 *
 * Computes the four canonical KPIs (RCD, FTCSR, MTTR, TRR) from real
 * ticket data and aggregates network benchmarks across all NOCH+ accounts.
 *
 * Where live telemetry isn't connected (FTCSR / RCD), the values are
 * deliberately reported as null and surfaced as "Awaiting telemetry"
 * — never fabricated.
 */

import { differenceInHours, subDays } from "date-fns";
import type { ServiceTicket } from "@/types/serviceTicket";

// Tunable assumption: average dollar cost of a single truck roll. Used to
// translate "Truck Rolls Avoided" into ROI dollars on the Membership page.
export const TRUCK_ROLL_COST_USD = 450;

// Minimum sample size before we trust a computed MTTR value.
export const MIN_RESOLVED_FOR_MTTR = 5;

export type MetricResult = {
  value: number | null;
  count: number;
};

export type DeltaResult = {
  direction: "up" | "down" | "flat";
  pct: number;
} | null;

function isResolved(t: ServiceTicket): boolean {
  return t.status === "completed" && !!t.createdAt && !!t.updatedAt;
}

/**
 * MTTR — average resolution time in hours over a window.
 * Returns null when the sample is below MIN_RESOLVED_FOR_MTTR.
 */
export function computeMTTR(tickets: ServiceTicket[], windowDays = 90): MetricResult {
  const cutoff = subDays(new Date(), windowDays);
  const resolved = tickets.filter(
    (t) => isResolved(t) && new Date(t.updatedAt) >= cutoff,
  );
  if (resolved.length < MIN_RESOLVED_FOR_MTTR) return { value: null, count: resolved.length };
  const total = resolved.reduce(
    (sum, t) => sum + Math.max(0, differenceInHours(new Date(t.updatedAt), new Date(t.createdAt))),
    0,
  );
  return { value: total / resolved.length, count: resolved.length };
}

/**
 * TRR — Truck Roll Reduction. Percentage of resolved tickets where no
 * field report (i.e. no on-site visit / dispatched work order) was needed.
 *
 * Proxy until work_order linkage lands: resolved tickets without a
 * `fieldReportUrl` are treated as "remote-resolved".
 */
export function computeTRR(tickets: ServiceTicket[], windowDays = 90): MetricResult {
  const cutoff = subDays(new Date(), windowDays);
  const resolved = tickets.filter(
    (t) => isResolved(t) && new Date(t.updatedAt) >= cutoff,
  );
  if (resolved.length === 0) return { value: null, count: 0 };
  const remote = resolved.filter((t) => !t.fieldReportUrl).length;
  return { value: (remote / resolved.length) * 100, count: resolved.length };
}

/**
 * 30-day delta vs the prior 30 days.
 * For "lower-is-better" metrics (MTTR), the caller should interpret the
 * direction with that polarity in mind; we just report the raw direction.
 */
export function compute30dDelta(
  tickets: ServiceTicket[],
  metric: (t: ServiceTicket[]) => MetricResult,
): DeltaResult {
  const now = new Date();
  const last30 = tickets.filter(
    (t) => t.updatedAt && new Date(t.updatedAt) >= subDays(now, 30),
  );
  const prior30 = tickets.filter((t) => {
    if (!t.updatedAt) return false;
    const d = new Date(t.updatedAt);
    return d >= subDays(now, 60) && d < subDays(now, 30);
  });
  const a = metric(last30).value;
  const b = metric(prior30).value;
  if (a == null || b == null || b === 0) return null;
  const pct = ((a - b) / b) * 100;
  if (Math.abs(pct) < 0.5) return { direction: "flat", pct: 0 };
  return { direction: pct > 0 ? "up" : "down", pct: Math.abs(pct) };
}

/**
 * NOCH+ network benchmarks computed across ALL tickets in the platform.
 *
 * `topPerformers` is the 90th-percentile value for accounts with at least
 * 10 resolved tickets — i.e. an aspirational ceiling drawn from real data,
 * not an industry comparison.
 */
export type NetworkBenchmarks = {
  mttrAvgHrs: number | null;
  mttrTopHrs: number | null;
  trrAvgPct: number | null;
  trrTopPct: number | null;
};

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

/**
 * Group tickets by account (customer.company) and compute MTTR/TRR per
 * account, then derive network avg + 90th percentile.
 */
export function computeNetworkBenchmarks(allTickets: ServiceTicket[]): NetworkBenchmarks {
  const byAccount = new Map<string, ServiceTicket[]>();
  for (const t of allTickets) {
    const key = t.customer?.company || "__unknown__";
    if (!byAccount.has(key)) byAccount.set(key, []);
    byAccount.get(key)!.push(t);
  }

  const mttrSamples: number[] = [];
  const trrSamples: number[] = [];

  for (const [, list] of byAccount) {
    const mttr = computeMTTR(list);
    if (mttr.value != null && mttr.count >= 10) mttrSamples.push(mttr.value);
    const trr = computeTRR(list);
    if (trr.value != null && trr.count >= 10) trrSamples.push(trr.value);
  }

  // MTTR: lower is better → top performers = 10th percentile (fastest)
  const mttrSorted = [...mttrSamples].sort((a, b) => a - b);
  // TRR: higher is better → top performers = 90th percentile (highest %)
  const trrSorted = [...trrSamples].sort((a, b) => a - b);

  const avg = (xs: number[]) =>
    xs.length === 0 ? null : xs.reduce((s, x) => s + x, 0) / xs.length;

  return {
    mttrAvgHrs: avg(mttrSamples),
    mttrTopHrs: percentile(mttrSorted, 10),
    trrAvgPct: avg(trrSamples),
    trrTopPct: percentile(trrSorted, 90),
  };
}

/** Format helpers — kept here so every surface formats values identically. */
export function formatMTTR(avgHrs: number | null): string {
  if (avgHrs == null) return "—";
  if (avgHrs >= 48) return `${(avgHrs / 24).toFixed(1)} days`;
  return `${Math.round(avgHrs)} hours`;
}

export function formatPct(pct: number | null, digits = 1): string {
  if (pct == null) return "—";
  return `${pct.toFixed(digits)}%`;
}
