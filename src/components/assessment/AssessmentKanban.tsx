import { useState, useMemo, useCallback } from "react";
import { AssessmentCharger, Phase, PriorityLevel } from "@/types/assessment";
import { getPriorityColor } from "@/lib/assessmentParser";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GripVertical, Zap, Plug } from "lucide-react";

interface AssessmentKanbanProps {
  chargers: AssessmentCharger[];
  onMoveCharger: (id: string, phase: Phase) => void;
  onSelectCharger: (charger: AssessmentCharger) => void;
}

const PHASES: Phase[] = ["Needs Assessment", "Scheduled", "In Progress", "Completed", "Deferred"];

const PHASE_COLORS: Record<Phase, string> = {
  "Needs Assessment": "border-t-muted-foreground",
  "Scheduled": "border-t-secondary",
  "In Progress": "border-t-degraded",
  "Completed": "border-t-optimal",
  "Deferred": "border-t-chart-6",
};

const PRIORITY_BADGE: Record<PriorityLevel, string> = {
  Critical: "bg-critical text-critical-foreground",
  High: "bg-degraded text-degraded-foreground",
  Medium: "bg-yellow-500 text-white",
  Low: "bg-optimal text-optimal-foreground",
};

export function AssessmentKanban({ chargers, onMoveCharger, onSelectCharger }: AssessmentKanbanProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<Phase | null>(null);

  const byPhase = useMemo(() => {
    const map: Record<Phase, AssessmentCharger[]> = {
      "Needs Assessment": [],
      "Scheduled": [],
      "In Progress": [],
      "Completed": [],
      "Deferred": [],
    };
    chargers.forEach(c => {
      if (map[c.phase]) map[c.phase].push(c);
    });
    // Sort each column by priority
    const priorityOrder: Record<PriorityLevel, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    for (const phase of PHASES) {
      map[phase].sort((a, b) => priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel]);
    }
    return map;
  }, [chargers]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, phase: Phase) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverPhase(phase);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, phase: Phase) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) onMoveCharger(id, phase);
    setDraggedId(null);
    setDragOverPhase(null);
  }, [onMoveCharger]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverPhase(null);
  }, []);

  return (
    <div className="flex gap-4 p-6 overflow-x-auto min-h-[calc(100vh-80px)]">
      {PHASES.map(phase => (
        <div
          key={phase}
          className={`flex-1 min-w-[260px] max-w-[320px] flex flex-col rounded-xl border bg-muted/30 ${PHASE_COLORS[phase]} border-t-4 transition-colors ${
            dragOverPhase === phase ? "bg-primary/5 border-primary/30" : ""
          }`}
          onDragOver={(e) => handleDragOver(e, phase)}
          onDrop={(e) => handleDrop(e, phase)}
          onDragLeave={() => setDragOverPhase(null)}
        >
          {/* Column Header */}
          <div className="p-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">{phase}</h3>
              <Badge variant="outline" className="text-xs">{byPhase[phase].length}</Badge>
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
            {byPhase[phase].length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No chargers in this phase yet. Drag chargers here to get started.
              </p>
            ) : (
              byPhase[phase].map(charger => (
                <Card
                  key={charger.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, charger.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectCharger(charger)}
                  className={`p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                    draggedId === charger.id ? "opacity-50 scale-95" : ""
                  }`}
                  style={{ borderLeft: `3px solid ${getPriorityColor(charger.priorityLevel)}` }}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{charger.assetName}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs py-0">
                          {charger.assetRecordType === "DCFC" ? <Zap className="h-2.5 w-2.5 mr-0.5" /> : <Plug className="h-2.5 w-2.5 mr-0.5" />}
                          {charger.assetRecordType}
                        </Badge>
                        <Badge className={`${PRIORITY_BADGE[charger.priorityLevel]} text-xs py-0`}>
                          {charger.priorityLevel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {charger.city}, {charger.state}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
