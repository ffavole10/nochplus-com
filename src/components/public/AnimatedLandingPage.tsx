import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, ArrowLeft } from "lucide-react";
import heroPerson from "@/assets/hero-person.png";
import nochLogoWhite from "@/assets/noch-logo-white.png";

interface AnimatedLandingPageProps {
  onStart: () => void;
}

export default function AnimatedLandingPage({ onStart }: AnimatedLandingPageProps) {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setStage(6);
      return;
    }
    const timers = [
    setTimeout(() => setStage(1), 300),
    setTimeout(() => setStage(2), 800),
    setTimeout(() => setStage(3), 1200),
    setTimeout(() => setStage(4), 1800),
    setTimeout(() => setStage(5), 2400),
    setTimeout(() => setStage(6), 3000)];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{
      background: "linear-gradient(180deg, #FF8E53 0%, #FFB088 20%, #FFC4A3 40%, #A8D5CE 60%, #25b3a5 80%, #1a8a7e 100%)"
    }}>
      {/* Floating shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[300px] h-[300px] rounded-full bg-white/[0.06] -top-20 -left-20 animate-float-slow" />
        <div className="absolute w-[200px] h-[200px] rounded-full bg-white/[0.04] top-1/4 -right-16 animate-float-medium" />
        <div className="absolute w-[150px] h-[150px] rounded-full bg-white/[0.05] bottom-1/4 left-10 animate-float-reverse" />
        <div className="absolute w-[100px] h-[100px] rounded-full bg-[#FF8E53]/10 top-1/2 right-1/4 animate-float-slow" />
        <div className="absolute w-[250px] h-[250px] rounded-full bg-white/[0.03] -bottom-20 right-10 animate-float-medium" />
        {/* Glass morphism accents */}
        <div className="absolute w-[180px] h-[180px] rounded-full backdrop-blur-3xl bg-white/[0.04] top-[15%] left-[60%] animate-float-reverse" />
      </div>


      {/* Logo */}
      <div className={`relative z-10 transition-all duration-700 ${stage >= 1 ? "opacity-100" : "opacity-0"}`}>
        <img
          src={nochLogoWhite}
          alt="Noch Power"
          className="h-7 sm:h-6 mx-auto sm:mx-0 sm:absolute sm:top-4 sm:left-6 mt-2 sm:mt-0 brightness-0 invert"
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Headline */}
        <div className={`text-center mb-2 pt-1 sm:pt-12 transition-all duration-1000 ease-out ${stage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white/50 tracking-wide leading-none lg:text-7xl">
            RELIABILITY
          </h1>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white/50 tracking-wide leading-none lg:text-6xl">
            STARTS HERE. 
          </h1>
        </div>

        {/* Welcome subtitle */}
        <div className={`mb-1 transition-all duration-1000 ease-out delay-200 ${stage >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <p className="text-white/50 text-sm tracking-[0.35em] uppercase font-light sm:text-2xl">
            W E L C O M E
          </p>
        </div>

        {/* Hero image - no circle background */}
        <div className={`relative mb-4 transition-all duration-1000 ease-out ${stage >= 3 ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
          <div className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[26rem] md:h-[26rem] mx-auto">
            <img
              src={heroPerson}
              alt="Happy customer"
              className="w-full h-full object-contain object-center animate-hero-float"
              loading="eager"
              style={{
                WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0) 100%)",
                maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0) 100%)"
              }} />

          </div>
          {/* Inverted arc below person */}
        <svg width="260" height="80" viewBox="0 0 300 90" fill="none" className="mx-auto -mt-4">
            <path
              d="M 30 10 Q 150 90 270 10"
              stroke="white"
              strokeWidth="2"
              fill="none"
              opacity="0.5"
              strokeDasharray="500"
              strokeDashoffset={stage >= 4 ? "0" : "500"}
              style={{ transition: "stroke-dashoffset 1.5s ease-out" }} />

            <circle cx="30" cy="10" r="8" fill="white" opacity={stage >= 4 ? 0.9 : 0} style={{ transition: "opacity 0.4s ease-out 0.3s" }} />
            <text x="30" y="15" fill="#25b3a5" textAnchor="middle" fontSize="12" fontWeight="700" opacity={stage >= 4 ? 1 : 0} style={{ transition: "opacity 0.4s ease-out 0.3s" }}>1</text>
            <circle cx="150" cy="50" r="8" fill="white" opacity={stage >= 4 ? 0.9 : 0} style={{ transition: "opacity 0.4s ease-out 0.6s" }} />
            <text x="150" y="55" fill="#25b3a5" textAnchor="middle" fontSize="12" fontWeight="700" opacity={stage >= 4 ? 1 : 0} style={{ transition: "opacity 0.4s ease-out 0.6s" }}>2</text>
            <circle cx="270" cy="10" r="8" fill="white" opacity={stage >= 4 ? 0.9 : 0} style={{ transition: "opacity 0.4s ease-out 0.9s" }} />
            <text x="270" y="15" fill="#25b3a5" textAnchor="middle" fontSize="12" fontWeight="700" opacity={stage >= 4 ? 1 : 0} style={{ transition: "opacity 0.4s ease-out 0.9s" }}>3</text>
          </svg>
        </div>

        {/* Value proposition + CTA centered between arc and footer */}
        <div className="flex flex-col items-center flex-1 -mt-4">
          <div className={`text-center -mt-2 transition-all duration-1000 ease-out ${stage >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-white text-3xl sm:text-4xl md:text-4xl font-extralight leading-relaxed">
              Fast. Simple. Reliable.
            </p>
            <p className="text-white/80 text-base sm:text-lg md:text-xl font-extralight">
              Your peace of mind is just minutes away
            </p>
          </div>

          <div className={`mt-10 transition-all duration-700 ease-out ${stage >= 6 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <button
              onClick={onStart}
              className="px-8 py-3 rounded-full bg-white/20 backdrop-blur-md text-white text-lg font-light hover:bg-white/30 active:scale-95 transition-all duration-300 tracking-widest"
              aria-label="Start assessment">
              Get Started &gt;&gt;
            </button>
          </div>
        </div>
      </div>


      {/* Footer */}
      <div className={`pb-6 pt-8 flex flex-col items-center gap-2 relative z-10 transition-all duration-700 ${stage >= 6 ? "opacity-100" : "opacity-0"}`}>
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/10 transition-all text-sm"
          aria-label="Admin login">

          <Monitor className="h-4 w-4" />
          <span>Admin Access</span>
        </button>
        <span className="text-white/30 text-sm">© 2026 Noch Power. All rights reserved.</span>
      </div>

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -30px); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-15px, 20px); }
          66% { transform: translate(10px, -15px); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 25px); }
        }
        @keyframes hero-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float-slow { animation: float-slow 15s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 12s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 18s ease-in-out infinite; }
        .animate-hero-float { animation: hero-float 3s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .animate-float-slow,
          .animate-float-medium,
          .animate-float-reverse,
          .animate-hero-float {
            animation: none !important;
          }
        }
      `}</style>
    </div>);

}