import { useState, useRef, useCallback } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, DollarSign, Plane, Car, Hotel, Wrench, Loader2 } from "lucide-react";
import { CostAssumptions } from "@/hooks/useCampaignCostAssumptions";
import { GeneratedScheduleDay, TravelSegment } from "@/lib/routeOptimizer";

interface CostAssumptionsPanelProps {
  assumptions: CostAssumptions;
  saving: boolean;
  onUpdateField: (field: string, value: number | string | null) => void;
  scheduleDays: GeneratedScheduleDay[];
  rateCards: { id: string; name: string }[];
}

function CurrencyField({ label, value, field, onUpdate }: {
  label: string;
  value: number;
  field: string;
  onUpdate: (f: string, v: number) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value) || 0;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onUpdate(field, v), 800);
  }, [field, onUpdate]);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="relative w-28">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
        <Input
          type="number"
          step="0.01"
          defaultValue={value}
          onChange={handleChange}
          className="h-7 text-xs pl-5 pr-2"
        />
      </div>
    </div>
  );
}

function NumberField({ label, value, field, suffix, step, onUpdate }: {
  label: string;
  value: number;
  field: string;
  suffix?: string;
  step?: number;
  onUpdate: (f: string, v: number) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value) || 0;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onUpdate(field, v), 800);
  }, [field, onUpdate]);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step={step || 1}
          defaultValue={value}
          onChange={handleChange}
          className="h-7 text-xs w-20 text-right"
        />
        {suffix && <span className="text-[10px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, label, open, onToggle }: {
  icon: typeof DollarSign;
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleTrigger
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
    </CollapsibleTrigger>
  );
}

function fmt$(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function CostAssumptionsPanel({
  assumptions,
  saving,
  onUpdateField,
  scheduleDays,
  rateCards,
}: CostAssumptionsPanelProps) {
  const [laborOpen, setLaborOpen] = useState(true);
  const [accomOpen, setAccomOpen] = useState(true);
  const [vehicleOpen, setVehicleOpen] = useState(true);
  const [flightOpen, setFlightOpen] = useState(true);

  // Extract flights from schedule
  const flights: { from: string; to: string; date: string; estimate: number; techId: string }[] = [];
  const rentalPeriods: { city: string; tech: string; days: number; start: string; end: string }[] = [];

  for (const day of scheduleDays) {
    for (const seg of day.travel_segments) {
      if (seg.mode === "flight") {
        flights.push({
          from: seg.from_site,
          to: seg.to_site,
          date: day.schedule_date,
          estimate: seg.cost_estimate || 200,
          techId: day.technician_id,
        });
      }
    }
  }

  // Rental periods per tech
  const techWorkDays = new Map<string, { city: string; date: string }[]>();
  for (const day of scheduleDays) {
    if (day.day_type !== "work" || !day.overnight_city) continue;
    if (!techWorkDays.has(day.technician_id)) techWorkDays.set(day.technician_id, []);
    techWorkDays.get(day.technician_id)!.push({ city: day.overnight_city, date: day.schedule_date });
  }

  for (const [techId, days] of techWorkDays) {
    let current: typeof rentalPeriods[0] | null = null;
    for (const d of days.sort((a, b) => a.date.localeCompare(b.date))) {
      if (current && current.city === d.city) {
        current.days++;
        current.end = d.date;
      } else {
        if (current) rentalPeriods.push(current);
        current = { city: d.city, tech: techId, days: 1, start: d.date, end: d.date };
      }
    }
    if (current) rentalPeriods.push(current);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Rate Source */}
      <div className="px-3 py-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Rate Source</span>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <Select
          value={assumptions.rate_source}
          onValueChange={(v) => onUpdateField("rate_source", v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom Rates</SelectItem>
            {rateCards.map(rc => (
              <SelectItem key={rc.id} value={rc.id}>{rc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Labor Rates */}
      <Collapsible open={laborOpen}>
        <SectionHeader icon={Wrench} label="Labor Rates" open={laborOpen} onToggle={() => setLaborOpen(!laborOpen)} />
        <CollapsibleContent className="px-3 pb-3 space-y-2">
          <CurrencyField label="Base Labor Rate" value={assumptions.base_labor_rate} field="base_labor_rate" onUpdate={onUpdateField} />
          <CurrencyField label="Overtime Rate" value={assumptions.overtime_rate} field="overtime_rate" onUpdate={onUpdateField} />
          <CurrencyField label="Portal-to-Portal Rate" value={assumptions.portal_to_portal_rate} field="portal_to_portal_rate" onUpdate={onUpdateField} />
          <NumberField label="OT Daily Threshold" value={assumptions.overtime_daily_threshold} field="overtime_daily_threshold" suffix="hrs" step={0.5} onUpdate={onUpdateField} />
          <NumberField label="OT Weekly Threshold" value={assumptions.overtime_weekly_threshold} field="overtime_weekly_threshold" suffix="hrs" step={1} onUpdate={onUpdateField} />
        </CollapsibleContent>
      </Collapsible>

      {/* Accommodation */}
      <Collapsible open={accomOpen}>
        <SectionHeader icon={Hotel} label="Accommodation" open={accomOpen} onToggle={() => setAccomOpen(!accomOpen)} />
        <CollapsibleContent className="px-3 pb-3 space-y-2">
          <CurrencyField label="Hotel Nightly Rate" value={assumptions.hotel_nightly_rate} field="hotel_nightly_rate" onUpdate={onUpdateField} />
          <NumberField label="Hotel Tax (est.)" value={assumptions.hotel_tax_pct} field="hotel_tax_pct" suffix="%" step={0.5} onUpdate={onUpdateField} />
          <CurrencyField label="Meal Per Diem" value={assumptions.meal_per_diem} field="meal_per_diem" onUpdate={onUpdateField} />
        </CollapsibleContent>
      </Collapsible>

      {/* Vehicle */}
      <Collapsible open={vehicleOpen}>
        <SectionHeader icon={Car} label="Vehicle" open={vehicleOpen} onToggle={() => setVehicleOpen(!vehicleOpen)} />
        <CollapsibleContent className="px-3 pb-3 space-y-2">
          <CurrencyField label="EV Rental Daily Rate" value={assumptions.ev_rental_daily} field="ev_rental_daily" onUpdate={onUpdateField} />
          {rentalPeriods.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Rental Periods</span>
              {rentalPeriods.map((r, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{r.city} ({r.days}d)</span>
                  <span className="font-medium">{fmt$(r.days * assumptions.ev_rental_daily)}</span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Flight */}
      <Collapsible open={flightOpen}>
        <SectionHeader icon={Plane} label="Flights" open={flightOpen} onToggle={() => setFlightOpen(!flightOpen)} />
        <CollapsibleContent className="px-3 pb-3 space-y-2">
          <CurrencyField label="Luggage Fee" value={assumptions.luggage_per_flight} field="luggage_per_flight" onUpdate={onUpdateField} />
          <NumberField label="Airfare Buffer" value={assumptions.airfare_buffer_pct} field="airfare_buffer_pct" suffix="%" step={5} onUpdate={onUpdateField} />
          {flights.length > 0 ? (
            <div className="mt-2 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Flight Segments</span>
              {flights.map((f, i) => {
                const buffered = Math.round(f.estimate * (1 + assumptions.airfare_buffer_pct / 100));
                return (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground truncate max-w-[55%]">
                      {f.from} → {f.to}
                    </span>
                    <span className="font-medium">{fmt$(buffered)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 mt-1">No flight segments in schedule.</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
