import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, TrendingUp, Target, Zap, Calendar, DollarSign, Users, Flame, AlertTriangle, ChevronRight, Sparkles, ArrowUp, ArrowRight, Shuffle, Mic, CalendarDays, List, Heart, Radar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SnapshotHistory } from "@/components/career-trajectory/SnapshotHistory";
import { ExportTrajectoryPDF } from "@/components/career-trajectory/ExportTrajectoryPDF";
import { WeeklyPlanView } from "@/components/career-trajectory/WeeklyPlanView";

interface TrajectorySnapshot {
  current_position?: {
    level_label: string;
    confidence: number;
    one_line_summary: string;
    strength_highlights: string[];
    risk_or_ceiling_factors: string[];
  };
  next_roles?: Array<{
    title: string;
    readiness_score: number;
    time_estimate_months: string;
    key_gaps_to_fill: string[];
    leverage_factors: string[];
  }>;
  trajectories?: Array<{
    id: string;
    label: string;
    description: string;
    stages: Array<{
      stage_label: string;
      time_window_months: string;
      focus_areas: string[];
    }>;
  }>;
  breakthrough_skills?: Array<{
    skill_name: string;
    impact: string;
    how_to_practice: string[];
  }>;
  six_month_plan?: {
    summary: string;
    months: Array<{
      month_index: number;
      theme: string;
      focus_items: string[];
    }>;
  };
  salary_projection?: {
    note: string;
    current_band?: {
      currency: string;
      annual_min: number;
      annual_max: number;
      commentary: string;
    };
    trajectory_bands?: Array<{
      trajectory_id: string;
      level_label: string;
      currency: string;
      annual_min: number;
      annual_max: number;
      commentary: string;
    }>;
  };
  peer_comparison?: {
    narrative: string;
    relative_strengths: string[];
    relative_weaknesses: string[];
  };
  market_demand?: {
    narrative: string;
    hot_roles: string[];
    cooling_roles: string[];
  };
  error?: string;
}

