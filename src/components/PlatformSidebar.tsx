import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Ticket, CalendarDays, Settings, Plus,
  Filter, AlertTriangle, ChevronDown, ChevronRight, X, ChevronLeft,
  MapPin, Zap, FileCheck, UserCog, Database, Columns,
} from "lucide-react";
import { NewCampaignModal } from "@/components/campaigns/NewCampaignModal";
import { toast } from "sonner";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { sampleCampaigns, CUSTOMER_LABELS } from "@/data/sampleCampaigns";
import nochLogo from "@/assets/noch-logo-white.png";
import { useUserRole } from "@/hooks/useUserRole";
import { useFilters, type StatusLevel } from "@/contexts/FilterContext";
import { useCampaignContext } from "@/contexts/CampaignContext";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Dataset", url: "/dataset", icon: Database },
  { title: "Kanban", url: "/kanban", icon: Columns },
  { title: "Tickets", url: "/tickets", icon: Ticket },
  { title: "Schedule", url: "/schedule", icon: CalendarDays },
];

const STATUS_LEVELS: { value: StatusLevel; label: string; colorClass: string }[] = [
  { value: "Critical", label: "Critical", colorClass: "bg-critical" },
  { value: "High", label: "High", colorClass: "bg-high" },
  { value: "Medium", label: "Medium", colorClass: "bg-medium" },
  { value: "Low", label: "Low", colorClass: "bg-low" },
];

const CHARGER_TYPES = ["DCFC", "L2", "HPCD"];
const SWI_OPTIONS = ["With SWI", "Without SWI"];
const ACCOUNT_MANAGERS = [
  { value: "jrose", label: "Joe Rose" },
  { value: "cromano", label: "Caitlin Romano" },
  { value: "ffavole", label: "Fernando Favole" },
];

const US_STATES = ["AZ", "CA", "FL", "GA", "IL", "NY", "TX", "VA", "WA"];

