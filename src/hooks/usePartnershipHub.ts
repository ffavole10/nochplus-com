import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { TierName, CoreTierName, calcSiteMonthlyCost, LABOR_DISCOUNT } from "@/constants/nochPlusTiers";

export interface SiteConfig {
  id: string;
  name: string;
  l2Count: number;
  dcCount: number;
  tier: TierName;
}

export interface PartnerInfo {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  currentProvider: string;
}

export interface RoiInputs {
  avgServiceCallCost: number;
  avgResponseTime: number;
  serviceCallsPerYear: number;
  downtimeCostPerDay: number;
  driversAffectedPerIncident: number;
  customerLifetimeValue: number;
}

const NEGATIVE_REVIEW_RATE = 0.10;

const L2_DAILY_REVENUE = 16;
const DC_DAILY_REVENUE = 137;

const L2_CALLS_PER_YEAR = 2;
const DC_CALLS_PER_YEAR = 4;

// SLA target hours by tier (Starter = best effort/no guarantee, Enterprise = custom est.)
const SLA_HOURS: Record<TierName, number> = {
  starter: 96,
  essential: 72,
  priority: 48,
  elite: 24,
  enterprise: 12,
};

// Map any tier to a "core" tier for dominant-tier display purposes
const toCoreTier = (t: TierName): CoreTierName => {
  if (t === "starter") return "essential";
  if (t === "enterprise") return "elite";
  return t;
};

const defaultSite = (): SiteConfig => ({
  id: crypto.randomUUID(),
  name: "Site 1",
  l2Count: 0,
  dcCount: 0,
  tier: "priority",
});

function calcSmartDowntimeCost(totalL2: number, totalDC: number): number {
  const total = totalL2 + totalDC;
  if (total === 0) return 0;
  if (totalDC === 0) return L2_DAILY_REVENUE;
  if (totalL2 === 0) return DC_DAILY_REVENUE;
  return Math.round((totalL2 * L2_DAILY_REVENUE + totalDC * DC_DAILY_REVENUE) / total);
}

function calcSmartServiceCalls(totalL2: number, totalDC: number): number {
  return totalL2 * L2_CALLS_PER_YEAR + totalDC * DC_CALLS_PER_YEAR;
}

function calcSmartDriversAffected(responseHours: number): number {
  return Math.max(2, Math.round(responseHours / 12));
}

