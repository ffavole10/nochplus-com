import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { AssessmentHeader } from "@/components/assessment/AssessmentHeader";
import { AssessmentDashboard } from "@/components/assessment/AssessmentDashboard";
import { AssessmentMap } from "@/components/assessment/AssessmentMap";
import { AssessmentKanban } from "@/components/assessment/AssessmentKanban";
import { ChargerDetailModal } from "@/components/assessment/ChargerDetailModal";
import { useAssessmentData } from "@/hooks/useAssessmentData";
import { AssessmentCharger, ViewMode } from "@/types/assessment";
import { Upload, FileSpreadsheet, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const AssessmentTracker = () => {
  const { chargers, importChargers, updateCharger, moveChargerToPhase, clearData } = useAssessmentData();
  const [view, setView] = useState<ViewMode>("dashboard");
  const [selectedCharger, setSelectedCharger] = useState<AssessmentCharger | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelectCharger = useCallback((charger: AssessmentCharger) => {
    setSelectedCharger(charger);
    setModalOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(chargers, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chargers]);

  // Empty state
  if (chargers.length === 0 && view === "dashboard") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AssessmentHeader
          view={view}
          onViewChange={setView}
          onImport={importChargers}
          onExport={handleExport}
          onClear={clearData}
          chargerCount={0}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Upload Campaign Data</h2>
            <p className="text-muted-foreground mb-6">
              Upload an Excel file (.xlsx, .xls) with your EV charger assessment data to get started. 
              The tracker will automatically calculate priority scores and organize chargers.
            </p>
            <div className="border-2 border-dashed border-border rounded-xl p-8 hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const { parseAssessmentExcel } = await import("@/lib/assessmentParser");
                  try {
                    const data = await parseAssessmentExcel(file);
                    importChargers(data);
                  } catch {
                    // handled in parser
                  }
                }}
                className="hidden"
                id="empty-upload"
              />
              <label htmlFor="empty-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">Drop file here or click to upload</p>
                <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
              </label>
            </div>
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-6">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AssessmentHeader
        view={view}
        onViewChange={setView}
        onImport={importChargers}
        onExport={handleExport}
        onClear={clearData}
        chargerCount={chargers.length}
      />

      {view === "dashboard" && (
        <AssessmentDashboard chargers={chargers} onSelectCharger={handleSelectCharger} />
      )}
      {view === "map" && (
        <AssessmentMap chargers={chargers} onSelectCharger={handleSelectCharger} />
      )}
      {view === "kanban" && (
        <AssessmentKanban
          chargers={chargers}
          onMoveCharger={moveChargerToPhase}
          onSelectCharger={handleSelectCharger}
        />
      )}

      <ChargerDetailModal
        charger={selectedCharger}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={updateCharger}
      />
    </div>
  );
};

export default AssessmentTracker;
