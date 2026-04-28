import { GitBranch } from "lucide-react";
import { BusinessPageHeader } from "@/components/business/BusinessPageHeader";
import GrowthPipeline from "@/pages/growth/GrowthPipeline";

export default function BusinessPipeline() {
  return (
    <div className="p-6 pb-0">
      <BusinessPageHeader
        title="Pipeline"
        subtitle="Active deals across the NOCH+ membership funnel."
        icon={GitBranch}
      />
      {/* Re-render the existing Growth Pipeline body — same kanban + list views, search, filters. */}
      <div className="-mx-6">
        <GrowthPipeline />
      </div>
    </div>
  );
}
