import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Mail, Phone, Clock, Star, ClipboardList, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function SubmissionConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state as {
    fullName: string;
    email: string;
    phone: string;
    companyName: string;
    chargerCount: number;
    submissionId: string;
    nochPlus: boolean;
    submittedAt: string;
  } | null;

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No submission data found.</p>
            <Button onClick={() => navigate("/submit")}>Submit New Assessment</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <img src="/images/noch-power-logo.png" alt="Noch" className="h-8" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Success Badge */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Submission Received!</h1>
          <p className="text-lg text-muted-foreground">Thank you, {data.fullName}!</p>
        </div>

        {/* Submission Details */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Submission Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Submission ID</span><span className="font-mono font-semibold">{data.submissionId}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Chargers submitted</span><span>{data.chargerCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span>{format(new Date(data.submittedAt), "MMM d, yyyy 'at' h:mm a")}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">What Happens Next</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <ClipboardList className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Our team is reviewing your submission</p>
                  <p className="text-xs text-muted-foreground">We'll reach out if we need additional information</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Within 24-48 hours</p>
                  <p className="text-xs text-muted-foreground">You'll receive an email with your assessment results</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">We'll contact you at:</p>
                  <p className="text-xs text-muted-foreground">Phone: {data.phone} · Email: {data.email}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Confirmation email sent to:</p>
                  <p className="text-xs text-muted-foreground">{data.email}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Noch+ Membership */}
        {data.nochPlus && (
          <Card className="mb-6 border-primary/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-5 w-5 text-primary fill-primary" />
                <h3 className="font-semibold">Welcome to Noch+ Membership!</h3>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>✓ Dedicated account manager</p>
                <p>✓ Member exclusive rate — 50% off</p>
                <p>✓ Parts discount — 20% off</p>
                <p>✓ Annual Preventive Maintenance — 50% off</p>
                <p>✓ Direct system access</p>
                <p className="italic mt-2">Our team will contact you to complete membership setup.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Track Link */}
        <div className="text-center">
          <Link to={`/track/${data.submissionId}`}>
            <Button variant="outline" className="gap-2">
              Track Your Submission <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
