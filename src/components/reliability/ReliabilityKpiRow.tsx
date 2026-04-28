import { useMemo } from "react";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import {
  computeMTTR,
  computeTRR,
  compute30dDelta,
  computeNetworkBenchmarks,
  formatMTTR,
  formatPct,
} from "@/services/reliabilityMetrics";
import { ReliabilityKpiCard } from "./ReliabilityKpiCard";
import type { ServiceTicket } from "@/types/serviceTicket";

export type ReliabilityKpiRowProps = {
  /** Filtered tickets for this scope (account, campaign, etc). Empty array = whole network is muted. */
  scopedTickets: ServiceTicket[];
  scope: "fleet" | "campaign" | "account";
  /** Show NEVI line on FTCSR card (Account 360 with federally-funded sites only). */
  neviAlert?: boolean;
  size?: "large" | "compact";
};

/**
 * Single source-of-truth row of the four reliability KPIs.
 * Used by Mission Control, Campaigns Dashboard, and Account 360.
 */
export function ReliabilityKpiRow({
  scopedTickets,
  scope,
  neviAlert,
  size = "large",
}: ReliabilityKpiRowProps) {
  const allTickets = useServiceTicketsStore((s) => s.tickets);

  const benchmarks = useMemo(() => computeNetworkBenchmarks(allTickets), [allTickets]);

  const mttr = useMemo(() => computeMTTR(scopedTickets), [scopedTickets]);
  const trr = useMemo(() => computeTRR(scopedTickets), [scopedTickets]);
  const mttrDelta = useMemo(() => compute30dDelta(scopedTickets, computeMTTR), [scopedTickets]);
  const trrDelta = useMemo(() => compute30dDelta(scopedTickets, computeTRR), [scopedTickets]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <ReliabilityKpiCard
        metric="RCD"
        value={null}
        statusPill={{ label: "Pilot · CARB integration in progress", tone: "amber" }}
        networkAvgLabel="—"
        topPerformersLabel="—"
        scope={scope}
        size={size}
      />
      <ReliabilityKpiCard
        metric="FTCSR"
        value={null}
        statusPill={{ label: "Pilot · CARB integration in progress", tone: "amber" }}
        networkAvgLabel="—"
        topPerformersLabel="—"
        neviAlert={neviAlert}
        scope={scope}
        size={size}
      />
      <ReliabilityKpiCard
        metric="MTTR"
        value={mttr.value}
        valueLabel={mttr.value != null ? formatMTTR(mttr.value) : "Awaiting resolved tickets"}
        delta={mttrDelta}
        lowerIsBetter
        networkAvgLabel={benchmarks.mttrAvgHrs != null ? formatMTTR(benchmarks.mttrAvgHrs) : "—"}
        topPerformersLabel={benchmarks.mttrTopHrs != null ? formatMTTR(benchmarks.mttrTopHrs) : "—"}
        scope={scope}
        size={size}
      />
      <ReliabilityKpiCard
        metric="TRR"
        value={trr.value}
        valueLabel={trr.value != null ? formatPct(trr.value, 0) : "Awaiting telemetry"}
        delta={trrDelta}
        lowerIsBetter={false}
        networkAvgLabel={benchmarks.trrAvgPct != null ? formatPct(benchmarks.trrAvgPct, 0) : "—"}
        topPerformersLabel={benchmarks.trrTopPct != null ? formatPct(benchmarks.trrTopPct, 0) : "—"}
        scope={scope}
        size={size}
        neuralLayer="resolution layer"
      />
    </div>
  );
}
