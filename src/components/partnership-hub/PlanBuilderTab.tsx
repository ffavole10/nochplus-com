import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, X, Zap, Target, Shield, Info, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import {
  TierName, TIER_LABELS, ALL_TIERS,
  calcSiteMonthlyCost, isCustomPricedTier, isFreeTier,
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
    brandProtectionSavings: number; brandReputationExposure: number;
    combinedSavings: number; netCost: number; totalSavings: number;
    dominantTier: TierName; slaTargetHours: number; hoursSaved: number;
    recommendedTier: TierName; recommendedReason: string;
  };
  onNavigate: (tab: string) => void;
}

const TIERS: TierName[] = ALL_TIERS;

// Tier-specific styling for builder buttons
const tierButtonClass = (tier: TierName, selected: boolean): string => {
  if (selected) {
    if (tier === "starter") return "bg-muted text-foreground border-border hover:bg-muted/80";
    if (tier === "enterprise") return "bg-slate-900 text-amber-400 border-amber-500/40 hover:bg-slate-800";
    if (tier === "elite") return "bg-amber-500 text-white hover:bg-amber-400 border-amber-500";
    return ""; // default for essential/priority
  }
  if (tier === "starter") return "border-border text-muted-foreground";
  if (tier === "enterprise") return "border-slate-700 text-slate-700 hover:bg-slate-50";
  return "";
};

export function PlanBuilderTab({
  partnerInfo, setPartnerInfo, sites, addSite, removeSite, updateSite,
  roiInputs, setRoiInputs, summary, onNavigate,
}: PlanBuilderTabProps) {
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
  const fmt2 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // After-tax cost section
  const [taxExpanded, setTaxExpanded] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(25);
  const taxDeduction = (summary.annualTotal * taxRate) / 100;
  const realAfterTaxCost = summary.annualTotal - taxDeduction;
  const effectivePerChargerMo =
    summary.totalChargers > 0 ? realAfterTaxCost / 12 / summary.totalChargers : 0;

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
              const customPriced = isCustomPricedTier(site.tier);
              const freeTier = isFreeTier(site.tier);
              return (
                <div key={site.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={site.name}
                      onChange={(e) => updateSite(site.id, { name: e.target.value })}
                      className="font-medium w-48 h-8 text-sm"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-primary">
                        {customPriced ? "Custom" : freeTier ? "Free" : `${fmt(monthly)}/mo`}
                      </span>
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
                      <div className="flex flex-wrap gap-1">
                        {TIERS.map((t) => {
                          const selected = site.tier === t;
                          return (
                            <Button
                              key={t}
                              size="sm"
                              variant={selected ? "default" : "outline"}
                              className={`flex-1 min-w-[72px] h-8 text-xs ${tierButtonClass(t, selected)}`}
                              onClick={() => updateSite(site.id, { tier: t })}
                            >
                              {TIER_LABELS[t]}
                            </Button>
                          );
                        })}
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

          {/* Brand Impact Estimate sub-section */}
          <div className="mx-5 mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold">Brand Impact Estimate</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Every charger failure risks negative reviews and lost customers. Faster response times reduce the number of drivers who encounter broken chargers, protecting your brand reputation and customer retention.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Avg. Drivers Affected per Incident</Label>
                <Input
                  type="number"
                  min={1}
                  value={roiInputs.driversAffectedPerIncident}
                  onChange={(e) =>
                    setRoiInputs({
                      ...roiInputs,
                      driversAffectedPerIncident: Math.max(1, parseInt(e.target.value) || 0),
                    })
                  }
                />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Estimated drivers who encounter a broken charger before it's fixed.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Est. Customer Lifetime Value ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={roiInputs.customerLifetimeValue}
                  onChange={(e) =>
                    setRoiInputs({
                      ...roiInputs,
                      customerLifetimeValue: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Revenue from a repeat customer over 12 months.
                </p>
              </div>
            </div>
          </div>
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
                <span className="text-sidebar-foreground/70">Est. Brand Protection</span>
                <span className="text-emerald-400">{fmt(summary.brandProtectionSavings)}</span>
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

              {/* Real Cost After Tax Deduction */}
              <Separator className="bg-sidebar-border" />
              <button
                type="button"
                onClick={() => setTaxExpanded((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              >
                <span>Show after-tax cost</span>
                {taxExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {taxExpanded && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-sidebar-foreground/70">Estimated Tax Rate</Label>
                    <div className="flex items-center gap-1">
                      {[20, 25, 30].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setTaxRate(r)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                            taxRate === r
                              ? "bg-sidebar-accent text-primary-foreground"
                              : "bg-sidebar-border/40 text-sidebar-foreground/70 hover:bg-sidebar-border/70"
                          }`}
                        >
                          {r}%
                        </button>
                      ))}
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={taxRate}
                        onChange={(e) => setTaxRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        className="h-6 w-14 text-[11px] px-1.5 bg-sidebar-border/30 border-sidebar-border text-sidebar-foreground"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sidebar-foreground/70">Annual NOCH+ membership</span>
                    <span>{fmt(summary.annualTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sidebar-foreground/70">Est. tax deduction</span>
                    <span className="text-emerald-400">−{fmt(taxDeduction)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sidebar-foreground/70">Real after-tax cost</span>
                    <span className="font-bold">{fmt(realAfterTaxCost)}</span>
                  </div>
                  {summary.totalChargers > 0 && (
                    <div className="rounded-md bg-sidebar-accent/20 border border-sidebar-border p-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Effective cost per charger</p>
                      <p className="text-base font-bold text-sidebar-foreground">{fmt2(effectivePerChargerMo)}<span className="text-xs font-normal text-sidebar-foreground/70">/charger/mo after tax</span></p>
                    </div>
                  )}
                  <p className="text-[10px] text-sidebar-foreground/50 leading-snug">
                    NOCH+ membership fees are a tax-deductible business expense. Consult your tax advisor for your specific situation.
                  </p>
                </div>
              )}
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

              {/* Review Final Plan CTA */}
              {(() => {
                const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partnerInfo.email.trim());
                const isReady =
                  partnerInfo.companyName.trim().length > 0 &&
                  partnerInfo.contactName.trim().length > 0 &&
                  emailValid &&
                  summary.totalChargers > 0;

                const button = (
                  <button
                    type="button"
                    disabled={!isReady}
                    onClick={() => isReady && onNavigate("partner-plan")}
                    className={`w-full mt-2 rounded-lg px-5 py-3.5 flex flex-col items-center justify-center gap-0.5 transition-all ${
                      isReady
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg cursor-pointer shadow-md"
                        : "bg-sidebar-border/40 text-sidebar-foreground/40 cursor-not-allowed"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-sm">
                      Review Final Plan <ArrowRight className="h-4 w-4" />
                    </span>
                    <span className={`text-[11px] ${isReady ? "text-primary-foreground/80" : "text-sidebar-foreground/40"}`}>
                      Confirm pricing and capture payment
                    </span>
                  </button>
                );

                return (
                  <>
                    <Separator className="bg-sidebar-border" />
                    {isReady ? (
                      button
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block w-full">{button}</span>
                          </TooltipTrigger>
                          <TooltipContent>Complete partner information to continue</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
