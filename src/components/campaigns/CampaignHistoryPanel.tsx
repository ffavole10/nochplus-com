import { useState } from "react";
import { format } from "date-fns";
import { useCampaigns, useDeleteCampaign, Campaign } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
  FolderOpen, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Calendar, 
  Building2, 
  Activity,
  Loader2,
  FileSpreadsheet
} from "lucide-react";
import { CampaignUploadDialog } from "./CampaignUploadDialog";
import { toast } from "sonner";

interface CampaignHistoryPanelProps {
  selectedCampaignId: string | null;
  onSelectCampaign: (campaign: Campaign | null) => void;
}

const CUSTOMER_LABELS: Record<string, string> = {
  evgo: "EVgo",
  chargepoint: "ChargePoint",
  electrify_america: "Electrify America",
  tesla: "Tesla",
  rivian: "Rivian",
  other: "Other",
};

export function CampaignHistoryPanel({ selectedCampaignId, onSelectCampaign }: CampaignHistoryPanelProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  const { data: campaigns, isLoading, error } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();

  const handleDelete = async () => {
    if (!campaignToDelete) return;

    try {
      await deleteCampaign.mutateAsync(campaignToDelete.id);
      toast.success(`Campaign "${campaignToDelete.name}" deleted`);
      if (selectedCampaignId === campaignToDelete.id) {
        onSelectCampaign(null);
      }
    } catch (error) {
      toast.error("Failed to delete campaign");
    } finally {
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="h-5 w-5 text-primary" />
              Campaign History
            </CardTitle>
            <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive p-4">
              Failed to load campaigns
            </div>
          ) : !campaigns || campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No campaigns yet</p>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload your first campaign
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100%-1rem)]">
              <div className="p-4 space-y-2">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`relative p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${
                      selectedCampaignId === campaign.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    }`}
                    onClick={() => onSelectCampaign(campaign)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{campaign.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {CUSTOMER_LABELS[campaign.customer] || campaign.customer}
                          </Badge>
                          {campaign.quarter && campaign.year && (
                            <span className="text-xs text-muted-foreground">
                              {campaign.quarter} {campaign.year}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCampaignToDelete(campaign);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <span className={getHealthScoreColor(campaign.health_score)}>
                          {campaign.health_score}%
                        </span>
                      </span>
                      <span>{campaign.total_chargers} chargers</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(campaign.created_at), "MMM d, yyyy")}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ 
                            width: `${campaign.total_chargers > 0 
                              ? (campaign.optimal_count / campaign.total_chargers) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500" 
                          style={{ 
                            width: `${campaign.total_chargers > 0 
                              ? (campaign.degraded_count / campaign.total_chargers) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500" 
                          style={{ 
                            width: `${campaign.total_chargers > 0 
                              ? (campaign.critical_count / campaign.total_chargers) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <CampaignUploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
        onSuccess={() => {}}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{campaignToDelete?.name}"? This action cannot be undone 
              and will remove all associated charger records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
