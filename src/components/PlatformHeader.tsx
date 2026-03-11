import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { User, LogOut, Pencil, Check, X, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useFilters } from "@/contexts/FilterContext";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dataset": "Dataset",
  "/issues": "Flagged",
  "/schedule": "Schedule",
  "/settings": "Settings",
  "/autoheal/ai-agent": "AI Agent",
  "/autoheal/deep-learning": "Deep Learning",
  "/autoheal/configuration": "Configuration",
  "/autoheal/performance": "Performance",
  "/autoheal/swi-library": "SWI Library",
  "/autoheal/locations": "Locations",
  "/field-reports": "Field Reports",
  "/service-desk/tickets": "Tickets",
  "/service-desk/estimates": "Estimates",
  "/service-desk/customers": "Customers",
  "/service-desk/chargers": "All Chargers",
  "/noch-plus/dashboard": "Dashboard",
  "/noch-plus/submissions": "Submissions",
  "/noch-plus/assessments": "Assessments",
  "/noch-plus/members": "Members",
  "/noch-plus/chargers": "Chargers",
};

export function PlatformHeader() {
  const { session } = useAuth();
  const location = useLocation();
  const { selectedCampaignName, setSelectedCampaignName } = useCampaignContext();
  const { filters, updateFilter } = useFilters();
  const { state, toggleSidebar } = useSidebar();
  const sidebarCollapsed = state === "collapsed";
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const pageTitle = PAGE_TITLES[location.pathname] || "Dashboard";
  const isSettingsPage = location.pathname === "/settings";
  const isCampaignPage = ["/dashboard", "/dataset", "/tickets", "/schedule", "/campaigns/reports"].includes(location.pathname);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setAvatarUrl(data.avatar_url);
          if (data.display_name) {
            setInitials(
              data.display_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
            );
          }
        }
      });
  }, [session?.user?.id]);

  const startEditing = () => {
    setEditValue(selectedCampaignName);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmEdit = () => {
    if (editValue.trim()) {
      setSelectedCampaignName(editValue.trim());
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2 min-w-0">
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="h-6 w-6 rounded-full border border-border bg-background shadow-sm flex items-center justify-center hover:bg-accent transition-colors shrink-0"
              aria-label="Open sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <h1 className="font-semibold whitespace-nowrap text-3xl text-muted-foreground">{pageTitle}</h1>
          {selectedCampaignName && isCampaignPage && !isSettingsPage && (
            <>
              <span className="text-lg text-muted-foreground font-light">|</span>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <Input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="h-7 text-sm w-[260px]"
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={confirmEdit}>
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <button onClick={startEditing} className="flex items-center gap-1.5 group min-w-0">
                  <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                    {selectedCampaignName}
                  </span>
                  <Pencil className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isSettingsPage && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chargers..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="pl-8 h-9 w-[200px] text-sm"
              />
            </div>
          )}
          <NotificationBell />
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarImage src={avatarUrl || undefined} alt="Profile" />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials || <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
