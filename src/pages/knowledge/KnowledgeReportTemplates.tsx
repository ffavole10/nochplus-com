import { ClipboardList } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import WorkTemplates from "@/pages/field-capture/admin/WorkTemplates";
import { KnowledgePageHeader } from "@/components/knowledge/KnowledgePageHeader";

export default function KnowledgeReportTemplates() {
  usePageTitle("Report Templates");
  return (
    <div>
      <div className="px-8 pt-8 max-w-7xl mx-auto">
        <KnowledgePageHeader
          title="Report Templates"
          subtitle="Auto-populating narratives for technician field reports. Coverage matrix shows which issue × root cause combinations have active templates."
          icon={ClipboardList}
        />
      </div>
      <WorkTemplates />
    </div>
  );
}
