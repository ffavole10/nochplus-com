import { useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import statusApprovedHero from "@/assets/status-approved-hero.png";

export default function EstimateStatus() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") || "error";
  const message = searchParams.get("message");

  if (status === "approved") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <img
          src={statusApprovedHero}
          alt="You're in Good Hands — Your service is confirmed"
          className="w-full h-full object-contain max-w-[1400px]"
        />
      </div>
    );
  }

  // "already-approved" gets the same blob design
  if (status === "already-approved") {
    return (
      <div className="min-h-screen bg-slate-100 relative overflow-hidden">
        <div className="absolute top-6 left-8 z-20">
          <img src="/images/noch-power-logo.png" alt="Noch Power" className="h-10" />
        </div>
        <div className="min-h-screen flex items-center justify-center px-4 py-20">
          <div className="max-w-6xl w-full flex flex-col md:flex-row items-center relative">
            <div className="relative z-10 flex-1 max-w-xl">
              <div
                className="bg-primary px-10 md:px-14 py-14 md:py-16 text-white relative"
                style={{
                  borderRadius: '42% 58% 62% 38% / 38% 32% 68% 62%',
                  minHeight: '460px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div className="absolute -top-4 right-16 w-14 h-12 bg-primary rounded-full opacity-70" />
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5 drop-shadow-sm">
                  You're in<br />Good Hands!
                </h1>
                <p className="text-white/90 text-base md:text-lg font-bold italic mb-4 leading-relaxed">
                  Your service is confirmed.<br />The team is already on it.
                </p>
                <p className="text-white/80 text-sm md:text-base leading-relaxed mb-4">
                  We've received your request and a NOCH ninja technician is already preparing for the mission. You'll hear from us soon. No follow-up needed on your end.
                </p>
                <p className="text-white/80 text-sm md:text-base leading-relaxed mb-4">
                  Go watch a movie. Read a book. Maybe even try yoga.
                </p>
                <p className="text-white font-bold italic text-base md:text-lg">
                  We've got this!
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 md:-ml-10 relative z-0 mt-8 md:mt-0">
              <img
                src={approvedHero}
                alt="Celebration"
                className="h-[350px] md:h-[500px] object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
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
