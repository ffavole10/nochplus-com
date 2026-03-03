import { FileText, Cog, ArrowRight, UserCheck, ClipboardCheck } from "lucide-react";

const STEPS = [
  { icon: FileText, title: "Ticket Created", desc: "Service ticket captures charger type, customer, and location" },
  { icon: Cog, title: "Rate Card Applied", desc: "System selects the customer's linked rate card (or default)" },
  { icon: ClipboardCheck, title: "Rules Evaluated", desc: "Quote rules fire in priority order, adding/modifying line items" },
  { icon: UserCheck, title: "Overrides Applied", desc: "Customer-specific adjustments override standard rates" },
  { icon: ClipboardCheck, title: "Operator Review", desc: "Final quote presented for review — all auto-values can be adjusted" },
];

export function QuoteFlowDiagram() {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-6 mt-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">How Quote Generation Works</h3>
      <div className="flex items-start justify-between gap-2">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-start gap-2 flex-1">
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground">{i + 1}. {step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-3" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
