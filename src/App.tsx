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

// New IA placeholder pages (Batch 1)
import CommandCenter from "./pages/placeholders/CommandCenter";
import Operations from "./pages/placeholders/Operations";
import Business from "./pages/placeholders/Business";
import Knowledge from "./pages/placeholders/Knowledge";
import MissionControlHome from "./pages/placeholders/MissionControlHome";
import CommandCenterMissionControl from "./pages/command-center/CommandCenterMissionControl";
import CommandCenterAnalytics from "./pages/command-center/CommandCenterAnalytics";

// Knowledge section pages (Batch 3)
import KnowledgeSwiLibrary from "./pages/knowledge/KnowledgeSwiLibrary";
import KnowledgePartsCatalog from "./pages/knowledge/KnowledgePartsCatalog";
import KnowledgeReportTemplates from "./pages/knowledge/KnowledgeReportTemplates";
import KnowledgeRegulatory from "./pages/knowledge/KnowledgeRegulatory";
import KnowledgeExternalSources from "./pages/knowledge/KnowledgeExternalSources";

// Operations section pages (Batch 4)
import OperationsCampaigns from "./pages/operations/OperationsCampaigns";
import OperationsTickets from "./pages/operations/OperationsTickets";
import OperationsWorkOrders from "./pages/operations/OperationsWorkOrders";
import OperationsEstimates from "./pages/operations/OperationsEstimates";
import OperationsPartsInventory from "./pages/operations/OperationsPartsInventory";
import OperationsTeamPerformance from "./pages/operations/OperationsTeamPerformance";

