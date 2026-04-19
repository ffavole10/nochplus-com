import { useLocation } from "react-router-dom";
import { useSectionAccess, pathToSection, SECTION_LABELS } from "@/hooks/useSectionAccess";
import { ShieldAlert } from "lucide-react";

/**
 * Wraps protected routes and blocks rendering if the current user
 * doesn't have access to the section that owns the current pathname.
 */
export function SectionAccessGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { canAccess, loading } = useSectionAccess();
  const section = pathToSection(location.pathname);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!canAccess(section)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            You don't have access to {section ? SECTION_LABELS[section] : "this section"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Contact your admin to request access to this part of the platform.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
