import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, BadgeCheck, FlaskConical, Plus, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { MEMBERSHIP_VALUE_PROPS } from "@/constants/membershipValueProps";
import {
  TIER_PRICING,
  TIER_LABELS,
  type TierName,
  type CoreTierName,
} from "@/constants/nochPlusTiers";
import { useContacts, useCreateContact } from "@/hooks/useContacts";
import { ContactFormModal } from "@/components/business/ContactFormModal";
import { formatCurrency } from "@/lib/formatters";
import { consumeEnrollPrefill, type EnrollPrefill } from "@/lib/submissionEnrollPrefill";
import { Link as RouterLink } from "react-router-dom";

type AccountMembership = {
  id: string;
  membership_tier: TierName | null;
  membership_status: "not_enrolled" | "active" | "paused" | "cancelled" | "demo";
  enrolled_at: string | null;
  chargers_enrolled_count: number;
  monthly_revenue: number;
  list_monthly_revenue: number;
  negotiated_monthly_revenue: number;
  discount_amount: number;
  discount_pct: number;
  discount_reason: string | null;
  billing_cycle: "monthly" | "annual_prepay";
  annual_prepay_amount: number | null;
  annual_savings: number | null;
  annual_period_end: string | null;
  billing_contact_id: string | null;
  is_demo_membership: boolean;
  membership_notes: string | null;
  source_submission_id?: string | null;
  source_type?: string | null;
};

type SourceSubmissionMeta = {
  id: string;
  submission_id: string;
};

const SELECTABLE_TIERS: CoreTierName[] = ["essential", "priority", "elite"];

const TIER_HIGHLIGHTS: Record<CoreTierName, string[]> = {
  essential: [
    "72-hour guaranteed response",
    "M–F, 8a–5p coverage",
    "10% off labor, 5% off parts",
    "1 travel fee waiver / year",
  ],
  priority: [
    "48-hour guaranteed response",
    "M–F, 7a–9p coverage",
    "15% off labor, 10% off parts",
    "50% off PM visits",
    "Priority dispatch queue",
  ],
  elite: [
    "24-hour guaranteed response",
    "7-day, 7a–9p coverage",
    "20% off labor, 15% off parts",
    "Dedicated Account Manager",
    "1 PM visit / year included",
  ],
};

function tierUnitPrice(tier: CoreTierName, type: "ac" | "dc") {
  return type === "ac" ? TIER_PRICING[tier].l2 : TIER_PRICING[tier].dc;
}

export type ChargerLineType = "ac_level_2" | "dc_level_3" | "ac_level_1";
export const CHARGER_LINE_TYPES: ChargerLineType[] = ["ac_level_2", "dc_level_3", "ac_level_1"];
export const CHARGER_LINE_LABELS: Record<ChargerLineType, string> = {
  ac_level_2: "AC | Level 2",
  dc_level_3: "DC | Level 3",
  ac_level_1: "AC | Level 1",
};
export function tierRateForLineType(tier: CoreTierName, t: ChargerLineType): number {
  if (t === "dc_level_3") return TIER_PRICING[tier].dc;
  // L1 priced same as L2 list (rare, negotiable)
  return TIER_PRICING[tier].l2;
}

export type ChargerLine = {
  id: string;
  charger_type: ChargerLineType;
  connector_count: number;
  tier_rate_per_connector: number;
  negotiated_rate_per_connector: number;
  notes: string;
};

