import { useMemo, useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Ticket, AlertTriangle, Clock, CheckCircle, MapPin, Wrench, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { AssessmentCharger, TicketPriority } from "@/types/assessment";
import { differenceInDays } from "date-fns";
import { useSWIMatching } from "@/hooks/useSWIMatching";
import { SWIAttachment } from "@/components/assessment/SWIAttachment";
import { DispatchButton, EstimateStatus } from "@/components/tickets/DispatchButton";

interface TicketsViewProps {
  chargers: AssessmentCharger[];
  onSelectCharger: (charger: AssessmentCharger) => void;
}

const PRIORITY_CONFIG: Record<TicketPriority, { color: string; bg: string; label: string }> = {
  "P1-Critical": { color: "text-critical", bg: "bg-critical text-critical-foreground", label: "P1 — Critical" },
  "P2-High": { color: "text-orange-500", bg: "bg-degraded text-degraded-foreground", label: "P2 — High" },
  "P3-Medium": { color: "text-yellow-500", bg: "bg-yellow-500 text-white", label: "P3 — Medium" },
  "P4-Low": { color: "text-optimal", bg: "bg-optimal text-optimal-foreground", label: "P4 — Low" },
};

function classifyTicketPriority(charger: AssessmentCharger): TicketPriority {
  const { priorityLevel, hasOpenTicket, ticketCreatedDate, assetRecordType } = charger;
  const ageDays = ticketCreatedDate ? differenceInDays(new Date(), new Date(ticketCreatedDate)) : 0;

  // P1: Critical charger priority OR open ticket > 30 days on DCFC
  if (priorityLevel === "Critical" || (hasOpenTicket && ageDays > 30 && assetRecordType === "DCFC")) {
    return "P1-Critical";
  }
  // P2: High priority OR open ticket > 14 days
  if (priorityLevel === "High" || (hasOpenTicket && ageDays > 14)) {
    return "P2-High";
  }
  // P3: Medium priority OR open ticket > 7 days
  if (priorityLevel === "Medium" || (hasOpenTicket && ageDays > 7)) {
    return "P3-Medium";
  }
  return "P4-Low";
}

function generateRecommendation(charger: AssessmentCharger, priority: TicketPriority, ageDays: number): string {
  const subject = charger.ticketSubject?.toLowerCase() || "";
  const group = charger.ticketGroup?.toLowerCase() || "";
  const parts: string[] = [];

  // Subject-based recommendations
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

  // Priority-based urgency
  if (priority === "P1-Critical") {
    parts.push("URGENT: Escalate immediately. Assign senior technician for same-day dispatch.");
  } else if (priority === "P2-High") {
    parts.push("Schedule priority service within 48 hours. Notify account manager.");
  }

  // Age-based recommendation
  if (ageDays > 30) {
    parts.push(`Ticket has been open for ${ageDays} days — consider escalation to engineering team.`);
  } else if (ageDays > 14) {
    parts.push(`Ticket aging at ${ageDays} days — follow up with assigned group.`);
  }

  // Group-based
  if (group && group !== "unknown") {
    parts.push(`Currently assigned to: ${charger.ticketGroup}. Verify group has bandwidth.`);
  }

  return parts.join(" ");
}

export function TicketsView({ chargers, onSelectCharger }: TicketsViewProps) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [swiFilter, setSwiFilter] = useState<string>("all");
  const [estimateFilter, setEstimateFilter] = useState<string>("all");
  const [dispatchFilter, setDispatchFilter] = useState<string>("all");
  const [amFilter, setAmFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [estimateStatuses, setEstimateStatuses] = useState<Record<string, "none" | "draft" | "sent">>(() => {
    try { const s = localStorage.getItem("ticket-estimate-statuses"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [accountManagers, setAccountManagers] = useState<Record<string, string>>(() => {
    try { const s = localStorage.getItem("ticket-account-managers"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { matchTicket, matchBatch, getSWIMatch, isMatching, getError, clearMatch, batchProgress } = useSWIMatching();

  useEffect(() => {
    localStorage.setItem("ticket-estimate-statuses", JSON.stringify(estimateStatuses));
  }, [estimateStatuses]);

  useEffect(() => {
    localStorage.setItem("ticket-account-managers", JSON.stringify(accountManagers));
  }, [accountManagers]);

  // Helper: extract city/state from address if not set
  const enrichLocation = useCallback((c: AssessmentCharger) => {
    if (c.city && c.state) return c;
    // Try parsing from address: "123 Main St, Jacksonville, FL 32221"
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
      .filter(c => c.ticketId || c.ticketCreatedDate)
      .map(c => {
        const enriched = enrichLocation(c);
        const priority = classifyTicketPriority(enriched);
        const ageDays = enriched.ticketCreatedDate ? differenceInDays(new Date(), new Date(enriched.ticketCreatedDate)) : 0;
        return {
          charger: enriched,
          ticketPriority: priority,
          ageDays,
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
    else if (statusFilter === "in_progress") result = result.filter(t => {
      const hasSWI = !!getSWIMatch(t.charger.id);
      const hasEst = (estimateStatuses[t.charger.id] || "none") !== "none";
      return t.charger.hasOpenTicket && (hasSWI || hasEst);
    });
    else if (statusFilter === "solved") result = result.filter(t => !!t.charger.ticketSolvedDate);
    if (priorityFilter !== "all") result = result.filter(t => t.ticketPriority === priorityFilter);
    if (typeFilter !== "all") result = result.filter(t => t.charger.assetRecordType === typeFilter);
    if (stateFilter !== "all") result = result.filter(t => t.charger.state === stateFilter);
    if (swiFilter !== "all") {
      result = result.filter(t => {
        const hasSWI = !!getSWIMatch(t.charger.id);
        return swiFilter === "matched" ? hasSWI : !hasSWI;
      });
    }
    if (estimateFilter !== "all") {
      result = result.filter(t => {
        const estStatus = estimateStatuses[t.charger.id] || "none";
        return estimateFilter === estStatus;
      });
    }
    if (dispatchFilter !== "all") {
      // Currently dispatch is always false, but filter infrastructure is ready
      result = result.filter(t => {
        const dispatched = false; // placeholder
        return dispatchFilter === "dispatched" ? dispatched : !dispatched;
      });
    }
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
    return result;
  }, [ticketChargers, search, priorityFilter, statusFilter, stateFilter, typeFilter, swiFilter, estimateFilter, dispatchFilter, amFilter, getSWIMatch, estimateStatuses, accountManagers]);

  const stats = useMemo(() => {
    const open = ticketChargers.filter(t => t.charger.hasOpenTicket);
    const inProgress = open.filter(t => {
      const hasSWI = !!getSWIMatch(t.charger.id);
      const hasEst = (estimateStatuses[t.charger.id] || "none") !== "none";
      return hasSWI || hasEst;
    });
    return {
      total: ticketChargers.length,
      open: open.length,
      inProgress: inProgress.length,
      solved: ticketChargers.length - open.length,
      p1: open.filter(t => t.ticketPriority === "P1-Critical").length,
      p2: open.filter(t => t.ticketPriority === "P2-High").length,
      p3: open.filter(t => t.ticketPriority === "P3-Medium").length,
      p4: open.filter(t => t.ticketPriority === "P4-Low").length,
    };
  }, [ticketChargers, getSWIMatch, estimateStatuses]);

  return (
    <div className="space-y-6 p-6">
      {/* Search & Match All row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <button
          onClick={() => matchBatch(filtered.map(t => t.charger))}
          disabled={batchProgress.isRunning}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-md font-medium flex items-center gap-2 text-sm ml-auto"
        >
          {batchProgress.isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              <span>Matching {batchProgress.current}/{batchProgress.total}...</span>
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              <span>Match All SWIs</span>
            </>
          )}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="metric-card border-l-4 border-l-critical">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Open Tickets</p>
            <p className="text-2xl font-bold text-critical">{stats.open}</p>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-secondary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-secondary">{stats.inProgress}</p>
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
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="solved">Solved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="P1-Critical">P1 — Critical</SelectItem>
            <SelectItem value="P2-High">P2 — High</SelectItem>
            <SelectItem value="P3-Medium">P3 — Medium</SelectItem>
            <SelectItem value="P4-Low">P4 — Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="DCFC">DCFC</SelectItem>
            <SelectItem value="L2">L2</SelectItem>
            <SelectItem value="HPCD">HPCD</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All States</SelectItem>
            {uniqueStates.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={swiFilter} onValueChange={setSwiFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="SWI" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All SWI</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="unmatched">Unmatched</SelectItem>
          </SelectContent>
        </Select>
        <Select value={estimateFilter} onValueChange={setEstimateFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estimate" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All Estimates</SelectItem>
            <SelectItem value="none">No Estimate</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dispatchFilter} onValueChange={setDispatchFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Dispatch" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All Dispatch</SelectItem>
            <SelectItem value="dispatched">Dispatched</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={amFilter} onValueChange={setAmFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Acct Manager" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All Managers</SelectItem>
            {uniqueAMs.map(am => (
              <SelectItem key={am} value={am}>{am}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ticket List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No tickets found</p>
          <p className="text-sm">Upload data with ticket columns or adjust filters.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(({ charger, ticketPriority, ageDays, recommendation }) => {
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
                          <Badge className="bg-critical text-critical-foreground animate-pulse gap-1">
                            <AlertTriangle className="h-3 w-3" /> Open
                          </Badge>
                        ) : (
                          <Badge className="bg-optimal text-optimal-foreground gap-1">
                            <CheckCircle className="h-3 w-3" /> Solved
                          </Badge>
                        )}
                        {charger.ticketId && (
                          <Badge variant="outline" className="text-xs">#{charger.ticketId}</Badge>
                        )}
                        {/* Milestone tracker */}
                        <div className="flex items-center gap-1 ml-1">
                          {(() => {
                            const hasSWI = !!getSWIMatch(charger.id);
                            const estStatus = estimateStatuses[charger.id] || "none";
                            const hasEstimate = estStatus === "sent";
                            const hasDispatch = false;
                            const milestones = [
                              { label: "S", done: hasSWI },
                              { label: "E", done: hasEstimate },
                              { label: "D", done: hasDispatch },
                            ];
                            return milestones.map((m) => (
                              <span
                                key={m.label}
                                title={m.label === "S" ? "SWI" : m.label === "E" ? "Estimate" : "Dispatch"}
                                className={`inline-flex items-center justify-center rounded-full text-[9px] font-bold w-5 h-5 border ${
                                  m.done
                                    ? "bg-optimal text-optimal-foreground border-optimal"
                                    : "bg-muted text-muted-foreground border-border"
                                }`}
                              >
                                {m.label}
                              </span>
                            ));
                          })()}
                          {accountManagers[charger.id] && (
                            <span className="text-xs text-muted-foreground font-medium ml-1 truncate max-w-[120px]">
                              {accountManagers[charger.id]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        {charger.ticketSubject && <span className="truncate max-w-xs">{charger.ticketSubject}</span>}
                        <span className="flex items-center gap-1">
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
                      <div className="mt-3">
                        <SWIAttachment
                          ticket={charger}
                          swiMatch={getSWIMatch(charger.id)}
                          isMatching={isMatching(charger.id)}
                          error={getError(charger.id)}
                          onMatch={matchTicket}
                          onClear={clearMatch}
                        />
                        {(() => {
                          const swiMatch = getSWIMatch(charger.id);
                          return swiMatch && swiMatch.confidence >= 70 ? (
                            <DispatchButton
                              ticket={charger}
                              swiMatch={swiMatch}
                              onEstimateStatusChange={(s) => setEstimateStatuses(prev => ({ ...prev, [charger.id]: s }))}
                              onAccountManagerChange={(name) => setAccountManagers(prev => ({ ...prev, [charger.id]: name }))}
                            />
                          ) : null;
                        })()}
                      </div>
                      <button
                        className="text-sm text-primary hover:underline"
                        onClick={(e) => { e.stopPropagation(); onSelectCharger(charger); }}
                      >
                        View full charger details →
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
