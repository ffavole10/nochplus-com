import { useState } from "react";
import { getSitePerformance, Charger } from "@/data/chargerData";
import { ArrowUpDown, Download, Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SitePerformanceTableProps {
  chargers: Charger[];
  onSiteClick: (siteName: string) => void;
}

type SortField = "siteName" | "healthScore" | "critical" | "totalChargers";
type SortDir = "asc" | "desc";

export function SitePerformanceTable({ chargers, onSiteClick }: SitePerformanceTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("healthScore");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [stateRollup, setStateRollup] = useState(false);

  const siteData = getSitePerformance(chargers);

  // State rollup aggregation
  const stateData = stateRollup
    ? Object.values(
        siteData.reduce((acc, site) => {
          const key = site.state;
          if (!acc[key]) {
            acc[key] = {
              siteName: site.state,
              city: "",
              state: site.state,
              totalChargers: 0,
              low: 0,
              medium: 0,
              high: 0,
              critical: 0,
              optimal: 0,
              degraded: 0,
              healthScore: 0,
              lastServiced: site.lastServiced,
              primaryIssue: site.primaryIssue,
            };
          }
          acc[key].totalChargers += site.totalChargers;
          acc[key].low += site.low;
          acc[key].medium += site.medium;
          acc[key].high += site.high;
          acc[key].optimal += site.optimal;
          acc[key].degraded += site.degraded;
          acc[key].critical += site.critical;
          return acc;
        }, {} as Record<string, typeof siteData[0]>)
      ).map((s) => ({
        ...s,
        healthScore: Math.round((s.optimal / s.totalChargers) * 100),
      }))
    : siteData;

  const filteredData = stateData.filter((site) =>
    site.siteName.toLowerCase().includes(search.toLowerCase()) ||
    site.city.toLowerCase().includes(search.toLowerCase()) ||
    site.state.toLowerCase().includes(search.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "siteName":
        comparison = a.siteName.localeCompare(b.siteName);
        break;
      case "healthScore":
        comparison = a.healthScore - b.healthScore;
        break;
      case "critical":
        comparison = a.critical - b.critical;
        break;
      case "totalChargers":
        comparison = a.totalChargers - b.totalChargers;
        break;
    }
    return sortDir === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 85) return "text-optimal bg-optimal/10";
    if (score >= 70) return "text-degraded bg-degraded/10";
    return "text-critical bg-critical/10";
  };

  return (
    <div className="dashboard-section">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <h2 className="dashboard-section-title">
          <Building2 className="w-5 h-5" />
          Site Performance
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search sites..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="state-rollup"
              checked={stateRollup}
              onCheckedChange={setStateRollup}
            />
            <Label htmlFor="state-rollup" className="text-sm">
              State Rollup
            </Label>
          </div>
          <Button variant="outline" size="icon">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="metric-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th
                  className="cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("siteName")}
                >
                  <div className="flex items-center gap-2">
                    {stateRollup ? "State" : "Site Name"}
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                {!stateRollup && <th>Location</th>}
                <th
                  className="cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("totalChargers")}
                >
                  <div className="flex items-center gap-2">
                    Chargers
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th>Status Breakdown</th>
                <th
                  className="cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("healthScore")}
                >
                  <div className="flex items-center gap-2">
                    Health
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                {!stateRollup && <th>Primary Issue</th>}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((site, idx) => (
                <tr
                  key={site.siteName + idx}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSiteClick(site.siteName)}
                >
                  <td className="font-medium">{site.siteName}</td>
                  {!stateRollup && (
                    <td className="text-muted-foreground">
                      {site.city}, {site.state}
                    </td>
                  )}
                  <td>{site.totalChargers}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-optimal"></span>
                        <span className="text-xs">{site.optimal}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-degraded"></span>
                        <span className="text-xs">{site.degraded}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-critical"></span>
                        <span className="text-xs">{site.critical}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        getHealthColor(site.healthScore)
                      )}
                    >
                      {site.healthScore}%
                    </span>
                  </td>
                  {!stateRollup && (
                    <td className="text-sm text-muted-foreground">
                      {site.primaryIssue}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedData.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No sites match your search
          </div>
        )}
      </div>
    </div>
  );
}
