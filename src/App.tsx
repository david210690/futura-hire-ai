import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Assessments from "./pages/Assessments";
import AssessmentDetail from "./pages/AssessmentDetail";
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
import BillingSettings from "./pages/BillingSettings";
import ShareableShortlist from "./pages/ShareableShortlist";
import CareersPage from "./pages/careers/CareersPage";
import JobDetailPage from "./pages/careers/JobDetailPage";
import ApplyPage from "./pages/careers/ApplyPage";
import ApplicationStatusPage from "./pages/careers/ApplicationStatusPage";
import TakeAssessmentPage from "./pages/careers/TakeAssessmentPage";
import RecordVideoPage from "./pages/careers/RecordVideoPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Index />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/assessments/:id" element={<AssessmentDetail />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<RecruiterDashboard />} />
          <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
          <Route path="/candidate/profile" element={<CandidateProfile />} />
          <Route path="/candidate/video" element={<CandidateVideo />} />
          <Route path="/create-job" element={<CreateJob />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/admin/monitor" element={<AdminMonitor />} />
          <Route path="/org/settings" element={<OrgSettingsPage />} />
          <Route path="/billing" element={<BillingSettings />} />
          <Route path="/role-designer" element={<RoleDesigner />} />
          <Route path="/s/:token" element={<ShareableShortlist />} />
          
          {/* Candidate-facing career pages */}
          <Route path="/c/:orgSlug" element={<CareersPage />} />
          <Route path="/c/:orgSlug/jobs/:jobSlug" element={<JobDetailPage />} />
          <Route path="/c/:orgSlug/jobs/:jobSlug/apply" element={<ApplyPage />} />
          <Route path="/c/:orgSlug/apply/status/:token" element={<ApplicationStatusPage />} />
          <Route path="/c/:orgSlug/apply/assessment/:token" element={<TakeAssessmentPage />} />
          <Route path="/c/:orgSlug/apply/video/:token" element={<RecordVideoPage />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
