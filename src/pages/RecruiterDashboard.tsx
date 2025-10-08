import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Briefcase, Users, TrendingUp, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function RecruiterDashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ openJobs: 0, candidates: 0, avgCultureFit: 0 });
  const [jobs, setJobs] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [hasCompany, setHasCompany] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

    if (!userData?.company_id) {
      setHasCompany(false);
      return;
    }

    setHasCompany(true);

    // Load company
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .single();

    setCompany(companyData);

    // Load jobs
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false })
      .limit(5);

    setJobs(jobsData || []);

    // Load stats
    const { count: openCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', userData.company_id)
      .eq('status', 'open');

    const { data: appsData } = await supabase
      .from('applications')
      .select('culture_fit_score, job_id')
      .in('job_id', (jobsData || []).map(j => j.id));

    const avgCulture = appsData && appsData.length > 0
      ? Math.round(appsData.reduce((sum, app) => sum + (app.culture_fit_score || 0), 0) / appsData.length)
      : 0;

    const uniqueCandidates = new Set(appsData?.map(app => app.job_id)).size;

    setStats({
      openJobs: openCount || 0,
      candidates: uniqueCandidates,
      avgCultureFit: avgCulture,
    });
  };

  const createCompany = async () => {
    if (!user) return;

    const companyName = prompt("Enter your company name:");
    if (!companyName) return;

    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        created_by: user.id,
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

    await supabase
      .from('users')
      .update({ company_id: newCompany.id })
      .eq('id', user.id);

    toast({
      title: "Company created!",
      description: "You can now create jobs.",
    });

    loadData();
  };

  if (!user) return null;

  if (!hasCompany) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar userName={user?.name} userRole="recruiter" />
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={user?.name} userRole="recruiter" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">{company?.name}</p>
          </div>
          <Button onClick={() => navigate('/jobs/new')} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Job
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Your latest job postings</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No jobs yet. Create your first job posting!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <div>
                      <h3 className="font-semibold">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {job.location} • {job.employment_type}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
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
      </div>
    </div>
  );
}
