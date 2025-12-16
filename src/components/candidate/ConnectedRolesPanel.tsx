import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Briefcase, BookOpen, Sparkles, Clock, CheckCircle, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ConnectedRole {
  id: string;
  source: 'fit_request' | 'application';
  status: string;
  createdAt: string;
  jobTwinJobId?: string;
  jobId?: string;
  jobTitle: string;
  companyName: string;
}

export function ConnectedRolesPanel() {
  const [roles, setRoles] = useState<ConnectedRole[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConnectedRoles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get candidate record
        const { data: candidate } = await supabase
          .from('candidates')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        const connectedRoles: ConnectedRole[] = [];

        // Fetch fit requests (recruiter invited candidate)
        const { data: fitRequests } = await supabase
          .from('role_dna_fit_requests')
          .select(`
            id,
            status,
            created_at,
            job_twin_job_id,
            job_twin_jobs (
              id,
              job_id,
              jobs (
                id,
                title,
                companies (name)
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (fitRequests) {
          for (const req of fitRequests) {
            const jobData = req.job_twin_jobs as any;
            connectedRoles.push({
              id: req.id,
              source: 'fit_request',
              status: req.status,
              createdAt: req.created_at,
              jobTwinJobId: req.job_twin_job_id,
              jobId: jobData?.jobs?.id,
              jobTitle: jobData?.jobs?.title || 'Unknown Role',
              companyName: jobData?.jobs?.companies?.name || 'Unknown Company',
            });
          }
        }

        // Fetch applications (candidate applied)
        if (candidate) {
          const { data: applications } = await supabase
            .from('applications')
            .select(`
              id,
              status,
              stage,
              created_at,
              job_id,
              jobs (
                id,
                title,
                companies (name)
              )
            `)
            .eq('candidate_id', candidate.id)
            .order('created_at', { ascending: false });

          if (applications) {
            for (const app of applications) {
              const jobData = app.jobs as any;
              // Avoid duplicates - check if job already in list from fit requests
              const existingJob = connectedRoles.find(r => r.jobId === app.job_id);
              if (!existingJob) {
                connectedRoles.push({
                  id: app.id,
                  source: 'application',
                  status: app.stage || app.status,
                  createdAt: app.created_at || '',
                  jobId: app.job_id,
                  jobTitle: jobData?.title || 'Unknown Role',
                  companyName: jobData?.companies?.name || 'Unknown Company',
                });
              }
            }
          }
        }

        // Sort by most recent
        connectedRoles.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setRoles(connectedRoles);
      } catch (error) {
        console.error("Error fetching connected roles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConnectedRoles();
  }, []);

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'pending' || normalizedStatus === 'new' || normalizedStatus === 'review') {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
    if (normalizedStatus === 'completed' || normalizedStatus === 'hired') {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
    }
    if (normalizedStatus.includes('progress') || normalizedStatus === 'interview' || normalizedStatus === 'shortlisted') {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200"><Play className="h-3 w-3 mr-1" />In Progress</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const getCTA = (role: ConnectedRole) => {
    const normalizedStatus = role.status.toLowerCase();
    if (normalizedStatus === 'pending') {
      return { label: "Complete Fit Check", action: () => navigate(`/job-twin/jobs/${role.jobTwinJobId || role.jobId}`) };
    }
    if (normalizedStatus.includes('progress') || normalizedStatus === 'interview') {
      return { label: "Continue Preparation", action: () => navigate(`/job-twin/jobs/${role.jobTwinJobId || role.jobId}`) };
    }
    return { label: "View Details", action: () => navigate(`/job-twin/jobs/${role.jobTwinJobId || role.jobId}`) };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state - no connected roles
  if (roles.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No active role requests yet</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            When a recruiter invites you to prepare for a role, it will appear here.
            Until then, you can explore practice tools at your own pace.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => navigate('/voice-interviews')}>
              <Sparkles className="h-4 w-4 mr-2" />
              Go to Practice Sessions
            </Button>
            <Button variant="outline" onClick={() => navigate('/opportunity-radar')}>
              <BookOpen className="h-4 w-4 mr-2" />
              Explore Learning Tools
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Your Connected Roles
        </CardTitle>
        <CardDescription>
          Roles you've been invited to or applied for. This is your private preparation space.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {roles.map((role) => {
          const cta = getCTA(role);
          return (
            <div
              key={`${role.source}-${role.id}`}
              className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(role.status)}
                    {role.source === 'fit_request' && (
                      <span className="text-xs text-muted-foreground">Invited</span>
                    )}
                    {role.source === 'application' && (
                      <span className="text-xs text-muted-foreground">Applied</span>
                    )}
                  </div>
                  <h4 className="font-medium">{role.jobTitle}</h4>
                  <p className="text-sm text-muted-foreground">{role.companyName}</p>
                </div>
                <Button onClick={cta.action} className="shrink-0">
                  {cta.label}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
