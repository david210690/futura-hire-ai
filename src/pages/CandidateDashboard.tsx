import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CareerCoachCard } from "@/components/career/CareerCoachCard";
import { FileUp, Video, BriefcaseIcon, Radar, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CandidateDashboard() {
  const [user, setUser] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      const { data: candidateData } = await supabase
        .from('candidates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setCandidate(candidateData);

      // Load resume text if available
      if (candidateData) {
        const { data: resumeData } = await supabase
          .from('resumes')
          .select('parsed_text')
          .eq('candidate_id', candidateData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (resumeData?.parsed_text) {
          setResumeText(resumeData.parsed_text);
        }
      }
    };

    fetchData();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={user?.user_metadata?.name} userRole="candidate" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {user?.user_metadata?.name || 'Candidate'}</h1>
          <p className="text-muted-foreground">Manage your profile, applications, and AI assessments</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile Completeness</CardTitle>
              <FileUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{candidate ? '100%' : '0%'}</div>
              <p className="text-xs text-muted-foreground">
                {candidate ? 'Profile complete' : 'Create your profile'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Video Intro</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Upload intro video</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Active applications</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* AI Career Coach */}
          {candidate && (
            <div className="md:col-span-2">
              <CareerCoachCard candidateId={candidate.id} resumeText={resumeText} />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Profile & Resume</CardTitle>
              <CardDescription>Complete your profile and upload your resume for AI analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={() => navigate('/candidate/profile')}>
                {candidate ? 'Edit Profile' : 'Create Profile'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Intro Video</CardTitle>
              <CardDescription>Record a short video to boost your culture-fit score</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate('/candidate/video')}>
                <Video className="w-4 h-4 mr-2" />
                Record Video
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radar className="h-5 w-5 text-primary" />
                My Opportunity Radar
              </CardTitle>
              <CardDescription>Discover role families that match your skills and find high-impact areas to focus on</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/opportunity-radar')} className="w-full md:w-auto">
                <Radar className="w-4 h-4 mr-2" />
                View Opportunity Radar
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                Career Trajectory Engine
              </CardTitle>
              <CardDescription>Map your career path with AI-powered trajectory planning, salary projections, and 6-month action plans</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/career-trajectory')} className="w-full md:w-auto bg-amber-600 hover:bg-amber-700">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Career Trajectory
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
