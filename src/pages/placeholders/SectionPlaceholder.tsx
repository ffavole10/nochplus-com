import { LucideIcon } from "lucide-react";

interface SectionPlaceholderProps {
  title: string;
  batch: string;
  icon?: LucideIcon;
}

export default function SectionPlaceholder({ title, batch, icon: Icon }: SectionPlaceholderProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      {Icon && (
        <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/20">
          <Icon className="h-10 w-10 text-primary" />
        </div>
      )}
      <h1 className="text-4xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 text-base text-muted-foreground">Coming in {batch}</p>
    </div>
  );
}
