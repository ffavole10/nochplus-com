import { useState } from "react";
import { Link } from "react-router-dom";
import { Upload, FileSpreadsheet, LayoutDashboard, FolderOpen, CheckSquare, Rocket, Clock, CheckCircle2, CalendarClock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Campaign } from "@/types/campaign";
import { SampleCampaign, CUSTOMER_LABELS } from "@/data/sampleCampaigns";
import nochLogo from "@/assets/noch-logo-white.png";

interface MissionControlLandingProps {
  campaigns: Campaign[];
  onUploadFile: (file: File) => void;
  onSelectCampaigns: (campaignIds: string[]) => void;
  onCreateNew: () => void;
  onDeleteCampaign?: (id: string) => void;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "active":
    case "In Progress":
      return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    case "completed":
    case "Completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "draft":
    case "Scheduled":
      return <CalendarClock className="h-3.5 w-3.5 text-blue-500" />;
    default:
      return <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string) {
  const variants: Record<string, string> = {
    active: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "In Progress": "bg-amber-500/10 text-amber-600 border-amber-500/20",
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    Completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    draft: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Scheduled: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };
  return variants[status] || "bg-muted text-muted-foreground";
}

export function MissionControlLanding({ campaigns, onUploadFile, onSelectCampaigns, onCreateNew, onDeleteCampaign }: MissionControlLandingProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Merge user campaigns + sample campaigns into a unified list
  const allCampaigns = [
    ...campaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status as string,
      customer: c.configuration?.name || "—",
      totalChargers: c.statistics.totalChargers,
      startDate: c.startDate,
      endDate: c.endDate,
      source: "user" as const,
    })),
    ...sampleCampaigns.map(c => ({
      id: `sample-${c.id}`,
      name: c.name,
      status: c.status,
      customer: CUSTOMER_LABELS[c.customer] || c.customer,
      totalChargers: c.totalChargers,
      startDate: c.startDate,
      endDate: c.endDate,
      source: "sample" as const,
    })),
  ];

  const toggleId = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(allCampaigns.map(c => c.id));
  const clearAll = () => setSelectedIds([]);

  const totalChargers = allCampaigns
    .filter(c => selectedIds.includes(c.id))
    .reduce((sum, c) => sum + c.totalChargers, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <img src={nochLogo} alt="Noch Power" className="h-8 brightness-0 dark:brightness-100" />
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Tickets
          </h1>
        </div>
        <Link to="/">
          <Button variant="outline" size="sm" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Button>
        </Link>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center p-6 overflow-auto">
        <div className="w-full max-w-4xl space-y-8">
          {/* Top section: Upload + Create New */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Upload File */}
            <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadFile(file);
                  }}
                  className="hidden"
                  id="landing-upload"
                />
                <label htmlFor="landing-upload" className="cursor-pointer block">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Upload New Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Import an Excel or CSV file with charger data
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">.xlsx, .xls, .csv</p>
                </label>
              </CardContent>
            </Card>

            {/* Create New Campaign */}
            <Card
              className="border-2 border-border hover:border-primary/50 transition-colors cursor-pointer"
              onClick={onCreateNew}
            >
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Create New Campaign</h3>
                <p className="text-sm text-muted-foreground">
                  Start a fresh campaign plan from existing charger data
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Campaign List */}
          {allCampaigns.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    Select Campaigns
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Select one or more campaigns to view combined workload
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
                    Clear
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                {allCampaigns.map((campaign) => {
                  const isSelected = selectedIds.includes(campaign.id);
                  return (
                    <Card
                      key={campaign.id}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                      onClick={() => toggleId(campaign.id)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleId(campaign.id)}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(campaign.status)}
                            <span className="font-medium text-sm text-foreground truncate">
                              {campaign.name}
                            </span>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${getStatusBadge(campaign.status)}`}>
                              {campaign.status}
                            </Badge>
                            {campaign.source === "sample" && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted">
                                Demo
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{campaign.customer}</span>
                            <span>{campaign.totalChargers} chargers</span>
                            <span>{campaign.startDate} → {campaign.endDate}</span>
                          </div>
                        </div>
                        {campaign.source === "user" && onDeleteCampaign && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{campaign.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => {
                                    setSelectedIds(prev => prev.filter(x => x !== campaign.id));
                                    onDeleteCampaign(campaign.id);
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Selection summary + action */}
              {selectedIds.length > 0 && (
                <div className="sticky bottom-0 bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {selectedIds.length} campaign{selectedIds.length > 1 ? "s" : ""} selected
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {totalChargers.toLocaleString()} total chargers
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => onSelectCampaigns(selectedIds)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Rocket className="h-4 w-4 mr-1" />
                    Open in Mission Control
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
