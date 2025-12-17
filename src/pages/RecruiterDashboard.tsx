import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Briefcase, 
  Users, 
  TrendingUp, 
  Building2, 
  Settings, 
  MessageSquare,
  BarChart3,
  FileText,
  Wand2,
  Target,
  Zap,
  ArrowRight,
  Clock,
  Gauge,
  Percent
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { CopilotPanel } from "@/components/recruiter/CopilotPanel";
import { PilotBanner } from "@/components/pilot/PilotBanner";
import { UpgradeFAB } from "@/components/trial/UpgradeFAB";
import { GlobalCopilotFAB } from "@/components/copilot/GlobalCopilotFAB";
import { activateGrowthPilot, getOrgPilotStatus } from "@/lib/pilot";
import { ProductTour } from "@/components/tour/ProductTour";
import { TourTriggerButton } from "@/components/tour/TourTriggerButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import '@/components/tour/tour-styles.css';

export default function RecruiterDashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ openJobs: 0, candidates: 0, avgCultureFit: 0 });
  const [jobs, setJobs] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [showCopilot, setShowCopilot] = useState(false);
  const [showUpgradeFAB, setShowUpgradeFAB] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pilotStatus, setPilotStatus] = useState<Awaited<ReturnType<typeof getOrgPilotStatus>>>(null);
  const [pipelineStats, setPipelineStats] = useState({
    newApplications: 0,
    inReview: 0,
    interviewed: 0,
    offered: 0,
    pendingAssessments: 0,
    pendingInterviews: 0
  });
  const [metrics, setMetrics] = useState({
    avgTimeToHire: 0,
    hiringVelocity: 0,
    conversionRate: 0,
    interviewToOfferRate: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrg, loading: orgLoading } = useCurrentOrg();

  // Check user role and redirect candidates
  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      if (userRole?.role === 'candidate') {
        navigate('/candidate/dashboard');
        return;
      }
    };
    checkRole();
  }, [navigate]);

  useEffect(() => {
    if (!orgLoading && currentOrg) {
      loadData();
      checkPilotStatus();
    }
  }, [currentOrg, orgLoading]);

  const checkPilotStatus = async () => {
    if (!currentOrg?.id) return;
    
    const status = await getOrgPilotStatus(currentOrg.id);
    setPilotStatus(status);
    
    // If org has no pilot_start_at, this is a new org - activate pilot
    if (!status?.pilotStartAt && status?.planStatus === 'pilot') {
      await activateGrowthPilot(currentOrg.id);
      const updatedStatus = await getOrgPilotStatus(currentOrg.id);
      setPilotStatus(updatedStatus);
      toast({
        title: "Welcome!",
        description: "Your Growth Pilot is active until 31 Mar 2026.",
      });
    }
    
    setShowUpgradeFAB(status?.planStatus === 'pilot');
  };

  const loadData = async () => {
    if (orgLoading || !currentOrg) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    // Load user data
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    setUser(userData);

    // Load company for this org - get the first one
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (companyError) {
      console.error('Error loading company:', companyError);
    }

    const companyData = companies?.[0];

    if (!companyData) {
      setHasCompany(false);
      return;
    }

    setHasCompany(true);
    setCompany(companyData);

    // Load jobs for this org
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setJobs(jobsData || []);

    // Load stats
    const { count: openCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', currentOrg.id)
      .eq('status', 'open');

    const { data: appsData } = await supabase
      .from('applications')
      .select('culture_fit_score, job_id, status, stage, created_at, candidate_id')
      .eq('org_id', currentOrg.id);

    const avgCulture = appsData && appsData.length > 0
      ? Math.round(appsData.reduce((sum, app) => sum + (app.culture_fit_score || 0), 0) / appsData.length)
      : 0;

    const uniqueCandidates = new Set(appsData?.map(app => app.job_id)).size;

    setStats({
      openJobs: openCount || 0,
      candidates: uniqueCandidates,
      avgCultureFit: avgCulture,
    });

    // Pipeline stats
    const newApps = appsData?.filter(a => a.stage === 'new' || a.stage === 'applied').length || 0;
    const inReview = appsData?.filter(a => a.stage === 'review' || a.status === 'review').length || 0;
    const interviewed = appsData?.filter(a => a.stage === 'interview' || a.stage === 'interviewed').length || 0;
    const offered = appsData?.filter(a => a.stage === 'offer' || a.status === 'hired').length || 0;

    // Pending assessments
    const { count: pendingAssessments } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Pending interviews
    const { count: pendingInterviews } = await supabase
      .from('interviews')
      .select('*', { count: 'exact', head: true })
      .is('ended_at', null);

    setPipelineStats({
      newApplications: newApps,
      inReview,
      interviewed,
      offered,
      pendingAssessments: pendingAssessments || 0,
      pendingInterviews: pendingInterviews || 0
    });

    // Calculate richer metrics
    // Get hires data for time-to-hire calculation
    const { data: hiresData } = await supabase
      .from('hires')
      .select('created_at, application_id, applications!inner(created_at)')
      .eq('org_id', currentOrg.id);

    // Average time to hire (days from application to hire)
    let avgTimeToHire = 0;
    if (hiresData && hiresData.length > 0) {
      const totalDays = hiresData.reduce((sum, hire) => {
        const appDate = new Date((hire.applications as any)?.created_at);
        const hireDate = new Date(hire.created_at);
        const days = Math.ceil((hireDate.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgTimeToHire = Math.round(totalDays / hiresData.length);
    }

    // Hiring velocity (hires in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: recentHires } = await supabase
      .from('hires')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', currentOrg.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Conversion rate (hired / total applications)
    const totalApps = appsData?.length || 0;
    const hiredCount = hiresData?.length || 0;
    const conversionRate = totalApps > 0 ? Math.round((hiredCount / totalApps) * 100) : 0;

    // Interview to offer rate
    const interviewedCount = appsData?.filter(a => 
      a.stage === 'interview' || a.stage === 'interviewed' || a.stage === 'offer' || a.status === 'hired'
    ).length || 0;
    const interviewToOfferRate = interviewedCount > 0 ? Math.round((offered / interviewedCount) * 100) : 0;

    setMetrics({
      avgTimeToHire,
      hiringVelocity: recentHires || 0,
      conversionRate,
      interviewToOfferRate
    });

    // Recent activity - get recent applications with job info
    const { data: recentApps } = await supabase
      .from('applications')
      .select(`
        id,
        created_at,
        stage,
        status,
        job_id,
        jobs!inner(title)
      `)
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const activities = (recentApps || []).map(app => ({
      id: app.id,
      type: 'application',
      message: `New application for ${(app.jobs as any)?.title || 'Unknown Job'}`,
      time: app.created_at,
      stage: app.stage
    }));

    setRecentActivity(activities);
  };

  const createCompany = async () => {
    if (!user || !currentOrg) return;

    const companyName = prompt("Enter your company name:");
    if (!companyName) return;

    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        created_by: user.id,
        org_id: currentOrg.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      return;
    }

    // Immediately update state to show dashboard
    setCompany(newCompany);
    setHasCompany(true);

    toast({
      title: "Company created!",
      description: "You can now create jobs.",
    });

    // Reload data in background
    loadData();
  };

  if (!user || hasCompany === null || orgLoading) {
    return <LoadingSpinner message="Preparing your dashboard" fullScreen />;
  }

  if (!hasCompany) {
    return (
      <SidebarLayout userRole="recruiter" userName={user?.name} orgName={currentOrg?.name}>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary mx-auto">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome to FuturaHire</h1>
              <p className="text-muted-foreground">
                Let's get started by creating your company profile
              </p>
            </div>
            <Button onClick={createCompany} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Create Company
            </Button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout userRole="recruiter" userName={user?.name} orgName={currentOrg?.name}>
      <ProductTour role="recruiter" autoStart />
      {currentOrg?.id && <PilotBanner orgId={currentOrg.id} onLocked={() => navigate('/billing')} />}
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">{company?.name}</p>
          </div>
          <div className="flex gap-2">
            <TourTriggerButton role="recruiter" />
            <Button
              variant="outline"
              onClick={() => navigate('/org/settings')}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Team
            </Button>
            <Button 
              variant={showCopilot ? "secondary" : "outline"}
              onClick={() => setShowCopilot(!showCopilot)} 
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Copilot
            </Button>
            <Button onClick={() => navigate('/create-job')} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Job
            </Button>
          </div>
        </div>

        {showCopilot && (
          <div className="mb-8">
            <CopilotPanel />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-tour="dashboard-stats">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {pilotStatus?.planTier || 'Growth'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {pilotStatus?.planStatus === 'pilot' && `Pilot • ${pilotStatus.daysRemaining}d remaining`}
                {pilotStatus?.planStatus === 'active' && '₹30,000/year'}
                {pilotStatus?.planStatus === 'locked' && 'Subscription required'}
                {!pilotStatus && 'Loading...'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Jobs</CardTitle>
              <Briefcase className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.openJobs}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Candidates in Review</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.candidates}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Culture Fit</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgCultureFit}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Hiring Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-tour="hiring-metrics">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Time to Hire</span>
              </div>
              <div className="text-2xl font-bold">
                {metrics.avgTimeToHire > 0 ? `${metrics.avgTimeToHire}d` : '—'}
              </div>
              <p className="text-xs text-muted-foreground">avg days to hire</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground font-medium">Hiring Velocity</span>
              </div>
              <div className="text-2xl font-bold">{metrics.hiringVelocity}</div>
              <p className="text-xs text-muted-foreground">hires last 30 days</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground font-medium">Conversion Rate</span>
              </div>
              <div className="text-2xl font-bold">{metrics.conversionRate}%</div>
              <p className="text-xs text-muted-foreground">applications → hired</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground font-medium">Interview → Offer</span>
              </div>
              <div className="text-2xl font-bold">{metrics.interviewToOfferRate}%</div>
              <p className="text-xs text-muted-foreground">interview success rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-tour="quick-actions">
          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
            onClick={() => navigate('/role-designer')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Role Designer</p>
                <p className="text-xs text-muted-foreground">AI job creation</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
            onClick={() => navigate('/assessments')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/50 text-secondary-foreground group-hover:bg-secondary transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Assessments</p>
                <p className="text-xs text-muted-foreground">Test candidates</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
            onClick={() => navigate('/analytics')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Analytics</p>
                <p className="text-xs text-muted-foreground">Hiring insights</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
            onClick={() => navigate('/billing')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Upgrade</p>
                <p className="text-xs text-muted-foreground">Plans & billing</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Pipeline Overview
            </CardTitle>
            <CardDescription>Current hiring funnel status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-3 rounded-lg bg-blue-500/10">
                <div className="text-2xl font-bold text-blue-600">{pipelineStats.newApplications}</div>
                <p className="text-xs text-muted-foreground">New</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-500/10">
                <div className="text-2xl font-bold text-amber-600">{pipelineStats.inReview}</div>
                <p className="text-xs text-muted-foreground">In Review</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-500/10">
                <div className="text-2xl font-bold text-purple-600">{pipelineStats.interviewed}</div>
                <p className="text-xs text-muted-foreground">Interviewed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <div className="text-2xl font-bold text-green-600">{pipelineStats.offered}</div>
                <p className="text-xs text-muted-foreground">Offered/Hired</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="text-2xl font-bold text-orange-600">{pipelineStats.pendingAssessments}</div>
                <p className="text-xs text-muted-foreground">Pending Tests</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="text-2xl font-bold text-rose-600">{pipelineStats.pendingInterviews}</div>
                <p className="text-xs text-muted-foreground">Pending Interviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout: Recent Jobs + Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Jobs</CardTitle>
                <CardDescription>Your latest job postings</CardDescription>
              </div>
              {jobs.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')} className="gap-1">
                  View all <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No jobs yet. Create your first job posting!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <div>
                        <h3 className="font-medium text-sm">{job.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {job.location} • {job.employment_type}
                        </p>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        job.status === 'open' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {job.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your hiring pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No recent activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="p-1.5 rounded-full bg-primary/10 text-primary mt-0.5">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.time).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {activity.stage && (
                        <div className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                          {activity.stage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {currentOrg?.id && (
        <>
          <UpgradeFAB orgId={currentOrg.id} show={showUpgradeFAB} />
          <GlobalCopilotFAB />
        </>
      )}
    </SidebarLayout>
  );
}
