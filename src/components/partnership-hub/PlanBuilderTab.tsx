import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  TierName, TIER_LABELS, TIER_BADGE_CLASSES, TIER_PRICING,
  calcSiteMonthlyCost, FEATURE_MATRIX,
} from "@/constants/nochPlusTiers";
import type { PartnerInfo, SiteConfig, RoiInputs } from "@/hooks/usePartnershipHub";

interface PlanBuilderTabProps {
  partnerInfo: PartnerInfo;
  setPartnerInfo: (info: PartnerInfo) => void;
  sites: SiteConfig[];
  addSite: () => void;
  removeSite: (id: string) => void;
  updateSite: (id: string, updates: Partial<SiteConfig>) => void;
  roiInputs: RoiInputs;
  setRoiInputs: (inputs: RoiInputs) => void;
  summary: {
    totalL2: number; totalDC: number; totalChargers: number; siteCount: number;
    monthlyTotal: number; annualTotal: number; annualPrePay: number;
    currentAnnualSpend: number; estimatedSavings: number; netCost: number; totalSavings: number;
  };
  onNavigate: (tab: string) => void;
}

const TIERS: TierName[] = ["essential", "priority", "elite"];

export function PlanBuilderTab({
  partnerInfo, setPartnerInfo, sites, addSite, removeSite, updateSite,
  roiInputs, setRoiInputs, summary, onNavigate,
}: PlanBuilderTabProps) {
  const [showTierComparison, setShowTierComparison] = useState(false);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* LEFT COLUMN */}
      <div className="xl:col-span-2 space-y-6">
        {/* Partner Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Partner Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Company Name</Label>
              <Input value={partnerInfo.companyName} onChange={(e) => setPartnerInfo({ ...partnerInfo, companyName: e.target.value })} placeholder="e.g. GreenCharge Networks" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Name</Label>
              <Input value={partnerInfo.contactName} onChange={(e) => setPartnerInfo({ ...partnerInfo, contactName: e.target.value })} placeholder="e.g. Sarah Chen" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={partnerInfo.email} onChange={(e) => setPartnerInfo({ ...partnerInfo, email: e.target.value })} placeholder="sarah@greencharge.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={partnerInfo.phone} onChange={(e) => setPartnerInfo({ ...partnerInfo, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
          </CardContent>
        </Card>

        {/* Site & Charger Configuration */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Site & Charger Configuration</CardTitle>
            <Button size="sm" variant="outline" onClick={addSite}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Site
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {sites.map((site) => {
              const monthly = calcSiteMonthlyCost(site.l2Count, site.dcCount, site.tier);
              return (
                <div key={site.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={site.name}
                      onChange={(e) => updateSite(site.id, { name: e.target.value })}
                      className="font-medium w-48 h-8 text-sm"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-primary">{fmt(monthly)}/mo</span>
                      {sites.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeSite(site.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">L2 AC Chargers</Label>
                      <Input type="number" min={0} value={site.l2Count} onChange={(e) => updateSite(site.id, { l2Count: Math.max(0, parseInt(e.target.value) || 0) })} className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">L3 DCFC Chargers</Label>
                      <Input type="number" min={0} value={site.dcCount} onChange={(e) => updateSite(site.id, { dcCount: Math.max(0, parseInt(e.target.value) || 0) })} className="h-8" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-muted-foreground">Tier</Label>
                      <div className="flex gap-1">
                        {TIERS.map((t) => (
                          <Button
                            key={t}
                            size="sm"
                            variant={site.tier === t ? "default" : "outline"}
                            className="flex-1 h-8 text-xs"
                            onClick={() => updateSite(site.id, { tier: t })}
                          >
                            {TIER_LABELS[t]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ROI Calculator */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ROI Calculator</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Avg. Service Call Cost ($)</Label>
              <Input type="number" value={roiInputs.avgServiceCallCost} onChange={(e) => setRoiInputs({ ...roiInputs, avgServiceCallCost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Avg. Response Time (hours)</Label>
              <Input type="number" value={roiInputs.avgResponseTime} onChange={(e) => setRoiInputs({ ...roiInputs, avgResponseTime: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Service Calls per Year</Label>
              <Input type="number" value={roiInputs.serviceCallsPerYear} onChange={(e) => setRoiInputs({ ...roiInputs, serviceCallsPerYear: parseInt(e.target.value) || 0 })} />
            </div>
          </CardContent>
        </Card>

        {/* Tier Comparison */}
        <Button variant="outline" className="w-full" onClick={() => setShowTierComparison(!showTierComparison)}>
          {showTierComparison ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
          {showTierComparison ? "Hide" : "Show"} Full Tier Comparison
        </Button>
        {showTierComparison && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Feature</th>
                      <th className="text-center p-3 font-medium">Essential</th>
                      <th className="text-center p-3 font-medium text-primary">Priority</th>
                      <th className="text-center p-3 font-medium text-amber-600">Elite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURE_MATRIX.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3 font-medium">{row.feature}</td>
                        <td className="p-3 text-center text-muted-foreground">{row.essential}</td>
                        <td className="p-3 text-center">{row.priority}</td>
                        <td className="p-3 text-center">{row.elite}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* RIGHT COLUMN — Sticky Summary */}
      <div className="xl:col-span-1">
        <div className="sticky top-4 space-y-4">
          <Card className="bg-sidebar text-sidebar-foreground border-sidebar-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-sidebar-foreground">Plan Summary</CardTitle>
              <p className="text-sm text-sidebar-foreground/70">{partnerInfo.companyName || "New Partner"}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-sidebar-foreground/70">Total Chargers</span>
                <span className="font-medium">{summary.totalChargers} ({summary.totalL2} L2 + {summary.totalDC} DC)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-sidebar-foreground/70">Sites</span>
                <span className="font-medium">{summary.siteCount}</span>
              </div>
              <Separator className="bg-sidebar-border" />
              <div className="flex justify-between">
                <span className="text-sidebar-foreground/70 text-sm">Monthly Total</span>
                <span className="text-lg font-bold">{fmt(summary.monthlyTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-sidebar-foreground/70">Annual Total</span>
                <span className="font-medium">{fmt(summary.annualTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-sidebar-foreground/70">Annual Pre-Pay</span>
                <div className="text-right">
                  <span className="font-medium">{fmt(summary.annualPrePay)}</span>
                  <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 text-[10px]">1 month free</Badge>
                </div>
              </div>
              <Separator className="bg-sidebar-border" />
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">ROI Snapshot</p>
              <div className="flex justify-between text-sm">
                <span className="text-sidebar-foreground/70">Current Annual Spend</span>
                <span>{fmt(summary.currentAnnualSpend)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-sidebar-foreground/70">Est. Labor/Parts Savings</span>
                <span className="text-emerald-400">{fmt(summary.estimatedSavings)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-sidebar-foreground/70">Net Cost with NOCH+</span>
                <span className="font-medium">{fmt(summary.netCost)}</span>
              </div>
              {summary.totalSavings > 0 && (
                <Badge className="w-full justify-center bg-emerald-500/20 text-emerald-400 py-1.5">
                  Total Savings: {fmt(summary.totalSavings)}/year
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
