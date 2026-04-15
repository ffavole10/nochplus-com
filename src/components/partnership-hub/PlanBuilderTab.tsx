import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Zap, Target } from "lucide-react";
import {
  TierName, TIER_LABELS,
  calcSiteMonthlyCost,
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
    currentAnnualSpend: number; estimatedSavings: number; downtimeSavings: number;
    combinedSavings: number; netCost: number; totalSavings: number;
    dominantTier: TierName; slaTargetHours: number; hoursSaved: number;
    recommendedTier: TierName; recommendedReason: string;
  };
  onNavigate: (tab: string) => void;
}

const TIERS: TierName[] = ["essential", "priority", "elite"];

export function PlanBuilderTab({
  partnerInfo, setPartnerInfo, sites, addSite, removeSite, updateSite,
  roiInputs, setRoiInputs, summary, onNavigate,
}: PlanBuilderTabProps) {
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

  // Response time bar widths (normalize to max of current vs 120)
  const maxHours = Math.max(roiInputs.avgResponseTime, 120);
  const currentPct = Math.min(100, (roiInputs.avgResponseTime / maxHours) * 100);
  const slaPct = Math.min(100, (summary.slaTargetHours / maxHours) * 100);

  const speedupLabel = useMemo(() => {
    if (summary.hoursSaved <= 0) return null;
    const ratio = roiInputs.avgResponseTime / summary.slaTargetHours;
    if (ratio >= 2 && Number.isInteger(ratio)) return `${ratio}x faster response`;
    return `${summary.hoursSaved} hours faster`;
  }, [roiInputs.avgResponseTime, summary.slaTargetHours, summary.hoursSaved]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
      {/* LEFT COLUMN */}
      <div className="xl:col-span-2 space-y-5">
        {/* Partner Information */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-base">Partner Information</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-1 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Company Name</Label>
                <Input value={partnerInfo.companyName} onChange={(e) => setPartnerInfo({ ...partnerInfo, companyName: e.target.value })} placeholder="e.g. GreenCharge Networks" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact Name</Label>
                <Input value={partnerInfo.contactName} onChange={(e) => setPartnerInfo({ ...partnerInfo, contactName: e.target.value })} placeholder="e.g. Sarah Chen" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={partnerInfo.email} onChange={(e) => setPartnerInfo({ ...partnerInfo, email: e.target.value })} placeholder="sarah@greencharge.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={partnerInfo.phone} onChange={(e) => setPartnerInfo({ ...partnerInfo, phone: e.target.value })} placeholder="(555) 123-4567" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Current Service Provider</Label>
              <Input
                value={partnerInfo.currentProvider}
                onChange={(e) => setPartnerInfo({ ...partnerInfo, currentProvider: e.target.value })}
                placeholder="e.g. ChargePoint Services, in-house team, none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Site & Charger Configuration */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Site & Charger Configuration</CardTitle>
            <Button size="sm" variant="outline" onClick={addSite}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Site
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-1 space-y-4">
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
        <Card className="shadow-sm border-l-[3px] border-l-primary/40 bg-primary/[0.02]">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> ROI Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Avg. Service Call Cost ($)</Label>
              <Input type="number" value={roiInputs.avgServiceCallCost} onChange={(e) => setRoiInputs({ ...roiInputs, avgServiceCallCost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Avg. Response Time (hours)</Label>
              <Input type="number" value={roiInputs.avgResponseTime} onChange={(e) => setRoiInputs({ ...roiInputs, avgResponseTime: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Service Calls per Year</Label>
              <Input type="number" value={roiInputs.serviceCallsPerYear} onChange={(e) => setRoiInputs({ ...roiInputs, serviceCallsPerYear: parseInt(e.target.value) || 0 })} />
              <p className="text-[10px] text-muted-foreground leading-tight">Est. 2 calls/yr per L2, 4 calls/yr per DCFC. Edit if known.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Est. Daily Revenue Loss per Charger</Label>
              <Input type="number" value={roiInputs.downtimeCostPerDay} onChange={(e) => setRoiInputs({ ...roiInputs, downtimeCostPerDay: parseFloat(e.target.value) || 0 })} />
              <p className="text-[10px] text-muted-foreground leading-tight">Industry avg: L2 ~$16/day, DCFC ~$137/day. Edit to match actual revenue.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN — Sticky Summary */}
      <div className="xl:col-span-1 self-stretch">
        <div className="sticky top-4">
          <Card className="bg-sidebar text-sidebar-foreground border-sidebar-border shadow-sm h-full">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-base text-sidebar-foreground">Plan Summary</CardTitle>
              <p className="text-sm text-sidebar-foreground/70">{partnerInfo.companyName || "New Partner"}</p>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
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
                  <Badge className="ml-2 text-[10px] text-primary-foreground bg-sidebar-accent">1 month free</Badge>
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
                <span className="text-sidebar-foreground/70">Est. Downtime Savings</span>
                <span className="text-emerald-400">{fmt(summary.downtimeSavings)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-sidebar-foreground/70">Net Cost with NOCH+</span>
                <span className="font-medium">{fmt(summary.netCost)}</span>
              </div>
              {summary.combinedSavings > 0 && (
                <Badge variant="outline" className="w-full justify-center py-1.5 text-primary-foreground bg-sidebar-accent border-transparent text-sm">
                  Total Savings: {fmt(summary.combinedSavings)}/year
                </Badge>
              )}

              {/* Response Time Comparison */}
              <Separator className="bg-sidebar-border" />
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Response Time Comparison</p>
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-sidebar-foreground/70">Current</span>
                    <span className="text-sidebar-foreground/70">{roiInputs.avgResponseTime} hrs</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-sidebar-border/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-destructive/70 transition-all duration-300"
                      style={{ width: `${currentPct}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-sidebar-foreground/70">With NOCH+ ({TIER_LABELS[summary.dominantTier]})</span>
                    <span className="text-sidebar-foreground/70">{summary.slaTargetHours} hrs</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-sidebar-border/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${slaPct}%` }}
                    />
                  </div>
                </div>
                {speedupLabel && (
                  <p className="text-xs font-semibold text-primary text-center">{speedupLabel}</p>
                )}
              </div>

              {/* Recommended Tier */}
              {summary.totalChargers > 0 && (
                <>
                  <Separator className="bg-sidebar-border" />
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <Badge className="text-xs text-primary-foreground bg-primary">
                        Recommended: {TIER_LABELS[summary.recommendedTier]}
                      </Badge>
                      <p className="text-xs text-sidebar-foreground/60 mt-1">{summary.recommendedReason}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
