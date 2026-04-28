import { DollarSign } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { OperationsPageHeader } from "@/components/operations/OperationsPageHeader";
import Estimates from "@/pages/Estimates";

export default function OperationsEstimates() {
  usePageTitle("Estimates");
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <OperationsPageHeader
          title="Estimates"
          subtitle="Quote management across all campaigns and customers."
          icon={DollarSign}
        />
      </div>
      <Estimates />
    </div>
  );
}
