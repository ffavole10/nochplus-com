import { useLocation } from "react-router-dom";
import { LayoutDashboard, Ticket, CalendarDays, Settings, Plus } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Tickets", url: "/tickets", icon: Ticket },
  { title: "Schedule", url: "/schedule", icon: CalendarDays },
];

export function PlatformSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const { hasRole } = useUserRole();

  return (
    <Sidebar side="left" className="border-r border-border/50">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {!isCollapsed && (
          <div className="flex justify-start mb-4">
            <img
              src={nochLogo}
              alt="Noch Power"
              className="w-[37.5%] h-auto"
            />
          </div>
        )}

        {/* Campaign Selector */}
        {!isCollapsed && (
          <div className="space-y-2">
            <Select defaultValue="2">
              <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground text-sm">
                <SelectValue placeholder="Select Campaign" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-[100]">
                {sampleCampaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id} className="cursor-pointer">
                    <div className="flex flex-col">
                      <span className="text-sm">{campaign.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {CUSTOMER_LABELS[campaign.customer]} · {campaign.totalChargers} chargers
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent gap-1.5"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
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
    </Sidebar>
  );
}