// Business section pages (Batch 5)
import BusinessAccounts from "./pages/business/BusinessAccounts";
import BusinessAccountDetail from "./pages/business/BusinessAccountDetail";
import BusinessPipeline from "./pages/business/BusinessPipeline";
import BusinessMembership from "./pages/business/BusinessMembership";
import BusinessSubmissions from "./pages/business/BusinessSubmissions";

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
            {/* Command Center */}
            <Route path="/command-center" element={<Navigate to="/command-center/mission-control" replace />} />
            <Route path="/command-center/mission-control" element={<CommandCenterMissionControl />} />
            <Route path="/command-center/analytics" element={<CommandCenterAnalytics />} />
            <Route path="/command-center/platform-analytics" element={<Navigate to="/settings?tab=platform-analytics" replace />} />
            <Route path="/operations" element={<Navigate to="/operations/campaigns" replace />} />
            <Route path="/operations/campaigns" element={<OperationsCampaigns />} />
            <Route path="/operations/campaigns/:tab" element={<OperationsCampaigns />} />
            <Route path="/operations/tickets" element={<OperationsTickets />} />
            <Route path="/operations/work-orders" element={<OperationsWorkOrders />} />
            <Route path="/operations/estimates" element={<OperationsEstimates />} />
            <Route path="/operations/parts-inventory" element={<OperationsPartsInventory />} />
            <Route path="/operations/team-performance" element={<OperationsTeamPerformance />} />
            <Route path="/business" element={<Navigate to="/business/accounts" replace />} />
            <Route path="/business/accounts" element={<BusinessAccounts />} />
            <Route path="/business/accounts/:accountId" element={<BusinessAccountDetail />} />
            <Route path="/business/pipeline" element={<BusinessPipeline />} />
            <Route path="/business/membership" element={<BusinessMembership />} />
            <Route path="/business/submissions" element={<BusinessSubmissions />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/knowledge/swi-library" element={<KnowledgeSwiLibrary />} />
            <Route path="/knowledge/parts-catalog" element={<KnowledgePartsCatalog />} />
            <Route path="/knowledge/report-templates" element={<KnowledgeReportTemplates />} />
            <Route path="/knowledge/regulatory" element={<KnowledgeRegulatory />} />
            <Route path="/knowledge/external-sources" element={<KnowledgeExternalSources />} />

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

            {/* ─── Legacy redirects → new IA ─── */}
            {/* Campaigns legacy */}
            <Route path="/dashboard" element={<Navigate to="/operations/campaigns" replace />} />
            <Route path="/campaigns/dashboard" element={<Navigate to="/operations/campaigns" replace />} />
            <Route path="/dataset" element={<Navigate to="/operations/campaigns?tab=dataset" replace />} />
            <Route path="/campaigns/dataset" element={<Navigate to="/operations/campaigns?tab=dataset" replace />} />
            <Route path="/issues" element={<Navigate to="/operations/campaigns?tab=flagged" replace />} />
            <Route path="/campaigns/flagged" element={<Navigate to="/operations/campaigns?tab=flagged" replace />} />
            <Route path="/schedule" element={<Navigate to="/operations/campaigns?tab=schedule" replace />} />
            <Route path="/campaigns/schedule" element={<Navigate to="/operations/campaigns?tab=schedule" replace />} />
            <Route path="/field-reports" element={<Navigate to="/operations/campaigns?tab=field-reports" replace />} />
            <Route path="/campaigns/field-reports" element={<Navigate to="/operations/campaigns?tab=field-reports" replace />} />

            {/* Service Desk legacy */}
            <Route path="/service-desk/tickets" element={<Navigate to="/operations/tickets" replace />} />
            <Route path="/service-desk/estimates" element={<Navigate to="/operations/estimates" replace />} />
            <Route path="/service-desk/customers" element={<Navigate to="/business/accounts?filter=customers" replace />} />
            <Route path="/service-desk/locations" element={<Navigate to="/operations/team-performance?view=map" replace />} />
            <Route path="/service-desk/swi-library" element={<Navigate to="/knowledge/swi-library" replace />} />
            <Route path="/service-desk/parts-inventory" element={<Navigate to="/operations/parts-inventory" replace />} />
            <Route path="/service-desk/parts-catalog" element={<Navigate to="/knowledge/parts-catalog" replace />} />

            {/* NOCH+ legacy */}
            <Route path="/nochplus/mission-control" element={<Navigate to="/command-center/mission-control" replace />} />
            <Route path="/noch-plus/monitoring" element={<Navigate to="/command-center/mission-control" replace />} />
            <Route path="/nochplus/partnership-hub" element={<Navigate to="/business/membership" replace />} />
            <Route path="/noch-plus/partnership-hub" element={<Navigate to="/business/membership" replace />} />
            <Route path="/nochplus/partnership-hub/plan-tiers" element={<Navigate to="/business/membership?tab=plan-tiers" replace />} />
            <Route path="/nochplus/partnership-hub/demo-invoices" element={<Navigate to="/business/membership?tab=demo-invoices" replace />} />
            <Route path="/nochplus/partnership-hub/plan-builder" element={<Navigate to="/business/membership?tab=plan-builder" replace />} />
            <Route path="/nochplus/partnership-hub/partner-plan" element={<Navigate to="/business/membership?tab=partner-plan" replace />} />
            <Route path="/nochplus/partnership-hub/knowledge-base" element={<Navigate to="/business/membership?tab=knowledge-base" replace />} />
            <Route path="/nochplus/dashboard" element={<Navigate to="/business/membership" replace />} />
            <Route path="/noch-plus/dashboard" element={<Navigate to="/business/membership" replace />} />
            <Route path="/nochplus/submissions" element={<Navigate to="/business/submissions" replace />} />
            <Route path="/noch-plus/submissions" element={<Navigate to="/business/submissions" replace />} />
            <Route path="/nochplus/assessments" element={<Navigate to="/business/submissions?tab=assessments" replace />} />
            <Route path="/noch-plus/assessments" element={<Navigate to="/business/submissions?tab=assessments" replace />} />
            <Route path="/nochplus/members" element={<Navigate to="/business/membership" replace />} />
            <Route path="/noch-plus/members" element={<Navigate to="/business/membership" replace />} />
            <Route path="/nochplus/chargers" element={<Navigate to="/command-center/mission-control?view=list" replace />} />
            <Route path="/noch-plus/chargers" element={<Navigate to="/command-center/mission-control?view=list" replace />} />

            {/* Growth legacy */}
            <Route path="/growth" element={<Navigate to="/business/accounts?view=growth" replace />} />
            <Route path="/growth/accounts" element={<Navigate to="/business/accounts?view=growth" replace />} />
            <Route path="/growth/pipeline" element={<Navigate to="/business/pipeline" replace />} />
            <Route path="/growth/deals/:dealId" element={<GrowthDealDetail />} />

            {/* Partners legacy */}
            <Route path="/partners" element={<Navigate to="/business/accounts?filter=partners" replace />} />
            <Route path="/partners/all-partners" element={<Navigate to="/business/accounts?filter=partners" replace />} />
            <Route path="/partners/:partnerId" element={<PartnerProfile />} />

            {/* AutoHeal legacy → Neural OS in Settings */}
            <Route path="/autoheal" element={<Navigate to="/settings?tab=neural-os" replace />} />
            <Route path="/autoheal/ai-agent" element={<Navigate to="/settings?tab=neural-os&layer=reasoning" replace />} />
            <Route path="/autoheal/deep-learning" element={<Navigate to="/settings?tab=neural-os&layer=learning" replace />} />
            <Route path="/autoheal/configuration" element={<Navigate to="/settings?tab=neural-os&layer=governance" replace />} />
            <Route path="/autoheal/performance" element={<Navigate to="/settings?tab=neural-os&layer=performance" replace />} />
            <Route path="/autoheal/swi-library" element={<Navigate to="/knowledge/swi-library" replace />} />
            <Route path="/autoheal/parts" element={<Navigate to="/operations/parts-inventory" replace />} />
            <Route path="/autoheal/parts-catalog" element={<Navigate to="/knowledge/parts-catalog" replace />} />
            <Route path="/autoheal/locations" element={<Navigate to="/operations/team-performance?view=map" replace />} />

            {/* Field Capture legacy admin views */}
            <Route path="/field-capture/all-work-orders" element={<Navigate to="/operations/work-orders" replace />} />
            <Route path="/field-capture/create-work-order" element={<Navigate to="/operations/work-orders?action=create" replace />} />
            <Route path="/field-capture/work-templates" element={<Navigate to="/knowledge/report-templates" replace />} />
            <Route path="/field-capture/team-performance" element={<Navigate to="/operations/team-performance?view=scorecard" replace />} />
            <Route path="/field-capture/admin/create-job" element={<Navigate to="/operations/work-orders?action=create" replace />} />
            <Route path="/field-capture/admin/work-orders" element={<Navigate to="/operations/work-orders" replace />} />
            <Route path="/field-capture/admin/templates" element={<Navigate to="/knowledge/report-templates" replace />} />
            <Route path="/field-capture/admin/performance" element={<Navigate to="/operations/team-performance?view=scorecard" replace />} />

            {/* Home legacy */}
            <Route path="/home" element={<Navigate to="/" replace />} />

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
