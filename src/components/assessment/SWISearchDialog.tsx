import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Clock, ExternalLink, Plus } from "lucide-react";
import { SWI_CATALOG, SWIDocument } from "@/data/swiCatalog";

interface SWISearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (swi: SWIDocument) => void;
  excludeIds?: string[];
}

export function SWISearchDialog({ open, onOpenChange, onSelect, excludeIds = [] }: SWISearchDialogProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SWI_CATALOG.filter(swi => {
      if (excludeIds.includes(swi.id)) return false;
      if (!q) return true;
      return (
        swi.title.toLowerCase().includes(q) ||
        swi.id.toLowerCase().includes(q) ||
        swi.filename.toLowerCase().includes(q) ||
        swi.description.toLowerCase().includes(q) ||
        swi.issueTypes.some(t => t.toLowerCase().includes(q)) ||
        swi.chargerModels.some(m => m.toLowerCase().includes(q)) ||
        swi.serviceCategories.some(c => c.toLowerCase().includes(q))
      );
    });
  }, [search, excludeIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Search SWI Database
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, model, issue type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No SWIs found matching your search</p>
            </div>
          ) : (
            filtered.map(swi => (
              <div
                key={swi.id}
                className="p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group"
                onClick={() => { onSelect(swi); onOpenChange(false); setSearch(""); }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">{swi.title}</span>
                      <span className="text-xs text-muted-foreground font-mono">{swi.id}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{swi.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {swi.chargerModels.map(m => (
                        <Badge key={m} variant="outline" className="text-[10px] px-1.5 py-0">{m}</Badge>
                      ))}
                      {swi.estimatedTime && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {swi.estimatedTime}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-1.5 rounded-md bg-primary text-primary-foreground">
                      <Plus className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          {filtered.length} of {SWI_CATALOG.length} SWIs available
        </p>
      </DialogContent>
    </Dialog>
  );
}
