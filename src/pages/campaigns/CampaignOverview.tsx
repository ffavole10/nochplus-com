import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCampaign } from "@/hooks/useCampaigns";
import { useCampaignChargers } from "@/hooks/useCampaignChargers";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePartners } from "@/hooks/usePartners";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Activity, AlertTriangle, CheckCircle, Clock, MapPin,
  Building2, Zap, BarChart3, FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import { CampaignSubtitle } from "@/components/campaigns/CampaignSubtitle";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  on_hold: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function CampaignOverview() {
  const { campaignId } = useParams();
  const { selectedCampaignId } = useCampaignContext();
  const id = campaignId || selectedCampaignId || null;
  const { data: campaign } = useCampaign(id);
  const { data: chargers = [] } = useCampaignChargers(id);
  const { data: partners = [] } = usePartners();
  const navigate = useNavigate();

  usePageTitle("Overview");

  const partnerLabel = useMemo(() => {
    if (!campaign) return "";
    const p = partners.find(p => p.value === campaign.customer);
    return p?.label || campaign.customer;
  }, [campaign, partners]);

  const stats = useMemo(() => {
    const total = chargers.length;
    const sites = new Set(chargers.map(c => c.site_name).filter(Boolean)).size;
    const statusCounts: Record<string, number> = {};
    chargers.forEach(c => {
      const s = c.status || "pending";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const completed = statusCounts["completed"] || 0;
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Top statuses for display
    const topStatuses = Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    // Priority breakdown
    const priorities: Record<string, number> = {};
    chargers.forEach(c => {
      const p = c.priority || "low";
      priorities[p] = (priorities[p] || 0) + 1;
    });

    // States breakdown
    const statesCounts: Record<string, number> = {};
    chargers.forEach(c => {
      const s = c.state?.toUpperCase();
      if (s) statesCounts[s] = (statesCounts[s] || 0) + 1;
    });
    const topStates = Object.entries(statesCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Top sites
    const siteCounts: Record<string, number> = {};
    chargers.forEach(c => {
      const s = c.site_name;
      if (s) siteCounts[s] = (siteCounts[s] || 0) + 1;
    });
    const topSites = Object.entries(siteCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return { total, sites, completed, progressPct, topStatuses, priorities, topStates, topSites };
  }, [chargers]);

  const daysRemaining = useMemo(() => {
    if (!campaign?.deadline) return null;
    return Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [campaign]);

  if (!campaign) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-muted-foreground">
        Select a campaign to view its overview.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Campaign Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{campaign.name}</h1>
            <Badge variant="outline" className={STATUS_BADGE[campaign.status || "draft"]}>
              {(campaign.status || "draft").replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {partnerLabel}
            </span>
            {campaign.start_date && (
              <span>Start: {format(new Date(campaign.start_date), "MMM d, yyyy")}</span>
            )}
            {campaign.deadline && (
              <span>Deadline: {format(new Date(campaign.deadline), "MMM d, yyyy")}</span>
            )}
          </div>
        </div>
      </div>

      {stats.total === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl bg-card">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Upload Your Chargers to Get Started</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Import your charger dataset to begin scanning, scheduling, and managing this campaign.
          </p>
          <Button onClick={() => navigate(`/campaigns/${id}/upload`)} className="gap-2">
            <Upload className="h-4 w-4" /> Upload Dataset
          </Button>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Chargers</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.total.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Sites</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.sites.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Progress</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.progressPct}%</p>
                <p className="text-xs text-muted-foreground">{stats.completed} / {stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Days Remaining</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{daysRemaining ?? "—"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown + Priority */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Status Summary
                </h3>
                <div className="space-y-2">
                  {stats.topStatuses.map(([status, count]) => {
                    const pct = Math.round((count / stats.total) * 100);
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 capitalize truncate">{status}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium w-12 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Priority Breakdown
                </h3>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  {(["critical", "high", "medium", "low"] as const).map(p => {
                    const count = stats.priorities[p] || 0;
                    const colors: Record<string, string> = {
                      critical: "text-destructive",
                      high: "text-orange-500",
                      medium: "text-yellow-500",
                      low: "text-muted-foreground",
                    };
                    return (
                      <div key={p} className="text-center">
                        <p className={`text-lg font-bold ${colors[p]}`}>{count}</p>
                        <p className="text-xs text-muted-foreground capitalize">{p}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Geographic + Top Sites */}
          <div className="grid md:grid-cols-2 gap-4">
            {stats.topStates.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3">Chargers by State</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.topStates.map(([state, count]) => (
                      <Badge key={state} variant="secondary" className="text-xs">
                        {state}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {stats.topSites.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-3">Top Sites</h3>
                  <div className="space-y-1.5">
                    {stats.topSites.map(([site, count]) => (
                      <div key={site} className="flex justify-between items-center text-sm">
                        <span className="truncate text-muted-foreground max-w-[200px]">{site}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
