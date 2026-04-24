import { usePageTitle } from "@/hooks/usePageTitle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Phase 2 placeholder — full job detail / safety briefing / charger capture lands here.
export default function FieldCaptureJobDetail() {
  usePageTitle("Job");
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6 max-w-2xl mx-auto">
      <Link
        to="/field-capture"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Today's Jobs
      </Link>
      <Card className="p-6 text-center">
        <h1 className="text-xl font-bold mb-2">Job Detail</h1>
        <p className="text-sm text-muted-foreground mb-4">
          The full technician capture flow (safety briefing, charger capture,
          photos, wrap-up) ships in Phase 2.
        </p>
        <Button asChild variant="outline">
          <Link to="/field-capture">Back to Today's Jobs</Link>
        </Button>
      </Card>
    </div>
  );
}
