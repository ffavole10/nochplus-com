import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import maxIpad from "@/assets/max-ipad.png";
import maxThumbsUp from "@/assets/max-thumbsup.png";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { BriefingType } from "@/types/fieldCapture";

interface Props {
  open: boolean;
  briefingType: BriefingType;
  firstName: string;
  workOrderId: string;
  technicianId: string;
  onComplete: () => void;
}

const FULL_ITEMS = [
  "PPE ready (glasses, gloves, hard hat, boots, hi-vis)",
  "Safety glasses on",
  "Gloves on",
  "Hi-vis vest visible",
  "Area cones placed",
  "Signage up and visible",
  "SOW reviewed (scope of work)",
];

const CONDENSED_ITEMS = [
  "New site: cones and signage in place",
  "Review SOW for THIS work order",
  "Identify point of contact",
];

function useTypewriter(text: string, speed = 30, enabled = true) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!enabled) {
      setOut(text);
      return;
    }
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, enabled]);
  return out;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export default function SafetyBriefingModal({
  open,
  briefingType,
  firstName,
  workOrderId,
  technicianId,
  onComplete,
}: Props) {
  const reduced = prefersReducedMotion();
  const isFull = briefingType === "full_briefing";
  const items = isFull ? FULL_ITEMS : CONDENSED_ITEMS;
  const itemDelayMs = isFull ? 1500 : 1000;

  const greeting = isFull
    ? `Good morning, ${firstName}. Let's run through safety before you start.`
    : `Nice work on the last one, ${firstName}. Quick site check for this one.`;
  const followup = isFull
    ? "Looking good. Tap below when you're ready to work."
    : "You got this. Tap when ready.";

  const [phase, setPhase] = useState<"greeting" | "checklist" | "ready" | "celebrate">("greeting");
  const [shownCount, setShownCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

  const enableTyping = !reduced;
  const greetingText = useTypewriter(
    phase === "greeting" || phase === "checklist" ? greeting : followup,
    enableTyping ? 30 : 0,
    enableTyping,
  );

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setPhase("greeting");
    setShownCount(0);
    startedAtRef.current = Date.now();
  }, [open, briefingType]);

  // Phase timing
  useEffect(() => {
    if (!open) return;
    if (phase === "greeting") {
      // Wait for greeting typing to finish (or short delay if reduced)
      const t = setTimeout(() => setPhase("checklist"), enableTyping ? 2800 : 600);
      return () => clearTimeout(t);
    }
    if (phase === "checklist") {
      // Reveal items
      let i = 0;
      const id = setInterval(() => {
        i += 1;
        setShownCount(i);
        if (i >= items.length) {
          clearInterval(id);
          setTimeout(() => setPhase("ready"), 600);
        }
      }, itemDelayMs);
      return () => clearInterval(id);
    }
  }, [phase, open, items.length, itemDelayMs, enableTyping]);

  const buttonReady = phase === "ready";

  async function handleReady() {
    if (submitting) return;
    setSubmitting(true);
    const startedAt = new Date(startedAtRef.current).toISOString();
    const completedAt = new Date().toISOString();
    const duration = Math.round((Date.now() - startedAtRef.current) / 1000);

    // Try GPS (best-effort)
    let gps: string | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        if (!navigator.geolocation) return rej(new Error("no-geo"));
        navigator.geolocation.getCurrentPosition(res, rej, {
          maximumAge: 60000,
          timeout: 4000,
        });
      });
      gps = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
    } catch {
      gps = null;
    }

    await Promise.all([
      supabase.from("safety_briefings_log").insert({
        work_order_id: workOrderId,
        technician_id: technicianId,
        briefing_type: briefingType,
        briefing_started_at: startedAt,
        briefing_completed_at: completedAt,
        duration_seconds: duration,
      }),
      supabase
        .from("work_orders")
        .update({
          status: "in_progress",
          arrival_timestamp: completedAt,
          ...(gps ? { gps_location: gps } : {}),
        })
        .eq("id", workOrderId),
    ]);

    setPhase("celebrate");
    setTimeout(() => {
      onComplete();
    }, 1500);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--fc-primary) / 0.18) 0%, hsl(var(--fc-bg)) 70%)",
      }}
      role="dialog"
      aria-modal="true"
    >
      {phase === "celebrate" ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <img
            src={maxThumbsUp}
            alt="Max thumbs up"
            className={cn(
              "w-56 h-auto",
              !reduced && "animate-[fc-celebrate_500ms_ease-out]",
            )}
          />
          <div className="mt-4 text-2xl font-bold text-fc-text">Let's go!</div>
        </div>
      ) : (
        <>
          {/* Speech bubble + checklist */}
          <div
            className="flex-1 px-5 pt-12 pb-4 overflow-hidden relative"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
          >
            {/* Speech bubble */}
            <div
              className={cn(
                "max-w-[80%] bg-white rounded-2xl shadow-lg p-4 relative border border-fc-border",
                !reduced && "animate-fade-in",
              )}
            >
              <p className="text-[15px] leading-snug text-fc-text font-medium min-h-[3em]">
                {greetingText}
                {enableTyping &&
                  greetingText.length <
                    (phase === "ready" || phase === "checklist" && shownCount === items.length
                      ? followup.length
                      : greeting.length) && (
                    <span className="inline-block w-1.5 h-4 bg-fc-primary ml-0.5 animate-pulse align-middle" />
                  )}
              </p>
              <span className="absolute -bottom-2 right-10 w-4 h-4 bg-white border-r border-b border-fc-border rotate-45" />
            </div>

            {/* Checklist */}
            <ul className="mt-6 space-y-2.5 max-w-[78%]">
              {items.slice(0, shownCount).map((item, idx) => (
                <li
                  key={idx}
                  className={cn(
                    "flex items-start gap-2.5 bg-white/85 backdrop-blur rounded-xl px-3 py-2 shadow-sm border border-fc-border/60",
                    !reduced && "animate-[fc-slide-in-left_300ms_ease-out]",
                  )}
                >
                  <span className="h-5 w-5 rounded-full bg-fc-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-fc-text leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Max image */}
          <img
            src={maxIpad}
            alt="Max"
            className={cn(
              "absolute bottom-24 right-0 max-h-[55vh] w-auto pointer-events-none select-none",
              !reduced && "animate-[fc-max-slide-up_500ms_cubic-bezier(0.34,1.56,0.64,1)]",
            )}
          />

          {/* Bottom CTA */}
          <div
            className="px-5 pb-6 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
          >
            <button
              type="button"
              disabled={!buttonReady || submitting}
              onClick={handleReady}
              className={cn(
                "w-full h-14 rounded-2xl bg-fc-primary text-white font-bold text-base shadow-lg transition-all",
                buttonReady && !submitting
                  ? "opacity-100 animate-pulse"
                  : "opacity-40 cursor-not-allowed",
              )}
            >
              {submitting
                ? "Starting…"
                : isFull
                ? "I'm Ready, Max"
                : "I'm Ready"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
