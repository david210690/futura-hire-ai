import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Radar, RefreshCw, TrendingUp, Target, Lightbulb, AlertCircle, Mic, Briefcase, Sparkles, Heart } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface RoleFamily {
  id: string;
  label: string;
  score: number;
  readiness: "ready_now" | "almost_there" | "stretch";
  why_fit: string[];
  key_gaps: string[];
  recommended_skills_to_focus: string[];
  related_job_ids: string[];
}

interface SkillLeverageInsight {
  skill_name: string;
  impact_summary: string;
  suggested_actions: string[];
}

interface GlobalCommentary {
  overall_positioning: string;
  short_term_opportunity: string;
  long_term_opportunity: string;
}

interface RadarSnapshot {
  role_families: RoleFamily[];
  skill_leverage_insight: SkillLeverageInsight[];
  global_commentary: GlobalCommentary;
  metadata?: {
    generated_at: string;
    jobs_analyzed: number;
    has_profile: boolean;
    has_job_twin_profile: boolean;
  };
  error?: string;
}

export default function OpportunityRadar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [snapshot, setSnapshot] = useState<RadarSnapshot | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);
    await loadLatestSnapshot();
  };

  const loadLatestSnapshot = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-opportunity-radar');
      
      if (error) throw error;
      
      if (data.exists) {
        setSnapshot(data.snapshot);
        setCreatedAt(data.createdAt);
      }
    } catch (error) {
      console.error('Error loading snapshot:', error);
      toast.error('Failed to load opportunity radar');
    } finally {
      setLoading(false);
    }
  };

  const generateRadar = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-opportunity-radar');
      
      if (error) throw error;
      
      if (data.success) {
        setSnapshot(data.snapshot);
        setCreatedAt(data.created_at);
        toast.success('Opportunity radar generated!');
      } else {
        throw new Error(data.error || 'Failed to generate radar');
      }
    } catch (error) {
      console.error('Error generating radar:', error);
      toast.error('Failed to generate opportunity radar. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const getReadinessBadge = (readiness: string) => {
    switch (readiness) {
      case "ready_now":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ready Now</Badge>;
      case "almost_there":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Almost There</Badge>;
      case "stretch":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Stretch</Badge>;
      default:
        return <Badge variant="secondary">{readiness}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-orange-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar userName={user?.user_metadata?.name} userRole="candidate" />
        <main className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Scanning your opportunities" size="sm" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={user?.user_metadata?.name} userRole="candidate" />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Radar className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">My Opportunity Radar</h1>
            </div>
            <p className="text-muted-foreground">
              {snapshot 
                ? "Based on your profile and the roles you've interacted with."
                : "Discover your career opportunities based on your profile and job interactions."}
            </p>
            {createdAt && (
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: {format(new Date(createdAt), "PPP 'at' p")}
              </p>
            )}
          </div>
          
          {snapshot && (
            <Button onClick={generateRadar} disabled={generating} variant="outline">
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Regenerating...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Regenerate</>
              )}
            </Button>
          )}
        </div>

        {/* Empty State - Gentle messaging */}
        {!snapshot && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Radar className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your opportunity map is waiting to be discovered</h2>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                We need a bit more data to sharpen this view. Try saving or exploring a few roles 
                or doing a mock interview — your radar will get clearer over time.
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6 flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                Every career path is unique. This is guidance, not judgment.
              </p>
              <Button onClick={generateRadar} disabled={generating} size="lg">
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Target className="h-4 w-4 mr-2" /> Generate Opportunity Radar</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Radar Results */}
        {snapshot && (
          <div className="space-y-8">
            {/* Low Data Warning - Gentle messaging */}
            {snapshot.metadata?.jobs_analyzed !== undefined && snapshot.metadata.jobs_analyzed < 3 && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="flex items-start gap-3 py-4">
                  <Heart className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-600 dark:text-amber-400">Still gathering insights</p>
                    <p className="text-sm text-muted-foreground">
                      We need a bit more data to sharpen this view. Try saving or exploring a few roles 
                      or doing a mock interview — your radar will get clearer over time. No rush.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Global Commentary */}
            {snapshot.global_commentary && (
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Your Career Positioning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Overall Positioning</h4>
                    <p className="text-muted-foreground">{snapshot.global_commentary.overall_positioning}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-500" />
                        Short-Term Focus
                      </h4>
                      <p className="text-sm text-muted-foreground">{snapshot.global_commentary.short_term_opportunity}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        Long-Term Growth
                      </h4>
                      <p className="text-sm text-muted-foreground">{snapshot.global_commentary.long_term_opportunity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Role Families */}
            {snapshot.role_families && snapshot.role_families.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Role Families ({snapshot.role_families.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {snapshot.role_families.map((family) => (
                    <RoleFamilyCard key={family.id} family={family} getReadinessBadge={getReadinessBadge} getScoreColor={getScoreColor} />
                  ))}
                </div>
              </div>
            )}

            {/* Skill Leverage Insights */}
            {snapshot.skill_leverage_insight && snapshot.skill_leverage_insight.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  One Skill, Big Unlock
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {snapshot.skill_leverage_insight.map((insight, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-primary" />
                          </div>
                          {insight.skill_name}
                        </CardTitle>
                        <CardDescription>{insight.impact_summary}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <h4 className="text-sm font-medium mb-2">Suggested Actions</h4>
                        <ul className="text-sm text-muted-foreground space-y-2">
                          {insight.suggested_actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary font-bold">{i + 1}.</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Role Family Card Component with CTAs
function RoleFamilyCard({ 
  family, 
  getReadinessBadge, 
  getScoreColor 
}: { 
  family: RoleFamily; 
  getReadinessBadge: (r: string) => React.ReactNode; 
  getScoreColor: (s: number) => string;
}) {
  const navigate = useNavigate();
  const [practiceDialogOpen, setPracticeDialogOpen] = useState(false);
  const [mode, setMode] = useState("mixed");
  const [difficulty, setDifficulty] = useState("mid");
  const [starting, setStarting] = useState(false);

  const startPracticeInterview = async () => {
    setStarting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        return;
      }

      const { data, error } = await supabase.functions.invoke("voice-interview-start", {
        body: {
          role_title: family.label,
          mode,
          difficulty,
        }
      });

      if (error) throw error;

      if (data?.session_id) {
        toast.success("Interview session created!");
        navigate(`/voice-interview/${data.session_id}`);
      } else if (data?.join_url) {
        window.open(data.join_url, '_blank');
      }
      setPracticeDialogOpen(false);
    } catch (error: any) {
      console.error("Error starting interview:", error);
      toast.error("Could not start interview. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{family.label}</CardTitle>
          {getReadinessBadge(family.readiness)}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Fit Score</span>
            <span className={`text-lg font-bold ${getScoreColor(family.score)}`}>
              {family.score}%
            </span>
          </div>
          <Progress value={family.score} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {family.why_fit && family.why_fit.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-green-500 mb-1">Why You're a Fit</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {family.why_fit.slice(0, 2).map((reason, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        {family.key_gaps && family.key_gaps.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-amber-500 mb-1">Still Developing</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {family.key_gaps.slice(0, 2).map((gap, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}
        {family.recommended_skills_to_focus && family.recommended_skills_to_focus.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-blue-500 mb-1">Focus On</h4>
            <div className="flex flex-wrap gap-1">
              {family.recommended_skills_to_focus.slice(0, 3).map((skill, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Cross-feature CTAs */}
        <div className="pt-3 border-t space-y-2">
          <Dialog open={practiceDialogOpen} onOpenChange={setPracticeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Mic className="h-3 w-3" />
                Practice Interview for this Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Practice Interview: {family.label}</DialogTitle>
                <DialogDescription>
                  Get comfortable with interviews for this role family. Choose your preferred settings below.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Interview Mode</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="mixed">Mixed (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setPracticeDialogOpen(false)}>Cancel</Button>
                <Button onClick={startPracticeInterview} disabled={starting}>
                  {starting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                  Start Practice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={() => navigate('/job-twin')}
            >
              <Briefcase className="h-3 w-3 mr-1" />
              See matching roles
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={() => navigate(`/career-trajectory?focusRoleFamily=${encodeURIComponent(family.id)}`)}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Impact on trajectory
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
