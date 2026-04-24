import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import maxThumbsUp from "@/assets/max-thumbsup.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function FieldCaptureSubmitted() {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  usePageTitle("Submitted");

  const [chargerCount, setChargerCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);

  const fullName =
    (session?.user?.user_metadata?.display_name as string) ||
    session?.user?.email?.split("@")[0] ||
    "Technician";
  const firstName = fullName.split(" ")[0];

  useEffect(() => {
    if (!workOrderId) return;
    (async () => {
      const [{ count: cc }, { count: pc }] = await Promise.all([
        supabase
          .from("work_order_chargers")
          .select("id", { count: "exact", head: true })
          .eq("work_order_id", workOrderId),
        supabase
          .from("work_order_photos")
          .select("id", { count: "exact", head: true })
          .eq("work_order_id", workOrderId),
      ]);
      setChargerCount(cc ?? 0);
      setPhotoCount(pc ?? 0);
    })();
    const t = setTimeout(() => navigate("/field-capture", { replace: true }), 5000);
    return () => clearTimeout(t);
  }, [workOrderId, navigate]);

  return (
    <div
      className="fixed inset-0 z-[2500] flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--fc-primary) / 0.18) 0%, hsl(var(--fc-bg)) 70%)",
      }}
    >
      <img
        src={maxThumbsUp}
        alt="Max thumbs up"
        className="w-56 h-auto animate-[fc-celebrate_500ms_ease-out]"
      />
      <h1 className="mt-6 text-3xl font-bold text-fc-text">Job Submitted!</h1>
      <div className="mt-4 space-y-1 text-fc-text">
        <div className="text-base">
          <span className="font-bold">{chargerCount}</span> charger
          {chargerCount === 1 ? "" : "s"} captured
        </div>
        <div className="text-base">
          <span className="font-bold">{photoCount}</span> photo
          {photoCount === 1 ? "" : "s"} uploaded
        </div>
      </div>
      <p className="mt-5 text-fc-muted">
        Nice work, {firstName}.<br />
        The team will review your submission.
      </p>
      <Button
        className="mt-8 h-14 px-8 rounded-xl bg-fc-primary hover:bg-fc-primary-dark text-white font-bold"
        onClick={() => navigate("/field-capture", { replace: true })}
      >
        Back to Today's Jobs
      </Button>
    </div>
  );
}
