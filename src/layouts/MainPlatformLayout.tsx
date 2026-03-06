import { useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PlatformSidebar } from "@/components/PlatformSidebar";
import { PlatformHeader } from "@/components/PlatformHeader";
import { FilterProvider } from "@/contexts/FilterContext";
import { CampaignProvider } from "@/contexts/CampaignContext";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function MainPlatformLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <FilterProvider>
      <CampaignProvider>
        <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <div className="min-h-screen flex w-full bg-background">
            <PlatformSidebar />
            <div className="flex-1 flex flex-col min-h-screen overflow-auto">
              <PlatformHeader />
              <main className="flex-1">
                <Outlet />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </CampaignProvider>
    </FilterProvider>
  );
}
