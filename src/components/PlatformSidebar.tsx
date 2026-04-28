import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Database, Search as SearchIcon, CalendarDays, Settings,
  AlertTriangle, ChevronDown, ChevronRight,
  MapPin, Zap, FileCheck, UserCog, Ticket, DollarSign,
  Users, HardDrive, Diamond, FolderOpen, Minus, Package,
  Filter, Crosshair, Home, Bot, BookOpen, MapPinned, Building2, Handshake,
  Brain, Sliders, BarChart3, List, Plus, LayoutGrid, Eye, FileText,
  TrendingUp, Kanban, Target, Workflow, Briefcase } from
"lucide-react";
import { toast } from "sonner";
import { useCustomers } from "@/hooks/useCustomers";
import { useCampaigns } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NavLink } from "@/components/NavLink";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { useSectionAccess } from "@/hooks/useSectionAccess";
import { useFilters, type StatusLevel } from "@/contexts/FilterContext";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { cn } from "@/lib/utils";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import { useEstimates } from "@/hooks/useEstimates";
import { NewPartnerModal } from "@/components/campaigns/NewPartnerModal";

type SectionKey = "campaigns" | "service-desk" | "noch-plus" | "growth" | "partners" | "autoheal" | null;

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

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-600",
  on_hold: "bg-amber-500/10 text-amber-600",
  cancelled: "bg-destructive/10 text-destructive",
};

function getActiveSection(pathname: string): SectionKey {
  if (pathname.startsWith("/campaigns")) return "campaigns";
  if (pathname.startsWith("/service-desk")) return "service-desk";
  if (pathname.startsWith("/noch-plus")) return "noch-plus";
  if (pathname.startsWith("/growth")) return "growth";
  if (pathname.startsWith("/partners")) return "partners";
  if (pathname.startsWith("/autoheal")) return "autoheal";
  if (["/dashboard", "/dataset", "/tickets", "/issues", "/schedule", "/field-reports"].includes(pathname)) return "campaigns";
  return null;
}

const CAMPAIGN_PAGES = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Dataset", url: "/dataset", icon: Database },
  { title: "Flagged", url: "/issues", icon: SearchIcon },
  { title: "Schedule", url: "/schedule", icon: CalendarDays },
  { title: "Field Reports", url: "/field-reports", icon: FileText },
];

