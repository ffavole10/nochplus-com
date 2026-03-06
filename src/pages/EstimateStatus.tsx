import { useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import statusApprovedHero from "@/assets/status-approved-hero.png";

export default function EstimateStatus() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") || "error";
  const message = searchParams.get("message");

  if (status === "approved") {
    return (
      <div className="min-h-screen w-full flex items-center justify-start overflow-hidden" style={{ backgroundColor: '#e5e5e5' }}>
        <img
          src={statusApprovedHero}
          alt="You're in Good Hands — Your service is confirmed"
          className="h-screen w-auto max-w-none object-contain object-left"
        />
      </div>
    );
  }

  // "already-approved" gets the same blob design
  if (status === "already-approved") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: '#e5e5e5' }}>
        <img
          src={statusApprovedHero}
          alt="You're in Good Hands — Your service is confirmed"
          className="h-screen w-auto max-w-full object-contain"
        />
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <img src="/images/noch-power-logo.png" alt="Noch Power" className="h-10 mx-auto" />
        </div>
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden text-center p-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 text-red-500 mb-6">
            <AlertTriangle className="h-14 w-14" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Oops, Something Went Wrong</h1>
          <p className="text-slate-500 text-base leading-relaxed">
            {message || "We couldn't process your request. Please try again or contact your account manager."}
          </p>
        </div>
      </div>
    </div>
  );
}
