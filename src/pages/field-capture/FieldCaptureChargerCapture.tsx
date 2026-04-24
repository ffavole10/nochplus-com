import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import maxThumbsUp from "@/assets/max-thumbsup.png";
import PhotoUploader from "@/components/field-capture/PhotoUploader";
import {
  ISSUE_CATEGORY_LABELS,
  ROOT_CAUSE_LABELS,
  POST_WORK_STATUS_LABELS,
  type ChargerIssueCategory,
  type ChargerPostWorkStatus,
  type ChargerRootCause,
  type WorkOrderCharger,
} from "@/types/fieldCapture";

const STEPS = [
  { n: 1, label: "Issue" },
  { n: 2, label: "Work" },
  { n: 3, label: "Resolution" },
  { n: 4, label: "Review" },
];

export default function FieldCaptureChargerCapture() {
  const { workOrderId, chargerId } = useParams<{
    workOrderId: string;
    chargerId: string;
  }>();
  const navigate = useNavigate();
  usePageTitle("Capture");

  const [step, setStep] = useState(1);
  const [charger, setCharger] = useState<WorkOrderCharger | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);

  // form
  const [issueCategory, setIssueCategory] = useState<ChargerIssueCategory | "">("");
  const [rootCause, setRootCause] = useState<ChargerRootCause | "">("");
  const [issueDesc, setIssueDesc] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [workPerformed, setWorkPerformed] = useState("");
  const [partsSwap, setPartsSwap] = useState(false);
  const [oldSerial, setOldSerial] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [resolution, setResolution] = useState("");
  const [postStatus, setPostStatus] = useState<ChargerPostWorkStatus | "">("");

  // photo counts
  const [beforeCount, setBeforeCount] = useState(0);
  const [afterCount, setAfterCount] = useState(0);
  const [oldSerialCount, setOldSerialCount] = useState(0);
  const [newSerialCount, setNewSerialCount] = useState(0);

  useEffect(() => {
    if (!chargerId || !workOrderId) return;
    (async () => {
      const [{ data: ch }, { count }] = await Promise.all([
        supabase
          .from("work_order_chargers")
          .select("*")
          .eq("id", chargerId)
          .maybeSingle(),
        supabase
          .from("work_order_chargers")
          .select("id", { count: "exact", head: true })
          .eq("work_order_id", workOrderId),
      ]);
      if (ch) {
        const c = ch as WorkOrderCharger;
        setCharger(c);
        setIssueCategory((c.issue_category as ChargerIssueCategory) || "");
        setRootCause((c.root_cause as ChargerRootCause) || "");
        setIssueDesc(c.issue_description || "");
        setRecurring(!!c.is_recurring_issue);
        setWorkPerformed(c.work_performed || "");
        setPartsSwap(!!c.parts_swap_performed);
        setOldSerial(c.old_serial_number || "");
        setNewSerial(c.new_serial_number || "");
        setResolution(c.resolution || "");
        setPostStatus(
          (c.charger_status_post_work as ChargerPostWorkStatus) || "",
        );
        // mark in_progress + capture_started_at if not already
        if (c.status === "not_started") {
          await supabase
            .from("work_order_chargers")
            .update({
              status: "in_progress",
              capture_started_at: new Date().toISOString(),
            })
            .eq("id", c.id);
        }
      }
      setTotal(count ?? 0);
      setLoading(false);
    })();
  }, [chargerId, workOrderId]);

  const step1Valid =
    !!issueCategory &&
    !!rootCause &&
    issueDesc.trim().length >= 10 &&
    beforeCount >= 2;

  const step2Valid =
    workPerformed.trim().length >= 10 &&
    (!partsSwap ||
      (oldSerial.trim() &&
        newSerial.trim() &&
        oldSerialCount >= 1 &&
        newSerialCount >= 1));

  const step3Valid =
    resolution.trim().length >= 10 && !!postStatus && afterCount >= 2;

  async function persist(extra: Partial<WorkOrderCharger> = {}) {
    if (!chargerId) return;
    const payload: any = {
      issue_category: issueCategory || null,
      root_cause: rootCause || null,
      issue_description: issueDesc || null,
      is_recurring_issue: recurring,
      work_performed: workPerformed || null,
      parts_swap_performed: partsSwap,
      old_serial_number: partsSwap ? oldSerial || null : null,
      new_serial_number: partsSwap ? newSerial || null : null,
      resolution: resolution || null,
      charger_status_post_work: postStatus || null,
      ...extra,
    };
    const { error } = await supabase
      .from("work_order_chargers")
      .update(payload)
      .eq("id", chargerId);
    if (error) {
      toast.error("Could not save");
      throw error;
    }
  }

  async function next() {
    setSaving(true);
    try {
      await persist();
      setStep((s) => Math.min(4, s + 1));
      window.scrollTo({ top: 0 });
    } finally {
      setSaving(false);
    }
  }

  async function submitCharger() {
    if (!chargerId) return;
    setSaving(true);
    try {
      await persist({
        status: "complete",
        capture_completed_at: new Date().toISOString(),
      });
      setShowCelebrate(true);
      setTimeout(() => {
        navigate(`/field-capture/job/${workOrderId}`);
      }, 1800);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !charger) {
    return (
      <div className="px-4 py-12 text-center text-fc-muted">Loading…</div>
    );
  }

  if (showCelebrate) {
    return (
      <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center bg-gradient-to-b from-fc-primary/15 to-white p-8">
        <img
          src={maxThumbsUp}
          alt="Max thumbs up"
          className="w-56 h-auto animate-[fc-celebrate_500ms_ease-out]"
        />
        <div className="mt-6 text-3xl font-bold text-fc-text">
          Charger {charger.charger_position} complete!
        </div>
        <div className="mt-1 text-fc-muted">Great work.</div>
      </div>
    );
  }

  return (
    <>
      {/* Top bar */}
      <div
        className="sticky top-0 z-30 bg-fc-header/95 backdrop-blur border-b border-fc-border"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="px-3 py-3 flex items-center gap-2">
          <button
            onClick={() => navigate(`/field-capture/job/${workOrderId}`)}
            className="h-9 w-9 rounded-full hover:bg-fc-border/50 flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-fc-text" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-fc-text text-sm">
              Charger {charger.charger_position} of {total}
            </div>
            <div className="text-[11px] text-fc-muted truncate">
              {charger.make_model || "—"} • {charger.serial_number || "no serial"}
            </div>
          </div>
        </div>
        {/* Step indicator */}
        <div className="px-3 pb-3 flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex-1 flex items-center gap-1">
              <div
                className={cn(
                  "flex-1 h-1.5 rounded-full",
                  s.n < step
                    ? "bg-fc-primary/60"
                    : s.n === step
                    ? "bg-fc-primary"
                    : "bg-fc-border",
                )}
              />
            </div>
          ))}
        </div>
        <div className="px-3 pb-2 flex items-center justify-between text-[11px] font-medium">
          {STEPS.map((s) => (
            <span
              key={s.n}
              className={cn(
                "flex items-center gap-1",
                s.n === step
                  ? "text-fc-primary"
                  : s.n < step
                  ? "text-fc-primary/70"
                  : "text-fc-muted",
              )}
            >
              {s.n < step ? <Check className="h-3 w-3" /> : null}
              {s.n}. {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 pb-32">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-fc-text">What did you find?</h2>

            <div className="space-y-1.5">
              <Label>Issue Category *</Label>
              <Select
                value={issueCategory}
                onValueChange={(v) => setIssueCategory(v as ChargerIssueCategory)}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ISSUE_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Root Cause (your best assessment) *</Label>
              <Select
                value={rootCause}
                onValueChange={(v) => setRootCause(v as ChargerRootCause)}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select root cause" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROOT_CAUSE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Describe the issue * <span className="text-fc-muted font-normal">(min 10 chars)</span></Label>
              <Textarea
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
                placeholder="What did you find when you arrived?"
                className="min-h-[110px] rounded-xl"
              />
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-fc-bg border border-fc-border">
              <Checkbox
                id="recurring"
                checked={recurring}
                onCheckedChange={(v) => setRecurring(!!v)}
                className="mt-0.5"
              />
              <label htmlFor="recurring" className="text-sm text-fc-text leading-snug">
                Have you seen this issue before at this site or on this charger model?
              </label>
            </div>

            <div className="space-y-1.5">
              <Label>Before Photos * <span className="text-fc-muted font-normal">(min 2 required)</span></Label>
              <PhotoUploader
                workOrderId={workOrderId!}
                chargerId={chargerId}
                photoType="before"
                minRequired={2}
                onCountChange={setBeforeCount}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-fc-text">What did you do?</h2>

            <div className="space-y-1.5">
              <Label>Describe the work you completed * <span className="text-fc-muted font-normal">(min 10 chars)</span></Label>
              <Textarea
                value={workPerformed}
                onChange={(e) => setWorkPerformed(e.target.value)}
                placeholder="Walk through what you did to address the issue"
                className="min-h-[110px] rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-fc-bg border border-fc-border">
              <Label className="cursor-pointer">Did you swap any parts?</Label>
              <Switch checked={partsSwap} onCheckedChange={setPartsSwap} />
            </div>

            {partsSwap && (
              <div className="space-y-4 border-l-2 border-fc-primary pl-3">
                <div className="space-y-1.5">
                  <Label>Old Serial Number *</Label>
                  <Input
                    value={oldSerial}
                    onChange={(e) => setOldSerial(e.target.value)}
                    placeholder="Enter old part serial"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Photo of old serial *</Label>
                  <PhotoUploader
                    workOrderId={workOrderId!}
                    chargerId={chargerId}
                    photoType="old_serial"
                    minRequired={1}
                    maxAllowed={2}
                    onCountChange={setOldSerialCount}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>New Serial Number *</Label>
                  <Input
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    placeholder="Enter new part serial"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Photo of new serial *</Label>
                  <PhotoUploader
                    workOrderId={workOrderId!}
                    chargerId={chargerId}
                    photoType="new_serial"
                    minRequired={1}
                    maxAllowed={2}
                    onCountChange={setNewSerialCount}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Return receipt or shipping label (optional)</Label>
                  <PhotoUploader
                    workOrderId={workOrderId!}
                    chargerId={chargerId}
                    photoType="return_receipt"
                    maxAllowed={2}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>During-Work Photos (optional)</Label>
              <PhotoUploader
                workOrderId={workOrderId!}
                chargerId={chargerId}
                photoType="during"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-fc-text">How did it end?</h2>

            <div className="space-y-1.5">
              <Label>Resolution summary * <span className="text-fc-muted font-normal">(min 10 chars)</span></Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe the final outcome and any important notes"
                className="min-h-[110px] rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Charger status after your work *</Label>
              <Select
                value={postStatus}
                onValueChange={(v) => setPostStatus(v as ChargerPostWorkStatus)}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(POST_WORK_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>After Photos * <span className="text-fc-muted font-normal">(min 2 required)</span></Label>
              <PhotoUploader
                workOrderId={workOrderId!}
                chargerId={chargerId}
                photoType="after"
                minRequired={2}
                onCountChange={setAfterCount}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-fc-text">Review your work</h2>

            <ReviewSection title="Charger" onEdit={() => setStep(1)}>
              <Pill>Pos {charger.charger_position}</Pill>
              <Pill>{charger.make_model || "—"}</Pill>
              <Pill>{charger.serial_number || "no serial"}</Pill>
            </ReviewSection>

            <ReviewSection title="Issue Identified" onEdit={() => setStep(1)}>
              <div className="flex flex-wrap gap-1.5">
                {issueCategory && (
                  <Pill>{ISSUE_CATEGORY_LABELS[issueCategory]}</Pill>
                )}
                {rootCause && <Pill>{ROOT_CAUSE_LABELS[rootCause]}</Pill>}
                {recurring && <Pill tone="warning">Recurring</Pill>}
              </div>
              <p className="text-sm text-fc-text mt-2 whitespace-pre-wrap">
                {issueDesc}
              </p>
              <div className="text-xs text-fc-muted mt-2">
                {beforeCount} before photo{beforeCount === 1 ? "" : "s"}
              </div>
            </ReviewSection>

            <ReviewSection title="Work Performed" onEdit={() => setStep(2)}>
              <p className="text-sm text-fc-text whitespace-pre-wrap">
                {workPerformed}
              </p>
              {partsSwap && (
                <div className="mt-2 text-sm text-fc-text space-y-0.5">
                  <div>
                    <span className="text-fc-muted">Old serial:</span> {oldSerial}
                  </div>
                  <div>
                    <span className="text-fc-muted">New serial:</span> {newSerial}
                  </div>
                </div>
              )}
            </ReviewSection>

            <ReviewSection title="Resolution" onEdit={() => setStep(3)}>
              <p className="text-sm text-fc-text whitespace-pre-wrap">
                {resolution}
              </p>
              {postStatus && (
                <div className="mt-2">
                  <Pill tone="success">
                    {POST_WORK_STATUS_LABELS[postStatus]}
                  </Pill>
                </div>
              )}
              <div className="text-xs text-fc-muted mt-2">
                {afterCount} after photo{afterCount === 1 ? "" : "s"}
              </div>
            </ReviewSection>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-fc-border"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="max-w-[480px] mx-auto px-4 pt-3 flex gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              className="h-12 rounded-xl flex-1"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={saving}
            >
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              className="h-12 rounded-xl flex-1 bg-fc-primary hover:bg-fc-primary-dark text-white font-semibold"
              onClick={next}
              disabled={
                saving ||
                (step === 1 && !step1Valid) ||
                (step === 2 && !step2Valid) ||
                (step === 3 && !step3Valid)
              }
            >
              {step === 1
                ? "Continue to Work"
                : step === 2
                ? "Continue to Resolution"
                : "Review & Submit"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="h-14 rounded-xl flex-1 bg-fc-primary hover:bg-fc-primary-dark text-white font-bold text-base"
              onClick={submitCharger}
              disabled={saving}
            >
              {saving ? "Submitting…" : "Submit Charger"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-fc-card rounded-2xl p-4 border border-fc-border/60">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-fc-muted">
          {title}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold text-fc-primary hover:underline"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warning" | "success";
}) {
  const cls =
    tone === "warning"
      ? "bg-fc-warning/15 text-fc-warning"
      : tone === "success"
      ? "bg-fc-success/15 text-fc-success"
      : "bg-fc-primary/10 text-fc-primary-dark";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold",
        cls,
      )}
    >
      {children}
    </span>
  );
}
