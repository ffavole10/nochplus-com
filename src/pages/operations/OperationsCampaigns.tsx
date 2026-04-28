import { Target } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { OperationsPageHeader } from "@/components/operations/OperationsPageHeader";
import Index from "@/pages/Index";
import Dataset from "@/pages/Dataset";
import IssuesQueue from "@/pages/IssuesQueue";
import Schedule from "@/pages/Schedule";
import FieldReports from "@/pages/FieldReports";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "dashboard", label: "Dashboard", Component: Index },
  { key: "dataset", label: "Dataset", Component: Dataset },
  { key: "flagged", label: "Flagged", Component: IssuesQueue },
  { key: "schedule", label: "Schedule", Component: Schedule },
  { key: "field-reports", label: "Field Reports", Component: FieldReports },
] as const;

export default function OperationsCampaigns() {
  usePageTitle("Campaigns");
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[3] || "dashboard";
  const active = TABS.find((t) => t.key === segment) || TABS[0];
  const ActiveComponent = active.Component;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <OperationsPageHeader
          title="Campaigns"
          subtitle="Network health, fleet datasets, AI-triaged tickets, forward scheduling, and field reports — scoped per campaign."
          icon={Target}
        />
        <div className="border-b border-border mb-2 -mx-6 px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => navigate(`/operations/campaigns/${t.key}`)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  active.key === t.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div>
        <ActiveComponent />
      </div>
    </div>
  );
}
