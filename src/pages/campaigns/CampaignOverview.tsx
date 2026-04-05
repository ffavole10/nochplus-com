import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCampaign } from "@/hooks/useCampaigns";
import { useCampaignChargers } from "@/hooks/useCampaignChargers";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Activity, AlertTriangle, CheckCircle, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function CampaignOverview() {
  const { campaignId } = useParams();
  const { selectedCampaignId } = useCampaignContext();
  const id = campaignId || selectedCampaignId || null;
  const { data: campaign } = useCampaign(id);
  const { data: chargers = [] } = useCampaignChargers(id);
  const navigate = useNavigate();

  usePageTitle(campaign ? `Overview | ${campaign.name}` : "Overview");

  const stats = useMemo(() => {
    const total = chargers.length;
    const critical = chargers.filter(c => c.priority === "critical").length;
    const high = chargers.filter(c => c.priority === "high").length;
    const completed = chargers.filter(c => c.status === "completed").length;
    const actionRequired = critical + high;
    const healthPct = total > 0 ? Math.round(((total - actionRequired) / total) * 100) : 0;
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, critical, high, completed, actionRequired, healthPct, progressPct };
  }, [chargers]);

  const daysRemaining = useMemo(() => {
    if (!campaign?.deadline) return null;
    const diff = Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          Overview <span className="text-muted-foreground font-normal">| {campaign.name}</span>
        </h1>
        <Badge variant="outline" className="capitalize text-xs">
          {(campaign.status || "draft").replace("_", " ")}
        </Badge>
      </div>

      {/* Metadata strip */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <span>Partner: <strong className="text-foreground">{campaign.customer}</strong></span>
        {campaign.start_date && <span>Start: {format(new Date(campaign.start_date), "MMM d, yyyy")}</span>}
        {campaign.deadline && <span>Deadline: {format(new Date(campaign.deadline), "MMM d, yyyy")}</span>}
        <span>Chargers: <strong className="text-foreground">{stats.total}</strong></span>
      </div>

      {stats.total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-lg">
          <Upload className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No chargers in this campaign yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Upload a dataset to populate charger records.</p>
          <Button onClick={() => navigate(`/campaigns/${id}/chargers`)} size="sm">
            <Upload className="h-4 w-4 mr-1" /> Upload Dataset
          </Button>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Network Health</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.healthPct}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Action Required</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.actionRequired}</p>
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

          {/* Priority breakdown */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">Findings by Priority</h3>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-lg font-bold text-destructive">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-500">{stats.high}</p>
                  <p className="text-xs text-muted-foreground">High</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-yellow-500">
                    {chargers.filter(c => c.priority === "medium").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Medium</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-muted-foreground">
                    {chargers.filter(c => c.priority === "low").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Low</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
