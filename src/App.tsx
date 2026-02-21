import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import AssessmentTracker from "./pages/AssessmentTracker";
import Dataset from "./pages/Dataset";
import Estimates from "./pages/Estimates";
import Schedule from "./pages/Schedule";
import NotFound from "./pages/NotFound";
import EstimateStatus from "./pages/EstimateStatus";
import ProtectedRoute from "./components/ProtectedRoute";
import MainPlatformLayout from "./layouts/MainPlatformLayout";

// Placeholder pages for new sections
import ServiceTickets from "./pages/placeholders/ServiceTickets";
import Customers from "./pages/placeholders/Customers";
import AllChargers from "./pages/placeholders/AllChargers";
import NochPlusDashboard from "./pages/placeholders/NochPlusDashboard";
import NochPlusChargers from "./pages/placeholders/NochPlusChargers";
import FieldReports from "./pages/placeholders/FieldReports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><MainPlatformLayout /></ProtectedRoute>}>
            {/* Campaigns section (uses existing pages) */}
            <Route path="/" element={<Index />} />
            <Route path="/dataset" element={<Dataset />} />
            <Route path="/tickets" element={<AssessmentTracker />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/campaigns/reports" element={<FieldReports />} />

            {/* Service Desk section */}
            <Route path="/service-desk/tickets" element={<ServiceTickets />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/service-desk/customers" element={<Customers />} />
            <Route path="/service-desk/chargers" element={<AllChargers />} />

            {/* Noch+ Program section */}
            <Route path="/noch-plus/dashboard" element={<NochPlusDashboard />} />
            <Route path="/noch-plus/chargers" element={<NochPlusChargers />} />

            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* Legacy redirects */}
          <Route path="/missioncontrol" element={<ProtectedRoute><AssessmentTracker /></ProtectedRoute>} />
          <Route path="/estimate-status" element={<EstimateStatus />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
