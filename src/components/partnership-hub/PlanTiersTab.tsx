import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FEATURE_MATRIX, TIER_PRICING } from "@/constants/nochPlusTiers";
import { Crown } from "lucide-react";

export function PlanTiersTab() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">NOCH+ Membership Tiers</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Compare benefits and pricing across Essential, Priority, and Elite
        </p>
      </div>

      {/* Feature Comparison */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium w-[30%]">Feature</th>
                  <th className="text-center p-3 font-medium w-[23%]">Essential</th>
                  <th className="text-center p-3 font-medium w-[23%] bg-primary/5 border-x border-primary/20">
                    <div className="flex flex-col items-center gap-1">
                      <Badge className="text-[10px] bg-primary text-primary-foreground">
                        <Crown className="h-3 w-3 mr-1" /> Recommended
                      </Badge>
                      <span className="text-primary">Priority</span>
                    </div>
                  </th>
                  <th className="text-center p-3 font-medium w-[23%] text-amber-600">Elite</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_MATRIX.filter(r => !r.feature.startsWith("L2 AC") && !r.feature.startsWith("L3 DCFC")).map((row, i) => (
                  <tr key={i} className={`border-b last:border-0 ${i % 2 === 0 ? "bg-background" : "bg-muted/30"}`}>
                    <td className="p-3 font-medium">{row.feature}</td>
                    <td className="p-3 text-center text-muted-foreground">{row.essential}</td>
                    <td className="p-3 text-center bg-primary/5 border-x border-primary/20">{row.priority}</td>
                    <td className="p-3 text-center">{row.elite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium w-[30%]">Pricing (per charger/month)</th>
                  <th className="text-center p-3 font-medium w-[23%]">Essential</th>
                  <th className="text-center p-3 font-medium w-[23%] bg-primary/5 border-x border-primary/20 text-primary">Priority</th>
                  <th className="text-center p-3 font-medium w-[23%] text-amber-600">Elite</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-background">
                  <td className="p-3 font-medium">L2 AC Chargers</td>
                  <td className="p-3 text-center text-muted-foreground">${TIER_PRICING.essential.l2}/mo</td>
                  <td className="p-3 text-center bg-primary/5 border-x border-primary/20 font-semibold">${TIER_PRICING.priority.l2}/mo</td>
                  <td className="p-3 text-center">${TIER_PRICING.elite.l2}/mo</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="p-3 font-medium">L3 DCFC Chargers</td>
                  <td className="p-3 text-center text-muted-foreground">${TIER_PRICING.essential.dc}/mo</td>
                  <td className="p-3 text-center bg-primary/5 border-x border-primary/20 font-semibold">${TIER_PRICING.priority.dc}/mo</td>
                  <td className="p-3 text-center">${TIER_PRICING.elite.dc}/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
