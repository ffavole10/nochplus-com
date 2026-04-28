import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe, BookOpen, Building2, Search, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { format } from "date-fns";

type KnowledgeSource = {
  id: string;
  category: string;
  title: string;
  summary: string;
  source_url: string | null;
  relevance_score: number | null;
  searched_at: string;
};

export function WebSearchSection() {
  const [enabled, setEnabled] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);

  const loadResults = async () => {
    const { data, error } = await supabase
      .from("ai_knowledge_sources")
      .select("*")
      .order("searched_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setResults(data as unknown as KnowledgeSource[]);
      if (data.length > 0) setEnabled(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadResults();
  }, []);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-knowledge");

      if (error) {
        toast.error("Search failed: " + error.message);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Found ${data.count} knowledge items`);
      loadResults();
    } catch (e) {
      toast.error("Search failed");
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const { confirm: confirmDialog, dialogProps } = useConfirmDialog();

  const handleClearAll = async () => {
    const ok = await confirmDialog({
      title: "Clear Knowledge Base?",
      description: "This will remove all saved knowledge sources. This action cannot be undone.",
      confirmLabel: "Clear All",
    });
    if (!ok) return;
    const { error } = await supabase
      .from("ai_knowledge_sources")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error("Failed to clear");
    } else {
      toast.success("Knowledge base cleared");
      setResults([]);
    }
  };

  const grouped = results.reduce<Record<string, KnowledgeSource[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  const lastSearched = results.length > 0 ? results[0].searched_at : null;

  return (
    <>
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">External Knowledge Sources</h2>
        <p className="text-sm text-muted-foreground">
          Enable Neural OS to search external sources for industry standards and documentation.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-5">
          {/* Web Search */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Web Search Integration</h3>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="web-search" checked={enabled} onCheckedChange={setEnabled} />
                <Label htmlFor="web-search" className="text-xs">Enable</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Enable Neural OS to search web for:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["OSHA Standards", "NEC Codes", "UL Certifications", "OEM Bulletins", "Technical Whitepapers"].map((s) => (
                <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
              ))}
            </div>

            {enabled && (
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={handleSearch}
                  disabled={searching}
                >
                  {searching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  {searching ? "Searching…" : "Search Now"}
                </Button>
                {lastSearched && (
                  <span className="text-xs text-muted-foreground">
                    Last searched: {format(new Date(lastSearched), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                )}
                {results.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-destructive" onClick={handleClearAll}>
                    <Trash2 className="h-3 w-3" />
                    Clear All
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {enabled && results.length > 0 && (
            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Saved Knowledge ({results.length} items)</h4>
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{category}</p>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between py-2 px-3 rounded-md bg-muted/30 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.summary}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {item.relevance_score && (
                            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                              {Math.round((item.relevance_score as number) * 100)}%
                            </Badge>
                          )}
                          {item.source_url && (
                            <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {enabled && !loading && results.length === 0 && (
            <div className="border-t border-border pt-4 text-center py-6">
              <Search className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">Click "Search Now" to discover external knowledge sources</p>
            </div>
          )}

          <div className="border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">OEM SWI Expansion</h3>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" /> BTC Power
                </span>
                <Badge className="bg-emerald-600 text-xs">300 SWIs</Badge>
              </div>
              <p className="text-muted-foreground">Goal: Add other manufacturers' documentation</p>
              <Button variant="outline" size="sm" className="text-xs h-7 mt-2">Request Access to OEM Documentation</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    <ConfirmDialog {...dialogProps} />
    </>
  );
}
