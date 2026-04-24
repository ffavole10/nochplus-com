import { Navigate, useLocation } from "react-router-dom";
import { useFieldCaptureRole } from "@/hooks/useFieldCaptureRole";

/**
 * Wraps the main platform shell. If the signed-in user is technician-only
 * (no admin-level role), force them to /field-capture and block access to
 * the rest of the platform (dashboard, campaigns, service desk, etc.).
 */
export function TechnicianGate({ children }: { children: React.ReactNode }) {
  const { loading, isTechnicianOnly } = useFieldCaptureRole();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isTechnicianOnly && !location.pathname.startsWith("/field-capture")) {
    return <Navigate to="/field-capture" replace />;
  }

  return <>{children}</>;
}
