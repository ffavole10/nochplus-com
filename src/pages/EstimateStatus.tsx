import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Info, PartyPopper } from "lucide-react";
import maxYeah from "@/assets/max-yeah.png";

export default function EstimateStatus() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") || "error";
  const message = searchParams.get("message");

  if (status === "approved") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 flex items-center justify-center p-4 overflow-hidden relative">
        {/* Confetti-like floating dots */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-bounce"
              style={{
                width: `${6 + Math.random() * 10}px`,
                height: `${6 + Math.random() * 10}px`,
                background: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i % 6],
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.3 + Math.random() * 0.4,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        <div className="max-w-2xl w-full relative z-10">
          {/* Logo header */}
          <div className="text-center mb-8">
            <img
              src="/images/noch-power-logo.png"
              alt="Noch Power"
              className="h-10 mx-auto"
            />
          </div>

          {/* Main card */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-emerald-100/50 overflow-hidden border border-emerald-100">
            <div className="flex flex-col md:flex-row items-center">
              {/* Left content */}
              <div className="flex-1 p-8 md:p-12 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                  <PartyPopper className="h-4 w-4" />
                  Estimate Approved
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
                  You relax now,
                  <br />
                  <span className="bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">
                    we got this!
                  </span>
                </h1>

                <p className="text-slate-500 text-base md:text-lg leading-relaxed mb-6">
                  Your service estimate has been approved. Our team is already gearing up to get your chargers running like new. Sit back, grab a coffee ☕ — we'll take it from here.
                </p>

                <div className="flex items-center gap-3 justify-center md:justify-start text-sm text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Account manager notified
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    Service team dispatching
                  </div>
                </div>
              </div>

              {/* Right — Max */}
              <div className="flex-shrink-0 px-6 pb-0 md:pb-0 md:pr-8 md:pl-0 flex items-end justify-center">
                <img
                  src={maxYeah}
                  alt="Max celebrating"
                  className="h-64 md:h-80 object-contain drop-shadow-xl"
                  style={{ marginBottom: '-4px' }}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-slate-400 text-xs mt-6">
            Questions? Reach out to your account manager — they'd love to help.
          </p>
        </div>
      </div>
    );
  }

  // already-approved & error states
  const configs: Record<string, { icon: React.ReactNode; title: string; description: string; bgColor: string; iconColor: string }> = {
    "already-approved": {
      icon: <Info className="h-14 w-14" />,
      title: "Already Approved ✅",
      description: "This estimate was already approved — no worries, we're on it!",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    error: {
      icon: <AlertTriangle className="h-14 w-14" />,
      title: "Oops, Something Went Wrong",
      description: message || "We couldn't process your request. Please try again or contact your account manager.",
      bgColor: "bg-red-50",
      iconColor: "text-red-500",
    },
  };

  const config = configs[status] || configs.error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <img src="/images/noch-power-logo.png" alt="Noch Power" className="h-10 mx-auto" />
        </div>
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden text-center p-10">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${config.bgColor} ${config.iconColor} mb-6`}>
            {config.icon}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">{config.title}</h1>
          <p className="text-slate-500 text-base leading-relaxed">{config.description}</p>
        </div>
      </div>
    </div>
  );
}
