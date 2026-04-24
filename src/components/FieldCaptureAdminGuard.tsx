import { Navigate } from "react-router-dom";
import { useFieldCaptureRole } from "@/hooks/useFieldCaptureRole";

/** Restricts a route to admin-level Field Capture users only. */
export function FieldCaptureAdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, isFieldAdmin } = useFieldCaptureRole();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!isFieldAdmin) return <Navigate to="/field-capture" replace />;
  return <>{children}</>;
}
