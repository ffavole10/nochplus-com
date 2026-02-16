import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PlatformSidebar } from "@/components/PlatformSidebar";
import { PlatformHeader } from "@/components/PlatformHeader";
import { FilterProvider } from "@/contexts/FilterContext";

export default function MainPlatformLayout() {
  return (
    <FilterProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <PlatformSidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            <PlatformHeader />
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </FilterProvider>
  );
}
