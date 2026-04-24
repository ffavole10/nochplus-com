import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Login from "./pages/Login";
import FieldLogin from "./pages/FieldLogin";
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
import PublicReport from "./pages/public/PublicReport";
import ProtectedRoute from "./components/ProtectedRoute";
import { SectionAccessGuard } from "./components/SectionAccessGuard";
import MainPlatformLayout from "./layouts/MainPlatformLayout";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

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

// Growth module
import GrowthAccounts from "./pages/growth/GrowthAccounts";
import GrowthPipeline from "./pages/growth/GrowthPipeline";
import GrowthDealDetail from "./pages/growth/GrowthDealDetail";

// Field Capture
import FieldCaptureLayout from "./layouts/FieldCaptureLayout";
import FieldCaptureJobs from "./pages/field-capture/FieldCaptureJobs";
import FieldCaptureHistory from "./pages/field-capture/FieldCaptureHistory";
import FieldCaptureProfile from "./pages/field-capture/FieldCaptureProfile";
import FieldCaptureJobDetail from "./pages/field-capture/FieldCaptureJobDetail";
import FieldCaptureChargerCapture from "./pages/field-capture/FieldCaptureChargerCapture";
import FieldCaptureWrapUp from "./pages/field-capture/FieldCaptureWrapUp";
import FieldCaptureSubmitted from "./pages/field-capture/FieldCaptureSubmitted";
import CreateTestJob from "./pages/field-capture/admin/CreateTestJob";
import AllWorkOrders from "./pages/field-capture/admin/AllWorkOrders";
import WorkTemplates from "./pages/field-capture/admin/WorkTemplates";
import TeamPerformance from "./pages/field-capture/admin/TeamPerformance";
import { FieldCaptureAdminGuard } from "./components/FieldCaptureAdminGuard";

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

// When the app is launched as an installed PWA (standalone display mode)
// and the user is not yet on a /field* route or admin route, send them to
// the technician login. Customers use a regular browser; the PWA is for techs.
function PWAStandaloneRedirect() {
  useEffect(() => {
    try {
      const isStandalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        // iOS Safari
        (navigator as any).standalone === true;
      if (!isStandalone) return;
      const path = window.location.pathname;
      // Only auto-redirect on the customer welcome root.
      if (path === "/" || path === "/submit") {
        window.location.replace("/field");
      }
    } catch {}
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <SessionCleanup />
      <PWAStandaloneRedirect />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/field" element={<FieldLogin />} />
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

            {/* Growth section */}
            <Route path="/growth" element={<Navigate to="/growth/accounts" replace />} />
            <Route path="/growth/accounts" element={<GrowthAccounts />} />
            <Route path="/growth/pipeline" element={<GrowthPipeline />} />
            <Route path="/growth/deals/:dealId" element={<GrowthDealDetail />} />

            {/* AutoHeal section */}
            <Route path="/autoheal/ai-agent" element={<AIAgent />} />
            <Route path="/autoheal/deep-learning" element={<DeepLearning />} />
            <Route path="/autoheal/configuration" element={<AutoHealConfig />} />
            <Route path="/autoheal/performance" element={<Performance />} />
            <Route path="/autoheal/swi-library" element={<SWILibrary />} />
            <Route path="/autoheal/parts" element={<Parts />} />
            <Route path="/autoheal/parts-catalog" element={<PartsCatalog />} />
            <Route path="/autoheal/locations" element={<Locations />} />

            {/* Field Capture (admin-only views inside main shell) */}
            <Route path="/field-capture/admin/create-job" element={<FieldCaptureAdminGuard><CreateTestJob /></FieldCaptureAdminGuard>} />
            <Route path="/field-capture/admin/work-orders" element={<FieldCaptureAdminGuard><AllWorkOrders /></FieldCaptureAdminGuard>} />
            <Route path="/field-capture/admin/templates" element={<FieldCaptureAdminGuard><WorkTemplates /></FieldCaptureAdminGuard>} />
            <Route path="/field-capture/admin/performance" element={<FieldCaptureAdminGuard><TeamPerformance /></FieldCaptureAdminGuard>} />

            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Field Capture mobile shell — no sidebar, dedicated layout */}
          <Route element={<ProtectedRoute><FieldCaptureLayout /></ProtectedRoute>}>
            <Route path="/field-capture" element={<FieldCaptureJobs />} />
            <Route path="/field-capture/history" element={<FieldCaptureHistory />} />
            <Route path="/field-capture/profile" element={<FieldCaptureProfile />} />
            <Route path="/field-capture/job/:workOrderId" element={<FieldCaptureJobDetail />} />
            <Route path="/field-capture/job/:workOrderId/charger/:chargerId" element={<FieldCaptureChargerCapture />} />
            <Route path="/field-capture/job/:workOrderId/wrap-up" element={<FieldCaptureWrapUp />} />
            <Route path="/field-capture/job/:workOrderId/submitted" element={<FieldCaptureSubmitted />} />
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
          <Route path="/r/:token" element={<PublicReport />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
