import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Database, Search as SearchIcon, CalendarDays, Settings, Plus,
  AlertTriangle, ChevronDown, ChevronRight,
  MapPin, Zap, FileCheck, UserCog, Ticket, DollarSign,
  Users, HardDrive, Diamond, FolderOpen, Minus, Package,
  Filter, Crosshair, Home, Bot, BookOpen, MapPinned,
  Brain, Sliders, BarChart3 } from
"lucide-react";
import { NewCampaignModal } from "@/components/campaigns/NewCampaignModal";
import { toast } from "sonner";
import { usePartners } from "@/hooks/usePartners";
import { useCampaigns, useCreateCampaign, useCreateChargerRecords } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NavLink } from "@/components/NavLink";
import { Label } from "@/components/ui/label";
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
  useSidebar } from
"@/components/ui/sidebar";
import nochLogo from "@/assets/noch-logo-white.png";
import { useUserRole } from "@/hooks/useUserRole";
import { useFilters, type StatusLevel } from "@/contexts/FilterContext";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { cn } from "@/lib/utils";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import { useEstimates } from "@/hooks/useEstimates";

type SectionKey = "campaigns" | "service-desk" | "noch-plus" | "autoheal" | null;

const STATUS_LEVELS: {value: StatusLevel;label: string;colorClass: string;}[] = [
{ value: "Critical", label: "Critical", colorClass: "bg-critical" },
{ value: "High", label: "High", colorClass: "bg-high" },
{ value: "Medium", label: "Medium", colorClass: "bg-medium" },
{ value: "Low", label: "Low", colorClass: "bg-low" }];


const CHARGER_TYPES = ["AC | Level 2", "DC | Level 3"];
const SWI_OPTIONS = ["With SWI", "Without SWI"];
const ACCOUNT_MANAGERS = [
{ value: "jrose", label: "Joe Rose" },
{ value: "cromano", label: "Caitlin Romano" },
{ value: "ffavole", label: "Fernando Favole" }];

const US_STATES = ["AZ", "CA", "FL", "GA", "IL", "NY", "TX", "VA", "WA"];

function getActiveSection(pathname: string): SectionKey {
  if (pathname.startsWith("/campaigns")) return "campaigns";
  if (pathname.startsWith("/service-desk")) return "service-desk";
  if (pathname.startsWith("/noch-plus")) return "noch-plus";
  if (pathname.startsWith("/autoheal")) return "autoheal";
  // Legacy root routes map to campaigns
  if (["/dashboard", "/dataset", "/tickets", "/issues", "/schedule", "/field-reports"].includes(pathname)) return "campaigns";
  return null;
}

