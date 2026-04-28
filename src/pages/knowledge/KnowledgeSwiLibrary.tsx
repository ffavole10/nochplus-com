import { BookText } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { SWIDocumentManagement } from "@/components/settings/SWIDocumentManagement";
import { KnowledgePageHeader } from "@/components/knowledge/KnowledgePageHeader";

export default function KnowledgeSwiLibrary() {
  usePageTitle("SWI Library");
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <KnowledgePageHeader
        title="SWI Library"
        subtitle="Standard Work Instructions across every supported OEM. The knowledge base that powers Neural OS Reasoning."
        icon={BookText}
      />
      <SWIDocumentManagement />
    </div>
  );
}
