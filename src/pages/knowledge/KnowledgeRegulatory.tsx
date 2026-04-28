import { ShieldCheck } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { RegionalRegulatoryIntelligence } from "@/components/regulatory/RegionalRegulatoryIntelligence";
import { KnowledgePageHeader } from "@/components/knowledge/KnowledgePageHeader";

export default function KnowledgeRegulatory() {
  usePageTitle("Regulatory");
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <KnowledgePageHeader
        title="Regulatory"
        subtitle="Federal and state-level EV regulations that Neural OS uses to contextualize every ticket and field report."
        icon={ShieldCheck}
      />
      <RegionalRegulatoryIntelligence />
    </div>
  );
}
