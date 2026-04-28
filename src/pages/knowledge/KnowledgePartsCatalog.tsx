import { Package } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import PartsCatalog from "@/pages/PartsCatalog";
import { KnowledgePageHeader } from "@/components/knowledge/KnowledgePageHeader";

export default function KnowledgePartsCatalog() {
  usePageTitle("Parts Catalog");
  return (
    <div>
      <div className="px-8 pt-8 max-w-7xl mx-auto">
        <KnowledgePageHeader
          title="Parts Catalog"
          subtitle="Every part Neural OS has learned from real estimates and field repairs."
          icon={Package}
        />
      </div>
      <PartsCatalog />
    </div>
  );
}
