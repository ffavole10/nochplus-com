// NOCH Pro performance stats engine
// Computes a technician's lifetime/30-day stats from raw work order data
// and writes them into technician_stats_cache. Also detects achievements.

import { supabase } from "@/integrations/supabase/client";

export type AchievementType =
  | "first_job" | "ten_jobs" | "fifty_jobs" | "century_club" | "five_hundred"
  | "first_charger" | "ten_chargers" | "fifty_chargers" | "charger_variety" | "charger_master"
  | "photo_documentarian" | "photo_master" | "photo_legend"
  | "first_swap" | "swap_specialist" | "swap_master"
  | "week_of_excellence" | "month_of_excellence" | "speed_demon" | "under_budget"
  | "thorough_documenter" | "detailed_writer"
  | "early_adopter" | "perfect_month" | "versatility";

export interface AchievementMeta {
  type: AchievementType;
  name: string;
  emoji: string;
  description: string;
}

export const ACHIEVEMENT_META: Record<AchievementType, AchievementMeta> = {
  first_job: { type: "first_job", name: "First Job Complete", emoji: "🚀", description: "Welcome to NOCH+" },
  ten_jobs: { type: "ten_jobs", name: "10 Jobs", emoji: "🔟", description: "Completed 10 jobs" },
  fifty_jobs: { type: "fifty_jobs", name: "50 Jobs", emoji: "🏅", description: "Completed 50 jobs" },
  century_club: { type: "century_club", name: "Century Club", emoji: "💯", description: "Completed your 100th job" },
  five_hundred: { type: "five_hundred", name: "500 Club", emoji: "🏆", description: "Completed 500 jobs" },
  first_charger: { type: "first_charger", name: "First Charger", emoji: "⚡", description: "Captured your 1st charger" },
  ten_chargers: { type: "ten_chargers", name: "10 Chargers", emoji: "⚡", description: "Captured 10 chargers" },
  fifty_chargers: { type: "fifty_chargers", name: "50 Chargers", emoji: "⚡", description: "Captured 50 chargers" },
  charger_variety: { type: "charger_variety", name: "Charger Variety", emoji: "🎛️", description: "5 different make/models" },
  charger_master: { type: "charger_master", name: "Charger Master", emoji: "🧠", description: "10 different make/models" },
  photo_documentarian: { type: "photo_documentarian", name: "Photo Documentarian", emoji: "📸", description: "100 photos uploaded" },
  photo_master: { type: "photo_master", name: "Photo Master", emoji: "📸", description: "500 photos uploaded" },
  photo_legend: { type: "photo_legend", name: "Photo Legend", emoji: "📸", description: "1,000 photos uploaded" },
  first_swap: { type: "first_swap", name: "First Swap", emoji: "🔧", description: "Your 1st parts swap" },
  swap_specialist: { type: "swap_specialist", name: "Swap Specialist", emoji: "🔧", description: "10 parts swaps" },
  swap_master: { type: "swap_master", name: "Swap Master", emoji: "🛠️", description: "50 parts swaps" },
  week_of_excellence: { type: "week_of_excellence", name: "Week of Excellence", emoji: "🎯", description: "7 jobs in a row within allocated time" },
  month_of_excellence: { type: "month_of_excellence", name: "Month of Excellence", emoji: "🌟", description: "Entire month within allocation average" },
  speed_demon: { type: "speed_demon", name: "Speed Demon", emoji: "⚡", description: "New personal fastest job" },
  under_budget: { type: "under_budget", name: "Under Budget", emoji: "📉", description: "10 jobs consecutively under allocated time" },
  thorough_documenter: { type: "thorough_documenter", name: "Thorough Documenter", emoji: "📝", description: "10 jobs with 8+ photos each" },
  detailed_writer: { type: "detailed_writer", name: "Detailed Writer", emoji: "✍️", description: "10 work descriptions over 500 chars" },
  early_adopter: { type: "early_adopter", name: "Early Adopter", emoji: "🌱", description: "Joined NOCH+ in the first 100 jobs" },
  perfect_month: { type: "perfect_month", name: "Perfect Month", emoji: "✨", description: "No rework required for full month" },
  versatility: { type: "versatility", name: "Versatility", emoji: "🎨", description: "5 different charger categories in 30 days" },
};

const SUBMITTED_STATUSES = ["submitted", "pending_review", "approved", "closed"];

