import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Monitor } from "lucide-react";
import heroPerson from "@/assets/hero-person.png";

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
      setTimeout(() => setStage(6), 3000),
    ];
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


      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Headline */}
        <div className={`text-center mb-2 transition-all duration-1000 ease-out ${stage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white/50 tracking-wide leading-none">
            PEACE OF
          </h1>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white/50 tracking-wide leading-none">
            MIND
          </h1>
        </div>

        {/* Welcome subtitle */}
        <div className={`mb-8 transition-all duration-1000 ease-out delay-200 ${stage >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <p className="text-white/50 text-sm sm:text-base tracking-[0.35em] uppercase font-light">
            W E L C O M E
          </p>
        </div>

        {/* Hero image with arc */}
        <div className={`relative mb-8 transition-all duration-1000 ease-out ${stage >= 3 ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72">
            {/* Person image with bottom fade */}
            <img
              src={heroPerson}
              alt="Happy customer"
              className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] object-cover object-top rounded-full animate-hero-float"
              loading="eager"
              style={{
                WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.8) 75%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%)",
                maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.8) 75%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%)",
              }}
            />
          </div>
        </div>

        {/* Value proposition */}
        <div className={`text-center mb-6 transition-all duration-1000 ease-out ${stage >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-white text-xl sm:text-2xl md:text-3xl font-extralight leading-relaxed">
            Fast. Simple. Reliable.
          </p>
          <p className="text-white/80 text-lg sm:text-xl md:text-2xl font-extralight">
            Your peace of mind
          </p>
          <p className="text-white text-xl sm:text-2xl md:text-3xl font-extralight">
            is just <span className="font-light text-white">2 minutes</span> away
          </p>
        </div>

        {/* Curved arc with 3 steps */}
        <div className={`mb-8 transition-all duration-1000 ease-out ${stage >= 5 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <svg width="260" height="80" viewBox="0 0 300 100" fill="none" className="mx-auto">
            <path
              d="M 30 75 Q 150 10 270 75"
              stroke="white"
              strokeWidth="2"
              fill="none"
              opacity="0.6"
              strokeDasharray="500"
              strokeDashoffset={stage >= 5 ? "0" : "500"}
              style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
            />
            {/* Dot 1 */}
            <circle cx="30" cy="75" r="10" fill="white" opacity={stage >= 5 ? 0.9 : 0} style={{ transition: "opacity 0.4s ease-out 0.3s" }} />
            <text x="30" y="80" fill="#25b3a5" textAnchor="middle" fontSize="13" fontWeight="700" opacity={stage >= 5 ? 1 : 0} style={{ transition: "opacity 0.4s ease-out 0.3s" }}>1</text>
            {/* Dot 2 */}
            <circle cx="150" cy="18" r="10" fill="white" opacity={stage >= 5 ? 0.9 : 0} style={{ transition: "opacity 0.4s ease-out 0.6s" }} />
            <text x="150" y="23" fill="#25b3a5" textAnchor="middle" fontSize="13" fontWeight="700" opacity={stage >= 5 ? 1 : 0} style={{ transition: "opacity 0.4s ease-out 0.6s" }}>2</text>
            {/* Dot 3 */}
            <circle cx="270" cy="75" r="10" fill="white" opacity={stage >= 5 ? 0.9 : 0} style={{ transition: "opacity 0.4s ease-out 0.9s" }} />
            <text x="270" y="80" fill="#25b3a5" textAnchor="middle" fontSize="13" fontWeight="700" opacity={stage >= 5 ? 1 : 0} style={{ transition: "opacity 0.4s ease-out 0.9s" }}>3</text>
          </svg>
        </div>

        {/* CTA button */}
        <div className={`transition-all duration-700 ease-out ${stage >= 6 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <button
            onClick={onStart}
            className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-[#25b3a5] shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 animate-cta-pulse"
            aria-label="Start assessment"
          >
            <ArrowRight className="h-7 w-7 sm:h-8 sm:w-8 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
            {/* Ripple rings */}
            <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-cta-ring" />
            <span className="absolute inset-0 rounded-full border-2 border-white/20 animate-cta-ring-delayed" />
          </button>
        </div>

        {/* Dot indicators */}
        <div className={`flex items-center gap-2 mt-8 transition-all duration-500 ${stage >= 6 ? "opacity-100" : "opacity-0"}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-white" />
          <span className="w-2 h-2 rounded-full bg-white/30" />
          <span className="w-2 h-2 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Bottom lotus/decoration */}
      <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 transition-all duration-1000 ${stage >= 5 ? "opacity-30" : "opacity-0"}`}>
        <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
          <path d="M30 40 C20 25, 0 20, 5 5 C10 15, 25 20, 30 0 C35 20, 50 15, 55 5 C60 20, 40 25, 30 40Z" fill="white" />
        </svg>
      </div>

      {/* Footer */}
      <div className={`pb-6 flex flex-col items-center gap-2 relative z-10 transition-all duration-700 ${stage >= 6 ? "opacity-100" : "opacity-0"}`}>
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/10 transition-all text-sm"
          aria-label="Admin login"
        >
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
        @keyframes cta-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.3); }
          50% { box-shadow: 0 0 0 12px rgba(255,255,255,0); }
        }
        @keyframes cta-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes cta-ring-delayed {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .animate-float-slow { animation: float-slow 15s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 12s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 18s ease-in-out infinite; }
        .animate-hero-float { animation: hero-float 3s ease-in-out infinite; }
        .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
        .animate-cta-ring { animation: cta-ring 2s ease-out infinite; }
        .animate-cta-ring-delayed { animation: cta-ring-delayed 2s 0.5s ease-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .animate-float-slow,
          .animate-float-medium,
          .animate-float-reverse,
          .animate-hero-float,
          .animate-cta-pulse,
          .animate-cta-ring,
          .animate-cta-ring-delayed {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
