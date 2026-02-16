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
import Kanban from "./pages/Kanban";
import Schedule from "./pages/Schedule";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import MainPlatformLayout from "./layouts/MainPlatformLayout";

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
            <Route path="/" element={<Index />} />
            <Route path="/dataset" element={<Dataset />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/tickets" element={<AssessmentTracker />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* Legacy redirect */}
          <Route path="/missioncontrol" element={<ProtectedRoute><AssessmentTracker /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