export interface StatsResult {
  total_jobs_completed: number;
  total_chargers_captured: number;
  total_photos_uploaded: number;
  total_parts_swaps: number;
  total_minutes_worked: number;
  lifetime_efficiency_rating: number;
  current_month_jobs: number;
  current_month_on_time: number;
  current_month_efficiency: number;
  last_30_days_efficiency: number;
  previous_30_days_efficiency: number;
  efficiency_trend: number;
  longest_on_time_streak: number;
  current_on_time_streak: number;
  fastest_job_minutes: number | null;
  most_chargers_one_day: number;
  best_efficiency_month: number;
  most_photos_one_job: number;
  noch_pro_score: number;
  quality_score: number;
  reliability_score: number;
  mastery_score: number;
  // Side data for achievement detection
  uniqueChargerModels: number;
  uniqueCategories30d: number;
  jobsWith8PlusPhotos: number;
  longDescriptionsCount: number;
}

/** Allocated minutes per job (assume 90 min target until configurable). */
const JOB_ALLOCATION_MINUTES = 90;

export async function computeStats(technicianId: string): Promise<StatsResult> {
  const { data: orders } = await supabase
    .from("work_orders")
    .select("id,status,arrival_timestamp,departure_timestamp,scheduled_date,support_time_minutes,access_time_minutes")
    .eq("assigned_technician_id", technicianId)
    .in("status", SUBMITTED_STATUSES);
  const completed = orders ?? [];
  const orderIds = completed.map((o: any) => o.id);

  // Chargers
  let chargers: any[] = [];
  let photos: any[] = [];
  if (orderIds.length) {
    const { data: c } = await supabase
      .from("work_order_chargers")
      .select("id,work_order_id,make_model,parts_swap_performed,issue_category,work_performed,capture_completed_at")
      .in("work_order_id", orderIds);
    chargers = c ?? [];
    const { data: p } = await supabase
      .from("work_order_photos")
      .select("id,work_order_id,uploaded_at")
      .in("work_order_id", orderIds);
    photos = p ?? [];
  }

  const total_jobs_completed = completed.length;
  const total_chargers_captured = chargers.length;
  const total_photos_uploaded = photos.length;
  const total_parts_swaps = chargers.filter((c) => c.parts_swap_performed).length;

  // Per-job durations
  const jobDurations = completed
    .map((o: any) => {
      if (!o.arrival_timestamp || !o.departure_timestamp) return null;
      const a = new Date(o.arrival_timestamp).getTime();
      const d = new Date(o.departure_timestamp).getTime();
      if (d <= a) return null;
      return { id: o.id, dateISO: o.scheduled_date as string, minutes: Math.round((d - a) / 60000) };
    })
    .filter((v): v is { id: string; dateISO: string; minutes: number } => v !== null);

  const total_minutes_worked = jobDurations.reduce((s, j) => s + j.minutes, 0);
  const fastest_job_minutes = jobDurations.length ? Math.min(...jobDurations.map((j) => j.minutes)) : null;

  // Efficiency = % of jobs within allocation
  const onTimeJobs = jobDurations.filter((j) => j.minutes <= JOB_ALLOCATION_MINUTES);
  const lifetime_efficiency_rating = jobDurations.length
    ? Math.round((onTimeJobs.length / jobDurations.length) * 1000) / 10
    : 0;

  // 30-day windows
  const now = Date.now();
  const day = 86_400_000;
  const last30 = jobDurations.filter((j) => now - new Date(j.dateISO).getTime() <= 30 * day);
  const prev30 = jobDurations.filter((j) => {
    const t = new Date(j.dateISO).getTime();
    return now - t > 30 * day && now - t <= 60 * day;
  });
  const last_30_days_efficiency = last30.length
    ? Math.round((last30.filter((j) => j.minutes <= JOB_ALLOCATION_MINUTES).length / last30.length) * 1000) / 10
    : 0;
  const previous_30_days_efficiency = prev30.length
    ? Math.round((prev30.filter((j) => j.minutes <= JOB_ALLOCATION_MINUTES).length / prev30.length) * 1000) / 10
    : 0;
  const efficiency_trend = Math.round((last_30_days_efficiency - previous_30_days_efficiency) * 10) / 10;

  // Current month
  const today = new Date();
  const monthJobs = jobDurations.filter((j) => {
    const d = new Date(j.dateISO);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  });
  const current_month_jobs = monthJobs.length;
  const current_month_on_time = monthJobs.filter((j) => j.minutes <= JOB_ALLOCATION_MINUTES).length;
  const current_month_efficiency = monthJobs.length
    ? Math.round((current_month_on_time / monthJobs.length) * 1000) / 10
    : 0;

  // Streaks (chronological)
  const sorted = [...jobDurations].sort(
    (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime(),
  );
  let longest = 0, runLong = 0, runCur = 0;
  for (const j of sorted) {
    if (j.minutes <= JOB_ALLOCATION_MINUTES) {
      runLong++; runCur++;
      if (runLong > longest) longest = runLong;
    } else {
      runLong = 0; runCur = 0;
    }
  }
  const longest_on_time_streak = longest;
  const current_on_time_streak = runCur;

  // Most chargers in one day
  const chargersByDay = new Map<string, number>();
  for (const c of chargers) {
    const order = completed.find((o: any) => o.id === c.work_order_id);
    const day = order?.scheduled_date;
    if (!day) continue;
    chargersByDay.set(day, (chargersByDay.get(day) ?? 0) + 1);
  }
  const most_chargers_one_day = chargersByDay.size ? Math.max(...chargersByDay.values()) : 0;

  // Best efficiency month
  const monthBuckets = new Map<string, { total: number; ontime: number }>();
  for (const j of jobDurations) {
    const d = new Date(j.dateISO);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const b = monthBuckets.get(k) ?? { total: 0, ontime: 0 };
    b.total++;
    if (j.minutes <= JOB_ALLOCATION_MINUTES) b.ontime++;
    monthBuckets.set(k, b);
  }
  const best_efficiency_month = monthBuckets.size
    ? Math.round(Math.max(...Array.from(monthBuckets.values()).map((b) => (b.ontime / b.total) * 100)) * 10) / 10
    : 0;

  // Most photos in one job
  const photosByJob = new Map<string, number>();
  for (const p of photos) photosByJob.set(p.work_order_id, (photosByJob.get(p.work_order_id) ?? 0) + 1);
  const most_photos_one_job = photosByJob.size ? Math.max(...photosByJob.values()) : 0;

  // Quality / mastery side metrics
  const uniqueChargerModels = new Set(chargers.map((c) => c.make_model).filter(Boolean)).size;
  const last30JobIds = new Set(last30.map((j) => j.id));
  const uniqueCategories30d = new Set(
    chargers
      .filter((c) => last30JobIds.has(c.work_order_id))
      .map((c) => c.issue_category)
      .filter(Boolean),
  ).size;
  const jobsWith8PlusPhotos = Array.from(photosByJob.values()).filter((n) => n >= 8).length;
  const longDescriptionsCount = chargers.filter((c) => (c.work_performed?.length ?? 0) >= 500).length;

  // ─── NOCH Pro Score (0-100) ──────────────────────────────
  // Quality: avg photos per job (target 6) + avg description length (target 250)
  const avgPhotosPerJob = total_jobs_completed ? total_photos_uploaded / total_jobs_completed : 0;
  const avgDescLen = chargers.length
    ? chargers.reduce((s, c) => s + (c.work_performed?.length ?? 0), 0) / chargers.length
    : 0;
  const photoScore = Math.min(100, (avgPhotosPerJob / 6) * 100);
  const descScore = Math.min(100, (avgDescLen / 250) * 100);
  const quality_score = Math.round((photoScore + descScore) / 2);

  // Reliability: completion rate (assume 100% since we filter completed) + on-time GPS
  // Use ratio of jobs with arrival_timestamp logged
  const withGps = completed.filter((o: any) => o.arrival_timestamp).length;
  const reliability_score = Math.round(
    ((total_jobs_completed ? (withGps / total_jobs_completed) * 100 : 0) +
      lifetime_efficiency_rating) /
      2,
  );

  // Mastery: charger variety (target 10) + parts swaps (target 20)
  const varietyScore = Math.min(100, (uniqueChargerModels / 10) * 100);
  const swapScore = Math.min(100, (total_parts_swaps / 20) * 100);
  const mastery_score = Math.round((varietyScore + swapScore) / 2);

  const noch_pro_score = Math.round(
    last_30_days_efficiency * 0.4 +
      quality_score * 0.25 +
      reliability_score * 0.2 +
      mastery_score * 0.15,
  );

  return {
    total_jobs_completed,
    total_chargers_captured,
    total_photos_uploaded,
    total_parts_swaps,
    total_minutes_worked,
    lifetime_efficiency_rating,
    current_month_jobs,
    current_month_on_time,
    current_month_efficiency,
    last_30_days_efficiency,
    previous_30_days_efficiency,
    efficiency_trend,
    longest_on_time_streak,
    current_on_time_streak,
    fastest_job_minutes,
    most_chargers_one_day,
    best_efficiency_month,
    most_photos_one_job,
    noch_pro_score: Math.max(0, Math.min(100, noch_pro_score)),
    quality_score,
    reliability_score,
    mastery_score,
    uniqueChargerModels,
    uniqueCategories30d,
    jobsWith8PlusPhotos,
    longDescriptionsCount,
  };
}

/** Persist stats to the cache table. Returns the prior NOCH Pro score so trend can be shown. */
export async function persistStats(technicianId: string, stats: StatsResult): Promise<number> {
  const { data: existing } = await supabase
    .from("technician_stats_cache")
    .select("noch_pro_score")
    .eq("technician_id", technicianId)
    .maybeSingle();
  const prev = existing?.noch_pro_score ?? 0;

  const payload = {
    technician_id: technicianId,
    total_jobs_completed: stats.total_jobs_completed,
    total_chargers_captured: stats.total_chargers_captured,
    total_photos_uploaded: stats.total_photos_uploaded,
    total_parts_swaps: stats.total_parts_swaps,
    total_minutes_worked: stats.total_minutes_worked,
    lifetime_efficiency_rating: stats.lifetime_efficiency_rating,
    current_month_jobs: stats.current_month_jobs,
    current_month_on_time: stats.current_month_on_time,
    current_month_efficiency: stats.current_month_efficiency,
    last_30_days_efficiency: stats.last_30_days_efficiency,
    previous_30_days_efficiency: stats.previous_30_days_efficiency,
    efficiency_trend: stats.efficiency_trend,
    longest_on_time_streak: stats.longest_on_time_streak,
    current_on_time_streak: stats.current_on_time_streak,
    fastest_job_minutes: stats.fastest_job_minutes,
    most_chargers_one_day: stats.most_chargers_one_day,
    best_efficiency_month: stats.best_efficiency_month,
    most_photos_one_job: stats.most_photos_one_job,
    noch_pro_score: stats.noch_pro_score,
    quality_score: stats.quality_score,
    reliability_score: stats.reliability_score,
    mastery_score: stats.mastery_score,
    previous_noch_pro_score: prev,
    updated_at: new Date().toISOString(),
  };

  await supabase.from("technician_stats_cache").upsert(payload, { onConflict: "technician_id" });
  return prev;
}

/** Detect newly-earned achievements based on stats. Inserts and returns the new ones. */
export async function detectAchievements(
  technicianId: string,
  stats: StatsResult,
): Promise<AchievementType[]> {
  const { data: existing } = await supabase
    .from("technician_achievements")
    .select("achievement_type")
    .eq("technician_id", technicianId);
  const owned = new Set((existing ?? []).map((r: any) => r.achievement_type as AchievementType));

  const candidates: AchievementType[] = [];
  const addIf = (cond: boolean, type: AchievementType) => {
    if (cond && !owned.has(type)) candidates.push(type);
  };

  addIf(stats.total_jobs_completed >= 1, "first_job");
  addIf(stats.total_jobs_completed >= 10, "ten_jobs");
  addIf(stats.total_jobs_completed >= 50, "fifty_jobs");
  addIf(stats.total_jobs_completed >= 100, "century_club");
  addIf(stats.total_jobs_completed >= 500, "five_hundred");

  addIf(stats.total_chargers_captured >= 1, "first_charger");
  addIf(stats.total_chargers_captured >= 10, "ten_chargers");
  addIf(stats.total_chargers_captured >= 50, "fifty_chargers");
  addIf(stats.uniqueChargerModels >= 5, "charger_variety");
  addIf(stats.uniqueChargerModels >= 10, "charger_master");

  addIf(stats.total_photos_uploaded >= 100, "photo_documentarian");
  addIf(stats.total_photos_uploaded >= 500, "photo_master");
  addIf(stats.total_photos_uploaded >= 1000, "photo_legend");

  addIf(stats.total_parts_swaps >= 1, "first_swap");
  addIf(stats.total_parts_swaps >= 10, "swap_specialist");
  addIf(stats.total_parts_swaps >= 50, "swap_master");

  addIf(stats.longest_on_time_streak >= 7, "week_of_excellence");
  addIf(stats.current_month_efficiency >= 90 && stats.current_month_jobs >= 10, "month_of_excellence");
  addIf(stats.current_on_time_streak >= 10, "under_budget");

  addIf(stats.jobsWith8PlusPhotos >= 10, "thorough_documenter");
  addIf(stats.longDescriptionsCount >= 10, "detailed_writer");

  addIf(stats.uniqueCategories30d >= 5, "versatility");

  if (!candidates.length) return [];

  const rows = candidates.map((type) => ({
    technician_id: technicianId,
    achievement_type: type,
    achievement_data: {} as any,
  }));
  await supabase.from("technician_achievements").insert(rows);
  return candidates;
}

/** Convenience: recompute, persist, and detect new achievements in one call. */
export async function refreshTechnicianStats(technicianId: string) {
  const stats = await computeStats(technicianId);
  const previousScore = await persistStats(technicianId, stats);
  const newAchievements = await detectAchievements(technicianId, stats);
  return { stats, previousScore, newAchievements };
}
