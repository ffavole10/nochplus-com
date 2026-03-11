import { useState, useEffect, useCallback } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { FleetCommandCenter } from "@/components/monitoring/FleetCommandCenter";
import { ChargerHealthMatrix } from "@/components/monitoring/ChargerHealthMatrix";
import { EnvironmentalIntelligence } from "@/components/monitoring/EnvironmentalIntelligence";
import { PatternIntelligence } from "@/components/monitoring/PatternIntelligence";
import { MaxLiveActivity } from "@/components/monitoring/MaxLiveActivity";
import { InterventionRadar } from "@/components/monitoring/InterventionRadar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TIME_RANGES = ["1H", "6H", "24H", "7D", "30D"] as const;
type TimeRange = typeof TIME_RANGES[number];

// MOCK — replace with live OCPP data when integration is complete
const MOCK_CUSTOMERS = ["All Customers", "Fontainebleau", "Hilton Hotels", "Marriott Corp", "Tesla Supercharger Network"];

export default function NochPlusMonitoring() {
  usePageTitle("Monitoring");
  const [timeRange, setTimeRange] = useState<TimeRange>("24H");
  const [customer, setCustomer] = useState("All Customers");
  const [pulse, setPulse] = useState(true);

  // Pulse animation cycle
  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh every 30s via realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("ocpp-events-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ocpp_events" }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Noch+ Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Real-time proactive intelligence across your connected charger network
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Live indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("w-2 h-2 rounded-full bg-emerald-500", pulse && "animate-pulse")} />
            <span>Live — updating every 30s</span>
          </div>

          {/* Time range */}
          <div className="flex items-center rounded-md border border-border bg-muted/30">
            {TIME_RANGES.map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium transition-colors",
                  timeRange === t
                    ? "bg-primary text-primary-foreground rounded-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Customer filter */}
          <Select value={customer} onValueChange={setCustomer}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOCK_CUSTOMERS.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 1 */}
      <FleetCommandCenter timeRange={timeRange} customer={customer} />

      {/* Section 2 */}
      <ChargerHealthMatrix timeRange={timeRange} customer={customer} />

      {/* Section 3 */}
      <EnvironmentalIntelligence timeRange={timeRange} customer={customer} />

      {/* Section 4 */}
      <PatternIntelligence timeRange={timeRange} customer={customer} />

      {/* Section 5 */}
      <MaxLiveActivity timeRange={timeRange} customer={customer} />

      {/* Section 6 */}
      <InterventionRadar timeRange={timeRange} customer={customer} />
    </div>
  );
}
