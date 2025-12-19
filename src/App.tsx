import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Assessments from "./pages/Assessments";
import AssessmentDetail from "./pages/AssessmentDetail";
import { AuthPage } from "./components/auth/AuthPage";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import CandidateDashboard from "./pages/CandidateDashboard";
import CandidateWarmups from "./pages/CandidateWarmups";
import CandidateProfile from "./pages/CandidateProfile";
import CandidateVideo from "./pages/CandidateVideo";
import CreateJob from "./pages/CreateJob";
import JobDetail from "./pages/JobDetail";
import DecisionRoom from "./pages/DecisionRoom";
import Jobs from "./pages/Jobs";
import AdminMonitor from "./pages/AdminMonitor";
import OrgSettingsPage from "./pages/OrgSettingsPage";
import RoleDesigner from "./pages/RoleDesigner";
import BillingSettings from "./pages/BillingSettings";
import ShareableShortlist from "./pages/ShareableShortlist";
import JobTwin from "./pages/JobTwin";
import JobTwinJobDetail from "./pages/JobTwinJobDetail";
import InterviewPractice from "./pages/InterviewPractice";
import InterviewSession from "./pages/InterviewSession";
import InterviewSessionReview from "./pages/InterviewSessionReview";
import VoiceInterviewList from "./pages/VoiceInterviewList";
import VoiceInterviewDetail from "./pages/VoiceInterviewDetail";
import OpportunityRadar from "./pages/OpportunityRadar";
import Analytics from "./pages/Analytics";
import CareerTrajectory from "./pages/CareerTrajectory";
import CareerBlueprint from "./pages/CareerBlueprint";
import QuestionBankLibrary from "./pages/QuestionBankLibrary";
import AdminQuestionBank from "./pages/AdminQuestionBank";
import InterviewKitPage from "./pages/InterviewKitPage";
import CareersPage from "./pages/careers/CareersPage";
import JobDetailPage from "./pages/careers/JobDetailPage";
import ApplyPage from "./pages/careers/ApplyPage";
import ApplicationStatusPage from "./pages/careers/ApplicationStatusPage";
import TakeAssessmentPage from "./pages/careers/TakeAssessmentPage";
import RecordVideoPage from "./pages/careers/RecordVideoPage";
import NotFound from "./pages/NotFound";
import PricingClarity from "./pages/onboarding/PricingClarity";
import CandidateWelcome from "./pages/onboarding/CandidateWelcome";
import EmailLogs from "./pages/admin/EmailLogs";
import UserAnalytics from "./pages/admin/UserAnalytics";
import CandidateSettings from "./pages/CandidateSettings";
import { useLocation } from "react-router-dom";

// Redirect /settings to /candidate/settings preserving query params
const SettingsRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/candidate/settings${location.search}`} replace />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnalyticsProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/assessments/:id" element={<AssessmentDetail />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<RecruiterDashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
            <Route path="/candidate/warmups" element={<CandidateWarmups />} />
            <Route path="/candidate/profile" element={<CandidateProfile />} />
            <Route path="/candidate/video" element={<CandidateVideo />} />
            <Route path="/candidate/settings" element={<CandidateSettings />} />
            <Route path="/settings" element={<SettingsRedirect />} />
            <Route path="/create-job" element={<CreateJob />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/jobs/:id/decision-room" element={<DecisionRoom />} />
            <Route path="/admin/monitor" element={<AdminMonitor />} />
            <Route path="/admin/email-logs" element={<EmailLogs />} />
            <Route path="/admin/user-analytics" element={<UserAnalytics />} />
            <Route path="/org/settings" element={<OrgSettingsPage />} />
            <Route path="/billing" element={<BillingSettings />} />
            <Route path="/role-designer" element={<RoleDesigner />} />
            <Route path="/job-twin" element={<JobTwin />} />
            <Route path="/job-twin/jobs/:id" element={<JobTwinJobDetail />} />
            <Route path="/interview-practice" element={<InterviewPractice />} />
            <Route path="/interview-practice/session/:sessionId" element={<InterviewSession />} />
            <Route path="/interview-practice/session/:sessionId/review" element={<InterviewSessionReview />} />
            <Route path="/voice-interview" element={<VoiceInterviewList />} />
            <Route path="/voice-interview/:sessionId" element={<VoiceInterviewDetail />} />
            <Route path="/opportunity-radar" element={<OpportunityRadar />} />
            <Route path="/career-trajectory" element={<CareerTrajectory />} />
            <Route path="/career-blueprint" element={<CareerBlueprint />} />
            <Route path="/question-bank" element={<QuestionBankLibrary />} />
            <Route path="/admin/question-bank" element={<AdminQuestionBank />} />
            <Route path="/recruiter/jobs/:jobId/candidates/:candidateId/interview-kit" element={<InterviewKitPage />} />
            <Route path="/s/:token" element={<ShareableShortlist />} />
            
            {/* Onboarding flows */}
            <Route path="/onboarding/pricing-clarity" element={<PricingClarity />} />
            <Route path="/onboarding/candidate-welcome" element={<CandidateWelcome />} />
            
            {/* Candidate-facing career pages */}
            <Route path="/c/:orgSlug" element={<CareersPage />} />
            <Route path="/c/:orgSlug/jobs/:jobSlug" element={<JobDetailPage />} />
            <Route path="/c/:orgSlug/jobs/:jobSlug/apply" element={<ApplyPage />} />
            <Route path="/c/:orgSlug/apply/status/:token" element={<ApplicationStatusPage />} />
            <Route path="/c/:orgSlug/apply/assessment/:token" element={<TakeAssessmentPage />} />
            <Route path="/c/:orgSlug/apply/video/:token" element={<RecordVideoPage />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnalyticsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
