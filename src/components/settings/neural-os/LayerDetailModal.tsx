import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import type { LayerDef } from "./layerData";

interface Props {
  layer: LayerDef | null;
  onClose: () => void;
}

export function LayerDetailModal({ layer, onClose }: Props) {
  const open = !!layer;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        {layer && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <layer.icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                {layer.name} Layer
              </DialogTitle>
              <DialogDescription>
                {layer.agents.length > 0
                  ? `Agents: ${layer.agents.map((a) => a.name).join(" · ")}`
                  : "Cross-cutting policy layer · no single agent"}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="decisions" className="mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="decisions">Recent decisions</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>

              <TabsContent value="decisions" className="pt-4">
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No decisions logged yet. Activity will appear here as Sentinel,
                  Cortex, and other agents begin operating in production.
                </div>
              </TabsContent>

              <TabsContent value="config" className="pt-4 space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Confidence threshold
                    </div>
                    <p className="text-sm text-foreground">{layer.confidenceThreshold}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Description
                    </div>
                    <p className="text-sm text-foreground">{layer.description}</p>
                  </div>
                  {layer.agents.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Agents
                      </div>
                      <ul className="space-y-2">
                        {layer.agents.map((a) => (
                          <li key={a.name} className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="text-[10px] mt-0.5">{a.name}</Badge>
                            <span className="text-muted-foreground flex-1">{a.role}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2 border-t border-border">
                  <Button variant="outline" size="sm" disabled className="gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    Edit (Coming soon)
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="pt-4">
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Performance analytics will appear after 30 days of operation.
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