export function usePartnershipHub() {
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo>({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    currentProvider: "",
  });

  const [sites, setSites] = useState<SiteConfig[]>([defaultSite()]);
  const downtimeManuallySet = useRef(false);
  const serviceCallsManuallySet = useRef(false);

  const driversManuallySet = useRef(false);

  const [roiInputs, setRoiInputs] = useState<RoiInputs>({
    avgServiceCallCost: 750,
    avgResponseTime: 96,
    serviceCallsPerYear: 0,
    downtimeCostPerDay: 0,
    driversAffectedPerIncident: calcSmartDriversAffected(96),
    customerLifetimeValue: 750,
  });

  useEffect(() => {
    const totalL2 = sites.reduce((a, s) => a + s.l2Count, 0);
    const totalDC = sites.reduce((a, s) => a + s.dcCount, 0);

    setRoiInputs((prev) => {
      let next = prev;
      if (!downtimeManuallySet.current) {
        const smart = calcSmartDowntimeCost(totalL2, totalDC);
        if (prev.downtimeCostPerDay !== smart) next = { ...next, downtimeCostPerDay: smart };
      }
      if (!serviceCallsManuallySet.current) {
        const smartCalls = calcSmartServiceCalls(totalL2, totalDC);
        if (prev.serviceCallsPerYear !== smartCalls) next = { ...next, serviceCallsPerYear: smartCalls };
      }
      return next;
    });
  }, [sites]);

  const handleSetRoiInputs = useCallback((next: RoiInputs) => {
    setRoiInputs((prev) => {
      if (next.downtimeCostPerDay !== prev.downtimeCostPerDay) {
        downtimeManuallySet.current = true;
      }
      if (next.serviceCallsPerYear !== prev.serviceCallsPerYear) {
        serviceCallsManuallySet.current = true;
      }
      return next;
    });
  }, []);

  const addSite = useCallback(() => {
    setSites((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Site ${prev.length + 1}`,
        l2Count: 0,
        dcCount: 0,
        tier: "priority",
      },
    ]);
  }, []);

  const removeSite = useCallback((id: string) => {
    setSites((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  }, []);

  const updateSite = useCallback((id: string, updates: Partial<SiteConfig>) => {
    setSites((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const summary = useMemo(() => {
    const totalL2 = sites.reduce((a, s) => a + s.l2Count, 0);
    const totalDC = sites.reduce((a, s) => a + s.dcCount, 0);
    const totalChargers = totalL2 + totalDC;

    // Monthly total only counts paid tiers (Starter = $0, Enterprise = "Custom" excluded)
    const monthlyTotal = sites.reduce(
      (a, s) => a + calcSiteMonthlyCost(s.l2Count, s.dcCount, s.tier),
      0
    );
    const annualTotal = monthlyTotal * 12;
    const annualPrePay = monthlyTotal * 11;

    // Has any enterprise sites?
    const hasEnterprise = sites.some((s) => s.tier === "enterprise");
    const allStarter = sites.length > 0 && sites.every((s) => s.tier === "starter");

    // Dominant tier (by charger count) — across all 5 tiers
    const tierCounts: Record<TierName, number> = { starter: 0, essential: 0, priority: 0, elite: 0, enterprise: 0 };
    sites.forEach((s) => { tierCounts[s.tier] += s.l2Count + s.dcCount; });
    const dominantTier: TierName = (Object.entries(tierCounts) as [TierName, number][])
      .sort((a, b) => b[1] - a[1])[0][0];
    const slaTargetHours = SLA_HOURS[dominantTier];

    // ROI calculations — blended labor discount
    const weightedDiscount =
      totalChargers > 0
        ? sites.reduce(
            (a, s) =>
              a + (s.l2Count + s.dcCount) * LABOR_DISCOUNT[s.tier],
            0
          ) / totalChargers
        : 0;

    const currentAnnualSpend = roiInputs.avgServiceCallCost * roiInputs.serviceCallsPerYear;
    const estimatedSavings = currentAnnualSpend * weightedDiscount;

    const hoursSaved = Math.max(0, roiInputs.avgResponseTime - slaTargetHours);
    const downtimeSavings = (hoursSaved / 24) * roiInputs.downtimeCostPerDay * roiInputs.serviceCallsPerYear;

    const netCost = annualTotal - estimatedSavings - downtimeSavings;
    const totalSavings = currentAnnualSpend + downtimeSavings * 1 - netCost;
    const combinedSavings = estimatedSavings + downtimeSavings;

    // Recommended tier logic
    const hasDC = totalDC > 0;
    const allL2Small = totalDC === 0 && totalChargers < 10;
    let recommendedTier: TierName = "priority";
    let recommendedReason = "Best fit for mixed L2/DCFC deployments";
    if (totalChargers >= 200) {
      recommendedTier = "enterprise";
      recommendedReason = "Large-scale deployment — custom volume pricing recommended";
    } else if (allL2Small && totalChargers > 0) {
      recommendedTier = "essential";
      recommendedReason = "Great starting point for smaller L2 sites";
    } else if (hasDC && totalDC >= totalL2) {
      recommendedTier = "elite";
      recommendedReason = "Maximum protection for DCFC-heavy networks";
    } else if (hasDC) {
      recommendedTier = "priority";
      recommendedReason = "Best fit for mixed L2/DCFC deployments";
    }

    return {
      totalL2,
      totalDC,
      totalChargers,
      siteCount: sites.length,
      monthlyTotal,
      annualTotal,
      annualPrePay,
      currentAnnualSpend,
      estimatedSavings,
      downtimeSavings,
      combinedSavings,
      netCost,
      totalSavings,
      dominantTier,
      dominantCoreTier: toCoreTier(dominantTier),
      slaTargetHours,
      hoursSaved,
      recommendedTier,
      recommendedReason,
      hasEnterprise,
      allStarter,
    };
  }, [sites, roiInputs]);

  return {
    partnerInfo,
    setPartnerInfo,
    sites,
    setSites,
    addSite,
    removeSite,
    updateSite,
    roiInputs,
    setRoiInputs: handleSetRoiInputs,
    summary,
  };
}