export default function CareerTrajectory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [snapshot, setSnapshot] = useState<TrajectorySnapshot | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [planViewMode, setPlanViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUserName(user.user_metadata?.name || user.email || 'Candidate');
    await loadLatestSnapshot();
  };

  const loadLatestSnapshot = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-career-trajectory`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (data.exists) {
        setSnapshot(data.snapshot);
        setCreatedAt(data.created_at);
        setSnapshotId(data.id);
      }
    } catch (error) {
      console.error('Error loading trajectory:', error);
      toast.error("Failed to load trajectory data");
    } finally {
      setLoading(false);
    }
  };

  const generateTrajectory = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-career-trajectory`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate trajectory');
      }

      setSnapshot(data.snapshot);
      setCreatedAt(data.created_at);
      setSnapshotId(data.id);
      toast.success("Career trajectory generated!");
    } catch (error: any) {
      console.error('Error generating trajectory:', error);
      toast.error(error.message || "Failed to generate trajectory");
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    if (currency === 'INR') {
      if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
      if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
      return `₹${amount.toLocaleString()}`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const getTrajectoryIcon = (id: string) => {
    switch (id) {
      case 'linear_growth': return <ArrowUp className="h-5 w-5" />;
      case 'expansion': return <ArrowRight className="h-5 w-5" />;
      case 'switch': return <Shuffle className="h-5 w-5" />;
      default: return <TrendingUp className="h-5 w-5" />;
    }
  };

  const handleSnapshotSelect = (snapshotData: any, snapshotCreatedAt: string, id: string) => {
    setSnapshot(snapshotData);
    setCreatedAt(snapshotCreatedAt);
    setSnapshotId(id);
  };

  const getTrajectoryColor = (id: string) => {
    switch (id) {
      case 'linear_growth': return 'text-green-500';
      case 'expansion': return 'text-blue-500';
      case 'switch': return 'text-purple-500';
      default: return 'text-primary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Career Trajectory Engine
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered career path planning and growth insights
            </p>
            {createdAt && (
              <div className="flex items-center gap-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(createdAt).toLocaleDateString()}
                </p>
                <SnapshotHistory 
                  currentSnapshotId={snapshotId} 
                  onSelectSnapshot={handleSnapshotSelect} 
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {snapshot && !snapshot.error && (
              <ExportTrajectoryPDF snapshot={snapshot} candidateName={userName} />
            )}
            <Button 
              onClick={generateTrajectory} 
              disabled={generating}
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {snapshot ? 'Regenerate' : 'Generate'} Trajectory
            </Button>
          </div>
        </div>

        {/* Supportive Disclaimer - ND-friendly */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              A map, not a verdict
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              This page is a snapshot based on your current data. It will change as you learn, rest, or take new steps. 
              Non-linear paths, pauses, and comebacks are normal. Use this as guidance, not as a final judgment. 
              Your worth isn't measured by timelines or scores.
            </p>
          </CardContent>
        </Card>

        {!snapshot ? (
          /* Empty State */
          <Card className="text-center py-16">
            <CardContent>
              <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Map Your Career Trajectory</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We haven't mapped your trajectory yet. Generate your personalized career path based on your profile, skills, and job interactions.
              </p>
              <Button 
                size="lg" 
                onClick={generateTrajectory} 
                disabled={generating}
                className="gap-2"
              >
                {generating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                Generate My Trajectory
              </Button>
            </CardContent>
          </Card>
        ) : snapshot.error ? (
          /* Error State */
          <Card className="text-center py-16">
            <CardContent>
              <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't generate your trajectory. Please try again.
              </p>
              <Button onClick={generateTrajectory} disabled={generating}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Main Content */
          <div className="space-y-8">
            {/* Current Position */}
            {snapshot.current_position && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Current Position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="secondary" className="text-lg py-1 px-3">
                          {snapshot.current_position.level_label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {snapshot.current_position.confidence}% confidence
                        </span>
                      </div>
                      <p className="text-foreground mb-4">
                        {snapshot.current_position.one_line_summary}
                      </p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Strengths
                      </h4>
                      <ul className="space-y-1">
                        {snapshot.current_position.strength_highlights?.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Growth Areas
                      </h4>
                      <ul className="space-y-1">
                        {snapshot.current_position.risk_or_ceiling_factors?.map((r, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Roles */}
            {snapshot.next_roles && snapshot.next_roles.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <ArrowUp className="h-5 w-5 text-primary" />
                  Next Achievable Roles
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {snapshot.next_roles.map((role, idx) => (
                    <Card key={idx} className="hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{role.title}</CardTitle>
                        <CardDescription>{role.time_estimate_months} months (at your pace)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Readiness</span>
                            <span className="font-medium">{role.readiness_score}%</span>
                          </div>
                          <Progress value={role.readiness_score} className="h-2" />
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Areas to Develop</p>
                            <ul className="text-sm space-y-1">
                              {role.key_gaps_to_fill?.slice(0, 2).map((g, i) => (
                                <li key={i} className="text-muted-foreground">• {g}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Your Strengths</p>
                            <ul className="text-sm space-y-1">
                              {role.leverage_factors?.slice(0, 2).map((l, i) => (
                                <li key={i} className="text-green-600 dark:text-green-400">• {l}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t space-y-2">
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 text-xs"
                              onClick={() => navigate('/job-twin')}
                            >
                              <Target className="h-3 w-3 mr-1" />
                              Find Jobs
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 text-xs"
                              onClick={() => navigate(`/voice-interview?role=${encodeURIComponent(role.title)}&difficulty=${role.readiness_score >= 70 ? 'senior' : role.readiness_score >= 40 ? 'mid' : 'junior'}`)}
                            >
                              <Mic className="h-3 w-3 mr-1" />
                              Practice Interview
                            </Button>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => navigate(`/opportunity-radar?focusRole=${encodeURIComponent(role.title)}`)}
                          >
                            <Radar className="h-3 w-3 mr-1" />
                            See on Opportunity Radar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Trajectories */}
            {snapshot.trajectories && snapshot.trajectories.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Career Trajectories
                </h2>
                <Tabs defaultValue={snapshot.trajectories[0]?.id} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    {snapshot.trajectories.map((t) => (
                      <TabsTrigger key={t.id} value={t.id} className="gap-2">
                        <span className={getTrajectoryColor(t.id)}>{getTrajectoryIcon(t.id)}</span>
                        <span className="hidden sm:inline">{t.id === 'linear_growth' ? 'Linear' : t.id === 'expansion' ? 'Expand' : 'Switch'}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {snapshot.trajectories.map((trajectory) => (
                    <TabsContent key={trajectory.id} value={trajectory.id}>
                      <Card>
                        <CardHeader>
                          <CardTitle className={`flex items-center gap-2 ${getTrajectoryColor(trajectory.id)}`}>
                            {getTrajectoryIcon(trajectory.id)}
                            {trajectory.label}
                          </CardTitle>
                          <CardDescription>{trajectory.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                            <div className="space-y-6">
                              {trajectory.stages?.map((stage, idx) => (
                                <div key={idx} className="relative pl-10">
                                  <div className={`absolute left-2 w-5 h-5 rounded-full border-2 bg-background ${getTrajectoryColor(trajectory.id).replace('text-', 'border-')}`} />
                                  <div>
                                    <h4 className="font-medium">{stage.stage_label}</h4>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {stage.time_window_months} months
                                    </p>
                                    <ul className="text-sm space-y-1">
                                      {stage.focus_areas?.map((f, i) => (
                                        <li key={i} className="text-muted-foreground">• {f}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}

            {/* Breakthrough Skills */}
            {snapshot.breakthrough_skills && snapshot.breakthrough_skills.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Breakthrough Skills
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {snapshot.breakthrough_skills.map((skill, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          {skill.skill_name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{skill.impact}</p>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">How to Practice</p>
                          <ul className="text-sm space-y-1">
                            {skill.how_to_practice?.map((h, i) => (
                              <li key={i} className="text-muted-foreground">• {h}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-4 pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs gap-2"
                            onClick={() => navigate(`/voice-interview?role=${encodeURIComponent(`Interview focusing on ${skill.skill_name}`)}&mode=mixed`)}
                          >
                            <Mic className="h-3 w-3" />
                            Practice this skill in a mock interview
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 6-Month Plan */}
            {snapshot.six_month_plan && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    6-Month Action Plan
                  </h2>
                  <div className="flex items-center gap-1 border rounded-lg p-1">
                    <Button
                      variant={planViewMode === 'monthly' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setPlanViewMode('monthly')}
                      className="gap-1 h-7"
                    >
                      <List className="h-3 w-3" />
                      Monthly
                    </Button>
                    <Button
                      variant={planViewMode === 'weekly' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setPlanViewMode('weekly')}
                      className="gap-1 h-7"
                    >
                      <CalendarDays className="h-3 w-3" />
                      Weekly
                    </Button>
                  </div>
                </div>
                <Card>
                  <CardHeader>
                    <CardDescription>{snapshot.six_month_plan.summary}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {planViewMode === 'monthly' ? (
                      <Accordion type="single" collapsible className="w-full">
                        {snapshot.six_month_plan.months?.map((month) => (
                          <AccordionItem key={month.month_index} value={`month-${month.month_index}`}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">Month {month.month_index}</Badge>
                                <span className="font-medium">{month.theme}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <ul className="space-y-2 pl-4">
                                {month.focus_items?.map((item, i) => (
                                  <li key={i} className="text-muted-foreground flex items-start gap-2">
                                    <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <WeeklyPlanView months={snapshot.six_month_plan.months || []} />
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Salary Projection */}
            {snapshot.salary_projection && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Salary Projections
                </h2>
                <Card className="border-amber-500/30">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      {snapshot.salary_projection.note}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {snapshot.salary_projection.current_band && (
                        <Card className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Current Range</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-foreground">
                              {formatCurrency(snapshot.salary_projection.current_band.annual_min)} - {formatCurrency(snapshot.salary_projection.current_band.annual_max)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {snapshot.salary_projection.current_band.commentary}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      {snapshot.salary_projection.trajectory_bands?.map((band, idx) => (
                        <Card key={idx}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">{band.level_label}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(band.annual_min)} - {formatCurrency(band.annual_max)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {band.commentary}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Peer Comparison & Market Demand */}
            <div className="grid md:grid-cols-2 gap-6">
              {snapshot.peer_comparison && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Peer Comparison
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Comparison helps identify focus areas — everyone has their own timeline
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{snapshot.peer_comparison.narrative}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Your Strengths</h4>
                        <ul className="text-sm space-y-1">
                          {snapshot.peer_comparison.relative_strengths?.map((s, i) => (
                            <li key={i} className="text-muted-foreground">• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">Growth Opportunities</h4>
                        <ul className="text-sm space-y-1">
                          {snapshot.peer_comparison.relative_weaknesses?.map((w, i) => (
                            <li key={i} className="text-muted-foreground">• {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {snapshot.market_demand && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-primary" />
                      Market Demand
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{snapshot.market_demand.narrative}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                          <Flame className="h-3 w-3" /> Hot Roles
                        </h4>
                        <ul className="text-sm space-y-1">
                          {snapshot.market_demand.hot_roles?.map((r, i) => (
                            <li key={i} className="text-muted-foreground">• {r}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-2">Cooling Roles</h4>
                        <ul className="text-sm space-y-1">
                          {snapshot.market_demand.cooling_roles?.map((r, i) => (
                            <li key={i} className="text-muted-foreground">• {r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
