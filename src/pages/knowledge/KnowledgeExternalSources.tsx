import { Globe } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { WebSearchSection } from "@/components/ai-agent/WebSearchSection";
import { KnowledgePageHeader } from "@/components/knowledge/KnowledgePageHeader";

export default function KnowledgeExternalSources() {
  usePageTitle("External Sources");
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <KnowledgePageHeader
        title="External Sources"
        subtitle="Industry standards, OEM bulletins, and technical whitepapers that augment the NOCH Knowledge Graph."
        icon={Globe}
      />
      <WebSearchSection />
    </div>
  );
}
