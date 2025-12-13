import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Users, Brain, Plus, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

interface Job {
  id: string;
  title: string;
  location: string;
  status: string;
  created_at: string;
  company: { name: string } | null;
  application_count: number;
}

export default function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: membership } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        setJobs([]);
        setLoading(false);
        return;
      }

      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          location,
          status,
          created_at,
          company:companies(name)
        `)
        .eq('org_id', membership.org_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get application counts
      const jobIds = jobsData?.map(j => j.id) || [];
      const { data: appCounts } = await supabase
        .from('applications')
        .select('job_id')
        .in('job_id', jobIds);

      const countMap: Record<string, number> = {};
      appCounts?.forEach(app => {
        countMap[app.job_id] = (countMap[app.job_id] || 0) + 1;
      });

      const jobsWithCounts = (jobsData || []).map(job => ({
        ...job,
        company: Array.isArray(job.company) ? job.company[0] : job.company,
        application_count: countMap[job.id] || 0,
      }));

      setJobs(jobsWithCounts);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'closed': return 'bg-muted text-muted-foreground';
      case 'draft': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <SidebarLayout userRole="recruiter">
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Jobs</h1>
                <p className="text-muted-foreground">Manage your job postings and access AI tools</p>
              </div>
              <Button onClick={() => navigate('/create-job')} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Job
              </Button>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No jobs yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first job posting to get started</p>
                  <Button onClick={() => navigate('/create-job')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map(job => (
                  <Card 
                    key={job.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{job.title}</CardTitle>
                          <CardDescription>{job.company?.name || 'No company'}</CardDescription>
                        </div>
                        <Badge variant="outline" className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(job.created_at), 'MMM d')}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{job.application_count} candidates</span>
                        </div>
                        {job.application_count > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/jobs/${job.id}/decision-room`);
                            }}
                            className="gap-1 text-primary"
                          >
                            <Brain className="w-4 h-4" />
                            Decision Room
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarLayout>
  );
}
