import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export type WeeklyReviewStatus =
  | "pre_meeting" | "open" | "closed" | "skipped" | "missed" | "pending_close";
export type WeeklyReviewNoteType =
  | "update" | "decision" | "action_item" | "risk" | "need";
export type WeeklyReviewLinkType = "deal" | "strategy" | "account" | "none";
export type WeeklyReviewSkipReason =
  | "holiday" | "trade_show" | "team_travel" | "sprint_week" | "other";

export interface WeeklyReview {
  id: string;
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  status: WeeklyReviewStatus;
  closed_at: string | null;
  closed_by: string | null;
  skip_reason: WeeklyReviewSkipReason | null;
  skip_reason_notes: string | null;
  skipped_at: string | null;
  skipped_by: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReviewNote {
  id: string;
  weekly_review_id: string;
  note_type: WeeklyReviewNoteType;
  note_text: string;
  linked_to_type: WeeklyReviewLinkType;
  linked_to_id: string | null;
  owner: string | null;
  due_date: string | null;
  action_status: "open" | "complete" | "abandoned" | null;
  author: string;
  author_user_id: string | null;
  is_pre_meeting: boolean;
  locked: boolean;
  edited_at: string | null;
  created_at: string;
}

async function userInfo() {
  const { data } = await supabase.auth.getUser();
  return {
    id: data?.user?.id || null,
    email: data?.user?.email || "Unknown",
  };
}

/** Ensures a current-week review exists; auto-advances stale statuses. */
export function useEnsureCurrentReview() {
  const qc = useQueryClient();
  useEffect(() => {
    (async () => {
      try {
        await sb.rpc("auto_advance_weekly_review_statuses");
        await sb.rpc("get_or_create_current_weekly_review");
        qc.invalidateQueries({ queryKey: ["weekly-reviews"] });
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useCurrentWeeklyReview() {
  return useQuery({
    queryKey: ["weekly-reviews", "current"],
    queryFn: async (): Promise<WeeklyReview | null> => {
      await sb.rpc("auto_advance_weekly_review_statuses");
      const { data, error } = await sb.rpc("get_or_create_current_weekly_review");
      if (error) throw error;
      // RPC returning RECORD may come back as object or array
      return Array.isArray(data) ? (data[0] || null) : data;
    },
    staleTime: 30_000,
  });
}

export function useWeeklyReviews(limit = 50) {
  return useQuery({
    queryKey: ["weekly-reviews", "list", limit],
    queryFn: async (): Promise<WeeklyReview[]> => {
      const { data, error } = await sb
        .from("weekly_reviews")
        .select("*")
        .order("year", { ascending: false })
        .order("week_number", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useReviewNotes(reviewId?: string) {
  return useQuery({
    queryKey: ["weekly-review-notes", reviewId || "none"],
    enabled: !!reviewId,
    queryFn: async (): Promise<WeeklyReviewNote[]> => {
      const { data, error } = await sb
        .from("weekly_review_notes")
        .select("*")
        .eq("weekly_review_id", reviewId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

/** Notes linked to a specific deal/strategy/account across all weeks. */
export function useNotesForLink(linkType: WeeklyReviewLinkType, linkId?: string | null) {
  return useQuery({
    queryKey: ["weekly-review-notes", "link", linkType, linkId || "none"],
    enabled: !!linkId && linkType !== "none",
    queryFn: async (): Promise<(WeeklyReviewNote & { _review?: WeeklyReview })[]> => {
      const { data: notes, error } = await sb
        .from("weekly_review_notes")
        .select("*")
        .eq("linked_to_type", linkType)
        .eq("linked_to_id", linkId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (notes || []) as WeeklyReviewNote[];
      const reviewIds = Array.from(new Set(list.map((n) => n.weekly_review_id)));
      if (reviewIds.length === 0) return [];
      const { data: revs } = await sb.from("weekly_reviews").select("*").in("id", reviewIds);
      const byId = new Map<string, WeeklyReview>((revs || []).map((r: WeeklyReview) => [r.id, r]));
      return list.map((n) => ({ ...n, _review: byId.get(n.weekly_review_id) }));
    },
  });
}

export function useAddReviewNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      weekly_review_id: string;
      note_type: WeeklyReviewNoteType;
      note_text: string;
      linked_to_type?: WeeklyReviewLinkType;
      linked_to_id?: string | null;
      owner?: string | null;
      due_date?: string | null;
      is_pre_meeting?: boolean;
    }) => {
      const u = await userInfo();
      const payload: any = {
        weekly_review_id: input.weekly_review_id,
        note_type: input.note_type,
        note_text: input.note_text,
        linked_to_type: input.linked_to_type || "none",
        linked_to_id: input.linked_to_id || null,
        owner: input.owner || null,
        due_date: input.due_date || null,
        author: u.email,
        author_user_id: u.id,
        is_pre_meeting: !!input.is_pre_meeting,
      };
      if (input.note_type === "action_item") payload.action_status = "open";
      const { data, error } = await sb.from("weekly_review_notes").insert(payload).select().single();
      if (error) throw error;
      return data as WeeklyReviewNote;
    },
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ["weekly-review-notes"] });
      qc.invalidateQueries({ queryKey: ["weekly-review-notes", note.weekly_review_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCloseReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const u = await userInfo();
      const { data, error } = await sb.rpc("close_weekly_review", {
        _id: id,
        _closed_by: u.email,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-reviews"] });
      qc.invalidateQueries({ queryKey: ["weekly-review-notes"] });
      toast.success("Weekly review closed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSkipReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      reason: WeeklyReviewSkipReason;
      notes?: string;
    }) => {
      const u = await userInfo();
      const { data, error } = await sb.rpc("skip_weekly_review", {
        _id: input.id,
        _reason: input.reason,
        _notes: input.notes || null,
        _skipped_by: u.email,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-reviews"] });
      toast.success("Week marked as skipped");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note_text }: { id: string; note_text: string }) => {
      const { data, error } = await sb
        .from("weekly_review_notes")
        .update({ note_text })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-review-notes"] });
      toast.success("Note updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Streak calculation: consecutive recent weeks that were closed or skipped (missed breaks). */
export function computeStreak(reviews: WeeklyReview[]) {
  // Order newest first by year then week
  const ordered = [...reviews].sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.week_number - a.week_number
  );
  let current = 0;
  for (const r of ordered) {
    if (r.status === "closed" || r.status === "skipped") current++;
    else if (r.status === "missed") break;
    else break; // open / pending / pre — stop counting forward
  }
  // Best & total
  let best = 0; let run = 0;
  for (const r of ordered) {
    if (r.status === "closed" || r.status === "skipped") { run++; best = Math.max(best, run); }
    else if (r.status === "missed") { run = 0; }
  }
  const totalClosed = ordered.filter((r) => r.status === "closed").length;
  return { current, best, totalClosed };
}

export function noteTypeMeta(type: WeeklyReviewNoteType) {
  switch (type) {
    case "update": return { label: "Update", icon: "📊", color: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200" };
    case "decision": return { label: "Decision", icon: "✅", color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200" };
    case "action_item": return { label: "Action", icon: "→", color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200" };
    case "risk": return { label: "Risk", icon: "⚠", color: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200" };
    case "need": return { label: "Need", icon: "💬", color: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200" };
  }
}
