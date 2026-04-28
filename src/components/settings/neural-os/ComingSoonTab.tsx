import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { NeuralOsHeader } from "./NeuralOsHeader";

interface ComingSoonTabProps {
  title: string;
  description: string;
  emptyState: string;
}

export function ComingSoonTab({ title, description, emptyState }: ComingSoonTabProps) {
  return (
    <div className="space-y-6">
      <NeuralOsHeader title={title} description={description} />
      <Card className="border-dashed">
        <CardContent className="p-10">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">Coming Soon</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{emptyState}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
