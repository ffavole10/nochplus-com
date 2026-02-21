import { useMemo } from "react";
import { Diamond, Users, DollarSign, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NochPlusMap } from "@/components/noch-plus/NochPlusMap";

interface Subscriber {
  id: string;
  company: string;
  plan: "Premium" | "Standard" | "Basic";
  monthlyCost: number;
  status: "active" | "cancelled" | "expired" | "trial";
  chargerCount: number;
  lat: number;
  lng: number;
  city: string;
  state: string;
}

const MOCK_SUBSCRIBERS: Subscriber[] = [
  { id: "s1", company: "ChargePoint Inc.", plan: "Premium", monthlyCost: 499, status: "active", chargerCount: 85, lat: 33.4484, lng: -112.0740, city: "Phoenix", state: "AZ" },
  { id: "s2", company: "EVgo Services", plan: "Premium", monthlyCost: 499, status: "active", chargerCount: 72, lat: 34.0522, lng: -118.2437, city: "Los Angeles", state: "CA" },
  { id: "s3", company: "Electrify America", plan: "Standard", monthlyCost: 299, status: "active", chargerCount: 48, lat: 37.3382, lng: -121.8863, city: "San Jose", state: "CA" },
  { id: "s4", company: "Blink Charging", plan: "Standard", monthlyCost: 299, status: "active", chargerCount: 35, lat: 25.7617, lng: -80.1918, city: "Miami", state: "FL" },
  { id: "s5", company: "FreeWire Tech", plan: "Basic", monthlyCost: 149, status: "active", chargerCount: 20, lat: 47.6062, lng: -122.3321, city: "Seattle", state: "WA" },
  { id: "s6", company: "Volta Charging", plan: "Premium", monthlyCost: 499, status: "active", chargerCount: 65, lat: 40.7128, lng: -74.0060, city: "New York", state: "NY" },
  { id: "s7", company: "SemaConnect", plan: "Basic", monthlyCost: 149, status: "cancelled", chargerCount: 15, lat: 41.8781, lng: -87.6298, city: "Chicago", state: "IL" },
  { id: "s8", company: "TurnOnGreen", plan: "Standard", monthlyCost: 299, status: "trial", chargerCount: 28, lat: 29.7604, lng: -95.3698, city: "Houston", state: "TX" },
  { id: "s9", company: "Wallbox NA", plan: "Basic", monthlyCost: 149, status: "expired", chargerCount: 12, lat: 33.7490, lng: -84.3880, city: "Atlanta", state: "GA" },
];

export default function NochPlusDashboard() {
  const stats = useMemo(() => ({
    activeSubscribers: MOCK_SUBSCRIBERS.filter(s => s.status === "active").length,
    totalChargers: MOCK_SUBSCRIBERS.reduce((s, c) => s + c.chargerCount, 0),
    monthlyRevenue: MOCK_SUBSCRIBERS.filter(s => s.status === "active").reduce((s, c) => s + c.monthlyCost, 0),
    churnRate: 2.1,
  }), []);

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3.5 w-3.5" />Active Members</p>
            <p className="text-2xl font-bold text-foreground">{stats.activeSubscribers}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Diamond className="h-3.5 w-3.5" />Enrolled Chargers</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalChargers}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-optimal">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><DollarSign className="h-3.5 w-3.5" />Monthly Revenue</p>
            <p className="text-2xl font-bold text-optimal">${stats.monthlyRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-medium">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><TrendingDown className="h-3.5 w-3.5" />Churn Rate</p>
            <p className="text-2xl font-bold text-medium">{stats.churnRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <NochPlusMap subscribers={MOCK_SUBSCRIBERS} />
    </div>
  );
}
