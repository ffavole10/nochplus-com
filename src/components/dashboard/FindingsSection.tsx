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
  const [highOpen, setHighOpen] = useState(true);
  const [mediumOpen, setMediumOpen] = useState(false);
  const [lowOpen, setLowOpen] = useState(false);

  const cities = [...new Set(chargers.map((c) => `${c.city}, ${c.state}`))].sort();

  const filteredChargers = chargers.filter((c) => {
    if (filterCity === "all") return true;
    return `${c.city}, ${c.state}` === filterCity;
  });

  const sortedChargers = [...filteredChargers].sort((a, b) => {
    switch (sortBy) {
      case "severity":
        const severityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        return (severityOrder[a.status] ?? 4) - (severityOrder[b.status] ?? 4);
      case "date":
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      case "location":
        return `${a.city}, ${a.state}`.localeCompare(`${b.city}, ${b.state}`);
      default:
        return 0;
    }
  });

  const critical = sortedChargers.filter((c) => c.status === "Critical");
  const high = sortedChargers.filter((c) => c.status === "High");
  const medium = sortedChargers.filter((c) => c.status === "Medium");
  const low = sortedChargers.filter((c) => c.status === "Low");

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

      {/* High Section */}
      <Collapsible open={highOpen} onOpenChange={setHighOpen} className="mt-4">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 bg-high/10 rounded-t-xl border-2 border-high/30 hover:bg-high/15 transition-colors">
            <div className="flex items-center gap-3">
              {highOpen ? <ChevronDown className="w-5 h-5 text-high" /> : <ChevronRight className="w-5 h-5 text-high" />}
              <span className="w-3 h-3 rounded-full bg-high"></span>
              <h3 className="font-semibold text-high">High ({high.length})</h3>
            </div>
            <span className="text-sm text-high font-medium">Schedule repair</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-2 border-t-0 border-high/30 rounded-b-xl p-4 space-y-3 bg-high/5">
            {high.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No high priority chargers</p>
            ) : (
              high.map((charger) => (
                <FindingsCard key={charger.charger_id} charger={charger} onShowOnMap={onShowOnMap} />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Medium Section */}
      <Collapsible open={mediumOpen} onOpenChange={setMediumOpen} className="mt-4">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 bg-medium/10 rounded-t-xl border-2 border-medium/30 hover:bg-medium/15 transition-colors">
            <div className="flex items-center gap-3">
              {mediumOpen ? <ChevronDown className="w-5 h-5 text-medium" /> : <ChevronRight className="w-5 h-5 text-medium" />}
              <span className="w-3 h-3 rounded-full bg-medium"></span>
              <h3 className="font-semibold text-medium">Medium ({medium.length})</h3>
            </div>
            <span className="text-sm text-medium font-medium">Monitor and schedule</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-2 border-t-0 border-medium/30 rounded-b-xl p-4 space-y-3 bg-medium/5">
            {medium.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No medium priority chargers</p>
            ) : (
              medium.map((charger) => (
                <FindingsCard key={charger.charger_id} charger={charger} onShowOnMap={onShowOnMap} />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Low Section */}
      <Collapsible open={lowOpen} onOpenChange={setLowOpen} className="mt-4">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 bg-low/10 rounded-t-xl border-2 border-low/30 hover:bg-low/15 transition-colors">
            <div className="flex items-center gap-3">
              {lowOpen ? <ChevronDown className="w-5 h-5 text-low" /> : <ChevronRight className="w-5 h-5 text-low" />}
              <span className="w-3 h-3 rounded-full bg-low"></span>
              <h3 className="font-semibold text-low">Low ({low.length})</h3>
            </div>
            <span className="text-sm text-low font-medium">Operating normally</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-2 border-t-0 border-low/30 rounded-b-xl p-4 space-y-3 bg-low/5 max-h-96 overflow-y-auto custom-scrollbar">
            {low.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No low priority chargers in selection</p>
            ) : (
              low.slice(0, 10).map((charger) => (
                <FindingsCard key={charger.charger_id} charger={charger} onShowOnMap={onShowOnMap} />
              ))
            )}
            {low.length > 10 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                + {low.length - 10} more low priority chargers
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
