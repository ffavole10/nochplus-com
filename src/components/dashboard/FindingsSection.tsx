import { useState } from "react";
import { ChevronDown, ChevronRight, Filter, Download } from "lucide-react";
import { Charger } from "@/data/chargerData";
import { FindingsCard } from "./FindingsCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface FindingsSectionProps {
  chargers: Charger[];
  onShowOnMap: (charger: Charger) => void;
  criticalRef?: React.RefObject<HTMLDivElement>;
}

type SortOption = "severity" | "date" | "location";

export function FindingsSection({ chargers, onShowOnMap, criticalRef }: FindingsSectionProps) {
  const [sortBy, setSortBy] = useState<SortOption>("severity");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [criticalOpen, setCriticalOpen] = useState(true);
  const [degradedOpen, setDegradedOpen] = useState(true);
  const [optimalOpen, setOptimalOpen] = useState(false);

  const cities = [...new Set(chargers.map((c) => `${c.city}, ${c.state}`))].sort();

  const filteredChargers = chargers.filter((c) => {
    if (filterCity === "all") return true;
    return `${c.city}, ${c.state}` === filterCity;
  });

  const sortedChargers = [...filteredChargers].sort((a, b) => {
    switch (sortBy) {
      case "severity":
        const severityOrder = { Critical: 0, Degraded: 1, Optimal: 2 };
        return severityOrder[a.status] - severityOrder[b.status];
      case "date":
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      case "location":
        return `${a.city}, ${a.state}`.localeCompare(`${b.city}, ${b.state}`);
      default:
        return 0;
    }
  });

  const critical = sortedChargers.filter((c) => c.status === "Critical");
  const degraded = sortedChargers.filter((c) => c.status === "Degraded");
  const optimal = sortedChargers.filter((c) => c.status === "Optimal");

  return (
    <div className="dashboard-section">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="dashboard-section-title">
          <Filter className="w-5 h-5" />
          Findings by Status
        </h2>
        <div className="flex flex-wrap gap-3">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="severity">Severity</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="location">Location</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Critical Section */}
      <div ref={criticalRef}>
        <Collapsible open={criticalOpen} onOpenChange={setCriticalOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 bg-critical/10 rounded-t-xl border-2 border-critical/30 hover:bg-critical/15 transition-colors">
              <div className="flex items-center gap-3">
                {criticalOpen ? (
                  <ChevronDown className="w-5 h-5 text-critical" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-critical" />
                )}
                <span className="w-3 h-3 rounded-full bg-critical animate-pulse"></span>
                <h3 className="font-semibold text-critical">
                  Critical Issues ({critical.length})
                </h3>
              </div>
              <span className="text-sm text-critical font-medium">
                Immediate attention required
              </span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-2 border-t-0 border-critical/30 rounded-b-xl p-4 space-y-3 bg-critical/5">
              {critical.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No critical issues found
                </p>
              ) : (
                critical.map((charger) => (
                  <FindingsCard
                    key={charger.charger_id}
                    charger={charger}
                    onShowOnMap={onShowOnMap}
                  />
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Degraded Section */}
      <Collapsible open={degradedOpen} onOpenChange={setDegradedOpen} className="mt-4">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 bg-degraded/10 rounded-t-xl border-2 border-degraded/30 hover:bg-degraded/15 transition-colors">
            <div className="flex items-center gap-3">
              {degradedOpen ? (
                <ChevronDown className="w-5 h-5 text-degraded" />
              ) : (
                <ChevronRight className="w-5 h-5 text-degraded" />
              )}
              <span className="w-3 h-3 rounded-full bg-degraded"></span>
              <h3 className="font-semibold text-degraded">
                Degraded ({degraded.length})
              </h3>
            </div>
            <span className="text-sm text-degraded font-medium">
              Monitor and schedule
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-2 border-t-0 border-degraded/30 rounded-b-xl p-4 space-y-3 bg-degraded/5">
            {degraded.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No degraded chargers
              </p>
            ) : (
              degraded.map((charger) => (
                <FindingsCard
                  key={charger.charger_id}
                  charger={charger}
                  onShowOnMap={onShowOnMap}
                />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Optimal Section */}
      <Collapsible open={optimalOpen} onOpenChange={setOptimalOpen} className="mt-4">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 bg-optimal/10 rounded-t-xl border-2 border-optimal/30 hover:bg-optimal/15 transition-colors">
            <div className="flex items-center gap-3">
              {optimalOpen ? (
                <ChevronDown className="w-5 h-5 text-optimal" />
              ) : (
                <ChevronRight className="w-5 h-5 text-optimal" />
              )}
              <span className="w-3 h-3 rounded-full bg-optimal"></span>
              <h3 className="font-semibold text-optimal">
                Optimal ({optimal.length})
              </h3>
            </div>
            <span className="text-sm text-optimal font-medium">
              Operating normally
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-2 border-t-0 border-optimal/30 rounded-b-xl p-4 space-y-3 bg-optimal/5 max-h-96 overflow-y-auto custom-scrollbar">
            {optimal.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No optimal chargers in selection
              </p>
            ) : (
              optimal.slice(0, 10).map((charger) => (
                <FindingsCard
                  key={charger.charger_id}
                  charger={charger}
                  onShowOnMap={onShowOnMap}
                />
              ))
            )}
            {optimal.length > 10 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                + {optimal.length - 10} more optimal chargers
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
