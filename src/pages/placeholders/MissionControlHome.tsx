import { Radar } from "lucide-react";
import nochLogo from "@/assets/noch-logo-white.png";

export default function MissionControlHome() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <img
        src={nochLogo}
        alt="Noch+"
        className="w-40 h-auto brightness-0 invert opacity-90 mb-8"
      />
      <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/20">
        <Radar className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Mission Control
      </h1>
      <p className="mt-3 text-base text-muted-foreground">Coming in Batch 2</p>
    </div>
  );
}
