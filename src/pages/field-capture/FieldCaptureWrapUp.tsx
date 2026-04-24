import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { refreshTechnicianStats } from "@/lib/nochProStats";
import { useAuth } from "@/hooks/useAuth";

export default function FieldCaptureWrapUp() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  usePageTitle("Wrap Up");

  const [supportMin, setSupportMin] = useState<string>("0");
  const [accessMin, setAccessMin] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workOrderId) return;
    (async () => {
      const { data } = await supabase
        .from("work_orders")
        .select("support_time_minutes,access_time_minutes,job_notes")
        .eq("id", workOrderId)
        .maybeSingle();
      if (data) {
        setSupportMin(String(data.support_time_minutes ?? 0));
        setAccessMin(String(data.access_time_minutes ?? 0));
        setNotes(data.job_notes || "");
      }
      setLoading(false);
    })();
  }, [workOrderId]);

  async function submit() {
    if (!workOrderId) return;
    setSaving(true);
    const { error } = await supabase
      .from("work_orders")
      .update({
        status: "submitted",
        departure_timestamp: new Date().toISOString(),
        support_time_minutes: Number(supportMin) || 0,
        access_time_minutes: Number(accessMin) || 0,
        job_notes: notes || null,
      })
      .eq("id", workOrderId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate(`/field-capture/job/${workOrderId}/submitted`, { replace: true });
  }

  if (loading) {
    return <div className="px-4 py-12 text-center text-fc-muted">Loading…</div>;
  }

  return (
    <>
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
          <div className="flex-1 font-semibold text-fc-text">Wrap Up Job</div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 pb-32">
        <section className="bg-fc-card rounded-2xl p-5 border border-fc-border/60 space-y-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-fc-muted">
            Time Tracking
          </div>

          <div className="space-y-1.5">
            <Label>Support Time (Minutes)</Label>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={supportMin}
              onChange={(e) => setSupportMin(e.target.value)}
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-fc-muted">
              Minutes on phone with OEM/support team. CPI tracks these calls. Be accurate.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Access Time (Minutes)</Label>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={accessMin}
              onChange={(e) => setAccessMin(e.target.value)}
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-fc-muted">
              Time you couldn't work due to site access or POC delays.
            </p>
          </div>
        </section>

        <section className="bg-fc-card rounded-2xl p-5 border border-fc-border/60 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-fc-muted">
            Additional Notes
          </div>
          <Label>Notes or follow-up required (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional context, follow-ups needed, or things the office should know"
            className="min-h-[120px] rounded-xl"
          />
        </section>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-fc-border"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="max-w-[480px] mx-auto px-4 pt-3">
          <Button
            className="w-full h-14 rounded-xl bg-fc-primary hover:bg-fc-primary-dark text-white font-bold text-base"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Submitting…" : "Complete Job"}
          </Button>
        </div>
      </div>
    </>
  );
}
