import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  CheckCircle2, Clock, Pause, Search, ChevronDown, Camera, Loader2, MapPin
} from "lucide-react";

interface TrackingSubmission {
  submission_id: string;
  status: string;
  full_name: string;
  company_name: string;
  city: string;
  state: string;
  noch_plus_member: boolean;
  staff_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TrackingCharger {
  id: string;
  brand: string;
  serial_number: string | null;
  charger_type: string;
  photo_count: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  pending_review: { label: "Under Review", color: "bg-yellow-500", description: "Our team is reviewing your submission. We'll contact you within 24-48 hours." },
  in_review: { label: "Under Review", color: "bg-yellow-500", description: "Our team is actively reviewing your submission." },
  assessment_complete: { label: "Assessment Complete", color: "bg-primary", description: "Your assessment is ready! Check your email for full details." },
  contacted: { label: "Contact Made", color: "bg-primary", description: "Our team has reached out to discuss your assessment results." },
  closed: { label: "Closed", color: "bg-muted-foreground", description: "This submission has been completed." },
};

const TIMELINE_STEPS = ["Submitted", "Under Review", "Assessment Complete", "Contact Made"];

export default function TrackSubmission() {
  const { submissionId: paramId } = useParams();
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState(paramId || "");
  const [submission, setSubmission] = useState<TrackingSubmission | null>(null);
  const [chargers, setChargers] = useState<TrackingCharger[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [chargersOpen, setChargersOpen] = useState(false);

  const fetchSubmission = async (id: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const { data, error } = await supabase.functions.invoke("track-submission", {
        body: { submission_id: id.trim().toUpperCase() },
      });

      if (error || data?.error) {
        setNotFound(true);
        setSubmission(null);
        setChargers([]);
        setLoading(false);
        return;
      }

      setSubmission(data.submission);
      setChargers(data.chargers || []);
    } catch {
      setNotFound(true);
      setSubmission(null);
      setChargers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (paramId) fetchSubmission(paramId);
  }, [paramId]);

  const handleSearch = () => {
    if (!searchId.trim()) return;
    navigate(`/track/${searchId.trim().toUpperCase()}`, { replace: true });
    fetchSubmission(searchId);
  };

  const getTimelineStep = () => {
    const s = submission?.status || "";
    if (s === "contacted" || s === "closed") return 3;
    if (s === "assessment_complete") return 2;
    if (s === "in_review" || s === "pending_review") return 1;
    return 0;
  };

  const config = submission ? (STATUS_CONFIG[submission.status] || STATUS_CONFIG.pending_review) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <img src="/images/noch-power-logo.png" alt="Noch" className="h-8" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-2">Track Your Submission</h1>
        <p className="text-center text-muted-foreground mb-8">Enter your submission ID to check status</p>

        <div className="flex gap-2 mb-8">
          <Input
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            placeholder="e.g., NP-2026-1234"
            className="font-mono"
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading} className="gap-2 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Track
          </Button>
        </div>

        {notFound && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No submission found with that ID. Please check and try again.</p>
            </CardContent>
          </Card>
        )}

        {submission && config && (
          <>
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-semibold text-lg">{submission.submission_id}</span>
                  <Badge className={`${config.color} text-white`}>{config.label}</Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{submission.full_name}</span></div>
                  <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{submission.company_name}</span></div>
                  <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {submission.city}, {submission.state}</div>
                  <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> {format(new Date(submission.created_at), "MMM d, yyyy 'at' h:mm a")}</div>
                </div>
                {submission.noch_plus_member && (
                  <Badge variant="outline" className="mt-3 border-primary text-primary">⭐ Noch+ Member</Badge>
                )}
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-6">
                <p className="text-muted-foreground text-sm">{config.description}</p>
              </CardContent>
            </Card>

            <Collapsible open={chargersOpen} onOpenChange={setChargersOpen}>
              <Card className="mb-6">
                <CardContent className="p-6">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <span className="font-semibold">{chargers.length} Charger(s) Submitted</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${chargersOpen ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-3">
                    {chargers.map((c, i) => (
                      <div key={c.id} className="p-3 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Charger {i + 1}: {c.brand}, {c.charger_type}</span>
                          {c.photo_count > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Camera className="h-3 w-3" /> {c.photo_count}
                            </span>
                          )}
                        </div>
                        {c.serial_number && <p className="text-muted-foreground text-xs mt-1">Serial: {c.serial_number}</p>}
                      </div>
                    ))}
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>

            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Timeline</h3>
                <div className="space-y-4">
                  {TIMELINE_STEPS.map((step, i) => {
                    const currentStep = getTimelineStep();
                    const isComplete = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        {isComplete ? (
                          <CheckCircle2 className={`h-5 w-5 shrink-0 ${isCurrent ? "text-primary" : "text-primary/60"}`} />
                        ) : (
                          <Pause className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                        )}
                        <div>
                          <span className={`text-sm ${isComplete ? "font-medium" : "text-muted-foreground"}`}>{step}</span>
                          {i === 0 && <span className="text-xs text-muted-foreground ml-2">{format(new Date(submission.created_at), "MMM d, yyyy 'at' h:mm a")}</span>}
                          {isCurrent && i > 0 && <span className="text-xs text-primary ml-2">In progress</span>}
                          {!isComplete && <span className="text-xs text-muted-foreground ml-2">Pending</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {submission.staff_notes && (
              <Card className="mb-6 border-primary/30">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Notes from our team</h3>
                  <p className="text-sm text-muted-foreground">{submission.staff_notes}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
