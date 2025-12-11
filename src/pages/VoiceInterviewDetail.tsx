import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mic, Calendar, Target, Briefcase, TrendingUp, Clock, Bot, User, Heart, Sparkles, Radar, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface VoiceSession {
  id: string;
  role_title: string | null;
  mode: string;
  difficulty: string;
  status: string;
  overall_score: number | null;
  feedback_summary: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  job_twin_job_id: string | null;
}

interface Turn {
  id: string;
  turn_index: number;
  role: string;
  content: string;
  created_at: string;
}

export default function VoiceInterviewDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('voice_interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Verify ownership
      if (sessionData.user_id !== user.id) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this session",
          variant: "destructive",
        });
        navigate('/voice-interview');
        return;
      }

      setSession(sessionData);

      // Fetch turns
      const { data: turnsData, error: turnsError } = await supabase
        .from('voice_interview_turns')
        .select('*')
        .eq('session_id', sessionId)
        .order('turn_index', { ascending: true });

      if (turnsError) throw turnsError;
      setTurns(turnsData || []);

    } catch (error: any) {
      console.error('Error loading session:', error);
      toast({
        title: "Error",
        description: "Failed to load session details",
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

  const renderFeedbackSummary = (summary: string) => {
    // Parse markdown-like formatting
    const lines = summary.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={i} className="font-semibold mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
      }
      if (line.startsWith('• ')) {
        return <li key={i} className="ml-4">{line.substring(2)}</li>;
      }
      if (line.trim()) {
        return <p key={i} className="mb-2">{line}</p>;
      }
      return null;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mic className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Session Not Found</h3>
              <Button onClick={() => navigate('/voice-interview')}>
                Back to Sessions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/voice-interview')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mic className="h-6 w-6" />
              {session.role_title || "Voice Interview"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(session.status)}
            </div>
          </div>
        </div>

        {/* Session Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Session Details</span>
              {session.overall_score !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Score:</span>
                  <span className={`text-3xl font-bold ${getScoreColor(session.overall_score)}`}>
                    {session.overall_score}
                  </span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Mode</p>
                  <p className="font-medium">{getModeLabel(session.mode)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Difficulty</p>
                  <p className="font-medium">{getDifficultyLabel(session.difficulty)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {session.started_at
                      ? format(new Date(session.started_at), "MMM d, yyyy")
                      : format(new Date(session.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              {session.started_at && session.ended_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-medium">
                      {Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)} min
                    </p>
                  </div>
                </div>
              )}
            </div>

            {session.overall_score !== null && (
              <div className="mt-4">
                <Progress value={session.overall_score} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supportive Score Context - ND-friendly messaging */}
        {session.status === 'completed' && session.overall_score !== null && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-foreground font-medium mb-1">This score is guidance, not judgment</p>
                  <p className="text-sm text-muted-foreground">
                    It's here to help you see what to practice next — it does not define your worth or your future. 
                    Every interview is practice, and growth happens at your own pace.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cross-feature CTAs for completed sessions */}
        {session.status === 'completed' && session.overall_score !== null && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                What's Next?
              </CardTitle>
              <CardDescription>Use this practice session to inform your career journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <Link to={`/career-trajectory?sourceSessionId=${session.id}`}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    See how this affects my trajectory
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/opportunity-radar?fromSession=${session.id}`}>
                    <Radar className="h-4 w-4 mr-2" />
                    Update my Opportunity Radar
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Your Radar uses your latest performance signals. Regenerate it after a few practice sessions for more accurate insights.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Feedback Summary */}
        {session.feedback_summary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>AI Feedback</CardTitle>
              <CardDescription>Insights to help you grow — not judgment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {renderFeedbackSummary(session.feedback_summary)}
              </div>
              
              {/* Practice again CTA */}
              <div className="mt-6 pt-4 border-t">
                <Button 
                  variant="secondary" 
                  onClick={() => navigate(`/voice-interview?role=${encodeURIComponent(session.role_title || '')}&mode=${session.mode}&difficulty=${session.difficulty}`)}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Practice again with same settings
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle>Conversation Transcript</CardTitle>
            <CardDescription>
              {turns.length > 0 
                ? `${turns.length} exchanges recorded`
                : "No transcript available yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {turns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Transcript will appear here after the interview</p>
              </div>
            ) : (
              <div className="space-y-4">
                {turns.map((turn, index) => (
                  <div key={turn.id}>
                    <div className={`flex gap-3 ${turn.role === 'ai' ? '' : 'flex-row-reverse'}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        turn.role === 'ai' ? 'bg-primary/10' : 'bg-secondary'
                      }`}>
                        {turn.role === 'ai' ? (
                          <Bot className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div className={`flex-1 ${turn.role === 'ai' ? 'pr-12' : 'pl-12'}`}>
                        <div className={`rounded-lg p-3 ${
                          turn.role === 'ai' 
                            ? 'bg-muted' 
                            : 'bg-primary text-primary-foreground'
                        }`}>
                          <p className="text-sm">{turn.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {turn.role === 'ai' ? 'Interviewer' : 'You'} • Turn {turn.turn_index}
                        </p>
                      </div>
                    </div>
                    {index < turns.length - 1 && <Separator className="my-4" />}
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
