import { useMemo } from "react";
import { Search, MapPin, Calendar, AlertTriangle, Zap, Plug, Ticket } from "lucide-react";
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
  "AC | Level 2": "bg-chart-6 text-white",
  "DC | Level 3": "bg-secondary text-secondary-foreground",
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
              <span className="text-xs text-muted-foreground">DC | Level 3: {stats.dcL3Count}</span>
              <span className="text-xs text-muted-foreground">AC | Level 2: {stats.acL2Count}</span>
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
                      {charger.assetRecordType === "DC | Level 3" ? <Zap className="h-3 w-3 mr-1" /> : <Plug className="h-3 w-3 mr-1" />}
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
