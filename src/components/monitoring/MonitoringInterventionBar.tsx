import { cn } from "@/lib/utils";
import { Brain } from "lucide-react";

export function MonitoringInterventionBar() {
  return (
    <div className="flex items-stretch gap-0 rounded-lg overflow-hidden border border-border text-xs">
      {/* Neural OS Status */}
      <div className="flex items-center gap-2 bg-[hsl(var(--foreground))] text-white px-4 py-2.5 min-w-[220px]">
        <Brain className="h-5 w-5 text-[#1B8A7A]" />
        <div>
          <div className="font-bold">Neural OS</div>
          <div className="text-white/70">Resolve: 78.3% · 34 healed · 42s avg</div>
        </div>
      </div>
      {/* Dispatch Now */}
      <div className="flex items-center gap-2 bg-[#D93025]/10 border-l border-[#D93025]/20 px-4 py-2.5">
        <span className="w-2 h-2 rounded-full bg-[#D93025] animate-pulse" />
        <span className="text-[#D93025] font-medium">3 units need dispatch</span>
        <button className="ml-2 px-2.5 py-1 rounded bg-[#D93025] text-white font-medium text-[10px] hover:bg-[#D93025]/90 transition-colors">Open Dispatch</button>
      </div>
      {/* Schedule This Week */}
      <div className="flex items-center gap-2 bg-[#E8760A]/10 border-l border-[#E8760A]/20 px-4 py-2.5">
        <span className="w-2 h-2 rounded-full bg-[#E8760A]" />
        <span className="text-[#E8760A] font-medium">7 warnings to schedule</span>
        <button className="ml-2 px-2.5 py-1 rounded bg-[#E8760A] text-white font-medium text-[10px] hover:bg-[#E8760A]/90 transition-colors">Schedule</button>
      </div>
      {/* Max Handling */}
      <div className="flex items-center gap-2 bg-[#1B8A7A]/10 border-l border-[#1B8A7A]/20 px-4 py-2.5">
        <svg className="w-3.5 h-3.5 text-[#1B8A7A] animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
        <span className="text-[#1B8A7A] font-medium">12 auto-healing</span>
      </div>
      {/* Env Watchlist */}
      <div className="flex items-center gap-2 bg-blue-500/10 border-l border-blue-500/20 px-4 py-2.5">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-blue-600 font-medium">4 env. alerts active</span>
      </div>
    </div>
  );
}
