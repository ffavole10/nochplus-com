import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "account_manager"
  | "billing"
  | "technician"
  | "employee"
  | "customer"
  | "partner";

const ADMIN_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "manager",
  "account_manager",
  "billing",
  "employee",
];

export interface RoleInfo {
  roles: AppRole[];
  isTechnician: boolean;
  isAdmin: boolean;
  isTechnicianOnly: boolean;
}

export async function fetchRoleInfo(userId: string): Promise<RoleInfo> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = ((data || []).map((r) => r.role) as AppRole[]) ?? [];
  const isTechnician = roles.includes("technician");
  const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r));
  return {
    roles,
    isTechnician,
    isAdmin,
    isTechnicianOnly: isTechnician && !isAdmin,
  };
}

/** Where a user should land after authenticating. */
export function postLoginPath(info: RoleInfo): string {
  if (info.isTechnicianOnly) return "/field-capture";
  return "/dashboard";
}