export function PlatformSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useUserRole();
  const { canAccess } = useSectionAccess();
  const { filters, toggleArrayFilter, clearFilters, hasActiveFilters } = useFilters();
  const {
    selectedCampaignName, selectedCampaignId: contextCampaignId, selectedCustomer,
    setSelectedCampaignName, setSelectedCampaignId: setContextCampaignId, setSelectedCustomer
  } = useCampaignContext();

  const [expandedSection, setExpandedSection] = useState<SectionKey>(
    getActiveSection(location.pathname) || "campaigns"
  );

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(true);
  const [stateOpen, setStateOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [swiOpen, setSwiOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [newPartnerOpen, setNewPartnerOpen] = useState(false);
  const [newSectionsOpen, setNewSectionsOpen] = useState({
    "command-center": true,
    operations: true,
    business: true,
    knowledge: true,
  });
  const toggleNewSection = (key: keyof typeof newSectionsOpen) =>
    setNewSectionsOpen((p) => ({ ...p, [key]: !p[key] }));

  // Data
  const { data: dbCustomers = [] } = useCustomers();
  const customers = useMemo(() => dbCustomers.map((c) => ({ value: c.company, label: c.company })), [dbCustomers]);
  const { data: dbCampaigns = [] } = useCampaigns();

  // Campaigns filtered by selected customer
  const filteredCampaigns = useMemo(() => {
    if (!selectedCustomer || selectedCustomer === "__all__") return dbCampaigns;
    return dbCampaigns.filter(c =>
      (c as any).customer_company === selectedCustomer || c.customer === selectedCustomer
    );
  }, [dbCampaigns, selectedCustomer]);

  const sortedCampaigns = useMemo(() =>
    [...filteredCampaigns].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [filteredCampaigns]
  );

  const handleCustomerChange = (value: string) => {
    setSelectedCustomer(value === "__all__" ? "" : value);
    // Reset campaign selection when customer changes
    setContextCampaignId("");
    setSelectedCampaignName("");
  };

  const handleCampaignChange = (value: string) => {
    if (value === "__new__") {
      // Navigate to Campaign HQ and trigger new campaign modal
      navigate("/campaigns?new=1");
      return;
    }
    if (value === "__none__") {
      setContextCampaignId("");
      setSelectedCampaignName("");
      return;
    }
    const campaign = dbCampaigns.find(c => c.id === value);
    if (campaign) {
      setContextCampaignId(campaign.id);
      setSelectedCampaignName(campaign.name);
      setSelectedCustomer((campaign as any).customer_company || campaign.customer || "");
      navigate("/dashboard");
    }
  };

  const sectionFirstPage: Record<NonNullable<SectionKey>, string> = {
    "campaigns": "/campaigns",
    "service-desk": "/service-desk/tickets",
    "noch-plus": "/noch-plus/monitoring",
    "growth": "/growth/accounts",
    "partners": "/partners",
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

  // Ticket & estimate counts
  const allTickets = useServiceTicketsStore((s) => s.tickets);
  const totalTicketCount = useMemo(() => allTickets.filter(t => !t.isParent).length, [allTickets]);
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
  { title: "Partnership Hub", url: "/noch-plus/partnership-hub", icon: Handshake },
  { title: "Dashboard", url: "/noch-plus/dashboard", icon: LayoutDashboard },
  { title: "Submissions", url: "/noch-plus/submissions", icon: FileCheck },
  { title: "Assessments", url: "/noch-plus/assessments", icon: FolderOpen },
  { title: "Members", url: "/noch-plus/members", icon: Users },
  { title: "Chargers", url: "/noch-plus/chargers", icon: HardDrive }];

  const growthPages = [
  { title: "Accounts", url: "/growth/accounts", icon: Building2 },
  { title: "Pipeline", url: "/growth/pipeline", icon: Kanban }];

  const partnersPages = [
  { title: "All Partners", url: "/partners", icon: Building2 }];

  const autohealPages = [
  { title: "AI Agent", url: "/autoheal/ai-agent", icon: Bot },
  { title: "Deep Learning", url: "/autoheal/deep-learning", icon: Brain },
  { title: "Configuration", url: "/autoheal/configuration", icon: Sliders },
  { title: "Performance", url: "/autoheal/performance", icon: BarChart3 }];

  const SectionHeader = ({
    label,
    icon: Icon,
    section,
    legacy = false,
  }: {label: React.ReactNode;icon: React.ElementType;section: SectionKey;legacy?: boolean;}) => {
    const isOpen = expandedSection === section;
    return (
      <button
        onClick={() => toggleSection(section)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all",
          "border",
          isOpen ?
          "bg-primary text-primary-foreground border-primary shadow-sm" :
          "bg-sidebar-accent/30 text-sidebar-foreground/80 border-sidebar-border/40 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          legacy && !isOpen && "text-sidebar-foreground/50 opacity-80"
        )}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={cn("h-4 w-4 shrink-0", isOpen && "text-primary-foreground")} />
          <span className="truncate">{label}</span>
          {legacy && (
            <span
              className={cn(
                "ml-1 px-1.5 py-0 rounded-full text-[8px] font-semibold tracking-wider border",
                isOpen
                  ? "border-primary-foreground/40 text-primary-foreground/90"
                  : "border-sidebar-foreground/20 text-sidebar-foreground/50"
              )}
            >
              LEGACY
            </span>
          )}
        </div>
        <span className={cn(
          "text-xs font-mono",
          isOpen ? "text-primary-foreground" : "text-sidebar-foreground/50"
        )}>
          {isOpen ? "−" : "+"}
        </span>
      </button>);
  };

  /* New IA top-level placeholder section header (Batch 1 — empty sections) */
  const NewSectionHeader = ({
    label,
    icon: Icon,
    to,
    open,
    onToggle,
  }: { label: string; icon: React.ElementType; to: string; open: boolean; onToggle: () => void }) => {
    const isActive = location.pathname.startsWith(to);
    return (
      <div>
        <div
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border",
            isActive
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-sidebar-accent/30 text-sidebar-foreground/90 border-sidebar-border/40 hover:bg-sidebar-accent/60"
          )}
        >
          <button
            type="button"
            onClick={() => navigate(to)}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
          >
            <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary-foreground")} />
            <span className="truncate">{label}</span>
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "text-xs font-mono pl-2",
              isActive ? "text-primary-foreground" : "text-sidebar-foreground/60"
            )}
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? "−" : "+"}
          </button>
        </div>
        {open && (
          <div className="pl-3 pr-2 py-1.5 text-[10px] uppercase tracking-wider text-sidebar-foreground/40">
            No items yet
          </div>
        )}
      </div>
    );
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
          <button
            type="button"
            onClick={() => navigate("/command-center/mission-control")}
            className="block hover:opacity-80 transition-opacity"
            aria-label="Go to Mission Control"
          >
            <img src={nochLogo} alt="Noch Power" className="w-[45%] h-auto brightness-0 invert" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar px-2 py-2 space-y-1">
        {/* ─── NEW IA: Top-level sections (Batch 1) ─── */}
        <NewSectionHeader
          label="Command Center"
          icon={Target}
          to="/command-center"
          open={newSectionsOpen["command-center"]}
          onToggle={() => toggleNewSection("command-center")}
        />
        <NewSectionHeader
          label="Operations"
          icon={Workflow}
          to="/operations"
          open={newSectionsOpen.operations}
          onToggle={() => toggleNewSection("operations")}
        />
        <NewSectionHeader
          label="Business"
          icon={Briefcase}
          to="/business"
          open={newSectionsOpen.business}
          onToggle={() => toggleNewSection("business")}
        />
        <NewSectionHeader
          label="Knowledge"
          icon={BookOpen}
          to="/knowledge"
          open={newSectionsOpen.knowledge}
          onToggle={() => toggleNewSection("knowledge")}
        />

        {/* Visual divider between new IA and legacy sections */}
        <div className="my-3 flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-sidebar-border/60" />
          <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-sidebar-foreground/40">
            Legacy
          </span>
          <div className="h-px flex-1 bg-sidebar-border/60" />
        </div>

        {/* ─── CAMPAIGNS SECTION ─── */}
        {canAccess("campaigns") && (
          <>
            <SectionHeader label="CAMPAIGNS" icon={Crosshair} section="campaigns" legacy />
            {expandedSection === "campaigns" &&
            <div className="space-y-2 pl-1">
                {/* Customer/Partner dropdown */}
                <div className="space-y-1.5 px-2">
                  <Select
                    value={selectedCustomer || "__all__"}
                    onValueChange={(v) => {
                      if (v === "__new_partner__") {
                        setNewPartnerOpen(true);
                        return;
                      }
                      handleCustomerChange(v);
                    }}
                  >
                    <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground text-xs h-8">
                      <SelectValue placeholder="All Partners" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg z-[100]">
                      <SelectItem value="__all__" className="cursor-pointer text-xs text-muted-foreground">
                        All Partners
                      </SelectItem>
                      {customers.map((c) =>
                        <SelectItem key={c.value} value={c.value} className="cursor-pointer text-xs">
                          {c.label}
                        </SelectItem>
                      )}
                      <Separator className="my-1" />
                      <SelectItem value="__new_partner__" className="cursor-pointer text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Plus className="h-3 w-3" />
                          <span>New Partner</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campaign dropdown */}
                <div className="space-y-1.5 px-2">
                  <Select
                    value={contextCampaignId || "__none__"}
                    onValueChange={handleCampaignChange}
                  >
                    <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground text-xs h-8">
                      <SelectValue placeholder="Select campaign..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg z-[100]">
                      <SelectItem value="__none__" className="cursor-pointer text-xs text-muted-foreground">
                        Select campaign...
                      </SelectItem>
                      {sortedCampaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="cursor-pointer text-xs">
                          <div className="flex items-center gap-2">
                            <span>{c.name}</span>
                            <Badge variant="outline" className={`text-[8px] px-1 py-0 capitalize ${CAMPAIGN_STATUS_COLORS[c.status || "draft"]}`}>
                              {(c.status || "draft").replace("_", " ")}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      <Separator className="my-1" />
                      <SelectItem value="__new__" className="cursor-pointer text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Plus className="h-3 w-3" />
                          <span>New Campaign</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campaign nav pages */}
                <SidebarMenu className="px-1 mt-1">
                  {CAMPAIGN_PAGES.map((page) => (
                    <NavItem key={page.url} item={page} />
                  ))}
                </SidebarMenu>
              </div>
            }
          </>
        )}

        {/* ─── SERVICE DESK SECTION ─── */}
        {canAccess("service_desk") && (
          <>
            <SectionHeader label="SERVICE DESK" icon={Ticket} section="service-desk" legacy />
            {expandedSection === "service-desk" &&
            <div className="pl-1">
                <SidebarMenu className="px-1">
                  {serviceDeskPages.map((item) =>
                <NavItem key={item.title} item={item} />
                )}
                </SidebarMenu>
              </div>
            }
          </>
        )}

        {/* ─── NOCH+ PROGRAM SECTION ─── */}
        {canAccess("noch_plus") && (
          <>
            <SectionHeader label="NOCH+" icon={Diamond} section="noch-plus" legacy />
            {expandedSection === "noch-plus" &&
            <div className="pl-1">
                <SidebarMenu className="px-1">
                  {nochPlusPages.map((item) =>
                <NavItem key={item.title} item={item} />
                )}
                </SidebarMenu>
              </div>
            }
          </>
        )}

        {/* ─── GROWTH SECTION ─── */}
        {canAccess("growth") && (
          <>
            <SectionHeader label="GROWTH" icon={TrendingUp} section="growth" legacy />
            {expandedSection === "growth" &&
            <div className="pl-1">
                <SidebarMenu className="px-1">
                  {growthPages.map((item) =>
                <NavItem key={item.title} item={item} />
                )}
                </SidebarMenu>
              </div>
            }
          </>
        )}

        {/* ─── PARTNERS SECTION ─── */}
        {canAccess("partners") && (
          <>
            <SectionHeader label="PARTNERS" icon={Handshake} section="partners" legacy />
            {expandedSection === "partners" &&
            <div className="pl-1">
                <SidebarMenu className="px-1">
                  {partnersPages.map((item) =>
                <NavItem key={item.title} item={item} />
                )}
                </SidebarMenu>
              </div>
            }
          </>
        )}

        {/* ─── AUTOHEAL SECTION ─── */}
        {canAccess("autoheal") && (
          <>
            <SectionHeader label={<span>AUTOHEAL<sup className="text-[8px] align-super ml-0.5">TM</sup></span>} icon={Zap} section="autoheal" legacy />
            {expandedSection === "autoheal" &&
            <div className="pl-1">
                <SidebarMenu className="px-1">
                  {autohealPages.map((item) =>
                <NavItem key={item.title} item={item} />
                )}
                </SidebarMenu>
              </div>
            }
          </>
        )}

        {/* ─── FIELD CAPTURE (admin only, requires section access) ─── */}
        {canAccess("field_capture") && (hasRole("super_admin") || hasRole("admin") || hasRole("manager") || hasRole("account_manager")) && (
          <div className="pt-2 mt-2 border-t border-sidebar-border">
            <div className="px-3 py-2 text-xs font-bold tracking-wider uppercase text-sidebar-foreground/50 flex items-center gap-2">
              <span>Field Capture</span>
              <span className="px-1.5 py-0 rounded-full text-[8px] font-semibold tracking-wider border border-sidebar-foreground/20 text-sidebar-foreground/50">
                LEGACY
              </span>
            </div>
            <SidebarMenu className="px-1">
              <NavItem item={{ title: "All Work Orders", url: "/field-capture/admin/work-orders", icon: List }} />
              <NavItem item={{ title: "Create Work Order", url: "/field-capture/admin/create-job", icon: Plus }} />
              <NavItem item={{ title: "Work Templates", url: "/field-capture/admin/templates", icon: FileText }} />
              <NavItem item={{ title: "Team Performance", url: "/field-capture/admin/performance", icon: TrendingUp }} />
            </SidebarMenu>
          </div>
        )}

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

                <FilterGroup label="Status" icon={AlertTriangle} open={statusOpen} onOpenChange={setStatusOpen}>
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
                className="flex items-center gap-2 text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
                <Home className="mr-2 h-4 w-4" />
                <span>Home</span>
                <span className="ml-auto px-1.5 py-0 rounded-full text-[8px] font-semibold tracking-wider border border-sidebar-foreground/20 text-sidebar-foreground/50">
                  LEGACY
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <NewPartnerModal
        open={newPartnerOpen}
        onOpenChange={setNewPartnerOpen}
        onCreated={(partner) => {
          setSelectedCustomer(partner.company);
          setNewPartnerOpen(false);
        }}
      />
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
