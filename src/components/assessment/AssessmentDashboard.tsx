import { useMemo } from "react";
import { Search, Filter, MapPin, Calendar, AlertTriangle, Zap, Plug, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssessmentCharger, PriorityLevel, Phase, ChargerType } from "@/types/assessment";
import { getAssessmentStats, getTicketStats, getPriorityColor } from "@/lib/assessmentParser";

interface AssessmentDashboardProps {
  chargers: AssessmentCharger[];
  onSelectCharger: (charger: AssessmentCharger) => void;
  stateOptions?: string[];
  selectedState?: string;
  onStateChange?: (state: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  phaseFilter: string;
  onPhaseFilterChange: (value: string) => void;
  ticketFilter: string;
  onTicketFilterChange: (value: string) => void;
}

const TYPE_COLORS: Record<ChargerType, string> = {
  DCFC: "bg-secondary text-secondary-foreground",
  L2: "bg-chart-6 text-white",
  HPCD: "bg-chart-1 text-white",
};

const PRIORITY_BADGE: Record<PriorityLevel, string> = {
  Critical: "bg-critical text-critical-foreground",
  High: "bg-degraded text-degraded-foreground",
  Medium: "bg-yellow-500 text-white",
  Low: "bg-optimal text-optimal-foreground",
};

export function AssessmentDashboard({
  chargers,
  onSelectCharger,
  stateOptions = [],
  selectedState,
  onStateChange,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  phaseFilter,
  onPhaseFilterChange,
  ticketFilter,
  onTicketFilterChange,
}: AssessmentDashboardProps) {
  const stats = useMemo(() => getAssessmentStats(chargers), [chargers]);
  const ticketStats = useMemo(() => getTicketStats(chargers), [chargers]);

  return (
    <div className="space-y-6 p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="metric-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Chargers</p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            <div className="flex gap-2 mt-1">
              <span className="text-xs text-muted-foreground">DCFC: {stats.dcfcCount}</span>
              <span className="text-xs text-muted-foreground">L2: {stats.l2Count}</span>
              <span className="text-xs text-muted-foreground">HPCD: {stats.hpcdCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-critical">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">High Priority</p>
            <p className="text-3xl font-bold text-critical">{stats.critical + stats.high}</p>
            <p className="text-xs text-muted-foreground">{stats.critical} Critical, {stats.high} High</p>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-secondary">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-3xl font-bold text-secondary">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="metric-card border-l-4 border-l-optimal">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Completion</p>
            <p className="text-3xl font-bold text-optimal">{stats.completionPercent}%</p>
            <p className="text-xs text-muted-foreground">{stats.completed} of {stats.total} complete</p>
          </CardContent>
        </Card>
        {/* Ticket KPI */}
        <Card className={`metric-card border-l-4 ${ticketStats.openTickets > 0 ? "border-l-critical bg-critical/5" : "border-l-muted"}`}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Ticket className="h-3.5 w-3.5" /> Tickets
            </p>
            <p className={`text-3xl font-bold ${ticketStats.openTickets > 0 ? "text-critical" : "text-foreground"}`}>
              {ticketStats.openTickets}
            </p>
            <p className="text-xs text-muted-foreground">
              Open of {ticketStats.totalWithTickets} total · {ticketStats.solvedTickets} solved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chargers..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        {stateOptions.length > 0 && onStateChange && (
          <Select value={selectedState || "all"} onValueChange={(v) => onStateChange(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All States</SelectItem>
              {stateOptions.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="DCFC">DCFC</SelectItem>
            <SelectItem value="L2">L2</SelectItem>
            <SelectItem value="HPCD">HPCD</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={onPhaseFilterChange}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Phase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            <SelectItem value="Needs Assessment">Needs Assessment</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Deferred">Deferred</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ticketFilter} onValueChange={onTicketFilterChange}>
          <SelectTrigger className="w-[160px]"><Ticket className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Tickets" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open Tickets</SelectItem>
            <SelectItem value="solved">Solved Tickets</SelectItem>
            <SelectItem value="any">Has Ticket</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {chargers.length} results
        </span>
      </div>

      {/* Charger Cards */}
      {chargers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No chargers match your filters</p>
          <p className="text-sm">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {chargers.slice(0, 100).map(charger => (
            <Card
              key={charger.id}
              className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group"
              style={{ borderLeft: `4px solid ${getPriorityColor(charger.priorityLevel)}` }}
              onClick={() => onSelectCharger(charger)}
            >
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{charger.assetName}</p>
                    <Badge className={TYPE_COLORS[charger.assetRecordType]} variant="secondary">
                      {charger.assetRecordType === "DCFC" ? <Zap className="h-3 w-3 mr-1" /> : <Plug className="h-3 w-3 mr-1" />}
                      {charger.assetRecordType}
                    </Badge>
                    <Badge className={PRIORITY_BADGE[charger.priorityLevel]} variant="secondary">
                      {charger.priorityLevel} ({charger.priorityScore})
                    </Badge>
                    <Badge variant="outline">{charger.status}</Badge>
                    {charger.hasOpenTicket && (
                      <Badge className="bg-critical text-critical-foreground animate-pulse gap-1">
                        <Ticket className="h-3 w-3" /> Open Ticket
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {charger.address}, {charger.city}, {charger.state} {charger.zip}
                    </span>
                    {charger.inServiceDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        In-Service: {charger.inServiceDate}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className="text-xs">{charger.phase}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {chargers.length > 100 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Showing first 100 of {chargers.length} chargers. Use filters to narrow results.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
