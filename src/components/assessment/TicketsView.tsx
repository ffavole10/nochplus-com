import { useMemo, useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Ticket, AlertTriangle, Clock, CheckCircle, MapPin, Wrench, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, ExternalLink, PauseCircle, ShieldAlert } from "lucide-react";
import { AssessmentCharger, TicketPriority, PriorityLevel } from "@/types/assessment";
import { differenceInDays } from "date-fns";
import { classifyTicketPriority } from "@/lib/ticketPriority";

/** Estimate offline days from the status code when no ticket date exists */
function estimateAgeDaysFromStatus(status: string): number {
  const s = status.toLowerCase();
  if (s.includes("1–29") || s.includes("1-29")) return 15;
  if (s.includes("30–89") || s.includes("30-89")) return 60;
  if (s.includes("90 day") || s.includes("90–") || s.includes("90-")) return 135;
  if (s.includes("6 month") && !s.includes("1+ year") && !s.includes("2+ year") && !s.includes("3+ year")) return 270;
  if (s.includes("1+ year") && !s.includes("2+") && !s.includes("3+")) return 400;
  if (s.includes("2+ year")) return 800;
  if (s.includes("3+ year")) return 1100;
  if (s.includes("no comms")) return 365;
  return 0;
}

/** Map a charger's priorityLevel to TicketPriority */
function priorityLevelToTicketPriority(level: PriorityLevel): TicketPriority {
  switch (level) {
    case "Critical": return "P1-Critical";
    case "High": return "P2-High";
    case "Medium": return "P3-Medium";
    case "Low": return "P4-Low";
    default: return "P4-Low";
  }
}

/** Check if a charger is online */
function isOnline(status: string): boolean {
  return status.startsWith("00") || status.toLowerCase().includes("online");
}
import { TicketsEmptyState } from "@/components/empty-states/TicketsEmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AgingBreakdownChart } from "@/components/flagged/AgingBreakdownChart";
import { GeographicMapView } from "@/components/flagged/GeographicMapView";
import { GroupBreakdownChart } from "@/components/flagged/GroupBreakdownChart";
import { getSlaStatus, SlaStatus, AgeBand, getAgeBand } from "@/components/flagged/slaConstants";

interface TicketsViewProps {
  chargers: AssessmentCharger[];
  onSelectCharger: (charger: AssessmentCharger) => void;
  onApproveToServiceDesk?: (charger: AssessmentCharger) => string | null;
}

const PRIORITY_CONFIG: Record<TicketPriority, { color: string; bg: string; label: string }> = {
  "P1-Critical": { color: "text-critical", bg: "bg-critical text-critical-foreground", label: "P1 — Critical" },
  "P2-High": { color: "text-orange-500", bg: "bg-degraded text-degraded-foreground", label: "P2 — High" },
  "P3-Medium": { color: "text-yellow-500", bg: "bg-yellow-500 text-white", label: "P3 — Medium" },
  "P4-Low": { color: "text-optimal", bg: "bg-optimal text-optimal-foreground", label: "P4 — Low" },
};

