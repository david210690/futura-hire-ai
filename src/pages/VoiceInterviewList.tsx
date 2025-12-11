import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mic, Calendar, Target, Briefcase, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface VoiceSession {
  id: string;
  role_title: string | null;
  mode: string;
  difficulty: string;
  status: string;
  overall_score: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  job_twin_job_id: string | null;
  job_twin_job?: {
    job?: {
      title: string;
      companies?: { name: string };
    };
  };
}

export default function VoiceInterviewList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<VoiceSession[]>([]);

  const jobId = searchParams.get('jobId');

  useEffect(() => {
    loadSessions();
  }, [jobId]);

  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      let query = supabase
        .from('voice_interview_sessions')
        .select(`
          *,
          job_twin_job:job_twin_jobs (
            job:jobs (
              title,
              companies (name)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (jobId) {
        query = query.eq('job_twin_job_id', jobId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load voice interview sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      active: { variant: "default", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
      failed: { variant: "destructive", label: "Failed" },
    };
    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      technical: "Technical",
      behavioral: "Behavioral",
      mixed: "Mixed",
    };
    return labels[mode] || mode;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      junior: "Junior",
      mid: "Mid-Level",
      senior: "Senior",
    };
    return labels[difficulty] || difficulty;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(jobId ? `/job-twin/jobs/${jobId}` : '/job-twin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Voice Interview Sessions</h1>
            <p className="text-muted-foreground">
              {jobId ? "Sessions for this job" : "All your AI voice interview practice sessions"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mic className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Voice Interviews Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start a live AI voice interview from any job in your Job Twin
              </p>
              <Button onClick={() => navigate('/job-twin')}>
                Go to Job Twin
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/voice-interview/${session.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {session.role_title || session.job_twin_job?.job?.title || "Interview Session"}
                      </CardTitle>
                      {session.job_twin_job?.job?.companies?.name && (
                        <CardDescription>
                          {session.job_twin_job.job.companies.name}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {session.overall_score !== null && (
                        <span className={`text-xl font-bold ${getScoreColor(session.overall_score)}`}>
                          {session.overall_score}
                        </span>
                      )}
                      {getStatusBadge(session.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {getModeLabel(session.mode)}
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {getDifficultyLabel(session.difficulty)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {session.started_at
                        ? format(new Date(session.started_at), "MMM d, yyyy 'at' h:mm a")
                        : format(new Date(session.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
