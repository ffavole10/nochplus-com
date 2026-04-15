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
}

export interface RoiInputs {
  avgServiceCallCost: number;
  avgResponseTime: number;
  serviceCallsPerYear: number;
}

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
  });

  const [sites, setSites] = useState<SiteConfig[]>([defaultSite()]);

  const [roiInputs, setRoiInputs] = useState<RoiInputs>({
    avgServiceCallCost: 600,
    avgResponseTime: 96,
    serviceCallsPerYear: 12,
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
    const netCost = annualTotal - estimatedSavings;
    const totalSavings = currentAnnualSpend - netCost;

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
      netCost,
      totalSavings,
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
