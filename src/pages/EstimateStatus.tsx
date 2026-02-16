import { useSearchParams } from "react-router-dom";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";

export default function EstimateStatus() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") || "error";
  const message = searchParams.get("message");

  const configs: Record<string, { icon: React.ReactNode; title: string; description: string; bgColor: string; iconColor: string }> = {
    approved: {
      icon: <CheckCircle className="h-16 w-16" />,
      title: "Estimate Approved!",
      description: "Thank you for approving this service estimate. Your account manager has been notified and the service team will be dispatched shortly.",
      bgColor: "bg-green-50",
      iconColor: "text-green-500",
    },
    "already-approved": {
      icon: <Info className="h-16 w-16" />,
      title: "Already Approved",
      description: "This estimate has already been approved. Thank you!",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    error: {
      icon: <AlertTriangle className="h-16 w-16" />,
      title: "Something Went Wrong",
      description: message || "An error occurred while processing your request. Please try again later.",
      bgColor: "bg-red-50",
      iconColor: "text-red-500",
    },
  };

  const config = configs[status] || configs.error;

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl shadow-lg overflow-hidden text-center">
        <div className="bg-[#1e293b] py-6 px-8">
          <img
            src="/images/noch-power-logo-white-2.png"
            alt="Noch Power"
            className="h-9 mx-auto"
          />
        </div>
        <div className="p-10">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${config.bgColor} ${config.iconColor} mb-6`}>
            {config.icon}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {config.title}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {config.description}
          </p>
        </div>
      </div>
    </div>
  );
}
