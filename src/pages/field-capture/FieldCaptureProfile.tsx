import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronRight, LogOut, Settings, Timer, Star, Shield, Zap,
  Camera as CameraIcon, Wrench, Image as ImageIcon, Clock, Flame,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import {
  ACHIEVEMENT_META, refreshTechnicianStats, type AchievementType,
} from "@/lib/nochProStats";
import maxFullBody from "@/assets/max-fullbody.png";

interface CacheRow {
  total_jobs_completed: number;
  total_chargers_captured: number;
  total_photos_uploaded: number;
  total_parts_swaps: number;
  total_minutes_worked: number;
  current_month_jobs: number;
  current_month_on_time: number;
  current_month_efficiency: number;
  last_30_days_efficiency: number;
  efficiency_trend: number;
  longest_on_time_streak: number;
  current_on_time_streak: number;
  fastest_job_minutes: number | null;
  noch_pro_score: number;
  quality_score: number;
  reliability_score: number;
  mastery_score: number;
  previous_noch_pro_score: number;
  most_chargers_one_day: number;
  best_efficiency_month: number;
  most_photos_one_job: number;
}

interface AchRow {
  achievement_type: AchievementType;
  unlocked_at: string;
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

function fmtMins(mins: number) {
  if (!mins) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h`;
}

function TrendBadge({ delta, suffix = "" }: { delta: number; suffix?: string }) {
  if (Math.abs(delta) < 0.1) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-fc-muted">
        <Minus className="h-3 w-3" /> Steady
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
        up ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {Math.round(delta * 10) / 10}
      {suffix} vs last month
    </span>
  );
}

function ScoreRing({ value, size = 120 }: { value: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 800;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const offset = c - (animated / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--fc-border))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="white"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl font-bold text-white tabular-nums">{animated}</span>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon, label, value, subtext, trend,
}: {
  icon: any; label: string; value: string | number; subtext: string; trend?: React.ReactNode;
}) {
  return (
    <div className="bg-fc-card rounded-2xl p-4 border border-fc-border/60 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="h-9 w-9 rounded-xl bg-fc-primary/10 text-fc-primary-dark flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-fc-muted">
        {label}
      </div>
      <div className="text-2xl font-bold text-fc-text leading-tight tabular-nums">{value}</div>
      <div className="text-[11px] text-fc-muted">{subtext}</div>
      {trend && <div className="mt-1.5">{trend}</div>}
    </div>
  );
}

function StatChip({ icon: Icon, value, label }: { icon: any; value: string | number; label: string }) {
  return (
    <div className="flex-shrink-0 bg-fc-card rounded-2xl border border-fc-border/60 px-4 py-3 min-w-[110px]">
      <div className="flex items-center gap-1.5 text-fc-primary-dark">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-lg font-bold tabular-nums">{value}</span>
      </div>
      <div className="text-[10px] uppercase tracking-wide text-fc-muted mt-0.5">{label}</div>
    </div>
  );
}

export default function FieldCaptureProfile() {
  usePageTitle("Profile");
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cache, setCache] = useState<CacheRow | null>(null);
  const [achievements, setAchievements] = useState<AchRow[]>([]);

  const fullName =
    (session?.user?.user_metadata?.display_name as string) ||
    session?.user?.email?.split("@")[0] ||
    "Technician";
  const initials = getInitials(fullName) || "T";

  const handleLogout = async () => {
    await signOut();
    navigate("/field", { replace: true });
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Trigger fresh recompute then re-read
      try {
        await refreshTechnicianStats(session.user.id);
      } catch (e) {
        console.warn("[NOCH Pro] refresh failed", e);
      }
      const [{ data: c }, { data: a }] = await Promise.all([
        supabase
          .from("technician_stats_cache")
          .select("*")
          .eq("technician_id", session.user.id)
          .maybeSingle(),
        supabase
          .from("technician_achievements")
          .select("achievement_type,unlocked_at")
          .eq("technician_id", session.user.id)
          .order("unlocked_at", { ascending: false })
          .limit(5),
      ]);
      if (cancelled) return;
      setCache((c as CacheRow | null) ?? null);
      setAchievements((a as AchRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const hasData = (cache?.total_jobs_completed ?? 0) > 0;
  const score = cache?.noch_pro_score ?? 0;
  const scoreDelta = (cache?.noch_pro_score ?? 0) - (cache?.previous_noch_pro_score ?? 0);

  return (
    <div className="px-4 py-5 space-y-4 pb-10">
      {/* HEADER */}
      <div className="bg-fc-card rounded-2xl p-5 shadow-sm border border-fc-border/60">
        <div className="flex items-start gap-4">
          <div className="h-24 w-24 rounded-full bg-fc-primary/15 text-fc-primary-dark flex items-center justify-center text-3xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-bold text-fc-text leading-tight">{fullName}</h1>
            <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full bg-fc-primary/12 text-fc-primary-dark text-[11px] font-semibold uppercase tracking-wide">
              Technician
            </span>
            <div className="text-[13px] text-fc-muted mt-1.5 truncate">{session?.user?.email}</div>
          </div>
          <button
            type="button"
            aria-label="Settings"
            className="h-9 w-9 rounded-full hover:bg-fc-bg flex items-center justify-center text-fc-muted"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading && (
        <>
          <Skeleton className="h-48 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </>
      )}

      {!loading && !hasData && (
        <div className="bg-fc-card rounded-2xl p-6 border border-fc-border/60 text-center">
          <img src={maxFullBody} alt="" className="w-32 h-auto mx-auto" />
          <h2 className="mt-3 text-lg font-bold text-fc-text">
            Your stats will light up soon
          </h2>
          <p className="mt-1 text-sm text-fc-muted">
            Complete your first job to unlock your NOCH Pro Score, achievements, and personal records.
          </p>
        </div>
      )}

      {!loading && hasData && cache && (
        <>
          {/* CARD 1: NOCH PRO SCORE */}
          <div
            className="rounded-2xl p-6 shadow-sm border border-fc-border/60 text-center animate-fade-in"
            style={{
              background:
                "linear-gradient(160deg, hsl(var(--fc-primary)) 0%, hsl(var(--fc-primary-dark)) 100%)",
            }}
          >
            <div className="flex justify-center">
              <ScoreRing value={score} />
            </div>
            <div className="mt-4 text-white text-[13px] font-semibold uppercase tracking-widest">
              NOCH Pro Score
            </div>
            <div className="text-white/80 text-[12px] mt-1">Based on your last 30 days</div>
            {scoreDelta !== 0 && (
              <div className="mt-2 inline-flex items-center gap-1 text-white/95 text-[12px] font-semibold">
                {scoreDelta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {scoreDelta > 0 ? "+" : ""}{scoreDelta} this month
              </div>
            )}
          </div>

          {/* CARD 2: METRIC GRID */}
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            <MetricCard
              icon={Timer}
              label="Efficiency"
              value={`${Math.round(cache.last_30_days_efficiency)}%`}
              subtext="Jobs on time"
              trend={<TrendBadge delta={cache.efficiency_trend} suffix="%" />}
            />
            <MetricCard
              icon={Star}
              label="Quality"
              value={cache.quality_score}
              subtext="Photos + detail"
            />
            <MetricCard
              icon={Shield}
              label="Reliability"
              value={`${cache.reliability_score}%`}
              subtext="Jobs completed"
            />
            <MetricCard
              icon={Zap}
              label="Mastery"
              value={cache.mastery_score}
              subtext="Breadth + skill"
            />
          </div>

          {/* CARD 3: LIFETIME STATS */}
          <div className="bg-fc-card rounded-2xl p-4 border border-fc-border/60">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-fc-muted mb-3">
              Lifetime Stats
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              <StatChip icon={Wrench} value={cache.total_jobs_completed} label="Jobs" />
              <StatChip icon={Zap} value={cache.total_chargers_captured} label="Chargers" />
              <StatChip icon={ImageIcon} value={cache.total_photos_uploaded} label="Photos" />
              <StatChip icon={CameraIcon} value={cache.total_parts_swaps} label="Swaps" />
              <StatChip icon={Clock} value={fmtMins(cache.total_minutes_worked)} label="Worked" />
              <StatChip icon={Flame} value={cache.current_on_time_streak} label="Streak" />
            </div>
          </div>

          {/* CARD 4: RECENT ACHIEVEMENTS */}
          <div className="bg-fc-card rounded-2xl p-5 border border-fc-border/60">
            <h2 className="text-[15px] font-bold text-fc-text mb-3">Recent Achievements</h2>
            {achievements.length === 0 ? (
              <p className="text-sm text-fc-muted py-4 text-center">
                Keep going, more achievements ahead.
              </p>
            ) : (
              <ul className="space-y-3">
                {achievements.map((a) => {
                  const m = ACHIEVEMENT_META[a.achievement_type];
                  if (!m) return null;
                  return (
                    <li key={a.achievement_type} className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">{m.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-fc-text">{m.name}</div>
                        <div className="text-[12px] text-fc-muted">{m.description}</div>
                        <div className="text-[11px] text-fc-muted/80 mt-0.5">
                          {new Date(a.unlocked_at).toLocaleDateString()}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {achievements.length < 5 && (
                  <li className="text-[12px] text-fc-muted text-center pt-1">
                    Keep going, more achievements ahead.
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* CARD 5: PERSONAL RECORDS */}
          <div className="bg-fc-card rounded-2xl p-5 border border-fc-border/60">
            <h2 className="text-[15px] font-bold text-fc-text mb-3">Personal Records</h2>
            <ul className="divide-y divide-fc-border/60 text-sm">
              <li className="py-2 flex justify-between"><span className="text-fc-muted">Fastest job</span><span className="font-semibold text-fc-text">{cache.fastest_job_minutes ? `${cache.fastest_job_minutes} min` : "—"}</span></li>
              <li className="py-2 flex justify-between"><span className="text-fc-muted">Longest on-time streak</span><span className="font-semibold text-fc-text">{cache.longest_on_time_streak} jobs</span></li>
              <li className="py-2 flex justify-between"><span className="text-fc-muted">Most chargers in one day</span><span className="font-semibold text-fc-text">{cache.most_chargers_one_day}</span></li>
              <li className="py-2 flex justify-between"><span className="text-fc-muted">Best efficiency month</span><span className="font-semibold text-fc-text">{cache.best_efficiency_month ? `${cache.best_efficiency_month}%` : "—"}</span></li>
              <li className="py-2 flex justify-between"><span className="text-fc-muted">Most photos in one job</span><span className="font-semibold text-fc-text">{cache.most_photos_one_job}</span></li>
            </ul>
          </div>

          {/* CARD 6: THIS MONTH */}
          <div className="bg-fc-card rounded-2xl p-5 border border-fc-border/60">
            <h2 className="text-[15px] font-bold text-fc-text mb-3">This Month</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-fc-primary tabular-nums">{cache.current_month_jobs}</div>
                <div className="text-[10px] uppercase tracking-wide text-fc-muted mt-1">Jobs</div>
              </div>
              <div className="text-center border-l border-r border-fc-border/60">
                <div className="text-2xl font-bold text-fc-primary tabular-nums">{Math.round(cache.current_month_efficiency)}%</div>
                <div className="text-[10px] uppercase tracking-wide text-fc-muted mt-1">On Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-fc-primary tabular-nums">{cache.current_month_on_time}</div>
                <div className="text-[10px] uppercase tracking-wide text-fc-muted mt-1">On-Time Jobs</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CARD 7: PREFERENCES */}
      <div className="bg-fc-card rounded-2xl p-5 shadow-sm border border-fc-border/60">
        <h2 className="text-[15px] font-bold text-fc-text mb-3">Preferences</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium text-fc-text">Push notifications</div>
              <div className="text-[12px] text-fc-muted">Job assignments and updates</div>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium text-fc-text">Email notifications</div>
              <div className="text-[12px] text-fc-muted">Daily summaries and changes</div>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
        </div>
      </div>

      {/* CARD 8: HELP & SUPPORT */}
      <div className="bg-fc-card rounded-2xl p-2 shadow-sm border border-fc-border/60">
        <div className="px-3 py-2">
          <h2 className="text-[15px] font-bold text-fc-text">Help & Support</h2>
        </div>
        {["Contact Dispatcher", "View SOPs", "About NOCH+ Field"].map((label) => (
          <button
            key={label}
            type="button"
            className="w-full flex items-center justify-between px-3 py-3 hover:bg-fc-bg rounded-xl transition-colors"
          >
            <span className="text-[14px] text-fc-text font-medium">{label}</span>
            <ChevronRight className="h-4 w-4 text-fc-muted" />
          </button>
        ))}
      </div>

      <div className="pt-4">
        <Button
          onClick={() => setLogoutOpen(true)}
          variant="outline"
          className="w-full h-12 rounded-xl text-base font-semibold border-destructive text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </Button>
      </div>

      <p className="text-center text-[11px] text-fc-muted pb-4">NOCH+ Field · v1.0</p>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of NOCH+ Field?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to view your jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
