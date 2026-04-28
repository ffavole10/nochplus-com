import { Boxes } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { OperationsPageHeader } from "@/components/operations/OperationsPageHeader";
import Parts from "@/pages/placeholders/Parts";

export default function OperationsPartsInventory() {
  usePageTitle("Parts Inventory");
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <OperationsPageHeader
          title="Parts Inventory"
          subtitle="Real-time parts stock across all warehouses and field vehicles."
          icon={Boxes}
        />
      </div>
      <Parts />
    </div>
  );
}
