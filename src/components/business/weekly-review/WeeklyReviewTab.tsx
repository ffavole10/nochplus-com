import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, Flame, X, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { cn } from "@/lib/utils";
import {
  useCurrentWeeklyReview, useWeeklyReviews, useReviewNotes,
  useAddReviewNote, useCloseReview, useEnsureCurrentReview,
  computeStreak, noteTypeMeta,
  type WeeklyReview, type WeeklyReviewNoteType, type WeeklyReviewLinkType, type WeeklyReviewNote,
} from "@/hooks/useWeeklyReview";
import { useDeals } from "@/hooks/useDeals";
import { useAllStrategies } from "@/hooks/useStrategy";
import { useCustomers } from "@/hooks/useCustomers";
import { useFocus5CustomerIds } from "@/hooks/useFocus5";
import { SkipReviewModal } from "./SkipReviewModal";
import { InlineKpiUpdater } from "./InlineKpiUpdater";
import { CustomerLogo } from "@/components/CustomerLogo";
import { formatCurrency } from "@/lib/formatters";
import { DEAL_STAGES, DEAL_STAGE_COLORS, LOSS_REASON_LABELS, WIN_REASON_LABELS, type DealStage } from "@/types/growth";
import { useRecentStageTransitions } from "@/hooks/useStageTransitions";
import { Star, AlertTriangle } from "lucide-react";
import { differenceInDays } from "date-fns";

const CHIPS: WeeklyReviewNoteType[] = ["update", "decision", "action_item", "risk", "need"];

