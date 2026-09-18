import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SHOW_PRICING } from "@/lib/billing-config";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
const Index = lazy(() => import("./pages/Index"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Refund = lazy(() => import("./pages/Refund"));
const Assessments = lazy(() => import("./pages/Assessments"));
const AssessmentDetail = lazy(() => import("./pages/AssessmentDetail"));
const AuthPage = lazy(() => import("./components/auth/AuthPage").then(module => ({ default: module.AuthPage })));
const RecruiterDashboard = lazy(() => import("./pages/RecruiterDashboard"));
const CandidateDashboard = lazy(() => import("./pages/CandidateDashboard"));
const CandidateWarmups = lazy(() => import("./pages/CandidateWarmups"));
const CandidateProfile = lazy(() => import("./pages/CandidateProfile"));
const CandidateVideo = lazy(() => import("./pages/CandidateVideo"));
const CreateJob = lazy(() => import("./pages/CreateJob"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const DecisionRoom = lazy(() => import("./pages/DecisionRoom"));
const Jobs = lazy(() => import("./pages/Jobs"));
const AdminMonitor = lazy(() => import("./pages/AdminMonitor"));
const OrgSettingsPage = lazy(() => import("./pages/OrgSettingsPage"));
const RoleDesigner = lazy(() => import("./pages/RoleDesigner"));
const BillingSettings = lazy(() => import("./pages/BillingSettings"));
const ShareableShortlist = lazy(() => import("./pages/ShareableShortlist"));
const JobTwin = lazy(() => import("./pages/JobTwin"));
const JobTwinJobDetail = lazy(() => import("./pages/JobTwinJobDetail"));
const InterviewPractice = lazy(() => import("./pages/InterviewPractice"));
const InterviewSession = lazy(() => import("./pages/InterviewSession"));
const InterviewSessionReview = lazy(() => import("./pages/InterviewSessionReview"));
const VoiceInterviewList = lazy(() => import("./pages/VoiceInterviewList"));
const VoiceInterviewDetail = lazy(() => import("./pages/VoiceInterviewDetail"));
const OpportunityRadar = lazy(() => import("./pages/OpportunityRadar"));
const Analytics = lazy(() => import("./pages/Analytics"));
const CareerTrajectory = lazy(() => import("./pages/CareerTrajectory"));
const CareerBlueprint = lazy(() => import("./pages/CareerBlueprint"));
const QuestionBankLibrary = lazy(() => import("./pages/QuestionBankLibrary"));
const AdminQuestionBank = lazy(() => import("./pages/AdminQuestionBank"));
const InterviewKitPage = lazy(() => import("./pages/InterviewKitPage"));
const CareersPage = lazy(() => import("./pages/careers/CareersPage"));
const JobDetailPage = lazy(() => import("./pages/careers/JobDetailPage"));
const ApplyPage = lazy(() => import("./pages/careers/ApplyPage"));
const ApplicationStatusPage = lazy(() => import("./pages/careers/ApplicationStatusPage"));
const TakeAssessmentPage = lazy(() => import("./pages/careers/TakeAssessmentPage"));
const RecordVideoPage = lazy(() => import("./pages/careers/RecordVideoPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PricingClarity = lazy(() => import("./pages/onboarding/PricingClarity"));
const CandidateWelcome = lazy(() => import("./pages/onboarding/CandidateWelcome"));
const EmailLogs = lazy(() => import("./pages/admin/EmailLogs"));
const UserAnalytics = lazy(() => import("./pages/admin/UserAnalytics"));
const CandidateSettings = lazy(() => import("./pages/CandidateSettings"));
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
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AnalyticsProvider>
          <Suspense fallback={<LoadingSpinner message="Loading FuturaHire" fullScreen />}>
            <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={<Index />} />
            <Route path="/pricing" element={SHOW_PRICING ? <Pricing /> : <Navigate to="/" replace />} />
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
            <Route path="/billing" element={SHOW_PRICING ? <BillingSettings /> : <Navigate to="/dashboard" replace />} />
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
            <Route path="/onboarding/pricing-clarity" element={SHOW_PRICING ? <PricingClarity /> : <Navigate to="/dashboard" replace />} />
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
          </Suspense>
        </AnalyticsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