function generateRecommendation(charger: AssessmentCharger, priority: TicketPriority, ageDays: number): string {
  const subject = charger.ticketSubject?.toLowerCase() || "";
  const group = charger.ticketGroup?.toLowerCase() || "";
  const parts: string[] = [];

  if (subject.includes("offline") || subject.includes("not communicating") || subject.includes("communication")) {
    parts.push("Verify network connectivity and modem/SIM status. Check if the charger has power and the communication module is active. Consider a remote reboot if supported.");
  } else if (subject.includes("error") || subject.includes("fault")) {
    parts.push("Review fault logs and error codes. Perform a hard reset if safe. If error persists, schedule on-site diagnostics to inspect internal components.");
  } else if (subject.includes("cable") || subject.includes("connector")) {
    parts.push("Inspect connector pins for damage or debris. Check cable for wear or kinks. Replace connector assembly if physical damage is confirmed.");
  } else if (subject.includes("screen") || subject.includes("display")) {
    parts.push("Check display connections and driver board. If screen is physically damaged, order replacement panel. Verify software display settings.");
  } else if (subject.includes("payment") || subject.includes("reader") || subject.includes("rfid")) {
    parts.push("Test payment terminal with a known-good card. Clean card reader contacts. Verify payment processing backend connectivity and certificates.");
  } else if (subject.includes("power") || subject.includes("charging")) {
    parts.push("Measure output voltage and current under load. Check power supply modules and circuit breakers. Verify grid connection and transformer health.");
  } else {
    parts.push("Conduct a full diagnostic assessment including power systems, communication, and physical inspection.");
  }

  if (priority === "P1-Critical") {
    parts.push("URGENT: Escalate immediately. Assign senior technician for same-day dispatch.");
  } else if (priority === "P2-High") {
    parts.push("Schedule priority service within 48 hours. Notify account manager.");
  }

  if (ageDays > 30) {
    parts.push(`Ticket has been open for ${ageDays} days — consider escalation to engineering team.`);
  } else if (ageDays > 14) {
    parts.push(`Ticket aging at ${ageDays} days — follow up with assigned group.`);
  }

  if (group && group !== "unknown") {
    parts.push(`Currently assigned to: ${charger.ticketGroup}. Verify group has bandwidth.`);
  }

  return parts.join(" ");
}

function SlaBadge({ status }: { status: SlaStatus }) {
  if (status === "breached") {
    return (
      <Badge className="bg-critical text-critical-foreground gap-1 text-[10px] h-5">
        <ShieldAlert className="h-3 w-3" /> SLA Breach
      </Badge>
    );
  }
  if (status === "at_risk") {
    return (
      <Badge className="bg-degraded text-degraded-foreground gap-1 text-[10px] h-5">
        <AlertTriangle className="h-3 w-3" /> At Risk
      </Badge>
    );
  }
  return null;
}

