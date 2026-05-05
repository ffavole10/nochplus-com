import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Lightbulb, Target } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface Props {
  wins?: string[];
  lessons?: string[];
  decisions?: string[];
}

export function QbrInsightsColumns({ wins = [], lessons = [], decisions = [] }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-3 print:break-inside-avoid">
      <InsightColumn
        title="Top Wins"
        items={wins}
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        accent="border-l-emerald-500/70"
      />
      <InsightColumn
        title="Top Lessons"
        items={lessons}
        icon={<Lightbulb className="h-4 w-4 text-amber-600" />}
        accent="border-l-amber-500/70"
      />
      <InsightColumn
        title="Strategic Decisions"
        items={decisions}
        icon={<Target className="h-4 w-4 text-sky-600" />}
        accent="border-l-sky-500/70"
      />
    </div>
  );
}

function InsightColumn({
  title, items, icon, accent,
}: { title: string; items: string[]; icon: React.ReactNode; accent: string }) {
  const [showAll, setShowAll] = useState(false);

  return (
    <Card className={`border-l-4 ${accent} print:break-inside-avoid`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold">{title}</h3>
          <span className="text-xs text-muted-foreground ml-auto">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No items</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <InsightItem key={i} text={item} icon={icon} forceOpen={showAll} />
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs print:hidden"
            onClick={() => setShowAll((s) => !s)}
          >
            {showAll ? "Collapse all" : "Show all"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function InsightItem({ text, icon, forceOpen }: { text: string; icon: React.ReactNode; forceOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const headline = headlineFrom(text);
  const hasMore = text.length > headline.length;

  return (
    <li className="text-sm">
      <Collapsible open={isOpen} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full text-left flex items-start gap-2 hover:bg-muted/40 rounded p-1 -m-1">
          <span className="mt-0.5 shrink-0">{icon}</span>
          <span className="flex-1">{headline}{hasMore && !isOpen ? "…" : ""}</span>
          {hasMore && (
            <ChevronDown className={`h-3 w-3 mt-1 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} print:hidden`} />
          )}
        </CollapsibleTrigger>
        {hasMore && (
          <CollapsibleContent className="pl-6 pr-1 pb-1 pt-1 text-xs text-muted-foreground whitespace-pre-wrap">
            {text}
          </CollapsibleContent>
        )}
      </Collapsible>
    </li>
  );
}

function headlineFrom(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 10) return text;
  return words.slice(0, 10).join(" ");
}
