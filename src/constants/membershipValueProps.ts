import { Shield, TrendingUp, DollarSign, Award, Users, type LucideIcon } from "lucide-react";

export interface MembershipValueProp {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Single source of truth for the 5 "Why NOCH+" value props.
 * Used on the Account → Membership tab and the public Plan Tiers tab.
 */
export const MEMBERSHIP_VALUE_PROPS: MembershipValueProp[] = [
  {
    key: "brand_protection",
    icon: Shield,
    title: "Brand Protection",
    description:
      "Keep chargers online and drivers happy. Protect your brand from downtime and frustration.",
  },
  {
    key: "increase_revenue",
    icon: TrendingUp,
    title: "Increase Revenue",
    description:
      "More uptime means more sessions. Turn every charger into a consistent revenue driver.",
  },
  {
    key: "reduce_costs",
    icon: DollarSign,
    title: "Reduce Costs",
    description:
      "Lower service costs with faster fixes and built-in discounts on labor and parts.",
  },
  {
    key: "evitp_certified",
    icon: Award,
    title: "EVITP Certified",
    description:
      "Trained experts in EV infrastructure. No guesswork, just reliable execution.",
  },
  {
    key: "in_house_techs",
    icon: Users,
    title: "In-House Technicians",
    description:
      "Our own team, not contractors. Better quality, faster response, full accountability.",
  },
];
