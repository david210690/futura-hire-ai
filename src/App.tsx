import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import { AuthPage } from "./components/auth/AuthPage";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import CandidateDashboard from "./pages/CandidateDashboard";
import CandidateProfile from "./pages/CandidateProfile";
import CandidateVideo from "./pages/CandidateVideo";
import CreateJob from "./pages/CreateJob";
import JobDetail from "./pages/JobDetail";
import AdminMonitor from "./pages/AdminMonitor";
import OrgSettingsPage from "./pages/OrgSettingsPage";
import RoleDesigner from "./pages/RoleDesigner";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<RecruiterDashboard />} />
          <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
          <Route path="/candidate/profile" element={<CandidateProfile />} />
          <Route path="/candidate/video" element={<CandidateVideo />} />
          <Route path="/create-job" element={<CreateJob />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/admin/monitor" element={<AdminMonitor />} />
          <Route path="/org/settings" element={<OrgSettingsPage />} />
          <Route path="/role-designer" element={<RoleDesigner />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
