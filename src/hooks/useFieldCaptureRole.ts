import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type FieldRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "account_manager"
  | "billing"
  | "technician"
  | "employee"
  | "customer"
  | "partner";

const ADMIN_ROLES: FieldRole[] = [
  "super_admin",
  "admin",
  "manager",
  "account_manager",
];

/**
 * Returns ALL roles for the current user (a user may hold multiple).
 * Used to drive Field Capture access and the technician redirect.
 */
export function useFieldCaptureRole() {
  const { session, loading: sessionLoading } = useAuth();
  const [roles, setRoles] = useState<FieldRole[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (sessionLoading) return;
    if (!session?.user?.id) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles(((data || []).map((r) => r.role) as FieldRole[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, sessionLoading]);

  const isTechnician = !!roles?.includes("technician");
  const isFieldAdmin = !!roles?.some((r) => ADMIN_ROLES.includes(r));
  // A user is treated as "technician-only" if they have the technician role
  // and NO admin-level role. Such users are redirected to /field-capture.
  const isTechnicianOnly = isTechnician && !isFieldAdmin;

  return {
    roles: roles ?? [],
    loading: loading || sessionLoading,
    isTechnician,
    isFieldAdmin,
    isTechnicianOnly,
  };
}
