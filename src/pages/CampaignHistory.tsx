import { useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { 
  Plus, 
  FolderOpen, 
  CheckCircle2, 
  Clock, 
  CalendarClock,
  Activity,
  Building2,
  ArrowLeft,
  TrendingUp,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CampaignUploadDialog } from "@/components/campaigns/CampaignUploadDialog";
import { useCampaigns } from "@/hooks/useCampaigns";
import { sampleCampaigns, CUSTOMER_LABELS, CampaignStatus } from "@/data/sampleCampaigns";

const getStatusIcon = (status: CampaignStatus) => {
  switch (status) {
    case "Completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "In Progress":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "Scheduled":
      return <CalendarClock className="h-4 w-4 text-blue-500" />;
  }
};

const getStatusBadgeVariant = (status: CampaignStatus) => {
  switch (status) {
    case "Completed":
      return "default";
    case "In Progress":
      return "secondary";
    case "Scheduled":
      return "outline";
  }
};

const getHealthScoreColor = (score: number) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score === 0) return "text-muted-foreground";
  return "text-red-500";
};

export default function CampaignHistory() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { data: dbCampaigns } = useCampaigns();

  // Combine database campaigns with sample data for display
  const allCampaigns = [
    ...sampleCampaigns,
    ...(dbCampaigns?.map((c) => ({
      id: c.id,
      name: c.name,
      customer: c.customer,
      status: "Completed" as CampaignStatus,
      quarter: c.quarter || "Q1",
      year: c.year || 2026,
      startDate: c.start_date || c.created_at,
      endDate: c.end_date || c.created_at,
      totalChargers: c.total_chargers,
      totalServiced: c.total_serviced,
      healthScore: c.health_score,
      optimalCount: c.optimal_count,
      degradedCount: c.degraded_count,
      criticalCount: c.critical_count,
    })) || []),
  ];

  // Calculate KPIs
  const totalCampaigns = allCampaigns.length;
  const completedCampaigns = allCampaigns.filter((c) => c.status === "Completed").length;
  const inProgressCampaigns = allCampaigns.filter((c) => c.status === "In Progress").length;
  const scheduledCampaigns = allCampaigns.filter((c) => c.status === "Scheduled").length;
  const totalChargers = allCampaigns.reduce((sum, c) => sum + c.totalChargers, 0);
  const totalServiced = allCampaigns.reduce((sum, c) => sum + c.totalServiced, 0);
  const avgHealthScore = Math.round(
    allCampaigns.filter((c) => c.healthScore > 0).reduce((sum, c) => sum + c.healthScore, 0) /
      allCampaigns.filter((c) => c.healthScore > 0).length || 0
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Campaign History</h1>
              </div>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Campaign
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <FolderOpen className="h-4 w-4" />
                Total Campaigns
              </div>
              <div className="text-2xl font-bold mt-1">{totalCampaigns}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Completed
              </div>
              <div className="text-2xl font-bold mt-1 text-green-500">{completedCampaigns}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4 text-yellow-500" />
                In Progress
              </div>
              <div className="text-2xl font-bold mt-1 text-yellow-500">{inProgressCampaigns}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <CalendarClock className="h-4 w-4 text-blue-500" />
                Scheduled
              </div>
              <div className="text-2xl font-bold mt-1 text-blue-500">{scheduledCampaigns}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Zap className="h-4 w-4" />
                Total Chargers
              </div>
              <div className="text-2xl font-bold mt-1">{totalChargers.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <TrendingUp className="h-4 w-4" />
                Total Serviced
              </div>
              <div className="text-2xl font-bold mt-1">{totalServiced.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Activity className="h-4 w-4" />
                Avg Health Score
              </div>
              <div className={`text-2xl font-bold mt-1 ${getHealthScoreColor(avgHealthScore)}`}>
                {avgHealthScore}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              All Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {allCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base truncate">{campaign.name}</h3>
                          <Badge variant={getStatusBadgeVariant(campaign.status)} className="flex items-center gap-1">
                            {getStatusIcon(campaign.status)}
                            {campaign.status}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {CUSTOMER_LABELS[campaign.customer] || campaign.customer}
                          </span>
                          <span>
                            {campaign.quarter} {campaign.year}
                          </span>
                          <span>
                            {format(new Date(campaign.startDate), "MMM d")} - {format(new Date(campaign.endDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs">Chargers</div>
                          <div className="font-semibold">{campaign.totalChargers}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs">Serviced</div>
                          <div className="font-semibold">{campaign.totalServiced}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-xs">Health</div>
                          <div className={`font-semibold ${getHealthScoreColor(campaign.healthScore)}`}>
                            {campaign.healthScore > 0 ? `${campaign.healthScore}%` : "—"}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500" 
                              style={{ 
                                width: `${campaign.totalChargers > 0 
                                  ? (campaign.optimalCount / campaign.totalChargers) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-500" 
                              style={{ 
                                width: `${campaign.totalChargers > 0 
                                  ? (campaign.degradedCount / campaign.totalChargers) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500" 
                              style={{ 
                                width: `${campaign.totalChargers > 0 
                                  ? (campaign.criticalCount / campaign.totalChargers) * 100 
                                  : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      <CampaignUploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
        onSuccess={() => {}}
      />
    </div>
  );
}