export function AccountMembershipTab({
  account,
}: {
  account: { id: string; company: string };
}) {
  const qc = useQueryClient();

  const { data: membership, isLoading } = useQuery({
    queryKey: ["account_membership", account.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, membership_tier, membership_status, enrolled_at, chargers_enrolled_count, monthly_revenue, list_monthly_revenue, negotiated_monthly_revenue, discount_amount, discount_pct, discount_reason, billing_cycle, annual_prepay_amount, annual_savings, annual_period_end, billing_contact_id, is_demo_membership, membership_notes, source_submission_id, source_type"
        )
        .eq("id", account.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AccountMembership | null;
    },
  });

  // Look up the source submission display id for the chip
  const { data: sourceSubmission } = useQuery({
    queryKey: ["source_submission", membership?.source_submission_id],
    enabled: !!membership?.source_submission_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noch_plus_submissions")
        .select("id, submission_id")
        .eq("id", membership!.source_submission_id!)
        .maybeSingle();
      if (error) throw error;
      return data as SourceSubmissionMeta | null;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["membership_history", account.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_enrollment_history")
        .select("*")
        .eq("account_id", account.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: enrolledLines = [] } = useQuery({
    queryKey: ["membership_charger_lines", account.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_charger_lines")
        .select("*")
        .eq("account_id", account.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<CoreTierName | null>(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmDowngradeFromTier, setConfirmDowngradeFromTier] = useState<
    CoreTierName | null
  >(null);

  const openEnrollFor = (tier: CoreTierName) => {
    setSelectedTier(tier);
    setEnrollOpen(true);
  };

  const isEnrolled =
    membership?.membership_status === "active" ||
    membership?.membership_status === "paused" ||
    membership?.membership_status === "demo";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="space-y-8">
        {/* Section A — Why NOCH+ */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Why enroll {account.company} in NOCH+?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              The five reasons partners choose NOCH+ for their fleet.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {MEMBERSHIP_VALUE_PROPS.map((vp) => (
              <Card key={vp.key} className="border-border/60">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <vp.icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold">{vp.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {vp.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Section B — Choose a tier */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Select a tier</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pick the plan that matches this account's reliability needs. Pricing shown
              per AC L2 charger / month.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SELECTABLE_TIERS.map((tier) => (
              <Card
                key={tier}
                className={
                  tier === "priority"
                    ? "border-primary/60 ring-1 ring-primary/30"
                    : "border-border"
                }
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold">{TIER_LABELS[tier]}</h3>
                    {tier === "priority" && (
                      <Badge variant="default" className="text-[10px]">
                        Most popular
                      </Badge>
                    )}
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      ${TIER_PRICING[tier].l2}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      / AC charger / mo
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      DC fast: ${TIER_PRICING[tier].dc} / charger / mo
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {TIER_HIGHLIGHTS[tier].map((h) => (
                      <li key={h} className="flex items-start gap-2 text-xs">
                        <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={tier === "priority" ? "default" : "outline"}
                    onClick={() => openEnrollFor(tier)}
                  >
                    Select {TIER_LABELS[tier]}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={() =>
                window.open("/business/membership?tab=partner-plan", "_self")
              }
              className="text-xs text-primary hover:underline"
            >
              Need a custom partner plan?
            </button>
          </div>
        </section>

        <EnrollmentModal
          open={enrollOpen}
          onOpenChange={setEnrollOpen}
          account={account}
          tier={selectedTier}
          onChangeTier={() => {
            setEnrollOpen(false);
          }}
          currentTier={null}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["account_membership", account.id] });
            qc.invalidateQueries({ queryKey: ["membership_history", account.id] });
            qc.invalidateQueries({ queryKey: ["noch_plus_dashboard"] });
            qc.invalidateQueries({ queryKey: ["noch_plus_members_combined"] });
            qc.invalidateQueries({ queryKey: ["membership_charger_lines", account.id] });
          }}
        />
      </div>
    );
  }

  // ENROLLED STATE
  const m = membership!;
  const tierLabel = m.membership_tier ? TIER_LABELS[m.membership_tier] : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        {m.is_demo_membership ? (
          <Badge className="bg-medium/15 text-medium border-medium/30 gap-1">
            <FlaskConical className="h-3 w-3" /> Demo Member
          </Badge>
        ) : m.membership_status === "paused" ? (
          <Badge variant="outline">Paused</Badge>
        ) : (
          <Badge className="bg-optimal/15 text-optimal border-optimal/30 gap-1">
            <BadgeCheck className="h-3 w-3" /> Active NOCH+ Member
          </Badge>
        )}
        <Badge variant="outline">{tierLabel}</Badge>
        <Badge variant="outline" className="capitalize">
          {m.billing_cycle === "annual_prepay"
            ? `Annual${m.annual_period_end ? ` (paid through ${format(new Date(m.annual_period_end), "MMM d, yyyy")})` : ""}`
            : "Monthly"}
        </Badge>
        {Number(m.discount_amount || 0) > 0 && (
          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">
            Special pricing
          </Badge>
        )}
        {m.enrolled_at && (
          <span className="text-xs text-muted-foreground">
            Member since {format(new Date(m.enrolled_at), "MMM d, yyyy")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Connectors Enrolled" value={String(m.chargers_enrolled_count)} />
        <StatTile
          label="Monthly Revenue"
          value={formatCurrency(Number(m.negotiated_monthly_revenue || m.monthly_revenue || 0))}
          sub={
            Number(m.discount_amount || 0) > 0
              ? `List ${formatCurrency(Number(m.list_monthly_revenue || 0))} · -${Number(m.discount_pct || 0).toFixed(0)}%`
              : undefined
          }
        />
        {m.billing_cycle === "annual_prepay" ? (
          <StatTile
            label="Annual Value"
            value={formatCurrency(Number(m.annual_prepay_amount || 0))}
            sub={m.annual_savings ? `Saves ${formatCurrency(Number(m.annual_savings))}` : undefined}
          />
        ) : (
          <StatTile
            label="Member Since"
            value={m.enrolled_at ? format(new Date(m.enrolled_at), "MMM yyyy") : "—"}
          />
        )}
        <StatTile label="Plan" value={tierLabel} />
      </div>

      {enrolledLines.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold">Charger configuration</h3>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {enrolledLines.map((l: any) => {
                const lt = l.charger_type as ChargerLineType;
                const sub =
                  Number(l.negotiated_rate_per_connector) * Number(l.connector_count);
                return (
                  <div
                    key={l.id}
                    className="px-4 py-2.5 text-xs flex items-center gap-3 flex-wrap"
                  >
                    <span className="font-medium w-32">{CHARGER_LINE_LABELS[lt]}</span>
                    <span className="text-muted-foreground">
                      {l.connector_count} connector{l.connector_count === 1 ? "" : "s"}
                    </span>
                    <span className="text-muted-foreground">
                      ${Number(l.negotiated_rate_per_connector).toFixed(2)}/connector
                    </span>
                    <span className="ml-auto font-bold">
                      {formatCurrency(sub)}/mo
                    </span>
                  </div>
                );
              })}
              <div className="px-4 py-2.5 text-xs flex items-center bg-muted/30">
                <span className="font-bold w-32">Total</span>
                <span className="text-muted-foreground">
                  {enrolledLines.reduce(
                    (s: number, l: any) => s + Number(l.connector_count || 0),
                    0
                  )}{" "}
                  connectors
                </span>
                <span className="ml-auto font-bold">
                  {formatCurrency(
                    enrolledLines.reduce(
                      (s: number, l: any) =>
                        s +
                        Number(l.negotiated_rate_per_connector) *
                          Number(l.connector_count),
                      0
                    )
                  )}
                  /mo
                </span>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-bold">Member ROI</h3>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            ROI metrics coming soon.
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedTier((m.membership_tier as CoreTierName) || "priority");
            setEnrollOpen(true);
          }}
        >
          Change Tier
        </Button>
        {m.membership_status !== "paused" && (
          <Button variant="outline" size="sm" onClick={() => setPauseOpen(true)}>
            Pause Membership
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setCancelOpen(true)}
        >
          Cancel Membership
        </Button>
        <Button variant="outline" size="sm" disabled>
          View Billing
        </Button>
      </div>

      {history.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-muted-foreground">
            Membership history
          </h3>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {history.map((h: any) => (
                <div
                  key={h.id}
                  className="px-4 py-2.5 text-xs flex items-center gap-3"
                >
                  <span className="font-medium capitalize w-28">
                    {h.action.replace("_", " ")}
                  </span>
                  <span className="text-muted-foreground capitalize">
                    {h.tier || "—"}
                  </span>
                  {h.reason && (
                    <span className="text-muted-foreground truncate flex-1">
                      {h.reason}
                    </span>
                  )}
                  <span className="text-muted-foreground ml-auto">
                    {format(new Date(h.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      <EnrollmentModal
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        account={account}
        tier={selectedTier}
        currentTier={(m.membership_tier as CoreTierName) || null}
        currentChargers={m.chargers_enrolled_count}
        currentBillingContactId={m.billing_contact_id}
        currentIsDemo={m.is_demo_membership}
        isTierChange
        onChangeTier={() => setEnrollOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["account_membership", account.id] });
          qc.invalidateQueries({ queryKey: ["membership_history", account.id] });
          qc.invalidateQueries({ queryKey: ["noch_plus_dashboard"] });
          qc.invalidateQueries({ queryKey: ["noch_plus_members_combined"] });
            qc.invalidateQueries({ queryKey: ["membership_charger_lines", account.id] });
        }}
      />

      <ReasonModal
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        title="Pause Membership"
        description={`Pause ${account.company}'s NOCH+ membership. Monthly revenue contribution will be frozen.`}
        actionLabel="Pause Membership"
        accountId={account.id}
        action="paused"
        newStatus="paused"
        tier={m.membership_tier}
        chargers={m.chargers_enrolled_count}
        monthlyRevenue={Number(m.monthly_revenue || 0)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["account_membership", account.id] });
          qc.invalidateQueries({ queryKey: ["membership_history", account.id] });
          qc.invalidateQueries({ queryKey: ["noch_plus_dashboard"] });
          qc.invalidateQueries({ queryKey: ["noch_plus_members_combined"] });
            qc.invalidateQueries({ queryKey: ["membership_charger_lines", account.id] });
        }}
      />

      <ReasonModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Membership"
        description={`This cancels ${account.company}'s NOCH+ membership. They will no longer count in active member metrics.`}
        actionLabel="Cancel Membership"
        destructive
        doubleConfirm
        accountId={account.id}
        action="cancelled"
        newStatus="cancelled"
        tier={m.membership_tier}
        chargers={m.chargers_enrolled_count}
        monthlyRevenue={Number(m.monthly_revenue || 0)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["account_membership", account.id] });
          qc.invalidateQueries({ queryKey: ["membership_history", account.id] });
          qc.invalidateQueries({ queryKey: ["noch_plus_dashboard"] });
          qc.invalidateQueries({ queryKey: ["noch_plus_members_combined"] });
            qc.invalidateQueries({ queryKey: ["membership_charger_lines", account.id] });
        }}
      />
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-bold mt-1">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/* ---------------- Enrollment Modal ---------------- */

function EnrollmentModal({
  open,
  onOpenChange,
  account,
  tier,
  currentTier,
  currentChargers,
  currentBillingContactId,
  currentIsDemo,
  isTierChange,
  onChangeTier,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  account: { id: string; company: string };
  tier: CoreTierName | null;
  currentTier: CoreTierName | null;
  currentChargers?: number;
  currentBillingContactId?: string | null;
  currentIsDemo?: boolean;
  isTierChange?: boolean;
  onChangeTier: () => void;
  onSuccess: () => void;
}) {
  const { data: contacts = [] } = useContacts(account.id);
  const createContact = useCreateContact();

  // Load existing charger lines for this account (used when changing tier)
  const { data: existingLines = [] } = useQuery({
    queryKey: ["membership_charger_lines", account.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_charger_lines")
        .select("*")
        .eq("account_id", account.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: open,
  });

  const [lines, setLines] = useState<ChargerLine[]>([]);
  const [discountReason, setDiscountReason] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual_prepay">(
    "monthly"
  );
  const [contactId, setContactId] = useState<string>(currentBillingContactId || "");
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [isDemo, setIsDemo] = useState<boolean>(!!currentIsDemo);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [confirmDowngradeOpen, setConfirmDowngradeOpen] = useState(false);

  // Build initial lines whenever modal opens or tier changes
  useEffect(() => {
    if (!open || !tier) return;
    setContactId(currentBillingContactId || "");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setIsDemo(!!currentIsDemo);
    setDiscountReason("");
    setBillingCycle("monthly");

    if (existingLines.length > 0) {
      // Recalc tier rates against the (possibly new) tier; preserve negotiated.
      setLines(
        existingLines.map((l) => {
          const lt = l.charger_type as ChargerLineType;
          return {
            id: l.id,
            charger_type: lt,
            connector_count: Number(l.connector_count) || 1,
            tier_rate_per_connector: tierRateForLineType(tier, lt),
            negotiated_rate_per_connector:
              Number(l.negotiated_rate_per_connector) || tierRateForLineType(tier, lt),
            notes: l.notes || "",
          };
        })
      );
    } else {
      const defaultType: ChargerLineType = "ac_level_2";
      setLines([
        {
          id: crypto.randomUUID(),
          charger_type: defaultType,
          connector_count: currentChargers || 1,
          tier_rate_per_connector: tierRateForLineType(tier, defaultType),
          negotiated_rate_per_connector: tierRateForLineType(tier, defaultType),
          notes: "",
        },
      ]);
    }
  }, [open, tier, existingLines, currentBillingContactId, currentIsDemo, currentChargers]);

  const totalConnectors = lines.reduce((s, l) => s + (Number(l.connector_count) || 0), 0);
  const listMonthly = lines.reduce(
    (s, l) => s + (Number(l.tier_rate_per_connector) || 0) * (Number(l.connector_count) || 0),
    0
  );
  const negotiatedMonthly = lines.reduce(
    (s, l) => s + (Number(l.negotiated_rate_per_connector) || 0) * (Number(l.connector_count) || 0),
    0
  );
  const discountAmount = Math.max(0, listMonthly - negotiatedMonthly);
  const discountPct = listMonthly > 0 ? (discountAmount / listMonthly) * 100 : 0;
  const needsDiscountReason = lines.some(
    (l) => Number(l.negotiated_rate_per_connector) < Number(l.tier_rate_per_connector)
  ) || negotiatedMonthly < listMonthly;
  const isLargeDiscount = discountPct > 50;

  const annualPrepayAmount =
    billingCycle === "annual_prepay" ? negotiatedMonthly * 11 : null;
  const annualSavings =
    billingCycle === "annual_prepay" ? negotiatedMonthly : null;
  const effectiveMonthlyOnAnnual =
    billingCycle === "annual_prepay" ? (negotiatedMonthly * 11) / 12 : null;

  const today = new Date().toISOString().slice(0, 10);
  const validDate = effectiveDate >= today;
  const linesValid =
    lines.length > 0 &&
    lines.every(
      (l) =>
        !!l.charger_type &&
        Number(l.connector_count) >= 1 &&
        Number(l.negotiated_rate_per_connector) >= 0
    );
  const valid =
    !!tier &&
    linesValid &&
    !!contactId &&
    validDate &&
    (!needsDiscountReason || discountReason.trim().length >= 10);

  const updateLine = (id: string, patch: Partial<ChargerLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };
  const removeLine = (id: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  };
  const addLine = () => {
    if (!tier) return;
    const used = new Set(lines.map((l) => l.charger_type));
    const next = CHARGER_LINE_TYPES.find((t) => !used.has(t)) || "ac_level_2";
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        charger_type: next,
        connector_count: 1,
        tier_rate_per_connector: tierRateForLineType(tier, next),
        negotiated_rate_per_connector: tierRateForLineType(tier, next),
        notes: "",
      },
    ]);
  };

  const tierOrder: CoreTierName[] = ["essential", "priority", "elite"];
  const isDowngrade =
    !!currentTier &&
    !!tier &&
    tierOrder.indexOf(tier) < tierOrder.indexOf(currentTier);

  const enroll = useMutation({
    mutationFn: async () => {
      if (!tier) throw new Error("No tier selected");
      const status = isDemo ? "demo" : "active";
      const action = !currentTier
        ? "enrolled"
        : tier === currentTier
        ? "tier_changed"
        : tierOrder.indexOf(tier) > tierOrder.indexOf(currentTier)
        ? "upgraded"
        : "downgraded";

      const annualPeriodEnd =
        billingCycle === "annual_prepay"
          ? (() => {
              const d = new Date(effectiveDate);
              d.setFullYear(d.getFullYear() + 1);
              return d.toISOString();
            })()
          : null;

      const { error: upErr } = await supabase
        .from("customers")
        .update({
          membership_tier: tier,
          membership_status: status,
          enrolled_at: new Date(effectiveDate).toISOString(),
          chargers_enrolled_count: totalConnectors,
          monthly_revenue: negotiatedMonthly,
          list_monthly_revenue: listMonthly,
          negotiated_monthly_revenue: negotiatedMonthly,
          discount_amount: discountAmount,
          discount_pct: discountPct,
          discount_reason: needsDiscountReason ? discountReason : null,
          billing_cycle: billingCycle,
          annual_prepay_amount: annualPrepayAmount,
          annual_savings: annualSavings,
          annual_period_end: annualPeriodEnd,
          billing_contact_id: contactId,
          is_demo_membership: isDemo,
          membership_notes: notes || null,
        } as any)
        .eq("id", account.id);
      if (upErr) throw upErr;

      // Replace charger lines: delete existing, insert current.
      const { error: delErr } = await supabase
        .from("membership_charger_lines")
        .delete()
        .eq("account_id", account.id);
      if (delErr) throw delErr;
      const insertRows = lines.map((l, idx) => ({
        account_id: account.id,
        charger_type: l.charger_type,
        connector_count: Number(l.connector_count) || 1,
        tier_rate_per_connector: Number(l.tier_rate_per_connector) || 0,
        negotiated_rate_per_connector: Number(l.negotiated_rate_per_connector) || 0,
        notes: l.notes || null,
        sort_order: idx,
      }));
      if (insertRows.length) {
        const { error: insErr } = await supabase
          .from("membership_charger_lines")
          .insert(insertRows as any);
        if (insErr) throw insErr;
      }

      const { data: userRes } = await supabase.auth.getUser();
      const { error: hErr } = await supabase
        .from("membership_enrollment_history")
        .insert({
          account_id: account.id,
          tier,
          action,
          reason: notes || null,
          chargers_count: totalConnectors,
          monthly_revenue: negotiatedMonthly,
          list_monthly_revenue: listMonthly,
          negotiated_monthly_revenue: negotiatedMonthly,
          discount_pct: discountPct,
          discount_reason: needsDiscountReason ? discountReason : null,
          billing_cycle: billingCycle,
          annual_prepay_amount: annualPrepayAmount,
          annual_period_end: annualPeriodEnd,
          is_demo: isDemo,
          user_id: userRes?.user?.id || null,
        } as any);
      if (hErr) throw hErr;
    },
    onSuccess: () => {
      if (isDemo && billingCycle === "annual_prepay") {
        toast.warning(
          "Demo enrollments on annual prepay are unusual. Confirm this is intentional."
        );
      }
      toast.success(
        currentTier ? "Membership updated" : `${account.company} enrolled in NOCH+`
      );
      onSuccess();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Enrollment failed"),
  });

  const handleConfirm = () => {
    if (isDowngrade && !confirmDowngradeOpen) {
      setConfirmDowngradeOpen(true);
      return;
    }
    enroll.mutate();
  };

  if (contacts.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a billing contact first</DialogTitle>
            <DialogDescription>
              {account.company} has no contacts yet. Add a billing contact before
              enrolling.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => setContactModalOpen(true)}>Add contact</Button>
          </DialogFooter>
          <ContactFormModal
            open={contactModalOpen}
            onOpenChange={setContactModalOpen}
            customerId={account.id}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-0 flex flex-col max-h-[90vh] gap-0 sm:max-w-lg max-sm:max-w-[100vw] max-sm:max-h-[100vh] max-sm:h-[100vh] max-sm:rounded-none">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle>
              {isTierChange ? "Change tier for " : "Enroll "} {account.company}
              {tier && ` — ${TIER_LABELS[tier]}`}
            </DialogTitle>
            <DialogDescription>
              {isTierChange
                ? "Update the tier and charger count for this membership."
                : "Confirm enrollment details below."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto px-6 py-4 flex-1 min-h-0">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Tier:</span>{" "}
                <span className="font-medium">
                  {tier ? TIER_LABELS[tier] : "—"}
                </span>
              </div>
              <button
                type="button"
                onClick={onChangeTier}
                className="text-xs text-primary hover:underline"
              >
                Change tier
              </button>
            </div>

            {/* Charger configuration */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold">Charger configuration</h3>
                <p className="text-[11px] text-muted-foreground">
                  Add a line for each charger type in this account.
                </p>
              </div>
              <div className="space-y-3">
                {lines.map((line) => {
                  const lineList =
                    Number(line.tier_rate_per_connector) * Number(line.connector_count);
                  const lineNeg =
                    Number(line.negotiated_rate_per_connector) *
                    Number(line.connector_count);
                  const lineDiscount = lineList - lineNeg;
                  const linePct = lineList > 0 ? (Math.abs(lineDiscount) / lineList) * 100 : 0;
                  return (
                    <div
                      key={line.id}
                      className="relative rounded-md border border-border p-3 space-y-2"
                    >
                      <button
                        type="button"
                        disabled={lines.length <= 1}
                        onClick={() => removeLine(line.id)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Remove line"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </button>

                      <div className="grid grid-cols-12 gap-2 pr-6">
                        <div className="col-span-5 space-y-1">
                          <Label className="text-[10px] uppercase tracking-wide">
                            Type
                          </Label>
                          <Select
                            value={line.charger_type}
                            onValueChange={(v) => {
                              const t = v as ChargerLineType;
                              const newTierRate = tier ? tierRateForLineType(tier, t) : 0;
                              updateLine(line.id, {
                                charger_type: t,
                                tier_rate_per_connector: newTierRate,
                                negotiated_rate_per_connector: newTierRate,
                              });
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHARGER_LINE_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {CHARGER_LINE_LABELS[t]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 space-y-1">
                          <Label className="text-[10px] uppercase tracking-wide">
                            Connectors
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            className="h-9"
                            value={line.connector_count}
                            onChange={(e) =>
                              updateLine(line.id, {
                                connector_count: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                          />
                        </div>
                        <div className="col-span-4 space-y-1">
                          <Label className="text-[10px] uppercase tracking-wide">
                            $ / connector
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="pl-6 h-9"
                              value={line.negotiated_rate_per_connector}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  negotiated_rate_per_connector: Math.max(
                                    0,
                                    Number(e.target.value) || 0
                                  ),
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap pr-6">
                        <p className="text-[10px] text-muted-foreground">
                          List ${Number(line.tier_rate_per_connector).toFixed(2)} ·{" "}
                          {tier ? TIER_LABELS[tier] : "—"} ·{" "}
                          {CHARGER_LINE_LABELS[line.charger_type]}
                        </p>
                        <div className="flex items-center gap-2">
                          {lineDiscount > 0 ? (
                            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                              -{linePct.toFixed(1)}% discount
                            </Badge>
                          ) : lineDiscount < 0 ? (
                            <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">
                              +{linePct.toFixed(1)}% premium
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Standard
                            </Badge>
                          )}
                          <span className="text-sm font-bold">
                            {formatCurrency(lineNeg)}/mo
                          </span>
                        </div>
                      </div>

                      <Textarea
                        rows={1}
                        value={line.notes}
                        onChange={(e) => updateLine(line.id, { notes: e.target.value })}
                        placeholder="Line notes (optional)"
                        className="text-xs"
                      />
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add charger line
              </Button>

              {/* Totals summary */}
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total connectors</span>
                  <span className="font-bold">{totalConnectors}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">List monthly</span>
                  <span
                    className={
                      discountAmount > 0
                        ? "line-through text-muted-foreground"
                        : "font-bold"
                    }
                  >
                    {formatCurrency(listMonthly)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Negotiated monthly</span>
                  <div className="flex items-center gap-2">
                    {discountAmount > 0 && (
                      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                        -{discountPct.toFixed(1)}%
                      </Badge>
                    )}
                    <span className="font-bold text-base">
                      {formatCurrency(negotiatedMonthly)}
                    </span>
                  </div>
                </div>
                {isLargeDiscount && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400 mt-2">
                    Significant discount ({discountPct.toFixed(1)}%). Confirm before proceeding.
                  </div>
                )}
              </div>
            </div>

            {needsDiscountReason && (
              <div className="space-y-1.5">
                <Label className="text-xs">Discount reason * (10+ chars)</Label>
                <Textarea
                  rows={2}
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="Why is this account receiving a discount?"
                />
                <p className="text-[11px] text-muted-foreground">
                  {discountReason.trim().length}/10
                </p>
              </div>
            )}

            {/* Billing cycle */}
            <div className="space-y-2">
              <Label className="text-xs">Billing cycle</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                    billingCycle === "monthly"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <p className="font-medium">Monthly</p>
                  <p className="text-[11px] text-muted-foreground">
                    Billed every month
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("annual_prepay")}
                  className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                    billingCycle === "annual_prepay"
                      ? "border-optimal bg-optimal/10"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <p className="font-medium">Pay annually</p>
                  <p className="text-[11px] text-muted-foreground">1 month free</p>
                </button>
              </div>
              {billingCycle === "annual_prepay" && annualPrepayAmount !== null && (
                <div className="rounded-md border border-optimal/30 bg-optimal/10 px-3 py-2 text-xs space-y-0.5">
                  <p>
                    Annual prepay:{" "}
                    <span className="font-bold">
                      {formatCurrency(annualPrepayAmount)}
                    </span>
                  </p>
                  <p>
                    Savings:{" "}
                    <span className="font-bold">
                      {formatCurrency(annualSavings || 0)}
                    </span>{" "}
                    (1 month free)
                  </p>
                  <p>
                    Effective monthly rate:{" "}
                    <span className="font-bold">
                      {formatCurrency(effectiveMonthlyOnAnnual || 0)}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Billing contact *</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.email ? `· ${c.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="text-xs text-primary hover:underline"
              >
                + Add new contact
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Effective date *</Label>
              <Input
                type="date"
                min={today}
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
              {!validDate && (
                <p className="text-[11px] text-destructive">
                  Date cannot be in the past.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes / special terms</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={isDemo}
                onCheckedChange={(c) => setIsDemo(!!c)}
                className="mt-0.5"
              />
              <span>
                This is a demo enrollment, do not count in revenue metrics.
              </span>
            </label>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border shrink-0 bg-background">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!valid || enroll.isPending} onClick={handleConfirm}>
              {enroll.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isTierChange ? "Save changes" : "Confirm Enrollment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDowngradeOpen} onOpenChange={setConfirmDowngradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm tier downgrade</DialogTitle>
            <DialogDescription>
              Downgrading from{" "}
              <strong>{currentTier && TIER_LABELS[currentTier]}</strong> to{" "}
              <strong>{tier && TIER_LABELS[tier]}</strong> will reduce monthly revenue
              from <strong>{formatCurrency(listMonthly)}</strong>{" "}
              to <strong>{formatCurrency(negotiatedMonthly)}</strong>. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDowngradeOpen(false)}>
              Back
            </Button>
            <Button
              onClick={() => {
                setConfirmDowngradeOpen(false);
                enroll.mutate();
              }}
            >
              Yes, downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContactFormModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        customerId={account.id}
      />
    </>
  );
}

/* ---------------- Reason (Pause / Cancel) Modal ---------------- */

function ReasonModal({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  destructive,
  doubleConfirm,
  accountId,
  action,
  newStatus,
  tier,
  chargers,
  monthlyRevenue,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  destructive?: boolean;
  doubleConfirm?: boolean;
  accountId: string;
  action: "paused" | "cancelled";
  newStatus: "paused" | "cancelled";
  tier: string | null;
  chargers: number;
  monthlyRevenue: number;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setConfirmStep(false);
    }
  }, [open]);

  const valid = reason.trim().length >= 10;

  const mutation = useMutation({
    mutationFn: async () => {
      const updates: any = { membership_status: newStatus };
      if (newStatus === "cancelled") {
        updates.monthly_revenue = 0;
      } else if (newStatus === "paused") {
        updates.monthly_revenue = 0;
      }
      const { error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", accountId);
      if (error) throw error;

      const { data: userRes } = await supabase.auth.getUser();
      await supabase.from("membership_enrollment_history").insert({
        account_id: accountId,
        tier,
        action,
        reason,
        chargers_count: chargers,
        monthly_revenue: monthlyRevenue,
        user_id: userRes?.user?.id || null,
      } as any);
    },
    onSuccess: () => {
      toast.success(`${actionLabel} complete`);
      onSuccess();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Action failed"),
  });

  const handleClick = () => {
    if (doubleConfirm && !confirmStep) {
      setConfirmStep(true);
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs">Reason (10+ characters) *</Label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you taking this action?"
          />
          <p className="text-[11px] text-muted-foreground">
            {reason.trim().length}/10
          </p>
          {confirmStep && (
            <p className="text-xs text-destructive font-medium">
              Click {actionLabel} again to confirm.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={!valid || mutation.isPending}
            onClick={handleClick}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmStep ? `Confirm ${actionLabel}` : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