export function WeeklyReviewTab() {
  useEnsureCurrentReview();
  const { data: current } = useCurrentWeeklyReview();
  const { data: reviews = [] } = useWeeklyReviews(50);
  const [liveMode, setLiveMode] = useState(false);
  const [skipModal, setSkipModal] = useState<{ open: boolean; id?: string; week?: number }>({ open: false });
  const { confirm, dialogProps } = useConfirmDialog();
  const closeReview = useCloseReview();

  const streak = useMemo(() => computeStreak(reviews), [reviews]);
  const past = reviews.filter((r) => !current || r.id !== current.id);

  const handleClose = async (id: string, weekNum: number) => {
    const ok = await confirm({
      title: `Close Week ${weekNum} review?`,
      description: "Notes will be locked. The original author can edit typos for 24 hours.",
      confirmLabel: "Close review",
      variant: "default",
    });
    if (ok) {
      await closeReview.mutateAsync(id);
      setLiveMode(false);
    }
  };

  if (liveMode && current) {
    return (
      <>
        <LiveMode
          review={current}
          onExit={() => setLiveMode(false)}
          onClose={() => handleClose(current.id, current.week_number)}
        />
        <ConfirmDialog {...dialogProps} />
      </>
    );
  }

  return (
    <div className="space-y-5">
      {current && <CurrentWeekCard review={current} onEnter={() => setLiveMode(true)} onSkip={() => setSkipModal({ open: true, id: current.id, week: current.week_number })} />}

      {/* Streak */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-500" />
          <span className="font-semibold">{streak.current} week streak</span>
        </div>
        <span className="text-muted-foreground">
          Best: {streak.best} · Closed: {streak.totalClosed}
        </span>
      </div>

      {/* Past Reviews */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Past Reviews</h2>
        {past.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No past reviews yet.</CardContent></Card>
        )}
        {past.map((r) => (
          <PastReviewRow
            key={r.id}
            review={r}
            onAddReason={() => setSkipModal({ open: true, id: r.id, week: r.week_number })}
          />
        ))}
      </div>

      {skipModal.open && skipModal.id && (
        <SkipReviewModal
          open={skipModal.open}
          onOpenChange={(o) => setSkipModal({ open: o })}
          reviewId={skipModal.id}
          weekNumber={skipModal.week || 0}
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ───────── Current week card ─────────
function CurrentWeekCard({
  review, onEnter, onSkip,
}: {
  review: WeeklyReview;
  onEnter: () => void;
  onSkip: () => void;
}) {
  const monday = format(new Date(review.start_date), "MMM d, yyyy");
  let badge = "";
  let badgeClass = "";
  let subtitle = "";
  let primaryLabel = "Start Live Review →";

  switch (review.status) {
    case "pre_meeting":
      badge = "Opens soon"; badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
      subtitle = "Review opens Monday — pre-fill notes available now";
      primaryLabel = "Pre-fill notes →";
      break;
    case "open":
      badge = "Live"; badgeClass = "bg-teal-100 text-teal-800 border-teal-300 animate-pulse";
      subtitle = "Review is open — start when ready";
      break;
    case "pending_close":
      badge = "Pending close"; badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
      subtitle = "Review is open but not yet closed";
      primaryLabel = "Continue Review →";
      break;
    case "missed":
      badge = "Missed"; badgeClass = "bg-rose-100 text-rose-800 border-rose-300";
      subtitle = "Review was missed";
      primaryLabel = "Re-open and close →";
      break;
    case "closed":
      badge = "Closed"; badgeClass = "bg-slate-100 text-slate-700 border-slate-300";
      subtitle = "This week's review is complete";
      break;
    case "skipped":
      badge = "Skipped"; badgeClass = "bg-slate-100 text-slate-700 border-slate-300";
      subtitle = `Skipped — ${review.skip_reason || ""}`;
      break;
  }

  return (
    <Card className="border-2">
      <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold">Week {review.week_number} · {monday}</h2>
            <Badge className={cn("border text-[10px]", badgeClass)}>{badge}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          {(review.status === "pending_close" || review.status === "missed" || review.status === "open") && (
            <Button variant="outline" size="sm" onClick={onSkip}>Mark as Skipped</Button>
          )}
          {review.status !== "closed" && review.status !== "skipped" && (
            <Button size="sm" onClick={onEnter}>{primaryLabel}</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ───────── Past review row ─────────
function PastReviewRow({ review, onAddReason }: { review: WeeklyReview; onAddReason: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: notes = [] } = useReviewNotes(open ? review.id : undefined);
  const monday = format(new Date(review.start_date), "MMM d, yyyy");

  let icon = "✅"; let label = "Closed"; let meta = "";
  if (review.status === "skipped") {
    icon = "📅"; label = "Skipped";
    meta = `Reason: ${review.skip_reason || "—"}${review.skipped_by ? ` · Marked by ${review.skipped_by}` : ""}`;
  } else if (review.status === "missed") {
    icon = "❌"; label = "Missed"; meta = "No reason given";
  } else if (review.status === "closed") {
    meta = `Closed by ${review.closed_by || "—"}${review.closed_at ? ` · ${formatDistanceToNow(new Date(review.closed_at), { addSuffix: true })}` : ""}`;
  } else {
    meta = `Status: ${review.status}`;
  }

  return (
    <Card>
      <CardContent className="p-3">
        <button className="w-full text-left flex items-start justify-between gap-2" onClick={() => setOpen((o) => !o)}>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              <span className="mr-1.5">{icon}</span>
              Week {review.week_number} · {monday} · {label}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{meta}</div>
          </div>
          <div className="flex items-center gap-1">
            {review.status === "missed" && (
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); onAddReason(); }}>
                Add reason after the fact →
              </Button>
            )}
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
        {open && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {review.summary && (
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground bg-muted/40 rounded p-2 font-sans">{review.summary}</pre>
            )}
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No notes captured.</p>
            ) : (
              <ol className="space-y-1.5">
                {notes.map((n) => <NoteRow key={n.id} note={n} />)}
              </ol>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NoteRow({ note }: { note: WeeklyReviewNote }) {
  const meta = noteTypeMeta(note.note_type);
  return (
    <li className="rounded border bg-card px-2.5 py-2">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Badge className={cn("border text-[10px]", meta.color)}>
          <span className="mr-1">{meta.icon}</span>{meta.label}
        </Badge>
        <span className="text-[11px] text-muted-foreground">{note.author} · {format(new Date(note.created_at), "MMM d h:mm a")}</span>
      </div>
      <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
      {note.note_type === "action_item" && (note.owner || note.due_date) && (
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {note.owner && <>Owner: {note.owner}</>}
          {note.owner && note.due_date && " · "}
          {note.due_date && <>Due: {format(new Date(note.due_date), "MMM d")}</>}
        </p>
      )}
    </li>
  );
}

// ────────────── LIVE MODE ──────────────
function LiveMode({ review, onExit, onClose }: { review: WeeklyReview; onExit: () => void; onClose: () => void }) {
  const { data: notes = [] } = useReviewNotes(review.id);
  const { data: deals = [] } = useDeals();
  const { data: strategies = [] } = useAllStrategies();
  const { data: customers = [] } = useCustomers();
  const customerById = useMemo(() => Object.fromEntries(customers.map((c: any) => [c.id, c])), [customers]);

  const openDeals = useMemo(
    () => deals.filter((d: any) => d.stage !== "Closed Won" && d.stage !== "Closed Lost"),
    [deals]
  );
  const { data: focusCustomerIds = new Set<string>() } = useFocus5CustomerIds();
  const dealsByStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    DEAL_STAGES.forEach((s) => { map[s] = []; });
    openDeals.forEach((d: any) => { if (map[d.stage]) map[d.stage].push(d); });
    // sort each by value desc
    Object.keys(map).forEach((k) => map[k].sort((a, b) => Number(b.value || 0) - Number(a.value || 0)));
    return map;
  }, [openDeals]);
  const totalArr = useMemo(() => openDeals.reduce((s: number, d: any) => s + Number(d.value || 0), 0), [openDeals]);
  const stagesWithDeals = DEAL_STAGES.filter((s) => dealsByStage[s].length > 0);
  const focusStrategies = useMemo(() => strategies.filter((s: any) => s.is_focus), [strategies]);
  const atRisk = useMemo(
    () => strategies.filter((s: any) => !s.is_focus && (s.status === "needs_review" || s.current_position === "at_risk")),
    [strategies]
  );

  const notesByLink = useMemo(() => {
    const map = new Map<string, WeeklyReviewNote[]>();
    notes.forEach((n) => {
      if (n.linked_to_id) {
        const k = `${n.linked_to_type}:${n.linked_to_id}`;
        const arr = map.get(k) || [];
        arr.push(n);
        map.set(k, arr);
      }
    });
    return map;
  }, [notes]);

  const actionItems = notes.filter((n) => n.note_type === "action_item");

  const isPre = review.status === "pre_meeting";
  const canClose = review.status === "open" || review.status === "pending_close" || review.status === "missed";

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="rounded-md bg-slate-900 text-slate-100 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge className="bg-teal-500/20 text-teal-300 border-teal-400/40">REVIEW MODE</Badge>
          <span className="font-semibold text-sm">Week {review.week_number} · {format(new Date(review.start_date), "MMM d, yyyy")}</span>
          <Badge className="bg-slate-700 text-slate-200 border-slate-600 text-[10px] capitalize">{review.status.replace("_", " ")}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-slate-200 hover:text-white hover:bg-slate-800" onClick={onExit}>
            <X className="h-4 w-4 mr-1" /> Exit
          </Button>
          {canClose && (
            <Button size="sm" onClick={onClose} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              Close Weekly Review →
            </Button>
          )}
        </div>
      </div>

      {isPre && (
        <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-3 text-sm">
            Pre-meeting mode — adds will be saved for Monday's review.
          </CardContent>
        </Card>
      )}

      {/* Section 0: This week's transitions */}
      <WeeklyTransitionsSection deals={deals} customerById={customerById} />

      {/* Section 1: Pipeline — stage-grouped review layout */}
      <Section
        title="Pipeline"
        subtitle={`${openDeals.length} open ${openDeals.length === 1 ? "deal" : "deals"} across ${stagesWithDeals.length} ${stagesWithDeals.length === 1 ? "stage" : "stages"} · ${formatCurrency(totalArr)} total ARR`}
      >
        {openDeals.length === 0 ? <Empty>No open deals.</Empty> : (
          <div className="space-y-5">
            {stagesWithDeals.map((stage) => {
              const stageDeals = dealsByStage[stage];
              const stageTotal = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[11px] font-semibold", DEAL_STAGE_COLORS[stage as DealStage])}>
                        {stage}
                      </Badge>
                      <span className="text-xs text-muted-foreground">({stageDeals.length})</span>
                    </div>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">{formatCurrency(stageTotal)} total ARR</span>
                  </div>
                  {stageDeals.map((d: any) => {
                    const partner: any = customerById[d.partner_id];
                    const isFocus = focusCustomerIds.has(d.partner_id);
                    const days = Math.max(0, differenceInDays(new Date(), new Date(d.last_activity_at || d.updated_at)));
                    const health = d.deal_health as string | null;
                    const healthMeta = health === "critical" ? { label: "Critical", cls: "bg-rose-100 text-rose-800 border-rose-300" }
                      : health === "at_risk" ? { label: "At Risk", cls: "bg-amber-100 text-amber-800 border-amber-300" }
                      : health === "stalled" ? { label: "Stalled", cls: "bg-slate-200 text-slate-800 border-slate-300" }
                      : health === "healthy" ? { label: "Healthy", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" }
                      : null;
                    return (
                      <ArtifactRow
                        key={d.id}
                        title={d.deal_name || `Deal ${d.id.slice(0, 6)}`}
                        reviewId={review.id}
                        linkType="deal"
                        linkId={d.id}
                        existingNotes={notesByLink.get(`deal:${d.id}`) || []}
                        isPre={isPre}
                        header={
                          <div className="flex items-start gap-2.5">
                            <CustomerLogo logoUrl={partner?.logo_url} companyName={partner?.company || "—"} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isFocus && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />}
                                <span className="text-sm font-semibold truncate">{partner?.company || "Unknown"}</span>
                                {healthMeta && (
                                  <Badge variant="outline" className={cn("text-[9px] py-0 h-4", healthMeta.cls)}>
                                    {health === "at_risk" || health === "critical" ? <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> : null}
                                    {healthMeta.label}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {d.deal_name}{d.owner ? ` · ${d.owner}` : ""}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                ARR: <span className="font-medium text-foreground">{formatCurrency(Number(d.value || 0))}</span>
                                <span className="opacity-50"> · </span>
                                {days}d in stage
                              </p>
                            </div>
                          </div>
                        }
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Section 2: Focus 5 */}
      <Section title="Focus 5" subtitle={review.skip_reason || `${focusStrategies.length} strategies`}>
        {focusStrategies.length === 0 ? <Empty>No Focus 5 accounts set.</Empty> : (
          <div className="space-y-2">
            {focusStrategies.map((s: any) => (
              <ArtifactRow
                key={s.id}
                title={customerById[s.customer_id]?.company || "Account"}
                meta={s.north_star || ""}
                reviewId={review.id}
                linkType="strategy"
                linkId={s.id}
                existingNotes={notesByLink.get(`strategy:${s.id}`) || []}
                isPre={isPre}
                extra={<InlineKpiUpdater strategyId={s.id} weeklyReviewId={review.id} />}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Section 3: At-Risk */}
      <Section title="At-Risk Accounts" subtitle={`${atRisk.length} non-Focus accounts needing attention`}>
        {atRisk.length === 0 ? <Empty>No at-risk accounts.</Empty> : (
          <div className="space-y-2">
            {atRisk.slice(0, 20).map((s: any) => (
              <ArtifactRow
                key={s.id}
                title={customerById[s.customer_id]?.company || "Account"}
                meta={s.current_position || ""}
                reviewId={review.id}
                linkType="strategy"
                linkId={s.id}
                existingNotes={notesByLink.get(`strategy:${s.id}`) || []}
                isPre={isPre}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Section 4: Forward Look */}
      <Section title="Forward Look" subtitle="Next week">
        <ForwardPrompt label="Top 3 plays for next week" reviewId={review.id} isPre={isPre} />
        <ForwardPrompt label="What's coming up that needs prep?" reviewId={review.id} isPre={isPre} />
        <ForwardPrompt label="Any rotation or strategic conversations?" reviewId={review.id} isPre={isPre} />
      </Section>

      {/* Action Item Recap */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2">Action Item Recap ({actionItems.length})</h3>
          {actionItems.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No action items captured this week.</p>
          ) : (
            <ul className="space-y-1.5">
              {actionItems.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" disabled />
                  <span className="flex-1">
                    {a.note_text}
                    {(a.owner || a.due_date) && (
                      <span className="text-xs text-muted-foreground ml-1">
                        · {a.owner && `Owner: ${a.owner}`}{a.owner && a.due_date && " · "}{a.due_date && `Due: ${format(new Date(a.due_date), "MMM d")}`}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-baseline gap-2 border-b pb-2">
          <h3 className="font-bold">{title}</h3>
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground italic py-2">{children}</p>;
}

function ArtifactRow({
  title, meta, header, extra, reviewId, linkType, linkId, existingNotes, isPre,
}: {
  title: string; meta?: string;
  header?: React.ReactNode;
  extra?: React.ReactNode;
  reviewId: string; linkType: WeeklyReviewLinkType; linkId: string;
  existingNotes: WeeklyReviewNote[]; isPre: boolean;
}) {
  const [type, setType] = useState<WeeklyReviewNoteType | null>(null);
  const [text, setText] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const add = useAddReviewNote();

  const submit = async () => {
    if (!type || !text.trim()) return;
    await add.mutateAsync({
      weekly_review_id: reviewId,
      note_type: type,
      note_text: text.trim(),
      linked_to_type: linkType,
      linked_to_id: linkId,
      owner: type === "action_item" ? owner || null : null,
      due_date: type === "action_item" ? due || null : null,
      is_pre_meeting: isPre,
    });
    setText(""); setType(null); setOwner(""); setDue("");
  };

  return (
    <div className="rounded-md border p-2.5 space-y-2">
      {header ? header : (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{title}</p>
            {meta && <p className="text-[11px] text-muted-foreground truncate">{meta}</p>}
          </div>
        </div>
      )}
      {extra}
      {existingNotes.length > 0 && (
        <ol className="space-y-1 pl-2 border-l-2 border-muted">
          {existingNotes.map((n) => {
            const m = noteTypeMeta(n.note_type);
            return (
              <li key={n.id} className="text-xs flex items-start gap-1.5">
                <Badge className={cn("border text-[9px] mt-0.5", m.color)}>{m.icon} {m.label}</Badge>
                <span className="flex-1">{n.note_text} <span className="text-muted-foreground">— {n.author}</span></span>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {CHIPS.map((c) => {
          const m = noteTypeMeta(c);
          const active = type === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setType(active ? null : c)}
              className={cn("text-[10px] px-2 py-0.5 rounded-full border", m.color, active ? "ring-2 ring-primary/50" : "opacity-70 hover:opacity-100")}
            >
              {m.icon} {m.label}
            </button>
          );
        })}
      </div>
      {type && (
        <div className="space-y-1.5">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="text-sm" placeholder={`${noteTypeMeta(type).label}…`} />
          {type === "action_item" && (
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} className="h-8 text-xs" />
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-8 text-xs" />
            </div>
          )}
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => { setType(null); setText(""); }}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={!text.trim() || add.isPending}>
              <Plus className="h-3 w-3 mr-1" /> Save note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ForwardPrompt({ label, reviewId, isPre }: { label: string; reviewId: string; isPre: boolean }) {
  const [text, setText] = useState("");
  const add = useAddReviewNote();
  const submit = async () => {
    if (!text.trim()) return;
    await add.mutateAsync({
      weekly_review_id: reviewId,
      note_type: "update",
      note_text: `[${label}] ${text.trim()}`,
      linked_to_type: "none",
      is_pre_meeting: isPre,
    });
    setText("");
  };
  return (
    <div className="space-y-1.5 pb-2 border-b last:border-0">
      <p className="text-xs font-semibold">{label}</p>
      <div className="flex gap-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="text-sm flex-1" />
        <Button size="sm" onClick={submit} disabled={!text.trim() || add.isPending}>Add</Button>
      </div>
    </div>
  );
}
