import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { User, LogOut, Pencil, Check, X, Search, ChevronRight, FileText, Share2, Home, Target } from "lucide-react";
import { useFocusMode } from "@/hooks/useFocus5";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useFilters } from "@/contexts/FilterContext";
import { useCampaign, useChargerRecords } from "@/hooks/useCampaigns";
import { chargerRecordToCharger, getNetworkStats } from "@/data/chargerData";
import { chargerRecordToAssessment } from "@/lib/assessmentParser";
import { getTicketPriorityStats } from "@/lib/ticketPriority";
import { GenerateCampaignReportModal } from "@/components/reports/GenerateCampaignReportModal";
import type { ReportSnapshot } from "@/lib/campaignReportPdf";
import { CommandPaletteTrigger } from "@/components/command-palette/CommandPaletteTrigger";

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
  "/noch-plus/monitoring": "Mission Control",
  "/noch-plus/partnership-hub": "Partnership Hub",
  "/campaigns": "Campaigns",
};

const CAMPAIGN_TAB_TITLES: Record<string, string> = {
  overview: "Overview",
  chargers: "Chargers",
  schedule: "Schedule",
  cost: "Cost",
  reports: "Reports",
  upload: "Upload",
  scan: "Chargers",
  deploy: "Schedule",
  price: "Cost",
  launch: "Reports",
};

function getCampaignPageTitle(pathname: string): string | null {
  // Campaign list view
  if (pathname === "/campaigns") {
    return "Campaigns";
  }
  // Campaign tab view: /campaigns/:id/:tab
  const tabMatch = pathname.match(/^\/campaigns\/[^/]+\/(\w+)$/);
  if (tabMatch) {
    const tabName = CAMPAIGN_TAB_TITLES[tabMatch[1]];
    if (tabName) return tabName;
  }
  return null;
}

export function PlatformHeader() {
  const { session } = useAuth();
  const location = useLocation();
  const { selectedCampaignId, selectedCampaignName, setSelectedCampaignName, selectedCustomer } = useCampaignContext();
  const { filters, updateFilter } = useFilters();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const isDashboard = location.pathname === "/dashboard";
  const { data: campaignData } = useCampaign(isDashboard ? selectedCampaignId || null : null);
  const { data: chargerRecords = [] } = useChargerRecords(isDashboard ? selectedCampaignId || null : null);

  const reportSnapshot = useMemo<ReportSnapshot | null>(() => {
    if (!isDashboard || !selectedCampaignId || chargerRecords.length === 0) return null;
    const customer = campaignData?.customer || selectedCustomer || "";
    const chargers = chargerRecords.map((r) => chargerRecordToCharger(r, customer));
    const stats = getNetworkStats(chargers);
    const assessments = chargerRecords.map((r) => chargerRecordToAssessment(r));
    const ts = getTicketPriorityStats(assessments);

    // Top risk sites (Critical + High)
    const siteMap = new Map<string, { site_name: string; city: string; state: string; count: number }>();
    chargers.forEach((c) => {
      if (c.status !== "Critical" && c.status !== "High") return;
      const k = `${c.site_name}|${c.city}|${c.state}`;
      const ex = siteMap.get(k);
      if (ex) ex.count++;
      else siteMap.set(k, { site_name: c.site_name, city: c.city, state: c.state, count: 1 });
    });
    const topRiskSites = Array.from(siteMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

    // Top priority chargers
    const topPriorityChargers = chargers
      .filter((c) => c.status === "Critical" || c.status === "High")
      .slice(0, 10)
      .map((c) => ({
        station_id: c.station_number || c.charger_id || "—",
        site_name: c.site_name || "—",
        type: c.model || "—",
        priority: c.status,
        location: `${c.city}, ${c.state}`,
      }));

    // Geo distribution
    const geoMap = new Map<string, number>();
    chargers.forEach((c) => {
      if (!c.state) return;
      geoMap.set(c.state, (geoMap.get(c.state) || 0) + 1);
    });
    const geoDistribution = Array.from(geoMap.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalChargers: stats.total,
      serviced: stats.serviced,
      healthScore: stats.healthScore,
      critical: stats.critical,
      high: stats.high,
      medium: stats.medium,
      low: stats.low,
      ticketStats: ts
        ? {
            open: ts.total,
            solved: 0,
            p1: ts.p1,
            p2: ts.p2,
            p3: ts.p3,
            p4: ts.p4,
            slaBreached: 0,
            over90Days: 0,
          }
        : undefined,
      topRiskSites,
      topPriorityChargers,
      geoDistribution,
      customerName: customer,
      campaignName: selectedCampaignName || campaignData?.name || "Campaign",
    };
  }, [isDashboard, selectedCampaignId, chargerRecords, campaignData, selectedCustomer, selectedCampaignName]);
  const { state, toggleSidebar } = useSidebar();
  const sidebarCollapsed = state === "collapsed";
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const campaignTitle = getCampaignPageTitle(location.pathname);
  const pageTitle = campaignTitle || PAGE_TITLES[location.pathname] || "";
  const isSettingsPage = location.pathname === "/settings";
  const isCampaignPage = false; // Campaign name now shown in pageTitle directly

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
          <h1 className="whitespace-nowrap text-3xl text-muted-foreground font-semibold">{pageTitle}</h1>
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
          <CommandPaletteTrigger />
          {isDashboard && (
            <Button
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              disabled={!reportSnapshot}
              onClick={() => setReportModalOpen(true)}
              title={!reportSnapshot ? "Select a campaign to generate a report" : "Generate Campaign Report"}
            >
              <FileText className="w-4 h-4" />
              <Share2 className="w-3.5 h-3.5 -ml-1" />
              <span className="hidden md:inline">Generate Report</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            title="View customer portal"
            onClick={() => { window.location.href = "/"; }}
          >
            <Home className="w-4 h-4" />
          </Button>
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
      {isDashboard && reportSnapshot && selectedCampaignId && (
        <GenerateCampaignReportModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          campaignId={selectedCampaignId}
          campaignName={reportSnapshot.campaignName}
          campaignCustomerId={campaignData?.customer_id ?? null}
          snapshot={reportSnapshot}
        />
      )}
    </header>
  );
}
