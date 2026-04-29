import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function TabHeader({
  title,
  count,
  subhead,
  right,
}: {
  title: string;
  count?: number;
  subhead?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          {title}
          {typeof count === "number" && (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {count}
            </span>
          )}
        </h2>
        {subhead && <p className="text-xs text-muted-foreground mt-0.5">{subhead}</p>}
      </div>
      {right}
    </div>
  );
}

export function TabEmpty({ label, cta }: { label: string; cta?: ReactNode }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
        <p>{label}</p>
        {cta}
      </CardContent>
    </Card>
  );
}

export function TabFooterLink({ to, label }: { to: string; label: string }) {
  return (
    <div className="mt-4 text-right">
      <Link to={to} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
        {label} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

export function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground mt-1">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
