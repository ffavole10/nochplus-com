import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Settings,
  Ticket, DollarSign,
  Building2, BookOpen,
  BarChart3, Boxes,
  TrendingUp, Target, Workflow, Briefcase, BookText, PackageOpen,
  ClipboardList, ShieldCheck, Globe, Wrench, UserCheck,
  BadgeCheck, Inbox, Radar,
  Crosshair, Compass,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import nochLogo from "@/assets/noch-logo-new.png";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { useServiceTicketsStore } from "@/stores/serviceTicketsStore";
import { useEstimates } from "@/hooks/useEstimates";

export function PlatformSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useUserRole();

  const [newSectionsOpen, setNewSectionsOpen] = useState({
    "command-center": true,
    operations: true,
    business: true,
    knowledge: true,
  });
  const toggleNewSection = (key: keyof typeof newSectionsOpen) =>
    setNewSectionsOpen((p) => ({ ...p, [key]: !p[key] }));

  // Counts
  const allTickets = useServiceTicketsStore((s) => s.tickets);
  const totalTicketCount = useMemo(() => allTickets.filter((t) => !t.isParent).length, [allTickets]);
  const { data: allEstimates = [] } = useEstimates(null);
  const estimateCount = allEstimates.length;

  const NewSectionHeader = ({
    label,
    icon: Icon,
    to,
    open,
    onToggle,
    children,
  }: {
    label: string;
    icon: React.ElementType;
    to: string;
    open: boolean;
    onToggle: () => void;
    children?: React.ReactNode;
  }) => {
    const isActive = location.pathname.startsWith(to);
    return (
      <div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all border cursor-pointer text-left",
            isActive
              ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90"
              : "bg-sidebar-accent/30 text-sidebar-foreground/90 border-sidebar-border/40 hover:bg-sidebar-accent/60"
          )}
        >
          <span className="flex items-center gap-2.5 min-w-0 flex-1">
            <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary-foreground")} />
            <span className="truncate">{label}</span>
          </span>
          <span
            className={cn(
              "text-xs font-mono pl-2 shrink-0",
              isActive ? "text-primary-foreground" : "text-sidebar-foreground/60"
            )}
            aria-hidden="true"
          >
            {open ? "−" : "+"}
          </span>
        </button>
        {open && children && (
          <div className="pl-1 pt-1">
            <SidebarMenu className="px-1">{children}</SidebarMenu>
          </div>
        )}
      </div>
    );
  };

  const NavItem = ({
    item,
  }: {
    item: { title: string; url: string; icon: React.ElementType; badge?: number };
  }) => (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          className="hover:bg-sidebar-accent/50 flex items-center justify-between"
          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        >
          <div className="flex items-center gap-2">
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </div>
          {item.badge !== undefined && (
            <span className="bg-sidebar-accent/80 text-sidebar-foreground text-xs font-medium px-1.5 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  if (isCollapsed) {
    return (
      <Sidebar side="left" collapsible="none" className="border-r border-border/50 relative h-screen sticky top-0 w-14">
        <SidebarContent className="flex flex-col items-center py-4 gap-3">
          <Crosshair className="h-5 w-5 text-sidebar-foreground/70" />
        </SidebarContent>
      </Sidebar>
    );
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
            <img src={nochLogo} alt="Noch Power" className="w-[56%] h-auto object-scale-down" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar px-2 py-2 space-y-1">
        <NewSectionHeader
          label="Command Center"
          icon={Target}
          to="/command-center"
          open={newSectionsOpen["command-center"]}
          onToggle={() => toggleNewSection("command-center")}
        >
          <NavItem item={{ title: "Mission Control", url: "/command-center/mission-control", icon: Radar }} />
          <NavItem item={{ title: "Analytics", url: "/command-center/analytics", icon: BarChart3 }} />
        </NewSectionHeader>

        <NewSectionHeader
          label="Operations"
          icon={Workflow}
          to="/operations"
          open={newSectionsOpen.operations}
          onToggle={() => toggleNewSection("operations")}
        >
          <NavItem item={{ title: "Campaigns", url: "/operations/campaigns", icon: Target }} />
          <NavItem item={{ title: "Tickets", url: "/operations/tickets", icon: Ticket, badge: totalTicketCount }} />
          <NavItem item={{ title: "Work Orders", url: "/operations/work-orders", icon: Wrench }} />
          <NavItem item={{ title: "Estimates", url: "/operations/estimates", icon: DollarSign, badge: estimateCount }} />
          <NavItem item={{ title: "Parts Inventory", url: "/operations/parts-inventory", icon: Boxes }} />
          <NavItem item={{ title: "Team Performance", url: "/operations/team-performance", icon: UserCheck }} />
        </NewSectionHeader>

        <NewSectionHeader
          label="Business"
          icon={Briefcase}
          to="/business"
          open={newSectionsOpen.business}
          onToggle={() => toggleNewSection("business")}
        >
          <NavItem item={{ title: "Accounts", url: "/business/accounts", icon: Building2 }} />
          <NavItem item={{ title: "Pipeline", url: "/business/pipeline", icon: TrendingUp }} />
          <NavItem item={{ title: "Strategy", url: "/business/strategy", icon: Compass }} />
          <NavItem item={{ title: "Membership", url: "/business/membership", icon: BadgeCheck }} />
          <NavItem item={{ title: "Submissions", url: "/business/submissions", icon: Inbox }} />
        </NewSectionHeader>

        <NewSectionHeader
          label="Knowledge"
          icon={BookOpen}
          to="/knowledge"
          open={newSectionsOpen.knowledge}
          onToggle={() => toggleNewSection("knowledge")}
        >
          <NavItem item={{ title: "SWI Library", url: "/knowledge/swi-library", icon: BookText }} />
          <NavItem item={{ title: "Parts Catalog", url: "/knowledge/parts-catalog", icon: PackageOpen }} />
          <NavItem item={{ title: "Report Templates", url: "/knowledge/report-templates", icon: ClipboardList }} />
          <NavItem item={{ title: "Regulatory", url: "/knowledge/regulatory", icon: ShieldCheck }} />
          <NavItem item={{ title: "External Sources", url: "/knowledge/external-sources", icon: Globe }} />
        </NewSectionHeader>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          {hasRole("super_admin") && (
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
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
