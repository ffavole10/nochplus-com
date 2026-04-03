import { useCallback, useRef, useState } from "react";
import { Upload, FileSpreadsheet, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImportPhaseProps {
  hasExistingData: boolean;
  existingCount: number;
  onFileParsed: (file: File) => Promise<void>;
  onPastedData: (text: string) => void;
}

export function ImportPhase({ hasExistingData, existingCount, onFileParsed, onPastedData }: ImportPhaseProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls", "tsv"].includes(ext || "")) {
      toast.error("Unsupported file format. Use CSV, XLSX, XLS, or TSV.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds 50MB limit.");
      return;
    }
    setLoading(true);
    try {
      await onFileParsed(file);
    } catch (e: any) {
      toast.error(e.message || "Failed to parse file.");
    } finally {
      setLoading(false);
    }
  }, [onFileParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePaste = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste some data first.");
      return;
    }
    try {
      onPastedData(pastedText);
    } catch (e: any) {
      toast.error(e.message || "Failed to parse pasted data.");
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full space-y-6">
      {hasExistingData && (
        <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-400">
          This campaign already has <strong>{existingCount}</strong> chargers imported. Uploading new data will replace the existing dataset.
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls,.tsv"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {!pasteMode ? (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "w-full border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <FileSpreadsheet className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-sm text-muted-foreground">Parsing file...</p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground/60" />
                <div className="text-center">
                  <p className="text-base font-medium">Drop a file here or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">Supported: CSV, XLSX, XLS, TSV · Max 50MB</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" onClick={() => setPasteMode(true)} className="gap-2">
            <ClipboardPaste className="h-4 w-4" />
            Paste data from a spreadsheet
          </Button>
        </>
      ) : (
        <div className="w-full space-y-3">
          <Textarea
            placeholder="Paste tab-separated or comma-separated data here (including headers)..."
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            className="min-h-[300px] font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPasteMode(false)}>Cancel</Button>
            <Button onClick={handlePaste} disabled={!pastedText.trim()}>Parse Pasted Data</Button>
          </div>
        </div>
      )}
    </div>
  );
}
