import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { useWeeklyReviews, useEnsureCurrentReview } from "@/hooks/useWeeklyReview";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "wr-banner-dismissed";

/** Global banner shown when most recent review is pending_close or missed. */
export function WeeklyReviewBanner() {
  useEnsureCurrentReview();
  const navigate = useNavigate();
  const { data: reviews = [] } = useWeeklyReviews(5);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1"); } catch {}
  }, []);

  const latest = reviews[0];
  if (!latest || dismissed) return null;
  if (latest.status !== "pending_close" && latest.status !== "missed") return null;

  const isMissed = latest.status === "missed";

  return (
    <div className={cn(
      "w-full px-4 py-2 flex items-center justify-between gap-3 border-b text-sm",
      isMissed
        ? "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-900/50"
        : "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50"
    )}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Week {latest.week_number} review {isMissed ? "was missed" : "wasn't closed"}.{" "}
          <button
            className="underline font-medium"
            onClick={() => navigate("/business/strategy?tab=weekly_review")}
          >
            Take action →
          </button>
        </span>
      </div>
      <button
        onClick={() => {
          try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
          setDismissed(true);
        }}
        className="opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
