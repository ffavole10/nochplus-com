import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
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
import MainPlatformLayout from "./layouts/MainPlatformLayout";

// Placeholder pages for new sections
import ServiceTickets from "./pages/placeholders/ServiceTickets";
import Submissions from "./pages/Submissions";
import Customers from "./pages/placeholders/Customers";
import AllChargers from "./pages/placeholders/AllChargers";
import NochPlusDashboard from "./pages/placeholders/NochPlusDashboard";
import NochPlusChargers from "./pages/placeholders/NochPlusChargers";
import NochPlusMembers from "./pages/placeholders/NochPlusMembers";
import NochPlusAssessments from "./pages/placeholders/NochPlusAssessments";
import AIAgent from "./pages/placeholders/AIAgent";
import SWILibrary from "./pages/SWILibrary";
import Locations from "./pages/placeholders/Locations";

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
            {/* Campaigns section */}
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
            <Route path="/service-desk/chargers" element={<AllChargers />} />

            {/* Noch+ section */}
            <Route path="/noch-plus/dashboard" element={<NochPlusDashboard />} />
            <Route path="/noch-plus/members" element={<NochPlusMembers />} />
            <Route path="/noch-plus/chargers" element={<NochPlusChargers />} />
            <Route path="/noch-plus/assessments" element={<NochPlusAssessments />} />

            {/* AutoHeal section */}
            <Route path="/autoheal/ai-agent" element={<AIAgent />} />
            <Route path="/autoheal/swi-library" element={<SWILibrary />} />
            <Route path="/autoheal/locations" element={<Locations />} />

            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* Legacy redirects */}
          <Route path="/tickets" element={<Navigate to="/issues" replace />} />
          <Route path="/campaigns/reports" element={<Navigate to="/field-reports" replace />} />
          <Route path="/estimates" element={<Navigate to="/service-desk/estimates" replace />} />
          <Route path="/missioncontrol" element={<ProtectedRoute><IssuesQueue /></ProtectedRoute>} />
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
