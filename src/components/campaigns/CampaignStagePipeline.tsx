import { useNavigate, useLocation } from "react-router-dom";
import { Upload, Search, CalendarDays, DollarSign, Rocket, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaignContext } from "@/contexts/CampaignContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useMemo } from "react";

export type StageStatus = "not_started" | "in_progress" | "complete";

interface StageConfig {
  number: number;
  label: string;
  key: string;
  icon: React.ElementType;
  route: string;
}

const STAGES: StageConfig[] = [
  { number: 1, label: "UPLOAD", key: "upload", icon: Upload, route: "upload" },
  { number: 2, label: "SCAN", key: "scan", icon: Search, route: "scan" },
  { number: 3, label: "DEPLOY", key: "deploy", icon: CalendarDays, route: "deploy" },
  { number: 4, label: "PRICE", key: "price", icon: DollarSign, route: "price" },
  { number: 5, label: "LAUNCH", key: "launch", icon: Rocket, route: "launch" },
];

export function CampaignStagePipeline() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCampaignId } = useCampaignContext();
  const { data: campaigns = [] } = useCampaigns();

  const campaign = useMemo(() => {
    return campaigns.find(c => c.id === selectedCampaignId);
  }, [campaigns, selectedCampaignId]);

  const stageStatus = useMemo(() => {
    const defaults: Record<string, StageStatus> = {
      upload: "not_started",
      scan: "not_started",
      deploy: "not_started",
      price: "not_started",
      launch: "not_started",
    };
    if (!campaign?.stage_status) return defaults;
    const ss = campaign.stage_status as Record<string, string>;
    return {
      upload: (ss.upload || "not_started") as StageStatus,
      scan: (ss.scan || "not_started") as StageStatus,
      deploy: (ss.deploy || "not_started") as StageStatus,
      price: (ss.price || "not_started") as StageStatus,
      launch: (ss.launch || "not_started") as StageStatus,
    };
  }, [campaign]);

  const currentPath = location.pathname;

  const handleStageClick = (stage: StageConfig) => {
    if (!selectedCampaignId) return;
    navigate(`/campaigns/${selectedCampaignId}/${stage.route}`);
  };

  return (
    <div className="space-y-0">
      {STAGES.map((stage, idx) => {
        const status = stageStatus[stage.key];
        const isActive = currentPath.includes(`/${stage.route}`);
        const isComplete = status === "complete";
        const isInProgress = status === "in_progress";
        const prevComplete = idx > 0 ? stageStatus[STAGES[idx - 1].key] === "complete" : true;

        return (
          <div key={stage.key}>
            {/* Connecting line above (except first) */}
            {idx > 0 && (
              <div className="flex items-center pl-[18px]">
                <div
                  className={cn(
                    "w-[2px] h-3",
                    prevComplete && isComplete ? "bg-primary" :
                    prevComplete && isInProgress ? "bg-primary/50" :
                    "bg-sidebar-border/60"
                  )}
                />
              </div>
            )}

            {/* Stage row */}
            <button
              onClick={() => handleStageClick(stage)}
              disabled={!selectedCampaignId}
              className={cn(
                "w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-xs transition-all group",
                !selectedCampaignId && "opacity-40 cursor-not-allowed",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              {/* Stage number circle */}
              <div
                className={cn(
                  "w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border transition-colors",
                  isComplete
                    ? "bg-primary text-primary-foreground border-primary"
                    : isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : isInProgress
                    ? "border-primary text-primary bg-primary/10"
                    : "border-sidebar-foreground/30 text-sidebar-foreground/50"
                )}
              >
                {isComplete ? <Check className="h-3 w-3" /> : stage.number}
              </div>

              {/* Label */}
              <span className={cn(
                "tracking-wider",
                isActive && "font-bold"
              )}>
                {stage.label}
              </span>

              {/* Status indicator on right */}
              <div className="ml-auto">
                {isComplete ? (
                  <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-2 w-2 text-primary-foreground" />
                  </div>
                ) : isInProgress ? (
                  <div className="w-3 h-3 rounded-full border-2 border-primary bg-primary/30" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-sidebar-foreground/30" />
                )}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
