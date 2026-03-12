import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, CheckCircle, DollarSign, FileText } from "lucide-react";

interface RegulatoryContext {
  id: string;
  region_id: string;
  requires_permit: boolean;
  permit_authority: string | null;
  requires_licensed_contractor: boolean;
  licensing_requirement: string | null;
  available_incentives: string | null;
  compliance_flags: string[] | null;
  applicable_docs: string[] | null;
  region_name?: string;
  region_state?: string;
}

interface Props {
  ticketId: string;
}

export function TicketRegulatoryContext({ ticketId }: Props) {
  const [contexts, setContexts] = useState<RegulatoryContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsSheetOpen, setDocsSheetOpen] = useState(false);
  const [regionDocs, setRegionDocs] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("ticket_regulatory_context")
        .select(`
          *,
          regulatory_regions (name, state_code)
        `)
        .eq("ticket_id", ticketId);

      if (data && data.length > 0) {
        const enriched = data.map((ctx: any) => ({
          ...ctx,
          region_name: ctx.regulatory_regions?.name,
          region_state: ctx.regulatory_regions?.state_code,
        }));
        setContexts(enriched);
      }
      setLoading(false);
    }
    load();
  }, [ticketId]);

  if (loading || contexts.length === 0) return null;

  const primary = contexts[0];
  const totalDocs = contexts.reduce((sum, c) => sum + ((c.applicable_docs as string[])?.length || 0), 0);

  const handleViewAllRegs = async () => {
    const allDocIds = contexts.flatMap(c => (c.applicable_docs as string[]) || []);
    if (allDocIds.length === 0) return;

    const { data: docs } = await supabase
      .from("regulatory_documents")
      .select("title, category, content_summary, source_name, effective_date")
      .in("id", allDocIds);

    setRegionDocs(docs || []);
    setDocsSheetOpen(true);
  };

  return (
    <>
      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Regulatory Context — {primary.region_name} ({primary.region_state})
            </span>
          </div>

          {primary.requires_permit && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-medium mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Permit Required</p>
                {primary.permit_authority && (
                  <p className="text-xs text-muted-foreground">{primary.permit_authority}</p>
                )}
              </div>
            </div>
          )}

          {primary.requires_licensed_contractor && (
            <div className="flex items-start gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-optimal mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Licensed Contractor Required</p>
                {primary.licensing_requirement && (
                  <p className="text-xs text-muted-foreground">{primary.licensing_requirement}</p>
                )}
              </div>
            </div>
          )}

          {primary.available_incentives && (
            <div className="flex items-start gap-2">
              <DollarSign className="h-3.5 w-3.5 text-optimal mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Incentive Available</p>
                <p className="text-xs text-muted-foreground">{primary.available_incentives}</p>
              </div>
            </div>
          )}

          {(primary.compliance_flags as string[])?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(primary.compliance_flags as string[]).map((flag, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{flag}</Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {totalDocs} regulations apply to this job
            </span>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleViewAllRegs}>
              <FileText className="h-3 w-3" /> View All Regulations
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={docsSheetOpen} onOpenChange={setDocsSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="text-base">Applicable Regulations</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="space-y-3">
              {regionDocs.map((doc, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5">{doc.category}</Badge>
                    {doc.source_name && <span className="text-[10px] text-muted-foreground">{doc.source_name}</span>}
                  </div>
                  <p className="text-sm font-medium">{doc.title}</p>
                  {doc.content_summary && (
                    <p className="text-xs text-muted-foreground">{doc.content_summary}</p>
                  )}
                </div>
              ))}
              {regionDocs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No documents found.</p>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
