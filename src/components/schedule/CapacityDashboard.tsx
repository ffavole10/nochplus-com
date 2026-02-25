import { useMemo, useState } from "react";
import { AssessmentCharger } from "@/types/assessment";
import { Campaign } from "@/types/campaign";
import { classifyTicketPriority } from "@/lib/ticketPriority";
import { getRegion, ALL_REGIONS, Region, REGION_COLORS } from "@/lib/regionMapping";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChevronDown, ChevronRight, AlertTriangle, Target, CalendarCheck,
  TrendingUp, Clock,
} from "lucide-react";
import { addDays, format } from "date-fns";

interface CapacityDashboardProps {
  chargers: AssessmentCharger[];
  campaign: Campaign | null;
  onSwitchToCluster?: (region?: Region) => void;
}

interface RegionRow {
  region: Region;
  total: number;
  p1: number;
  scheduled: number;
  unscheduled: number;
  trips: number;
  weeksRemaining: number;
  technicians: string[];
  status: "Not Started" | "In Progress" | "On Track" | "At Risk";
  tripDetails: { dates: string; techs: string[]; chargerCount: number }[];
}

export function CapacityDashboard({ chargers, campaign, onSwitchToCluster }: CapacityDashboardProps) {
  const [expandedRegion, setExpandedRegion] = useState<Region | null>(null);

  const regionData = useMemo(() => {
    // Group chargers by region
    const byRegion = new Map<Region, AssessmentCharger[]>();
    chargers.forEach(c => {
      const r = getRegion(c.city, c.state);
      if (!byRegion.has(r)) byRegion.set(r, []);
      byRegion.get(r)!.push(c);
    });

    // Extract trip info from campaign schedule
    const tripsByRegion = new Map<Region, { dates: string; techs: string[]; chargerCount: number }[]>();
    const scheduledByRegion = new Map<Region, number>();
    const techsByRegion = new Map<Region, Set<string>>();

    if (campaign) {
      // Build a simplified trip model from schedule days
      const regionBlocks = new Map<Region, Map<string, { startDate: string; endDate: string; techs: Set<string>; count: number }>>();

      campaign.schedule.forEach(day => {
        day.chargers.forEach(item => {
          const charger = chargers.find(c => c.id === item.chargerId);
          if (!charger) return;
          const r = getRegion(charger.city, charger.state);

          scheduledByRegion.set(r, (scheduledByRegion.get(r) || 0) + 1);

          if (!techsByRegion.has(r)) techsByRegion.set(r, new Set());
          if (item.assignedTo) techsByRegion.get(r)!.add(item.assignedTo);

          // Group consecutive days per region+tech into trips
          const techKey = item.assignedTo || "unassigned";
          if (!regionBlocks.has(r)) regionBlocks.set(r, new Map());
          const blocks = regionBlocks.get(r)!;
          if (!blocks.has(techKey)) {
            blocks.set(techKey, { startDate: day.date, endDate: day.date, techs: new Set([techKey]), count: 0 });
          }
          const block = blocks.get(techKey)!;
          block.endDate = day.date;
          block.count += 1;
        });
      });

      regionBlocks.forEach((blocks, r) => {
        const trips: { dates: string; techs: string[]; chargerCount: number }[] = [];
        blocks.forEach(block => {
          trips.push({
            dates: block.startDate === block.endDate
              ? block.startDate
              : `${block.startDate} → ${block.endDate}`,
            techs: Array.from(block.techs),
            chargerCount: block.count,
          });
        });
        tripsByRegion.set(r, trips);
      });
    }

    const rows: RegionRow[] = [];
    ALL_REGIONS.forEach(region => {
      const regionChargers = byRegion.get(region) || [];
      if (regionChargers.length === 0) return;

      const total = regionChargers.length;
      const p1 = regionChargers.filter(c => classifyTicketPriority(c) === "P1-Critical").length;
      const scheduled = scheduledByRegion.get(region) || 0;
      const unscheduled = total - scheduled;
      const trips = tripsByRegion.get(region)?.length || 0;
      const weeksRemaining = unscheduled > 0 ? Math.ceil((unscheduled * 2) / 40) : 0;
      const techs = Array.from(techsByRegion.get(region) || []);
      const tripDetails = tripsByRegion.get(region) || [];

      let status: RegionRow["status"] = "Not Started";
      if (scheduled > 0 && scheduled < total) {
        status = p1 > 10 && trips === 0 ? "At Risk" : "In Progress";
      } else if (scheduled >= total) {
        status = "On Track";
      } else if (p1 > 10) {
        status = "At Risk";
      }

      rows.push({ region, total, p1, scheduled, unscheduled, trips, weeksRemaining, technicians: techs, status, tripDetails });
    });

    return rows;
  }, [chargers, campaign]);

  // Summary stats
  const totalChargers = chargers.length;
  const totalScheduled = regionData.reduce((s, r) => s + r.scheduled, 0);
  const pctScheduled = totalChargers > 0 ? Math.round((totalScheduled / totalChargers) * 100) : 0;
  const totalTrips = regionData.reduce((s, r) => s + r.trips, 0);
  const totalWeeksRemaining = regionData.reduce((max, r) => Math.max(max, r.weeksRemaining), 0);
  const estCompletion = totalWeeksRemaining > 0
    ? format(addDays(new Date(), totalWeeksRemaining * 7), "MMM d, yyyy")
    : "Complete";

  // Escalation alerts
  const alerts = regionData.filter(r => r.p1 > 0 && r.trips === 0);

  const statusConfig: Record<RegionRow["status"], { color: string; bg: string }> = {
    "Not Started": { color: "text-muted-foreground", bg: "bg-muted" },
    "In Progress": { color: "text-high", bg: "bg-high/10" },
    "On Track": { color: "text-low", bg: "bg-low/10" },
    "At Risk": { color: "text-critical", bg: "bg-critical/10" },
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalChargers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Chargers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="3"
                    strokeDasharray={`${pctScheduled * 0.9425} 94.25`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                  {pctScheduled}%
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalScheduled.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalTrips}</p>
                <p className="text-xs text-muted-foreground">Trips Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-low/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-low" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{estCompletion}</p>
                <p className="text-xs text-muted-foreground">Est. Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Capacity Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">P1 Critical</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Unscheduled</TableHead>
                <TableHead className="text-right">Trips</TableHead>
                <TableHead className="text-right">Weeks Left</TableHead>
                <TableHead>Technicians</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regionData.map(row => {
                const isExpanded = expandedRegion === row.region;
                const scheduledPct = row.total > 0 ? Math.round((row.scheduled / row.total) * 100) : 0;
                const sc = statusConfig[row.status];

                return (
                  <>
                    <TableRow
                      key={row.region}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedRegion(isExpanded ? null : row.region)}
                    >
                      <TableCell className="w-8 pr-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: REGION_COLORS[row.region] }} />
                          <span className="font-medium text-foreground">{row.region}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{row.total}</TableCell>
                      <TableCell className="text-right">
                        <span className={row.p1 > 0 ? "text-critical font-bold" : "text-muted-foreground"}>
                          {row.p1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={scheduledPct} className="h-2 w-20" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {row.scheduled} ({scheduledPct}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{row.unscheduled}</TableCell>
                      <TableCell className="text-right">{row.trips}</TableCell>
                      <TableCell className="text-right">{row.weeksRemaining}</TableCell>
                      <TableCell>
                        <div className="flex -space-x-1.5">
                          {row.technicians.slice(0, 3).map((t, i) => (
                            <Avatar key={i} className="h-6 w-6 border-2 border-card">
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                {t.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {row.technicians.length > 3 && (
                            <Avatar className="h-6 w-6 border-2 border-card">
                              <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                                +{row.technicians.length - 3}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {row.technicians.length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${sc.bg} ${sc.color} border-0 text-[10px]`}>
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow key={`${row.region}-detail`}>
                        <TableCell colSpan={10} className="bg-muted/30 p-4">
                          {row.tripDetails.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Confirmed Trips — {row.region}
                              </p>
                              {row.tripDetails.map((trip, i) => (
                                <div key={i} className="flex items-center gap-4 bg-card rounded-md px-3 py-2 text-sm border border-border">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-foreground font-medium">{trip.dates}</span>
                                  <span className="text-muted-foreground">·</span>
                                  <span className="text-muted-foreground">{trip.techs.join(", ")}</span>
                                  <span className="text-muted-foreground">·</span>
                                  <span className="text-foreground">{trip.chargerCount} chargers</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No trips scheduled for this region yet.</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Priority Escalation Alerts */}
      {alerts.length > 0 && (
        <Card className="border-critical/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-critical" />
              <h3 className="font-semibold text-foreground">Attention Required</h3>
              <Badge variant="destructive" className="text-[10px]">{alerts.length}</Badge>
            </div>
            <div className="space-y-3">
              {alerts.map(a => {
                const oldestP1 = chargers
                  .filter(c => getRegion(c.city, c.state) === a.region && c.priorityLevel === "Critical" && c.ticketCreatedDate)
                  .reduce((oldest, c) => {
                    const d = new Date(c.ticketCreatedDate!).getTime();
                    return d < oldest ? d : oldest;
                  }, Date.now());
                const daysSince = Math.floor((Date.now() - oldestP1) / (1000 * 60 * 60 * 24));

                return (
                  <div key={a.region} className="flex items-center justify-between bg-critical/5 rounded-lg px-4 py-3 border border-critical/20">
                    <div className="flex items-center gap-4">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: REGION_COLORS[a.region] }} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.region}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.p1} P1 Critical · {daysSince > 0 ? `${daysSince}d since oldest` : "Recent"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-critical/40 text-critical hover:bg-critical/10"
                      onClick={() => onSwitchToCluster?.(a.region)}
                    >
                      Schedule Now
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
