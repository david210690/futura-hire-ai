import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import Pricing from "./pages/Pricing";
import Assessments from "./pages/Assessments";
import AssessmentDetail from "./pages/AssessmentDetail";
import { AuthPage } from "./components/auth/AuthPage";
import Signup from "./pages/Signup";
import AccountType from "./pages/onboarding/AccountType";
import Company from "./pages/onboarding/Company";
import PricingClarity from "./pages/onboarding/PricingClarity";
import CreateRole from "./pages/onboarding/CreateRole";
import InterviewKitPreview from "./pages/onboarding/InterviewKitPreview";
import InviteCandidate from "./pages/onboarding/InviteCandidate";
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
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import RefundPolicy from "./pages/RefundPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import Contact from "./pages/Contact";
import SalesPitch from "./pages/SalesPitch";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<Index />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding/account-type" element={<AccountType />} />
          <Route path="/onboarding/company" element={<Company />} />
          <Route path="/onboarding/pricing-clarity" element={<PricingClarity />} />
          <Route path="/onboarding/create-role" element={<CreateRole />} />
          <Route path="/onboarding/interview-kit-preview" element={<InterviewKitPreview />} />
          <Route path="/onboarding/invite-candidate" element={<InviteCandidate />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/assessments/:id" element={<AssessmentDetail />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<RecruiterDashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
          <Route path="/candidate/warmups" element={<CandidateWarmups />} />
          <Route path="/candidate/profile" element={<CandidateProfile />} />
          <Route path="/candidate/video" element={<CandidateVideo />} />
          <Route path="/create-job" element={<CreateJob />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/jobs/:id/decision-room" element={<DecisionRoom />} />
          <Route path="/admin/monitor" element={<AdminMonitor />} />
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
          
          {/* Candidate-facing career pages */}
          <Route path="/c/:orgSlug" element={<CareersPage />} />
          <Route path="/c/:orgSlug/jobs/:jobSlug" element={<JobDetailPage />} />
          <Route path="/c/:orgSlug/jobs/:jobSlug/apply" element={<ApplyPage />} />
          <Route path="/c/:orgSlug/apply/status/:token" element={<ApplicationStatusPage />} />
          <Route path="/c/:orgSlug/apply/assessment/:token" element={<TakeAssessmentPage />} />
          <Route path="/c/:orgSlug/apply/video/:token" element={<RecordVideoPage />} />
          
          {/* Legal pages */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/refund" element={<RefundPolicy />} />
          <Route path="/shipping" element={<ShippingPolicy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/salespitch" element={<SalesPitch />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
