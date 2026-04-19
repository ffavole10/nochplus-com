import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import IssuesQueue from "./pages/IssuesQueue";
import Dataset from "./pages/Dataset";
import Estimates from "./pages/Estimates";
import Schedule from "./pages/Schedule";
import FieldReports from "./pages/FieldReports";
import NotFound from "./pages/NotFound";
import EstimateStatus from "./pages/EstimateStatus";
import SubmitAssessment from "./pages/public/SubmitAssessment";
import SubmissionConfirmation from "./pages/public/SubmissionConfirmation";
import TrackSubmission from "./pages/public/TrackSubmission";
import ProtectedRoute from "./components/ProtectedRoute";
import { SectionAccessGuard } from "./components/SectionAccessGuard";
import MainPlatformLayout from "./layouts/MainPlatformLayout";

// Placeholder pages for new sections
import ServiceTickets from "./pages/placeholders/ServiceTickets";
import Submissions from "./pages/Submissions";
import Customers from "./pages/placeholders/Customers";

import NochPlusDashboard from "./pages/placeholders/NochPlusDashboard";
import NochPlusChargers from "./pages/placeholders/NochPlusChargers";
import NochPlusMembers from "./pages/placeholders/NochPlusMembers";
import NochPlusAssessments from "./pages/placeholders/NochPlusAssessments";
import NochPlusMonitoring from "./pages/NochPlusMonitoring";
import AIAgent from "./pages/placeholders/AIAgent";
import DeepLearning from "./pages/placeholders/DeepLearning";
import AutoHealConfig from "./pages/placeholders/AutoHealConfig";
import Performance from "./pages/placeholders/Performance";
import SWILibrary from "./pages/SWILibrary";
import Locations from "./pages/placeholders/Locations";
import Parts from "./pages/placeholders/Parts";
import PartsCatalog from "./pages/PartsCatalog";
import Partners from "./pages/Partners";
import PartnerProfile from "./pages/PartnerProfile";
import PartnershipHub from "./pages/PartnershipHub";

// Campaign pages — new tab structure
import CampaignList from "./pages/campaigns/CampaignList";
import CampaignOverview from "./pages/campaigns/CampaignOverview";
import CampaignChargers from "./pages/campaigns/CampaignChargers";
import CampaignSchedule from "./pages/campaigns/CampaignSchedule";
import CampaignCost from "./pages/campaigns/CampaignCost";
import CampaignReports from "./pages/campaigns/CampaignReports";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Clear session on browser close if "Remember Me" was unchecked
function SessionCleanup() {
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const remember = localStorage.getItem("nochplus-remember-me");
        if (remember === "false") {
          // Sign out will clear storage on next load; we remove the token now
          const keys = Object.keys(localStorage).filter(k => k.startsWith("sb-"));
          keys.forEach(k => localStorage.removeItem(k));
        }
      } catch {}
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionCleanup />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<ProtectedRoute><MainPlatformLayout /></ProtectedRoute>}>
            {/* Campaign HQ and tab routes */}
            <Route path="/campaigns" element={<CampaignList />} />
            <Route path="/campaigns/:campaignId/overview" element={<CampaignOverview />} />
            <Route path="/campaigns/:campaignId/chargers" element={<CampaignChargers />} />
            <Route path="/campaigns/:campaignId/schedule" element={<CampaignSchedule />} />
            <Route path="/campaigns/:campaignId/cost" element={<CampaignCost />} />
            <Route path="/campaigns/:campaignId/reports" element={<CampaignReports />} />

            {/* Legacy stage redirects → new tabs */}
            <Route path="/campaigns/:campaignId/upload" element={<Navigate to="../chargers" replace />} />
            <Route path="/campaigns/:campaignId/scan" element={<Navigate to="../chargers" replace />} />
            <Route path="/campaigns/:campaignId/deploy" element={<Navigate to="../schedule" replace />} />
            <Route path="/campaigns/:campaignId/price" element={<Navigate to="../cost" replace />} />
            <Route path="/campaigns/:campaignId/launch" element={<Navigate to="../reports" replace />} />

            {/* Legacy campaign routes */}
            <Route path="/dashboard" element={<Index />} />
            <Route path="/dataset" element={<Dataset />} />
            <Route path="/issues" element={<IssuesQueue />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/field-reports" element={<FieldReports />} />

            {/* Service Desk section */}
            <Route path="/service-desk/tickets" element={<ServiceTickets />} />
            <Route path="/noch-plus/submissions" element={<Submissions />} />
            <Route path="/service-desk/estimates" element={<Estimates />} />
            <Route path="/service-desk/customers" element={<Customers />} />

            {/* Noch+ section */}
            <Route path="/noch-plus/dashboard" element={<NochPlusDashboard />} />
            <Route path="/noch-plus/members" element={<NochPlusMembers />} />
            <Route path="/noch-plus/chargers" element={<NochPlusChargers />} />
            <Route path="/noch-plus/assessments" element={<NochPlusAssessments />} />
            <Route path="/noch-plus/monitoring" element={<NochPlusMonitoring />} />
            <Route path="/noch-plus/partnership-hub" element={<PartnershipHub />} />

            {/* Partners section */}
            <Route path="/partners" element={<Partners />} />
            <Route path="/partners/:partnerId" element={<PartnerProfile />} />

            {/* AutoHeal section */}
            <Route path="/autoheal/ai-agent" element={<AIAgent />} />
            <Route path="/autoheal/deep-learning" element={<DeepLearning />} />
            <Route path="/autoheal/configuration" element={<AutoHealConfig />} />
            <Route path="/autoheal/performance" element={<Performance />} />
            <Route path="/autoheal/swi-library" element={<SWILibrary />} />
            <Route path="/autoheal/parts" element={<Parts />} />
            <Route path="/autoheal/parts-catalog" element={<PartsCatalog />} />
            <Route path="/autoheal/locations" element={<Locations />} />

            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Legacy redirects */}
          <Route path="/tickets" element={<Navigate to="/issues" replace />} />
          <Route path="/campaigns/reports" element={<Navigate to="/field-reports" replace />} />
          <Route path="/estimates" element={<Navigate to="/service-desk/estimates" replace />} />
          <Route path="/missioncontrol" element={<Navigate to="/issues" replace />} />
          <Route path="/estimate-status" element={<EstimateStatus />} />
          {/* Public Noch+ submission pages — "/" is the main landing */}
          <Route path="/" element={<SubmitAssessment />} />
          <Route path="/submit" element={<SubmitAssessment />} />
          <Route path="/submit/confirmation/:submissionId" element={<SubmissionConfirmation />} />
          <Route path="/track" element={<TrackSubmission />} />
          <Route path="/track/:submissionId" element={<TrackSubmission />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
