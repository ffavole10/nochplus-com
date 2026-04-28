import { Wrench } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { OperationsPageHeader } from "@/components/operations/OperationsPageHeader";
import AllWorkOrders from "@/pages/field-capture/admin/AllWorkOrders";

export default function OperationsWorkOrders() {
  usePageTitle("Work Orders");
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <OperationsPageHeader
          title="Work Orders"
          subtitle="Internal dispatch units. Generated from tickets when remote resolution isn't sufficient."
          icon={Wrench}
        />
      </div>
      <AllWorkOrders />
    </div>
  );
}
