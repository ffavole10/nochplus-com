import { useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PlatformSidebar } from "@/components/PlatformSidebar";
import { PlatformHeader } from "@/components/PlatformHeader";
import { FilterProvider } from "@/contexts/FilterContext";
import { CampaignProvider } from "@/contexts/CampaignContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SectionAccessGuard } from "@/components/SectionAccessGuard";
import { TechnicianGate } from "@/components/TechnicianGate";
import { useActivityTracking } from "@/hooks/useActivityTracking";

function ActivityTracker() {
  useActivityTracking();
  return null;
}

export default function MainPlatformLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <FilterProvider>
      <CampaignProvider>
        <ActivityTracker />
        <TechnicianGate>
          <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <div className="min-h-screen flex w-full bg-background">
              <PlatformSidebar />
              <div className="flex-1 flex flex-col min-h-screen overflow-auto">
                <PlatformHeader />
                <main className="flex-1">
                  <ErrorBoundary>
                    <SectionAccessGuard>
                      <Outlet />
                    </SectionAccessGuard>
                  </ErrorBoundary>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </TechnicianGate>
      </CampaignProvider>
    </FilterProvider>
  );
}
