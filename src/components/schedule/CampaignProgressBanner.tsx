import { Campaign } from "@/types/campaign";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Calendar, TrendingUp, Eye, XCircle } from "lucide-react";

interface CampaignProgressBannerProps {
  campaign: Campaign;
  onViewSchedule: () => void;
  onEndCampaign: () => void;
}

export function CampaignProgressBanner({ campaign, onViewSchedule, onEndCampaign }: CampaignProgressBannerProps) {
  const stats = campaign.statistics;
  const pct = stats.totalChargers > 0 ? Math.round((stats.completedChargers / stats.totalChargers) * 100) : 0;

  const statusLabel = stats.daysAheadBehind > 0
    ? `${stats.daysAheadBehind} ahead`
    : stats.daysAheadBehind < 0
      ? `${Math.abs(stats.daysAheadBehind)} behind`
      : "On track";

  const statusColor = stats.daysAheadBehind >= 0 ? "text-optimal" : "text-degraded";

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">Active Campaign: {campaign.name}</span>
            <Badge className="bg-optimal text-optimal-foreground text-[10px]">Active</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onViewSchedule}>
              <Eye className="h-3.5 w-3.5 mr-1" /> View Schedule
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={onEndCampaign}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> End
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <Progress value={pct} className="flex-1 h-2.5" />
          <span className="text-sm font-semibold">{pct}%</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="font-semibold text-foreground">{stats.completedChargers} chargers</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="font-semibold text-foreground">{stats.inProgressChargers} chargers</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Week</p>
            <p className="font-semibold text-foreground">{stats.currentWeek} of {stats.totalWeeks}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Status</p>
            <p className={`font-semibold ${statusColor}`}>{statusLabel}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
