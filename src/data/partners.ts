export interface PartnerCategory {
  label: string;
  partners: { value: string; label: string }[];
}

export const PARTNER_CATEGORIES: PartnerCategory[] = [
  {
    label: "CPOs",
    partners: [
      { value: "evgo", label: "EVgo" },
      { value: "chargepoint", label: "ChargePoint" },
      { value: "electrify_america", label: "Electrify America" },
      { value: "blink_charging", label: "Blink Charging" },
      { value: "shell_recharge", label: "Shell Recharge" },
    ],
  },
  {
    label: "OEMs",
    partners: [
      { value: "btc_power", label: "BTC Power" },
      { value: "abb", label: "ABB" },
      { value: "delta_electronics", label: "Delta Electronics" },
      { value: "tritium", label: "Tritium" },
      { value: "signet", label: "Signet" },
    ],
  },
  {
    label: "CSMS",
    partners: [
      { value: "chargelab", label: "ChargeLab" },
      { value: "driivz", label: "Driivz" },
      { value: "greenlots", label: "Greenlots" },
      { value: "sitehost", label: "SiteHost" },
      { value: "open_charge_cloud", label: "Open Charge Cloud" },
    ],
  },
];

export const ALL_PARTNERS = PARTNER_CATEGORIES.flatMap((c) => c.partners);

export const PARTNER_LABELS: Record<string, string> = Object.fromEntries(
  ALL_PARTNERS.map((p) => [p.value, p.label])
);
