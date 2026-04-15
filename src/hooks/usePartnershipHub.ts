import { useState, useCallback, useMemo } from "react";
import { TierName, calcSiteMonthlyCost, LABOR_DISCOUNT } from "@/constants/nochPlusTiers";

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
}

// SLA target hours by tier
const SLA_HOURS: Record<TierName, number> = {
  essential: 72,
  priority: 48,
  elite: 24,
};

const defaultSite = (): SiteConfig => ({
  id: crypto.randomUUID(),
  name: "Site 1",
  l2Count: 0,
  dcCount: 0,
  tier: "priority",
});

export function usePartnershipHub() {
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo>({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    currentProvider: "",
  });

  const [sites, setSites] = useState<SiteConfig[]>([defaultSite()]);

  const [roiInputs, setRoiInputs] = useState<RoiInputs>({
    avgServiceCallCost: 600,
    avgResponseTime: 96,
    serviceCallsPerYear: 12,
    downtimeCostPerDay: 40,
  });

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

    const monthlyTotal = sites.reduce(
      (a, s) => a + calcSiteMonthlyCost(s.l2Count, s.dcCount, s.tier),
      0
    );
    const annualTotal = monthlyTotal * 12;
    const annualPrePay = monthlyTotal * 11;

    // Dominant tier (by charger count)
    const tierCounts: Record<TierName, number> = { essential: 0, priority: 0, elite: 0 };
    sites.forEach((s) => { tierCounts[s.tier] += s.l2Count + s.dcCount; });
    const dominantTier: TierName = (Object.entries(tierCounts) as [TierName, number][])
      .sort((a, b) => b[1] - a[1])[0][0];
    const slaTargetHours = SLA_HOURS[dominantTier];

    // ROI calculations — blended labor discount across sites (weighted by charger count)
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

    // Downtime savings
    const hoursSaved = Math.max(0, roiInputs.avgResponseTime - slaTargetHours);
    const downtimeSavings = (hoursSaved / 24) * roiInputs.downtimeCostPerDay * roiInputs.serviceCallsPerYear;

    const netCost = annualTotal - estimatedSavings - downtimeSavings;
    const totalSavings = currentAnnualSpend + downtimeSavings * 1 - netCost;
    // Simpler: totalSavings = estimatedSavings + downtimeSavings (portion from membership savings)
    const combinedSavings = estimatedSavings + downtimeSavings;

    // Recommended tier logic
    const hasDC = totalDC > 0;
    const allL2Small = totalDC === 0 && totalChargers < 10;
    let recommendedTier: TierName = "priority";
    let recommendedReason = "Best fit for mixed L2/DCFC deployments";
    if (allL2Small && totalChargers > 0) {
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
      slaTargetHours,
      hoursSaved,
      recommendedTier,
      recommendedReason,
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
    setRoiInputs,
    summary,
  };
}
