import { useState, useMemo } from "react";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers } from "@/hooks/useCustomers";
import { useAllStrategies } from "@/hooks/useStrategy";
import { computeStrategyHealth } from "@/types/strategy";
import { Focus5ManagerModal, type Focus5ManagerEntry } from "./Focus5ManagerModal";

interface Props {
  customerId?: string | null;
}

/**
 * Gold ribbon shown above account/deal headers when the linked customer
 * is currently part of Focus 5. Renders nothing otherwise.
 */
export function FocusRibbon({ customerId }: Props) {
  const [managerOpen, setManagerOpen] = useState(false);
  const { data: customers = [] } = useCustomers();
  const { data: strategies = [] } = useAllStrategies();

  const sb = supabase as any;
  const { data: kpis = [] } = useQuery({
    queryKey: ["all-strategy-kpis"],
    queryFn: async () => {
      const { data } = await sb.from("strategy_kpis").select("*");
      return data || [];
    },
  });
  const { data: plays = [] } = useQuery({
    queryKey: ["all-strategy-plays"],
    queryFn: async () => {
      const { data } = await sb.from("strategy_plays").select("*");
      return data || [];
    },
  });

  const strategy = useMemo(
    () => strategies.find((s) => s.customer_id === customerId),
    [strategies, customerId]
  );

  const entries: Focus5ManagerEntry[] = useMemo(() => {
    return strategies
      .map((s) => {
        const customer = customers.find((c) => c.id === s.customer_id);
        if (!customer) return null;
        const sKpis = kpis.filter((k: any) => k.strategy_id === s.id);
        const sPlays = plays.filter((p: any) => p.strategy_id === s.id);
        const health = computeStrategyHealth(s, sKpis, sPlays);
        return {
          strategy: s,
          customer: { id: customer.id, company: customer.company, logo_url: customer.logo_url },
          health,
        };
      })
      .filter(Boolean) as Focus5ManagerEntry[];
  }, [strategies, customers, kpis, plays]);

  if (!strategy?.is_focus) return null;

  return (
    <>
      <div
        className="w-full bg-amber-100/80 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2 flex items-center gap-3 text-xs"
        data-tour="focus-ribbon"
      >
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-700 dark:text-amber-300 shrink-0" />
        <span className="font-semibold text-amber-900 dark:text-amber-200 tracking-wide uppercase shrink-0">
          Focus 5
        </span>
        <span className="text-amber-700/60 dark:text-amber-400/60">·</span>
        <span className="text-amber-900 dark:text-amber-200 shrink-0">
          {(strategy.focus_quarter || "").replace("-", " ")}
        </span>
        {strategy.focus_reason && (
          <>
            <span className="text-amber-700/60 dark:text-amber-400/60">·</span>
            <span className="text-amber-800 dark:text-amber-200/90 truncate italic">
              {strategy.focus_reason}
            </span>
          </>
        )}
        <button
          type="button"
          className="ml-auto text-amber-800 dark:text-amber-200 hover:text-amber-900 hover:underline shrink-0 font-medium"
          onClick={() => setManagerOpen(true)}
        >
          Edit Focus →
        </button>
      </div>

      <Focus5ManagerModal open={managerOpen} onOpenChange={setManagerOpen} entries={entries} />
    </>
  );
}
