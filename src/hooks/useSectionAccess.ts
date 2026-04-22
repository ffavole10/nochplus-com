import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

export type SectionKey = "campaigns" | "service_desk" | "noch_plus" | "partners" | "autoheal" | "growth";

export const SECTION_KEYS: SectionKey[] = [
  "campaigns",
  "service_desk",
  "noch_plus",
  "partners",
  "autoheal",
  "growth",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  campaigns: "Campaigns",
  service_desk: "Service Desk",
  noch_plus: "NOCH+",
  partners: "Partners",
  autoheal: "AutoHeal",
  growth: "Growth",
};

/** Maps a URL path to the SectionKey it belongs to (or null for global pages). */
export function pathToSection(pathname: string): SectionKey | null {
  if (pathname.startsWith("/growth")) return "growth";
  if (pathname.startsWith("/campaigns") || pathname === "/dashboard" ||
      pathname === "/dataset" || pathname === "/issues" ||
      pathname === "/schedule" || pathname === "/field-reports") return "campaigns";
  if (pathname.startsWith("/service-desk")) return "service_desk";
  if (pathname.startsWith("/noch-plus")) return "noch_plus";
  if (pathname.startsWith("/partners")) return "partners";
  if (pathname.startsWith("/autoheal")) return "autoheal";
  return null;
}

/** Returns the current user's section access map (super_admins always get full access). */
export function useSectionAccess() {
  const { session } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const [access, setAccess] = useState<Record<SectionKey, boolean> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    const isSuper = hasRole("super_admin");
    if (isSuper) {
      const all = SECTION_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<SectionKey, boolean>);
      setAccess(all);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_section_access")
      .select("section_key, has_access")
      .eq("user_id", session.user.id);

    const map = SECTION_KEYS.reduce((acc, k) => ({ ...acc, [k]: false }), {} as Record<SectionKey, boolean>);
    for (const row of data || []) {
      if (SECTION_KEYS.includes(row.section_key as SectionKey)) {
        map[row.section_key as SectionKey] = !!row.has_access;
      }
    }
    setAccess(map);
    setLoading(false);
  }, [session?.user?.id, hasRole]);

  useEffect(() => {
    if (!roleLoading) load();
  }, [load, roleLoading]);

  const canAccess = useCallback(
    (section: SectionKey | null) => {
      if (!section) return true; // global pages always accessible
      if (!access) return false;
      return access[section] === true;
    },
    [access],
  );

  return { access, loading: loading || roleLoading, canAccess, refetch: load };
}