export function PlatformSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useUserRole();
  const { filters, toggleArrayFilter, clearFilters, hasActiveFilters } = useFilters();
  const {
    selectedCampaignName, selectedCampaignId: contextCampaignId, selectedCustomer,
    setSelectedCampaignName, setSelectedCampaignId: setContextCampaignId, setSelectedCustomer
  } = useCampaignContext();

  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string>(selectedCustomer || "");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(contextCampaignId || "");

  // Section accordion – only one open at a time
  const [expandedSection, setExpandedSection] = useState<SectionKey>(
    getActiveSection(location.pathname) || "campaigns"
  );

  // Filter section collapsible
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(true);
  const [stateOpen, setStateOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [swiOpen, setSwiOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  // Partners & campaigns
  const { data: dbPartners = [] } = usePartners();
  const partners = useMemo(() => dbPartners.map((p) => ({ value: p.value, label: p.label })), [dbPartners]);
  const { data: dbCampaigns = [] } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const createChargerRecords = useCreateChargerRecords();
  const filteredCampaigns = useMemo(() => {
    if (!selectedPartner) return [];
    return dbCampaigns.filter((c) => c.customer === selectedPartner);
  }, [selectedPartner, dbCampaigns]);

  const handlePartnerChange = (value: string) => {
    setSelectedPartner(value);
    setSelectedCustomer(value);
    const partnerCampaigns = dbCampaigns.filter((c) => c.customer === value);
    if (partnerCampaigns.length === 1) {
      setSelectedCampaignId(partnerCampaigns[0].id);
      setContextCampaignId(partnerCampaigns[0].id);
      setSelectedCampaignName(partnerCampaigns[0].name);
    } else {
      setSelectedCampaignId("");
      setContextCampaignId("");
      setSelectedCampaignName("");
    }
  };

  const handleCampaignChange = (value: string) => {
    setSelectedCampaignId(value);
    setContextCampaignId(value);
    const campaign = dbCampaigns.find((c) => c.id === value);
    setSelectedCampaignName(campaign?.name || "");
    setSelectedCustomer(campaign?.customer || "");
  };

  const sectionFirstPage: Record<NonNullable<SectionKey>, string> = {
    "campaigns": "/dashboard",
    "service-desk": "/service-desk/tickets",
    "noch-plus": "/noch-plus/dashboard",
    "autoheal": "/autoheal/ai-agent",
  };

  const toggleSection = (section: SectionKey) => {
    if (section && expandedSection !== section) {
      setExpandedSection(section);
      navigate(sectionFirstPage[section]);
    } else {
      setExpandedSection((prev) => prev === section ? null : section);
    }
  };

  // Campaign nav items - use existing routes for backward compat
  const campaignPages = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Dataset", url: "/dataset", icon: Database },
  { title: "Flagged", url: "/issues", icon: SearchIcon },
  { title: "Schedule", url: "/schedule", icon: CalendarDays },
  { title: "Field Reports", url: "/field-reports", icon: FolderOpen }];


  // Ticket count matching KPI "Total Tickets" = non-parent tickets
  const allTickets = useServiceTicketsStore((s) => s.tickets);
  const totalTicketCount = useMemo(() => allTickets.filter(t => !t.isParent).length, [allTickets]);

  // Estimate count matching Estimates page KPI "Total"
  const { data: allEstimates = [] } = useEstimates(null);
  const estimateCount = allEstimates.length;

  const serviceDeskPages = [
  { title: "Tickets", url: "/service-desk/tickets", icon: Ticket, badge: totalTicketCount },
  { title: "Estimates", url: "/service-desk/estimates", icon: DollarSign, badge: estimateCount },
  { title: "Customers", url: "/service-desk/customers", icon: Users },
  { title: "Locations", url: "/autoheal/locations", icon: MapPinned },
  { title: "SWI Library", url: "/autoheal/swi-library", icon: BookOpen },
  { title: "Parts Inventory", url: "/autoheal/parts", icon: Package },
  { title: "Parts Catalog", url: "/autoheal/parts-catalog", icon: BookOpen }];


  const nochPlusPages = [
  { title: "Mission Control", url: "/noch-plus/monitoring", icon: BarChart3 },
  { title: "Dashboard", url: "/noch-plus/dashboard", icon: LayoutDashboard },
  { title: "Submissions", url: "/noch-plus/submissions", icon: FileCheck },
  { title: "Assessments", url: "/noch-plus/assessments", icon: FolderOpen },
  { title: "Members", url: "/noch-plus/members", icon: Users },
  { title: "Chargers", url: "/noch-plus/chargers", icon: HardDrive }];

  const autohealPages = [
  { title: "AI Agent", url: "/autoheal/ai-agent", icon: Bot },
  { title: "Deep Learning", url: "/autoheal/deep-learning", icon: Brain },
  { title: "Configuration", url: "/autoheal/configuration", icon: Sliders },
  { title: "Performance", url: "/autoheal/performance", icon: BarChart3 }];


  const SectionHeader = ({
    label,
    icon: Icon,
    section




  }: {label: React.ReactNode;icon: React.ElementType;section: SectionKey;}) => {
    const isOpen = expandedSection === section;
    return (
      <button
        onClick={() => toggleSection(section)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all",
          "border",
          isOpen ?
          "bg-primary text-primary-foreground border-primary shadow-sm" :
          "bg-sidebar-accent/30 text-sidebar-foreground/80 border-sidebar-border/40 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )}>

        <div className="flex items-center gap-2.5">
          <Icon className={cn("h-4 w-4", isOpen && "text-primary-foreground")} />
          <span>{label}</span>
        </div>
        <span className={cn(
          "text-xs font-mono",
          isOpen ? "text-primary-foreground" : "text-sidebar-foreground/50"
        )}>
          {isOpen ? "−" : "+"}
        </span>
      </button>);

  };

  const NavItem = ({
    item


  }: {item: {title: string;url: string;icon: React.ElementType;badge?: number;};}) =>
  <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
        to={item.url}
        end={item.url === "/dashboard"}
        className="hover:bg-sidebar-accent/50 flex items-center justify-between"
        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">

          <div className="flex items-center gap-2">
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </div>
          {item.badge !== undefined &&
        <span className="bg-sidebar-accent/80 text-sidebar-foreground text-xs font-medium px-1.5 py-0.5 rounded-full">
              {item.badge}
            </span>
        }
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>;


  if (isCollapsed) {
    return (
      <Sidebar side="left" collapsible="none" className="border-r border-border/50 relative h-screen sticky top-0 w-14">
        <SidebarContent className="flex flex-col items-center py-4 gap-3">
          <Crosshair className="h-5 w-5 text-sidebar-foreground/70" />
        </SidebarContent>
      </Sidebar>);

  }

  return (
    <Sidebar side="left" collapsible="none" className="border-r border-border/50 relative h-screen sticky top-0">
      <SidebarHeader className="p-4">
        <div className="flex justify-start mb-2">
          <img src={nochLogo} alt="Noch Power" className="w-[45%] h-auto brightness-0 invert" />
        </div>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar px-2 py-2 space-y-1">
        {/* ─── CAMPAIGNS SECTION ─── */}
        <SectionHeader label="CAMPAIGNS" icon={Crosshair} section="campaigns" />
        {expandedSection === "campaigns" &&
        <div className="space-y-2 pl-1">
            {/* Partner → Campaign Selectors */}
            <div className="space-y-1.5 px-2">
              <Select value={selectedPartner} onValueChange={handlePartnerChange}>
                <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground text-xs h-8">
                  <SelectValue placeholder="Select Partner" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg z-[100]">
                  {partners.map((p) =>
                <SelectItem key={p.value} value={p.value} className="cursor-pointer">
                      {p.label}
                    </SelectItem>
                )}
                </SelectContent>
              </Select>

              <Select value={selectedCampaignId} onValueChange={handleCampaignChange} disabled={!selectedPartner}>
                <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground text-xs h-8">
                  <SelectValue placeholder={selectedPartner ? "Select Campaign" : "Select partner first"} />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg z-[100]">
                  {filteredCampaigns.map((c) =>
                <SelectItem key={c.id} value={c.id} className="cursor-pointer max-w-[220px]">
                      <span className="truncate block">{c.name}</span>
                    </SelectItem>
                )}
                </SelectContent>
              </Select>

              <button
              onClick={() => setNewCampaignOpen(true)}
              className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">

                <Plus className="h-3 w-3" />
                New Campaign
              </button>
            </div>

            <SidebarMenu className="px-1">
              {campaignPages.map((item) =>
            <NavItem key={item.title} item={item} />
            )}
            </SidebarMenu>
          </div>
        }

        {/* ─── SERVICE DESK SECTION ─── */}
        <SectionHeader label="SERVICE DESK" icon={Ticket} section="service-desk" />
        {expandedSection === "service-desk" &&
        <div className="pl-1">
            <SidebarMenu className="px-1">
              {serviceDeskPages.map((item) =>
            <NavItem key={item.title} item={item} />
            )}
            </SidebarMenu>
          </div>
        }

        {/* ─── NOCH+ PROGRAM SECTION ─── */}
        <SectionHeader label="NOCH+" icon={Diamond} section="noch-plus" />
        {expandedSection === "noch-plus" &&
        <div className="pl-1">
            <SidebarMenu className="px-1">
              {nochPlusPages.map((item) =>
            <NavItem key={item.title} item={item} />
            )}
            </SidebarMenu>
          </div>
        }

        {/* ─── AUTOHEAL SECTION ─── */}
        <SectionHeader label={<span>AUTOHEAL<sup className="text-[8px] align-super ml-0.5">TM</sup></span>} icon={Zap} section="autoheal" />
        {expandedSection === "autoheal" &&
        <div className="pl-1">
            <SidebarMenu className="px-1">
              {autohealPages.map((item) =>
            <NavItem key={item.title} item={item} />
            )}
            </SidebarMenu>
          </div>
        }

        {/* ─── FILTERS SECTION ─── */}
        <div className="border-t border-sidebar-border mt-2 pt-2">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold text-sidebar-foreground/90 hover:bg-sidebar-accent/60 transition-colors">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>FILTERS</span>
                  {hasActiveFilters &&
                  <span className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                  }
                </div>
                <span className="text-xs font-mono text-sidebar-foreground/60">
                  {filtersOpen ? "−" : "+"}
                </span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-1 space-y-0.5">
                {hasActiveFilters &&
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 px-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground w-full justify-start">

                    Clear All
                  </Button>
                }

                {/* Status */}
                <FilterGroup
                  label="Status"
                  icon={AlertTriangle}
                  open={statusOpen}
                  onOpenChange={setStatusOpen}>

                  {STATUS_LEVELS.map((s) =>
                  <div key={s.value} className="flex items-center gap-2">
                      <Checkbox
                      id={`status-${s.value}`}
                      checked={filters.status.includes(s.value)}
                      onCheckedChange={() => toggleArrayFilter("status", s.value)}
                      className={`border-${s.value.toLowerCase()} data-[state=checked]:bg-${s.value.toLowerCase()}`} />

                      <Label htmlFor={`status-${s.value}`} className="flex items-center gap-2 text-sm cursor-pointer">
                        <span className={`w-2 h-2 rounded-full ${s.colorClass}`} />
                        {s.label}
                      </Label>
                    </div>
                  )}
                </FilterGroup>

                {/* State */}
                <FilterGroup label="State" icon={MapPin} open={stateOpen} onOpenChange={setStateOpen}>
                  <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-2">
                    {US_STATES.map((st) =>
                    <div key={st} className="flex items-center gap-2">
                        <Checkbox
                        id={`state-${st}`}
                        checked={filters.states.includes(st)}
                        onCheckedChange={() => toggleArrayFilter("states", st)} />

                        <Label htmlFor={`state-${st}`} className="text-sm cursor-pointer">{st}</Label>
                      </div>
                    )}
                  </div>
                </FilterGroup>

                {/* Charger Type */}
                <FilterGroup label="Charger Type" icon={Zap} open={typeOpen} onOpenChange={setTypeOpen}>
                  {CHARGER_TYPES.map((type) =>
                  <div key={type} className="flex items-center gap-2">
                      <Checkbox
                      id={`type-${type}`}
                      checked={filters.chargerTypes.includes(type)}
                      onCheckedChange={() => toggleArrayFilter("chargerTypes", type)} />

                      <Label htmlFor={`type-${type}`} className="text-sm cursor-pointer">{type}</Label>
                    </div>
                  )}
                </FilterGroup>

                {/* SWI Status */}
                <FilterGroup label="SWI Status" icon={FileCheck} open={swiOpen} onOpenChange={setSwiOpen}>
                  {SWI_OPTIONS.map((opt) =>
                  <div key={opt} className="flex items-center gap-2">
                      <Checkbox
                      id={`swi-${opt}`}
                      checked={filters.swiStatus.includes(opt)}
                      onCheckedChange={() => toggleArrayFilter("swiStatus", opt)} />

                      <Label htmlFor={`swi-${opt}`} className="text-sm cursor-pointer">{opt}</Label>
                    </div>
                  )}
                </FilterGroup>

                {/* Account Manager */}
                <FilterGroup label="Account Manager" icon={UserCog} open={managerOpen} onOpenChange={setManagerOpen}>
                  {ACCOUNT_MANAGERS.map((mgr) =>
                  <div key={mgr.value} className="flex items-center gap-2">
                      <Checkbox
                      id={`mgr-${mgr.value}`}
                      checked={filters.accountManagers.includes(mgr.value)}
                      onCheckedChange={() => toggleArrayFilter("accountManagers", mgr.value)} />

                      <Label htmlFor={`mgr-${mgr.value}`} className="text-sm cursor-pointer">{mgr.label}</Label>
                    </div>
                  )}
                </FilterGroup>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          {hasRole("super_admin") &&
          <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                to="/settings"
                className="hover:bg-sidebar-accent/50"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">

                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          }
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                href="/"
                className="flex items-center gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">

                <Home className="mr-2 h-4 w-4" />
                <span>Home</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <NewCampaignModal
        open={newCampaignOpen}
        onOpenChange={setNewCampaignOpen}
        onComplete={async (data) => {
          try {
            const chargers = data.chargers;
            const criticalCount = chargers.filter(c => c.priorityLevel === "Critical").length;
            const highCount = chargers.filter(c => c.priorityLevel === "High").length;
            const lowCount = chargers.filter(c => c.priorityLevel === "Low" || c.priorityLevel === "Medium").length;
            const healthScore = chargers.length > 0
              ? Math.round(((lowCount / chargers.length) * 50) + (((chargers.length - criticalCount) / chargers.length) * 30) + 20)
              : 0;

            const campaign = await createCampaign.mutateAsync({
              name: data.name,
              customer: data.customer,
              status: "draft",
              quarter: null,
              year: null,
              start_date: null,
              end_date: null,
              total_chargers: chargers.length,
              total_serviced: 0,
              optimal_count: lowCount,
              degraded_count: highCount,
              critical_count: criticalCount,
              health_score: healthScore,
            });

            if (chargers.length > 0) {
              const records = chargers.map(c => ({
                campaign_id: campaign.id,
                station_id: c.evseId || c.assetName || `CHG-${Math.random().toString(36).slice(2, 8)}`,
                station_name: c.assetName || null,
                serial_number: c.evseId || null,
                model: null,
                address: c.address || null,
                city: c.city || null,
                state: c.state || null,
                zip: c.zip || null,
                status: (c.status as "Optimal" | "Degraded" | "Critical") || null,
                site_name: c.accountName || null,
                max_power: null,
                start_date: c.inServiceDate || null,
                service_required: 0,
                serviced_qty: 0,
                service_date: null,
                report_url: null,
                summary: null,
                power_cabinet_report_url: null,
                power_cabinet_status: null,
                power_cabinet_summary: null,
                ccs_cable_issue: false,
                chademo_cable_issue: false,
                screen_damage: false,
                cc_reader_issue: false,
                rfid_reader_issue: false,
                app_issue: false,
                holster_issue: false,
                other_issue: false,
                power_supply_issue: false,
                circuit_board_issue: false,
                latitude: c.latitude || null,
                longitude: c.longitude || null,
                ticket_id: c.ticketId || null,
                ticket_created_date: c.ticketCreatedDate || null,
                ticket_solved_date: c.ticketSolvedDate || null,
                ticket_group: c.ticketGroup || null,
                ticket_subject: c.ticketSubject || null,
                ticket_reporting_source: c.ticketReportingSource || null,
              }));
              await createChargerRecords.mutateAsync(records);
            }

            toast.success(`Campaign "${data.name}" created with ${chargers.length} chargers`);
          } catch (err) {
            console.error("Failed to create campaign:", err);
            toast.error("Failed to create campaign");
          }
        }} />

    </Sidebar>);

}

/* ─── Reusable Filter Group ─── */
function FilterGroup({
  label,
  icon: Icon,
  open,
  onOpenChange,
  children






}: {label: string;icon: React.ElementType;open: boolean;onOpenChange: (o: boolean) => void;children: React.ReactNode;}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-sidebar-accent/50 text-xs text-sidebar-foreground/80">
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </div>
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2 py-2 space-y-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>);

}