export function PlatformSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { hasRole } = useUserRole();
  const { filters, toggleArrayFilter, updateFilter, clearFilters, hasActiveFilters } = useFilters();
  const { setSelectedCampaignName } = useCampaignContext();
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  const [statusOpen, setStatusOpen] = useState(true);
  const [stateOpen, setStateOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [swiOpen, setSwiOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  // Derive unique partners from campaigns
  const partners = useMemo(() => {
    const keys = [...new Set(sampleCampaigns.map(c => c.customer))];
    return keys.map(k => ({ value: k, label: CUSTOMER_LABELS[k] || k }));
  }, []);

  // Filter campaigns by selected partner
  const filteredCampaigns = useMemo(() => {
    if (!selectedPartner) return [];
    return sampleCampaigns.filter(c => c.customer === selectedPartner);
  }, [selectedPartner]);

  // Reset campaign when partner changes
  const handlePartnerChange = (value: string) => {
    setSelectedPartner(value);
    const partnerCampaigns = sampleCampaigns.filter(c => c.customer === value);
    if (partnerCampaigns.length === 1) {
      setSelectedCampaignId(partnerCampaigns[0].id);
      setSelectedCampaignName(partnerCampaigns[0].name);
    } else {
      setSelectedCampaignId("");
      setSelectedCampaignName("");
    }
  };

  const handleCampaignChange = (value: string) => {
    setSelectedCampaignId(value);
    const campaign = sampleCampaigns.find(c => c.id === value);
    setSelectedCampaignName(campaign?.name || "");
  };

  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar side="left" className="border-r border-border/50 relative h-screen">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {!isCollapsed && (
          <div className="flex justify-start">
            <img src={nochLogo} alt="Noch Power" className="w-[37.5%] h-auto" />
          </div>
        )}

        {/* Partner → Campaign Selectors */}
        {!isCollapsed && (
          <div className="space-y-2">
            {/* Partner Selector */}
            <Select value={selectedPartner} onValueChange={handlePartnerChange}>
              <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground text-sm">
                <SelectValue placeholder="Select Partner" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-[100]">
                {partners.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="cursor-pointer">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Campaign Selector (filtered by partner) */}
            <Select
              value={selectedCampaignId}
              onValueChange={handleCampaignChange}
              disabled={!selectedPartner}
            >
              <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground text-sm">
                <SelectValue placeholder={selectedPartner ? "Select Campaign" : "Select a partner first"} />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-[100]">
                {filteredCampaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id} className="cursor-pointer max-w-[220px]">
                    <span className="truncate block">{campaign.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent gap-1.5"
              onClick={() => setNewCampaignOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
            <NewCampaignModal
              open={newCampaignOpen}
              onOpenChange={setNewCampaignOpen}
              onComplete={(data) => {
                toast.success(`Campaign "${data.name}" created with ${data.chargers.length} chargers`);
              }}
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Filters Section */}
        {!isCollapsed && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-5 px-1.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground ml-auto"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                )}
              </SidebarGroupLabel>
            </SidebarGroup>

            {/* Status Filter - 4 levels */}
            <SidebarGroup>
              <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded px-2 py-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Status</span>
                    </div>
                    {statusOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent className="px-2 py-2 space-y-2">
                    {STATUS_LEVELS.map((s) => (
                      <div key={s.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`status-${s.value}`}
                          checked={filters.status.includes(s.value)}
                          onCheckedChange={() => toggleArrayFilter("status", s.value)}
                          className={`border-${s.value.toLowerCase()} data-[state=checked]:bg-${s.value.toLowerCase()}`}
                        />
                        <Label htmlFor={`status-${s.value}`} className="flex items-center gap-2 text-sm cursor-pointer">
                          <span className={`w-2 h-2 rounded-full ${s.colorClass}`} />
                          {s.label}
                        </Label>
                      </div>
                    ))}
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            {/* State Filter */}
            <SidebarGroup>
              <Collapsible open={stateOpen} onOpenChange={setStateOpen}>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded px-2 py-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>State</span>
                    </div>
                    {stateOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent className="px-2 py-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {US_STATES.map((st) => (
                      <div key={st} className="flex items-center gap-2">
                        <Checkbox
                          id={`state-${st}`}
                          checked={filters.states.includes(st)}
                          onCheckedChange={() => toggleArrayFilter("states", st)}
                        />
                        <Label htmlFor={`state-${st}`} className="text-sm cursor-pointer">{st}</Label>
                      </div>
                    ))}
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            {/* Charger Type Filter */}
            <SidebarGroup>
              <Collapsible open={typeOpen} onOpenChange={setTypeOpen}>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded px-2 py-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span>Charger Type</span>
                    </div>
                    {typeOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent className="px-2 py-2 space-y-2">
                    {CHARGER_TYPES.map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={filters.chargerTypes.includes(type)}
                          onCheckedChange={() => toggleArrayFilter("chargerTypes", type)}
                        />
                        <Label htmlFor={`type-${type}`} className="text-sm cursor-pointer">{type}</Label>
                      </div>
                    ))}
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            {/* SWI Status Filter */}
            <SidebarGroup>
              <Collapsible open={swiOpen} onOpenChange={setSwiOpen}>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded px-2 py-1">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4" />
                      <span>SWI Status</span>
                    </div>
                    {swiOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent className="px-2 py-2 space-y-2">
                    {SWI_OPTIONS.map((opt) => (
                      <div key={opt} className="flex items-center gap-2">
                        <Checkbox
                          id={`swi-${opt}`}
                          checked={filters.swiStatus.includes(opt)}
                          onCheckedChange={() => toggleArrayFilter("swiStatus", opt)}
                        />
                        <Label htmlFor={`swi-${opt}`} className="text-sm cursor-pointer">{opt}</Label>
                      </div>
                    ))}
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            {/* Account Manager Filter */}
            <SidebarGroup>
              <Collapsible open={managerOpen} onOpenChange={setManagerOpen}>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded px-2 py-1">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-4 h-4" />
                      <span>Account Manager</span>
                    </div>
                    {managerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent className="px-2 py-2 space-y-2">
                    {ACCOUNT_MANAGERS.map((mgr) => (
                      <div key={mgr.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`mgr-${mgr.value}`}
                          checked={filters.accountManagers.includes(mgr.value)}
                          onCheckedChange={() => toggleArrayFilter("accountManagers", mgr.value)}
                        />
                        <Label htmlFor={`mgr-${mgr.value}`} className="text-sm cursor-pointer">{mgr.label}</Label>
                      </div>
                    ))}
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!isCollapsed && hasRole("super_admin") && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/settings"
                  className="hover:bg-sidebar-accent/50"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>

      {/* Collapse toggle - half in sidebar, half out */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 z-20 h-7 w-7 rounded-full flex items-center justify-center shadow-md transition-colors"
        style={{ backgroundColor: 'hsl(174, 66%, 32%)', }}
        aria-label="Toggle sidebar"
      >
        <ChevronLeft
          className={`h-4 w-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
          style={{ color: 'hsl(174, 66%, 65%)' }}
        />
      </button>

    </Sidebar>
  );
}
