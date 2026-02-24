import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe, BookOpen, Building2 } from "lucide-react";

export function WebSearchSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">External Knowledge Sources</h2>
        <p className="text-sm text-muted-foreground">
          Enable AutoHeal to search external sources for industry standards and documentation.
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
                <Switch id="web-search" />
                <Label htmlFor="web-search" className="text-xs">Enable</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Enable AutoHeal to search web for:</p>
            <div className="flex flex-wrap gap-2">
              {["OSHA Standards", "NEC Codes", "UL Certifications", "OEM Bulletins", "Technical Whitepapers"].map((s) => (
                <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
              ))}
            </div>
          </div>

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
  );
}
