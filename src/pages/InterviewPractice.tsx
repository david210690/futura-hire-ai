import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mic, Play, Clock, Target, Trophy, BarChart3, Loader2, Sparkles, ChevronRight, Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Session {
  id: string;
  role_title: string;
  mode: string;
  difficulty: string;
  status: string;
  total_questions: number | null;
  completed_questions: number | null;
  overall_score: number | null;
  created_at: string;
  job_twin_job_id: string | null;
}

interface JobTwinJob {
  id: string;
  status: string;
  jobs: {
    id: string;
    title: string;
    companies: { name: string } | null;
  } | null;
}

export default function InterviewPractice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [jobTwinJobs, setJobTwinJobs] = useState<JobTwinJob[]>([]);

  // New session form
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [roleTitle, setRoleTitle] = useState("");
  const [mode, setMode] = useState("mixed");
  const [difficulty, setDifficulty] = useState("mid");
  const [questionCount, setQuestionCount] = useState("5");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load past sessions
      const { data: sessionsData } = await supabase
        .from("interview_simulation_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setSessions((sessionsData as Session[]) || []);

      // Load job twin jobs for selection
      const { data: profile } = await supabase
        .from("job_twin_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const { data: jobs } = await supabase
          .from("job_twin_jobs")
          .select("id, status, jobs(id, title, companies(name))")
          .eq("profile_id", profile.id);

        setJobTwinJobs((jobs as unknown as JobTwinJob[]) || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startNewSession = async () => {
    const finalRole = selectedJob 
      ? jobTwinJobs.find(j => j.id === selectedJob)?.jobs?.title || roleTitle
      : roleTitle;

    if (!finalRole) {
      toast({ title: "Please enter a role title or select a job", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from("interview_simulation_sessions")
        .insert({
          user_id: user.id,
          job_twin_job_id: selectedJob || null,
          role_title: finalRole,
          mode,
          difficulty,
          status: "in_progress",
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Generate questions
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("interview-generate-questions", {
        headers: { Authorization: `Bearer ${authSession?.access_token}` },
        body: {
          session_id: session.id,
          job_twin_job_id: selectedJob || null,
          role_title: finalRole,
          mode,
          difficulty,
          count: parseInt(questionCount),
        },
      });

      if (response.error) throw new Error(response.error.message);

      toast({ title: "Interview session created!" });
      navigate(`/interview-practice/session/${session.id}`);
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast({ title: "Failed to create session", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI Interview Practice</h1>
              <p className="text-muted-foreground">
                Simulate real interviews with voice Q&A and get personalized feedback
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="new" className="space-y-6">
          <TabsList>
            <TabsTrigger value="new">New Session</TabsTrigger>
            <TabsTrigger value="history">Past Sessions ({sessions.length})</TabsTrigger>
          </TabsList>

          {/* New Session Tab */}
          <TabsContent value="new" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Start Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Practice Target
                  </CardTitle>
                  <CardDescription>
                    Choose a specific job or enter a role title
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {jobTwinJobs.length > 0 && (
                    <div className="space-y-2">
                      <Label>Select from Job Twin</Label>
                      <Select value={selectedJob} onValueChange={(val) => {
                        setSelectedJob(val);
                        if (val) setRoleTitle("");
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a job..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None (use custom role)</SelectItem>
                          {jobTwinJobs.map(job => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.jobs?.title} at {job.jobs?.companies?.name || "Unknown"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Or enter role title</Label>
                    <Input
                      value={roleTitle}
                      onChange={(e) => {
                        setRoleTitle(e.target.value);
                        if (e.target.value) setSelectedJob("");
                      }}
                      placeholder="e.g. Senior React Developer"
                      disabled={!!selectedJob}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Session Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Session Settings
                  </CardTitle>
                  <CardDescription>
                    Customize your practice session
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Interview Mode</Label>
                      <Select value={mode} onValueChange={setMode}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="behavioral">Behavioral</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="mid">Mid-Level</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Number of Questions</Label>
                    <Select value={questionCount} onValueChange={setQuestionCount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 questions (~10 min)</SelectItem>
                        <SelectItem value="5">5 questions (~15 min)</SelectItem>
                        <SelectItem value="8">8 questions (~25 min)</SelectItem>
                        <SelectItem value="10">10 questions (~30 min)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Start Button */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Play className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Ready to Practice?</h3>
                      <p className="text-muted-foreground">
                        {selectedJob || roleTitle 
                          ? `${mode} interview • ${difficulty} level • ${questionCount} questions`
                          : "Configure your session settings above"
                        }
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={startNewSession}
                    disabled={creating || (!selectedJob && !roleTitle)}
                  >
                    {creating ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Mic className="h-5 w-5 mr-2" />
                    )}
                    {creating ? "Creating..." : "Start Practice Session"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {sessions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No practice sessions yet</p>
                  <p className="text-sm">Start your first interview practice to see it here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => (
                  <Card 
                    key={session.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(
                      session.status === "completed" 
                        ? `/interview-practice/session/${session.id}/review`
                        : `/interview-practice/session/${session.id}`
                    )}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            {session.status === "completed" ? (
                              <Trophy className="h-5 w-5 text-primary" />
                            ) : (
                              <Mic className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium">{session.role_title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="capitalize">{session.mode}</span>
                              <span>•</span>
                              <span className="capitalize">{session.difficulty}</span>
                              <span>•</span>
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(session.created_at), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {session.overall_score !== null && (
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${getScoreColor(session.overall_score)}`}>
                                {session.overall_score}
                              </div>
                              <div className="text-xs text-muted-foreground">Score</div>
                            </div>
                          )}
                          <div className="flex flex-col items-end gap-1">
                            {getStatusBadge(session.status)}
                            <span className="text-xs text-muted-foreground">
                              {session.completed_questions || 0}/{session.total_questions || "?"} questions
                            </span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
