import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Filter,
  MapPin,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Calendar,
  Building,
  Wrench,
  ChevronDown,
  ChevronRight,
  X,
  FolderOpen,
  Rocket,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { allChargers, Charger } from "@/data/chargerData";
import { cn } from "@/lib/utils";
import nochLogo from "@/assets/noch-logo-white.png";

interface DashboardSidebarProps {
  onFiltersChange: (chargers: Charger[]) => void;
  filteredCount: number;
  totalCount: number;
  searchQuery: string;
  onSearchChange?: (query: string) => void;
}

type StatusFilter = "Critical" | "Degraded" | "Optimal";
type ComponentFilter = string;

export function DashboardSidebar({
  onFiltersChange,
  filteredCount,
  totalCount,
  searchQuery,
  onSearchChange,
}: DashboardSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([
    "Critical",
    "Degraded",
    "Optimal",
  ]);
  const [cityFilters, setCityFilters] = useState<string[]>([]);
  const [componentFilters, setComponentFilters] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [statusOpen, setStatusOpen] = useState(true);
  const [locationOpen, setLocationOpen] = useState(true);
  const [componentOpen, setComponentOpen] = useState(true);
  const [dateOpen, setDateOpen] = useState(false);

  // Get unique cities and components
  const cities = [...new Set(allChargers.map((c) => `${c.city}, ${c.state}`))].sort();
  const components = [
    "Screen/Display",
    "Cable/Connector",
    "RFID",
    "Cloud Board",
    "Power Supply",
    "Payment System",
  ];

  const applyFilters = () => {
    let filtered = [...allChargers];

    // Status filter
    if (statusFilters.length > 0 && statusFilters.length < 3) {
      filtered = filtered.filter((c) => statusFilters.includes(c.status as StatusFilter));
    }

    // City filter
    if (cityFilters.length > 0) {
      filtered = filtered.filter((c) =>
        cityFilters.includes(`${c.city}, ${c.state}`)
      );
    }

    // Component filter
    if (componentFilters.length > 0) {
      filtered = filtered.filter((c) =>
        c.issues?.some((issue) =>
          componentFilters.some((comp) =>
            issue.toLowerCase().includes(comp.toLowerCase().split("/")[0])
          )
        )
      );
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.charger_id.toLowerCase().includes(query) ||
          c.site_name.toLowerCase().includes(query) ||
          c.address.toLowerCase().includes(query)
      );
    }

    // Date filter
    if (dateFrom || dateTo) {
      filtered = filtered.filter((c) => {
        const chargerDate = new Date(c.start_date);
        if (dateFrom && chargerDate < new Date(dateFrom)) return false;
        if (dateTo && chargerDate > new Date(dateTo)) return false;
        return true;
      });
    }

    onFiltersChange(filtered);
  };

  const handleStatusToggle = (status: StatusFilter) => {
    setStatusFilters((prev) => {
      const newFilters = prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status];
      return newFilters;
    });
  };

  const handleCityToggle = (city: string) => {
    setCityFilters((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  const handleComponentToggle = (component: string) => {
    setComponentFilters((prev) =>
      prev.includes(component)
        ? prev.filter((c) => c !== component)
        : [...prev, component]
    );
  };

  const clearAllFilters = () => {
    setStatusFilters(["Critical", "Degraded", "Optimal"]);
    setCityFilters([]);
    setComponentFilters([]);
    // searchQuery is cleared externally via prop
    setDateFrom("");
    setDateTo("");
    onFiltersChange(allChargers);
  };

  const hasActiveFilters =
    statusFilters.length < 3 ||
    cityFilters.length > 0 ||
    componentFilters.length > 0 ||
    searchQuery ||
    dateFrom ||
    dateTo;

  // Apply filters when any filter changes
  const handleFilterChange = () => {
    setTimeout(applyFilters, 0);
  };

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {/* Noch Logo - left aligned, smaller */}
        {!isCollapsed && (
          <div className="flex justify-start mb-4">
            <img 
              src={nochLogo} 
              alt="Noch Power" 
              className="w-[37.5%] h-auto"
            />
          </div>
        )}
        {/* Search Box */}
        {!isCollapsed && (
          <div className="relative mb-3">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
            <Input
              placeholder="Search chargers..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 text-sm"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          {!isCollapsed && <span className="font-semibold">Filters</span>}
        </div>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        {/* Status Filter */}
        <SidebarGroup>
          <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded px-2 py-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {!isCollapsed && <span>Status</span>}
                </div>
                {!isCollapsed &&
                  (statusOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  ))}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="px-2 py-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="critical"
                    checked={statusFilters.includes("Critical")}
                    onCheckedChange={() => {
                      handleStatusToggle("Critical");
                      handleFilterChange();
                    }}
                    className="border-critical data-[state=checked]:bg-critical"
                  />
                  <Label
                    htmlFor="critical"
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-critical" />
                    Critical
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="degraded"
                    checked={statusFilters.includes("Degraded")}
                    onCheckedChange={() => {
                      handleStatusToggle("Degraded");
                      handleFilterChange();
                    }}
                    className="border-degraded data-[state=checked]:bg-degraded"
                  />
                  <Label
                    htmlFor="degraded"
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-degraded" />
                    Degraded
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="optimal"
                    checked={statusFilters.includes("Optimal")}
                    onCheckedChange={() => {
                      handleStatusToggle("Optimal");
                      handleFilterChange();
                    }}
                    className="border-optimal data-[state=checked]:bg-optimal"
                  />
                  <Label
                    htmlFor="optimal"
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-optimal" />
                    Optimal
                  </Label>
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Location Filter */}
        <SidebarGroup>
          <Collapsible open={locationOpen} onOpenChange={setLocationOpen}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded px-2 py-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {!isCollapsed && <span>Location</span>}
                </div>
                {!isCollapsed &&
                  (locationOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  ))}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="px-2 py-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {cities.map((city) => (
                  <div key={city} className="flex items-center gap-2">
                    <Checkbox
                      id={city}
                      checked={cityFilters.includes(city)}
                      onCheckedChange={() => {
                        handleCityToggle(city);
                        handleFilterChange();
                      }}
                    />
                    <Label
                      htmlFor={city}
                      className="text-sm cursor-pointer truncate"
                    >
                      {city}
                    </Label>
                  </div>
                ))}
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Component Filter */}
        <SidebarGroup>
          <Collapsible open={componentOpen} onOpenChange={setComponentOpen}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded px-2 py-1">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  {!isCollapsed && <span>Component</span>}
                </div>
                {!isCollapsed &&
                  (componentOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  ))}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="px-2 py-2 space-y-2">
                {components.map((component) => (
                  <div key={component} className="flex items-center gap-2">
                    <Checkbox
                      id={component}
                      checked={componentFilters.includes(component)}
                      onCheckedChange={() => {
                        handleComponentToggle(component);
                        handleFilterChange();
                      }}
                    />
                    <Label
                      htmlFor={component}
                      className="text-sm cursor-pointer"
                    >
                      {component}
                    </Label>
                  </div>
                ))}
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Date Filter */}
        <SidebarGroup>
          <Collapsible open={dateOpen} onOpenChange={setDateOpen}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded px-2 py-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {!isCollapsed && <span>Date Range</span>}
                </div>
                {!isCollapsed &&
                  (dateOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  ))}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent className="px-2 py-2 space-y-3">
                <div>
                  <Label className="text-xs text-sidebar-foreground/70">
                    From
                  </Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      handleFilterChange();
                    }}
                    className="mt-1 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-sidebar-foreground/70">
                    To
                  </Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      handleFilterChange();
                    }}
                    className="mt-1 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground text-sm"
                  />
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
        {!isCollapsed && (
          <>
            <div className="text-sm text-sidebar-foreground/80">
              Showing <strong>{filteredCount}</strong> of{" "}
              <strong>{totalCount}</strong> chargers
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X className="w-4 h-4 mr-2" />
                Clear All Filters
              </Button>
            )}
            <Link to="/settings" className="w-full">
              <Button variant="outline" size="sm" className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
