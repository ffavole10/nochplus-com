import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Info } from "lucide-react";
import approvedHero from "@/assets/estimate-approved-hero.jpeg";

export default function EstimateStatus() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") || "error";
  const message = searchParams.get("message");

  if (status === "approved") {
    return (
      <div className="min-h-screen bg-[#f0f0f0] relative overflow-hidden">
        {/* Logo */}
        <div className="absolute top-6 left-8 z-20">
          <img src="/images/noch-power-logo.png" alt="Noch Power" className="h-10" />
        </div>

        <div className="min-h-screen flex items-center justify-center px-4 py-20">
          <div className="max-w-6xl w-full flex flex-col md:flex-row items-center gap-0 relative">
            {/* Left — Organic blob with text */}
            <div className="relative z-10 flex-1">
              {/* Blob shape */}
              <svg
                viewBox="0 0 600 550"
                className="w-full max-w-[600px]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <clipPath id="blobClip">
                    <path d="M80,60 C200,-20 420,-10 520,80 C620,170 600,320 540,420 C480,520 320,560 180,520 C40,480 -20,380 10,260 C40,140 -40,140 80,60 Z" />
                  </clipPath>
                </defs>
                <path
                  d="M80,60 C200,-20 420,-10 520,80 C620,170 600,320 540,420 C480,520 320,560 180,520 C40,480 -20,380 10,260 C40,140 -40,140 80,60 Z"
                  fill="hsl(var(--primary))"
                />
                {/* Small floating blob accent */}
                <ellipse cx="420" cy="40" rx="30" ry="28" fill="hsl(var(--primary))" opacity="0.7" />
                
                <foreignObject x="60" y="80" width="440" height="420">
                  <div className="flex flex-col justify-center h-full px-4 text-white">
                    <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5 drop-shadow-sm">
                      You're in<br />Good Hands.
                    </h1>
                    <p className="text-white/90 text-base md:text-lg font-medium mb-4 leading-relaxed">
                      Your service is confirmed. The team is already on it.
                    </p>
                    <p className="text-white/80 text-sm md:text-base leading-relaxed mb-4">
                      We've received your request and assigned a certified technician. You'll hear from us before we arrive. No follow-up needed on your end.
                    </p>
                    <p className="text-white/80 text-sm md:text-base leading-relaxed italic mb-6">
                      Your charger will be back online. We'll make sure of it.
                    </p>
                    <div>
                      <a
                        href="/"
                        className="inline-block bg-white text-slate-900 font-semibold text-sm px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
                      >
                        Track Our Progress
                      </a>
                    </div>
                  </div>
                </foreignObject>
              </svg>
            </div>

            {/* Right — Character illustration */}
            <div className="flex-shrink-0 -ml-12 md:-ml-20 relative z-0">
              <img
                src={approvedHero}
                alt="Celebration"
                className="h-[400px] md:h-[520px] object-contain object-left drop-shadow-2xl"
                style={{ 
                  clipPath: 'inset(0 0 0 45%)',
                  marginLeft: '-10%'
                }}
              />
            </div>
          </div>
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
