import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUserRole() {
  const { session } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => {
        setRole(data?.role || null);
        setLoading(false);
      });
  }, [session?.user?.id]);

  const hasRole = (...roles: string[]) => role !== null && roles.includes(role);

  return { role, loading, hasRole };
}
