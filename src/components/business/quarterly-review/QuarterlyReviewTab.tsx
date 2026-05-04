import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Sparkles, Pencil, Calendar } from "lucide-react";
import { useQuarterlyReviews, currentQbrQuarter, quarterLabel } from "@/hooks/useQbr";
import { CreateQbrModal } from "./CreateQbrModal";
import { QbrDetailView } from "./QbrDetailView";

const ENTRY_ICONS: Record<string, any> = {
  document_upload: FileText, auto: Sparkles, manual: Pencil, hybrid: Sparkles,
};

export function QuarterlyReviewTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qbrId = searchParams.get("qbr");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: reviews = [], isLoading } = useQuarterlyReviews();
  const cur = currentQbrQuarter();

  const setQbrId = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("qbr", id); else next.delete("qbr");
    setSearchParams(next, { replace: true });
  };

  if (qbrId) {
    return <QbrDetailView id={qbrId} onBack={() => setQbrId(null)} />;
  }

  const currentReview = reviews.find((r) => r.quarter === cur.quarter && r.year === cur.year);
  const past = reviews.filter((r) => !(r.quarter === cur.quarter && r.year === cur.year));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Quarterly Review</h2>
          <p className="text-sm text-muted-foreground">
            Strategic counterweight to the Weekly Review — track each quarter's narrative, financials, and decisions.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Build Past Quarter
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Current quarter</div>
              <div className="font-semibold">{quarterLabel(cur.quarter, cur.year)}</div>
            </div>
          </div>
          {currentReview ? (
            <Button variant="outline" size="sm" onClick={() => setQbrId(currentReview.id)}>Open current QBR</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>Start QBR for this quarter</Button>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-2">Past quarters</h3>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
        ) : past.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            No past quarters yet. Click "Build Past Quarter" to create one from a retrospective document or manual entry.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {past.map((r) => {
              const Icon = ENTRY_ICONS[r.entry_mode] || Pencil;
              return (
                <Card key={r.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setQbrId(r.id)}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{quarterLabel(r.quarter, r.year)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.closed_at ? `Closed ${new Date(r.closed_at).toLocaleDateString()}` : r.status}
                      </div>
                    </div>
                    <Badge variant="outline" className="gap-1"><Icon className="h-3 w-3" /> {r.entry_mode.replace("_", " ")}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <CreateQbrModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
