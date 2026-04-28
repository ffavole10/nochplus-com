import { LucideIcon } from "lucide-react";

interface OperationsPageHeaderProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export function OperationsPageHeader({ title, subtitle, icon: Icon, actions }: OperationsPageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-6">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
