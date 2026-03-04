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

export default function NochPlusDashboard() {
  const subscribers: Subscriber[] = [];

  const stats = useMemo(() => ({
    activeSubscribers: subscribers.filter(s => s.status === "active").length,
    totalChargers: subscribers.reduce((s, c) => s + c.chargerCount, 0),
    monthlyRevenue: subscribers.filter(s => s.status === "active").reduce((s, c) => s + c.monthlyCost, 0),
    churnRate: 0,
  }), [subscribers]);

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

      {/* Empty state */}
      {subscribers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Diamond className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No Members Yet</h3>
            <p className="text-sm text-muted-foreground">Noch+ members will appear here once enrolled.</p>
          </CardContent>
        </Card>
      )}

      {/* Map */}
      <NochPlusMap subscribers={subscribers} />
    </div>
  );
}