export function TicketsView({ chargers, onSelectCharger, onApproveToServiceDesk }: TicketsViewProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [amFilter, setAmFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, "pending" | "approved" | "rejected">>(() => {
    try { const s = localStorage.getItem("ticket-review-statuses"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [accountManagers, setAccountManagers] = useState<Record<string, string>>(() => {
    try { const s = localStorage.getItem("ticket-account-managers"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "approve" | "reject"; chargerId: string; chargerName: string; charger?: AssessmentCharger } | null>(null);
  const [createdTicketIds, setCreatedTicketIds] = useState<Record<string, string>>(() => {
    try { const s = localStorage.getItem("ticket-created-ids"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  // New filter states for the 3 new components
  const [agingFilter, setAgingFilter] = useState<{ band: AgeBand; priority: TicketPriority } | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null); // "city|state" or just state
  const [locationFilterType, setLocationFilterType] = useState<"city" | "state" | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("ticket-review-statuses", JSON.stringify(reviewStatuses));
  }, [reviewStatuses]);

  useEffect(() => {
    localStorage.setItem("ticket-account-managers", JSON.stringify(accountManagers));
  }, [accountManagers]);

  const enrichLocation = useCallback((c: AssessmentCharger) => {
    if (c.city && c.state) return c;
    const parts = c.address?.split(",").map(p => p.trim()) || [];
    let city = c.city;
    let state = c.state;
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      const match = last.match(/^([A-Z]{2})\s+\d{5}/);
      if (match) {
        if (!state) state = match[1];
        if (!city) city = parts[parts.length - 2] || "";
      } else if (/^[A-Z]{2}$/.test(last)) {
        if (!state) state = last;
        if (!city) city = parts[parts.length - 2] || "";
      }
    }
    return { ...c, city, state };
  }, []);

  const ticketChargers = useMemo(() => {
    return chargers
      .filter(c => {
        // Include chargers with ticket data OR any charger that is not online
        const hasTicketData = !!(c.ticketId || c.ticketCreatedDate);
        const offline = !isOnline(c.status);
        return hasTicketData || offline;
      })
      .map(c => {
        const enriched = enrichLocation(c);
        // Use ticket-based priority if ticket data exists, otherwise use charger's own priority level
        const hasTicketData = !!(enriched.ticketId || enriched.ticketCreatedDate);
        const priority = hasTicketData
          ? classifyTicketPriority(enriched)
          : priorityLevelToTicketPriority(enriched.priorityLevel);
        // Derive age from ticket date if available, otherwise estimate from status code
        const ageDays = enriched.ticketCreatedDate
          ? differenceInDays(new Date(), new Date(enriched.ticketCreatedDate))
          : estimateAgeDaysFromStatus(enriched.status);
        const slaStatus = getSlaStatus(priority, ageDays);
        // Mark as open if it has an open ticket OR is offline
        const effectivelyOpen = enriched.hasOpenTicket || !isOnline(enriched.status);
        return {
          charger: { ...enriched, hasOpenTicket: effectivelyOpen },
          ticketPriority: priority,
          ageDays,
          slaStatus,
          recommendation: generateRecommendation(enriched, priority, ageDays),
        };
      })
      .sort((a, b) => {
        const order: Record<TicketPriority, number> = { "P1-Critical": 0, "P2-High": 1, "P3-Medium": 2, "P4-Low": 3 };
        const pDiff = order[a.ticketPriority] - order[b.ticketPriority];
        if (pDiff !== 0) return pDiff;
        return b.ageDays - a.ageDays;
      });
  }, [chargers, enrichLocation]);

  const uniqueStates = useMemo(() => {
    const states = new Set(ticketChargers.map(t => t.charger.state).filter(Boolean));
    return Array.from(states).sort();
  }, [ticketChargers]);

  const uniqueAMs = useMemo(() => {
    const names = new Set(Object.values(accountManagers).filter(Boolean));
    return Array.from(names).sort();
  }, [accountManagers]);

  const filtered = useMemo(() => {
    let result = ticketChargers;
    if (statusFilter === "open") result = result.filter(t => t.charger.hasOpenTicket);
    else if (statusFilter === "solved") result = result.filter(t => !!t.charger.ticketSolvedDate);
    if (priorityFilter !== "all") result = result.filter(t => t.ticketPriority === priorityFilter);
    if (typeFilter !== "all") result = result.filter(t => t.charger.assetRecordType === typeFilter);
    if (stateFilter !== "all") result = result.filter(t => t.charger.state === stateFilter);
    if (amFilter !== "all") {
      result = result.filter(t => accountManagers[t.charger.id] === amFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.charger.assetName.toLowerCase().includes(q) ||
        t.charger.ticketSubject?.toLowerCase().includes(q) ||
        t.charger.ticketId?.toLowerCase().includes(q) ||
        t.charger.accountName.toLowerCase().includes(q)
      );
    }
    if (reviewFilter !== "all") {
      result = result.filter(t => {
        const status = reviewStatuses[t.charger.id] || "pending";
        return reviewFilter === status;
      });
    }

    // Aging filter
    if (agingFilter) {
      result = result.filter(t =>
        getAgeBand(t.ageDays) === agingFilter.band && t.ticketPriority === agingFilter.priority
      );
    }

    // Location filter
    if (locationFilter && locationFilterType === "city") {
      const [city, state] = locationFilter.split("|");
      result = result.filter(t =>
        t.charger.city?.toLowerCase() === city.toLowerCase() &&
        t.charger.state?.toLowerCase() === state.toLowerCase()
      );
    } else if (locationFilter && locationFilterType === "state") {
      result = result.filter(t => t.charger.state === locationFilter);
    }

    // Group filter
    if (groupFilter) {
      result = result.filter(t => (t.charger.ticketGroup || "Uncategorized") === groupFilter);
    }

    return result;
  }, [ticketChargers, search, priorityFilter, statusFilter, stateFilter, typeFilter, amFilter, reviewFilter, accountManagers, reviewStatuses, agingFilter, locationFilter, locationFilterType, groupFilter]);

  const stats = useMemo(() => {
    const totalChargers = chargers.length;
    const onlineCount = chargers.filter(c => isOnline(c.status)).length;
    const open = ticketChargers.filter(t => t.charger.hasOpenTicket);
    const breached = open.filter(t => t.slaStatus === "breached");
    return {
      total: totalChargers,
      open: open.length,
      solved: onlineCount,
      p1: open.filter(t => t.ticketPriority === "P1-Critical").length,
      p2: open.filter(t => t.ticketPriority === "P2-High").length,
      p3: open.filter(t => t.ticketPriority === "P3-Medium").length,
      p4: open.filter(t => t.ticketPriority === "P4-Low").length,
      slaBreached: breached.length,
      slaBreachedPct: open.length > 0 ? Math.round(breached.length / open.length * 100) : 0,
    };
  }, [chargers, ticketChargers]);

  // Data for the new chart components (only open tickets)
  const openTickets = useMemo(() => ticketChargers.filter(t => t.charger.hasOpenTicket), [ticketChargers]);

  const hasAnyActiveChartFilter = agingFilter || locationFilter || groupFilter;

  const clearAllChartFilters = () => {
    setAgingFilter(null);
    setLocationFilter(null);
    setLocationFilterType(null);
    setGroupFilter(null);
  };

  return (
    <div className="space-y-6 p-6">
      {/* KPI Cards — 7 cards including SLA Breached */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="metric-card border-l-4 border-l-critical">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Open Tickets</p>
            <p className="text-2xl font-bold text-critical">{stats.open}</p>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-optimal">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Solved</p>
            <p className="text-2xl font-bold text-optimal">{stats.solved}</p>
            <p className="text-xs text-muted-foreground mt-1">of {stats.total}</p>
          </CardContent>
        </Card>
        <Card className={`metric-card border-l-4 border-l-critical ${stats.p1 > 0 ? "bg-critical/5" : ""}`}>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">P1 Critical</p>
            <p className="text-2xl font-bold text-critical">{stats.p1}</p>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-orange-500">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">P2 High</p>
            <p className="text-2xl font-bold text-orange-500">{stats.p2}</p>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-yellow-500">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">P3 Medium</p>
            <p className="text-2xl font-bold text-yellow-500">{stats.p3}</p>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-optimal">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">P4 Low</p>
            <p className="text-2xl font-bold text-optimal">{stats.p4}</p>
          </CardContent>
        </Card>
        {/* NEW: SLA Breached stat card */}
        <Card className={`metric-card border-l-4 border-l-critical ${stats.slaBreached > 0 ? "bg-critical/5" : ""}`}>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> SLA Breached
            </p>
            <p className="text-2xl font-bold text-critical">{stats.slaBreached}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.slaBreachedPct}% of open</p>
          </CardContent>
        </Card>
      </div>

      {/* Aging Breakdown Chart */}
      <AgingBreakdownChart
        tickets={openTickets}
        activeFilter={agingFilter}
        onFilter={(band, priority) => {
          setAgingFilter({ band, priority });
          setLocationFilter(null);
          setLocationFilterType(null);
          setGroupFilter(null);
        }}
        onClear={() => setAgingFilter(null)}
      />

      {/* Geographic Map View */}
      <GeographicMapView
        tickets={openTickets.map(t => ({
          city: t.charger.city,
          state: t.charger.state,
          ticketPriority: t.ticketPriority,
          ticketId: t.charger.ticketId,
        }))}
        activeLocationFilter={locationFilter}
        onFilterCity={(city, state) => {
          setLocationFilter(`${city}|${state}`);
          setLocationFilterType("city");
          setAgingFilter(null);
          setGroupFilter(null);
        }}
        onFilterState={(state) => {
          setLocationFilter(state);
          setLocationFilterType("state");
          setAgingFilter(null);
          setGroupFilter(null);
        }}
        onClear={() => { setLocationFilter(null); setLocationFilterType(null); }}
      />

      {/* Group / Category Breakdown */}
      <GroupBreakdownChart
        tickets={openTickets.map(t => ({
          ticketPriority: t.ticketPriority,
          group: t.charger.ticketGroup,
        }))}
        activeGroupFilter={groupFilter}
        onFilter={(group) => {
          setGroupFilter(group);
          setAgingFilter(null);
          setLocationFilter(null);
          setLocationFilterType(null);
        }}
        onClear={() => setGroupFilter(null)}
      />

      {/* Active chart filter indicator */}
      {hasAnyActiveChartFilter && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <span>Ticket list filtered by chart selection.</span>
          <Button size="sm" variant="ghost" className="text-xs h-6 ml-auto" onClick={clearAllChartFilters}>
            Clear all chart filters
          </Button>
        </div>
      )}

      {/* Review Status Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs value={reviewFilter} onValueChange={setReviewFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending Review</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Ticket List */}
      {filtered.length === 0 ? (
        <TicketsEmptyState />
      ) : (
        <div className="grid gap-3">
          {filtered.map(({ charger, ticketPriority, ageDays, slaStatus, recommendation }) => {
            const config = PRIORITY_CONFIG[ticketPriority];
            const isExpanded = expandedId === charger.id;
            return (
              <Card
                key={charger.id}
                className={`transition-all hover:shadow-md ${charger.hasOpenTicket ? "border-l-4 border-l-critical" : "border-l-4 border-l-optimal"}`}
              >
                <CardContent className="p-4">
                  <div
                    className="flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : charger.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={config.bg}>{config.label}</Badge>
                        <span className="font-semibold text-foreground truncate">{charger.assetName}</span>
                        {charger.hasOpenTicket ? (
                          <Badge className="bg-degraded/15 text-degraded border border-degraded/30 gap-1">
                            <PauseCircle className="h-3 w-3" /> Needs Review
                          </Badge>
                        ) : (
                          <Badge className="bg-optimal text-optimal-foreground gap-1">
                            <CheckCircle className="h-3 w-3" /> Solved
                          </Badge>
                        )}
                        {charger.ticketId && (
                          <Badge variant="outline" className="text-xs">#{charger.ticketId}</Badge>
                        )}
                        {/* SLA Breach / At Risk badge */}
                        <SlaBadge status={slaStatus} />
                        {/* Review status badge */}
                        {reviewStatuses[charger.id] === "approved" && (
                          <Badge className="bg-optimal text-optimal-foreground gap-1">
                            <CheckCircle className="h-3 w-3" /> Approved ✓
                          </Badge>
                        )}
                        {reviewStatuses[charger.id] === "rejected" && (
                          <Badge className="bg-muted text-muted-foreground gap-1">Rejected</Badge>
                        )}
                        {accountManagers[charger.id] && (
                          <span className="text-xs text-muted-foreground font-medium ml-1 truncate max-w-[120px]">
                            {accountManagers[charger.id]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        {charger.ticketSubject && <span className="truncate max-w-xs">{charger.ticketSubject}</span>}
                        <span className={`flex items-center gap-1 font-medium ${
                          ageDays <= 30 ? "text-optimal" : ageDays <= 45 ? "text-degraded" : "text-critical"
                        }`}>
                          <Clock className="h-3 w-3" />
                          {ageDays}d old
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[charger.city, charger.state].filter(Boolean).length > 0
                            ? [charger.city, charger.state].filter(Boolean).join(", ")
                            : charger.address || "No location"}
                        </span>
                        {charger.ticketGroup && <span>Group: {charger.ticketGroup}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline">{charger.assetRecordType}</Badge>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                          <Wrench className="h-4 w-4 text-primary" />
                          Recommendation
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{recommendation}</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Account</p>
                          <p className="font-medium">{charger.accountName || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Created</p>
                          <p className="font-medium">{charger.ticketCreatedDate || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Solved</p>
                          <p className="font-medium">{charger.ticketSolvedDate || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Reporting Source</p>
                          <p className="font-medium">{charger.ticketReportingSource || "—"}</p>
                        </div>
                      </div>

                      {/* Approve / Reject Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          className="text-sm text-primary hover:underline"
                          onClick={(e) => { e.stopPropagation(); onSelectCharger(charger); }}
                        >
                          View full charger details →
                        </button>
                        <div className="flex-1" />
                        {reviewStatuses[charger.id] !== "approved" && reviewStatuses[charger.id] !== "rejected" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmAction({ type: "reject", chargerId: charger.id, chargerName: charger.assetName });
                              }}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmAction({ type: "approve", chargerId: charger.id, chargerName: charger.assetName, charger });
                              }}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              Approve to Service Desk
                            </Button>
                          </>
                        )}
                        {reviewStatuses[charger.id] === "approved" && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-optimal font-medium flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" /> Approved ✓
                            </span>
                            {createdTicketIds[charger.id] && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate("/service-desk/tickets");
                                }}
                              >
                                <ExternalLink className="h-3 w-3" />
                                Ticket {createdTicketIds[charger.id]}
                              </Button>
                            )}
                          </div>
                        )}
                        {reviewStatuses[charger.id] === "rejected" && (
                          <span className="text-sm text-muted-foreground font-medium">No service required</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Flagged Chargers Table */}
      {openTickets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Flagged Chargers ({openTickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Charger ID</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Address</TableHead>
                    <TableHead className="text-xs text-right">Days Offline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openTickets.map(({ charger, ticketPriority, ageDays }) => {
                    const config = PRIORITY_CONFIG[ticketPriority];
                    return (
                      <TableRow
                        key={charger.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onSelectCharger(charger)}
                      >
                        <TableCell className="text-xs font-medium">{charger.assetName}</TableCell>
                        <TableCell className="text-xs">{charger.assetRecordType}</TableCell>
                        <TableCell>
                          <Badge className={`${config.bg} text-[10px]`}>{config.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{charger.status}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {[charger.city, charger.state].filter(Boolean).join(", ") || charger.address || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          <span className={ageDays > 90 ? "text-critical" : ageDays > 30 ? "text-degraded" : "text-foreground"}>
                            {ageDays}d
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "approve"
                ? "Approve to Service Desk"
                : "Reject — No Service Required"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "approve"
                ? `This will create a service ticket in Service Desk. The issue will be marked as approved. Continue?`
                : `Mark "${confirmAction?.chargerName}" as no service required?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.type === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
              onClick={() => {
                if (!confirmAction) return;
                const { type, chargerId, chargerName, charger } = confirmAction;
                setReviewStatuses(prev => ({ ...prev, [chargerId]: type === "approve" ? "approved" : "rejected" }));
                if (type === "approve" && charger && onApproveToServiceDesk) {
                  const ticketId = onApproveToServiceDesk(charger);
                  if (ticketId) {
                    setCreatedTicketIds(prev => ({ ...prev, [chargerId]: ticketId }));
                    toast.success(
                      `✓ Issue approved. Service ticket ${ticketId} created.`,
                      {
                        action: {
                          label: "View Ticket",
                          onClick: () => navigate("/service-desk/tickets"),
                        },
                        duration: 6000,
                      }
                    );
                  }
                } else if (type === "approve") {
                  toast.success(`Issue approved — service ticket created for ${chargerName}`);
                } else {
                  toast.info(`Issue rejected — no service for ${chargerName}`);
                }
                setConfirmAction(null);
              }}
            >
              {confirmAction?.type === "approve" ? "Approve & Create Ticket" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
