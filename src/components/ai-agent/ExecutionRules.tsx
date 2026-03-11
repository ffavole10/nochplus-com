import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ListChecks, Ban, ArrowUpDown } from "lucide-react";

export type ExecutionRulesConfig = {
  triggers: Record<string, boolean>;
  exclusions: Record<string, boolean>;
  skip_older_than_days: number;
  execution_order: string;
};

export const DEFAULT_EXECUTION_RULES: ExecutionRulesConfig = {
  triggers: {
    status_new_pending: true,
    has_serial: true,
    has_description: true,
    active_member: true,
    from_submission: false,
    high_critical_only: false,
  },
  exclusions: {
    reviewed_by_tech: false,
    has_estimate: false,
    older_than_days: false,
    specific_customers: false,
  },
  skip_older_than_days: 30,
  execution_order: "highest_priority",
};

const TRIGGER_LABELS: Record<string, string> = {
  status_new_pending: 'Ticket status is "New" or "Pending Review"',
  has_serial: "Ticket has a charger serial number",
  has_description: "Ticket has an issue description (min 10 chars)",
  active_member: "Customer is an active Noch+ member",
  from_submission: "Ticket was created from a Noch+ submission",
  high_critical_only: 'Ticket priority is "High" or "Critical" only',
};

const EXCLUSION_LABELS: Record<string, string> = {
  reviewed_by_tech: "Skip tickets already reviewed by a technician",
  has_estimate: "Skip tickets with existing estimates",
  older_than_days: "Skip tickets older than",
  specific_customers: "Skip tickets from specific customers",
};

type Props = {
  value: ExecutionRulesConfig;
  onChange: (v: ExecutionRulesConfig) => void;
};

export function ExecutionRules({ value, onChange }: Props) {
  const update = (partial: Partial<ExecutionRulesConfig>) => onChange({ ...value, ...partial });
  const setTrigger = (key: string, v: boolean) =>
    update({ triggers: { ...value.triggers, [key]: v } });
  const setExclusion = (key: string, v: boolean) =>
    update({ exclusions: { ...value.exclusions, [key]: v } });

  return (
    <div className="border-t border-border pt-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Agent Execution Rules</h2>
        <p className="text-sm text-muted-foreground">
          Control which tickets AutoHeal processes and under what conditions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trigger Conditions */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Trigger Conditions</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">AutoHeal only runs when ALL selected conditions are met.</p>
            <div className="space-y-2.5">
              {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`trigger-${key}`}
                    checked={value.triggers[key] ?? false}
                    onCheckedChange={(v) => setTrigger(key, !!v)}
                  />
                  <Label htmlFor={`trigger-${key}`} className="text-xs cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Exclusion Rules */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Exclusion Rules</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">Skip AutoHeal for these ticket types.</p>
            <div className="space-y-2.5">
              {Object.entries(EXCLUSION_LABELS).map(([key, label]) => (
                <div key={key}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`excl-${key}`}
                      checked={value.exclusions[key] ?? false}
                      onCheckedChange={(v) => setExclusion(key, !!v)}
                    />
                    <Label htmlFor={`excl-${key}`} className="text-xs cursor-pointer">
                      {key === "older_than_days" ? (
                        <span className="flex items-center gap-1">
                          {label}
                          <Input
                            type="number"
                            className="h-6 w-14 text-xs inline-block"
                            value={value.skip_older_than_days}
                            onChange={(e) => update({ skip_older_than_days: parseInt(e.target.value) || 30 })}
                            min={1}
                          />
                          <span>days</span>
                        </span>
                      ) : label}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution Order */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Execution Order</h3>
          </div>
          <p className="text-[10px] text-muted-foreground">Priority queue for processing.</p>
          <RadioGroup
            value={value.execution_order}
            onValueChange={(v) => update({ execution_order: v })}
            className="space-y-1.5"
          >
            {[
              { value: "highest_priority", label: "Highest priority tickets first" },
              { value: "newest_first", label: "Newest tickets first" },
              { value: "oldest_first", label: "Oldest tickets first (FIFO)" },
              { value: "members_first", label: "Noch+ members first" },
            ].map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`order-${opt.value}`} />
                <Label htmlFor={`order-${opt.value}`} className="text-xs">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
