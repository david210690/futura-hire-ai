import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BlueprintHistorySelector } from "@/components/career-blueprint/BlueprintHistorySelector";
import { ExportBlueprintPDF } from "@/components/career-blueprint/ExportBlueprintPDF";
import { ProgressTracker } from "@/components/career-blueprint/ProgressTracker";
import { 
  Compass, 
  Target, 
  TrendingUp, 
  Sparkles, 
  ChevronRight,
  Clock,
  Lightbulb,
  Shield,
  Rocket,
  BookOpen,
  Users,
  Briefcase,
  Zap,
  Loader2,
  RefreshCw
} from "lucide-react";

interface GrowthFocusArea {
  area: string;
  objective: string;
  current_level: string;
  target_level: string;
  actions: Array<{
    action: string;
    type: string;
    timeline: string;
  }>;
  quick_win: boolean;
}

interface RoleBlueprint {
  role_title: string;
  readiness_score: number;
  readiness_label: string;
  bridge_skills: Array<{
    skill: string;
    relevance: string;
  }>;
  growth_focus_areas: GrowthFocusArea[];
  timeline_summary: string;
  encouragement: string;
}

interface Blueprint {
  employee_summary: {
    current_positioning: string;
    growth_potential: string;
  };
  role_1_blueprint: RoleBlueprint;
  role_2_blueprint?: RoleBlueprint;
  overall_guidance: {
    recommended_path: string;
    key_theme: string;
    closing_message: string;
  };
}

export default function CareerBlueprint() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [targetRole1, setTargetRole1] = useState("");
  const [targetRole2, setTargetRole2] = useState("");
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [previousBlueprints, setPreviousBlueprints] = useState<any[]>([]);
  const [currentSnapshotId, setCurrentSnapshotId] = useState<string | undefined>();
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      // Fetch previous blueprints
      const { data: blueprints } = await supabase
        .from('career_blueprint_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (blueprints && blueprints.length > 0) {
        setPreviousBlueprints(blueprints);
        // Load the most recent blueprint
        const latest = blueprints[0];
        setBlueprint(latest.blueprint_json as unknown as Blueprint);
        setTargetRole1(latest.target_role_1);
        setTargetRole2(latest.target_role_2 || "");
        setCurrentSnapshotId(latest.id);
        
        // Load completed actions from localStorage
        const savedActions = localStorage.getItem(`blueprint_actions_${latest.id}`);
        if (savedActions) {
          setCompletedActions(JSON.parse(savedActions));
        }
      }

      setLoading(false);
    };

    init();
  }, [navigate]);

  const handleGenerateBlueprint = async () => {
    if (!targetRole1.trim()) {
      toast({
        title: "Role required",
        description: "Please enter at least one target role",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-career-blueprint', {
        body: {
          targetRole1: targetRole1.trim(),
          targetRole2: targetRole2.trim() || null
        }
      });

      if (error) throw error;

      setBlueprint(data.blueprint);
      toast({
        title: "Blueprint generated!",
        description: "Your personalized growth path is ready."
      });
    } catch (error) {
      console.error('Error generating blueprint:', error);
      toast({
        title: "Generation failed",
        description: "Could not generate blueprint. Please try again.",
        variant: "destructive"
      });
      // Refresh blueprints list
      const { data: updatedBlueprints } = await supabase
        .from('career_blueprint_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (updatedBlueprints && updatedBlueprints.length > 0) {
        setPreviousBlueprints(updatedBlueprints);
        setCurrentSnapshotId(updatedBlueprints[0].id);
        setCompletedActions([]);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectSnapshot = (snapshot: any) => {
    setBlueprint(snapshot.blueprint_json as unknown as Blueprint);
    setTargetRole1(snapshot.target_role_1);
    setTargetRole2(snapshot.target_role_2 || "");
    setCurrentSnapshotId(snapshot.id);
    
    // Load completed actions for this snapshot
    const savedActions = localStorage.getItem(`blueprint_actions_${snapshot.id}`);
    setCompletedActions(savedActions ? JSON.parse(savedActions) : []);
  };

  const handleToggleAction = (actionId: string) => {
    const newCompleted = completedActions.includes(actionId)
      ? completedActions.filter(id => id !== actionId)
      : [...completedActions, actionId];
    
    setCompletedActions(newCompleted);
    if (currentSnapshotId) {
      localStorage.setItem(`blueprint_actions_${currentSnapshotId}`, JSON.stringify(newCompleted));
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (score >= 60) return "text-amber-600 bg-amber-100 dark:bg-amber-900/30";
    return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
  };

  const getActionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'training': return <BookOpen className="h-4 w-4" />;
      case 'project': return <Briefcase className="h-4 w-4" />;
      case 'mentorship': return <Users className="h-4 w-4" />;
      case 'experience': return <Rocket className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const RoleBlueprintCard = ({ roleBlueprint, roleNumber }: { roleBlueprint: RoleBlueprint; roleNumber: number }) => (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {roleNumber === 1 ? "Target Role" : "Stretch Role"}
            </CardTitle>
            <CardDescription className="text-lg font-medium mt-1">
              {roleBlueprint.role_title}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${getReadinessColor(roleBlueprint.readiness_score)}`}>
              <span className="text-2xl font-bold">{roleBlueprint.readiness_score}</span>
              <span className="text-sm">/100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{roleBlueprint.readiness_label}</p>
          </div>
        </div>
        <Progress value={roleBlueprint.readiness_score} className="mt-3" />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Bridge Skills */}
        {roleBlueprint.bridge_skills?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              Your Bridge Skills
            </h4>
            <div className="space-y-2">
              {roleBlueprint.bridge_skills.map((skill, i) => (
                <div key={i} className="flex items-start gap-2 bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                  <Badge variant="secondary" className="shrink-0">{skill.skill}</Badge>
                  <span className="text-sm text-muted-foreground">{skill.relevance}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Growth Focus Areas */}
        {roleBlueprint.growth_focus_areas?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Growth Focus Areas
            </h4>
            <div className="space-y-4">
              {roleBlueprint.growth_focus_areas.map((area, i) => (
                <Card key={i} className={area.quick_win ? "border-amber-200 dark:border-amber-800" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium">{area.area}</h5>
                      {area.quick_win && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Quick Win
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{area.objective}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground">Now:</span>
                        <p className="font-medium">{area.current_level}</p>
                      </div>
                      <div className="bg-primary/5 rounded p-2">
                        <span className="text-muted-foreground">Target:</span>
                        <p className="font-medium">{area.target_level}</p>
                      </div>
                    </div>

                    {area.actions?.length > 0 && (
                      <div className="space-y-2">
                        {area.actions.map((action, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm">
                            <div className="shrink-0 mt-0.5 text-muted-foreground">
                              {getActionIcon(action.type)}
                            </div>
                            <div className="flex-1">
                              <span>{action.action}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{action.type}</Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {action.timeline}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Timeline & Encouragement */}
        <div className="space-y-3">
          {roleBlueprint.timeline_summary && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Timeline:</span>
              <span className="font-medium">{roleBlueprint.timeline_summary}</span>
            </div>
          )}
          {roleBlueprint.encouragement && (
            <div className="bg-primary/5 rounded-lg p-4">
              <p className="text-sm italic">{roleBlueprint.encouragement}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <SidebarLayout userRole="candidate" userName={user?.user_metadata?.name}>
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout userRole="candidate" userName={user?.user_metadata?.name}>
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Compass className="h-8 w-8 text-primary" />
                Your Growth Compass
              </h1>
              <p className="text-muted-foreground">
                This is your personalized, confidential career map. Growth should be clear, not guesswork.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {blueprint && (
                <ExportBlueprintPDF 
                  blueprint={blueprint} 
                  userName={user?.user_metadata?.name} 
                />
              )}
            </div>
          </div>
          
          {/* History selector */}
          {previousBlueprints.length > 1 && (
            <div className="mt-4">
              <BlueprintHistorySelector
                snapshots={previousBlueprints}
                currentSnapshotId={currentSnapshotId}
                onSelectSnapshot={handleSelectSnapshot}
              />
            </div>
          )}
        </div>
        {/* Disclaimer Card */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">100% Confidential</p>
                <p className="text-xs text-muted-foreground">
                  Your blueprint is private and does not impact your performance review or current role.
                  This is for your growth journey only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Selection Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              I'm interested in growing toward...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role1">Target Role</Label>
                <Input
                  id="role1"
                  placeholder="e.g., Senior Product Manager"
                  value={targetRole1}
                  onChange={(e) => setTargetRole1(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role2">Stretch Role (Optional)</Label>
                <Input
                  id="role2"
                  placeholder="e.g., VP of Product"
                  value={targetRole2}
                  onChange={(e) => setTargetRole2(e.target.value)}
                />
              </div>
            </div>
            <Button 
              onClick={handleGenerateBlueprint} 
              disabled={generating || !targetRole1.trim()}
              className="w-full md:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Blueprint...
                </>
              ) : (
                <>
                  {blueprint ? <RefreshCw className="mr-2 h-4 w-4" /> : <Compass className="mr-2 h-4 w-4" />}
                  {blueprint ? "Regenerate Blueprint" : "Generate My Career Blueprint"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Blueprint Results */}
        {blueprint && (
          <div className="space-y-8">
            {/* Employee Summary */}
            {blueprint.employee_summary && (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Your Current Profile
                  </h3>
                  <p className="text-sm mb-3">{blueprint.employee_summary.current_positioning}</p>
                  <p className="text-sm text-primary font-medium">{blueprint.employee_summary.growth_potential}</p>
                </CardContent>
              </Card>
            )}

            {/* Progress Tracker */}
            {blueprint.role_1_blueprint?.growth_focus_areas && (
              <ProgressTracker
                growthAreas={[
                  ...blueprint.role_1_blueprint.growth_focus_areas,
                  ...(blueprint.role_2_blueprint?.growth_focus_areas || [])
                ]}
                completedActions={completedActions}
                onToggleAction={handleToggleAction}
              />
            )}

            {/* Role 1 Blueprint */}
            {blueprint.role_1_blueprint && (
              <RoleBlueprintCard roleBlueprint={blueprint.role_1_blueprint} roleNumber={1} />
            )}

            {/* Role 2 Blueprint */}
            {blueprint.role_2_blueprint && (
              <RoleBlueprintCard roleBlueprint={blueprint.role_2_blueprint} roleNumber={2} />
            )}

            {/* Overall Guidance */}
            {blueprint.overall_guidance && (
              <Card className="border-2 border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-primary" />
                    Your Growth Path
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {blueprint.overall_guidance.recommended_path && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Recommended Path</h4>
                      <p className="text-sm text-muted-foreground">{blueprint.overall_guidance.recommended_path}</p>
                    </div>
                  )}
                  {blueprint.overall_guidance.key_theme && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Key Development Theme</h4>
                      <p className="text-sm text-muted-foreground">{blueprint.overall_guidance.key_theme}</p>
                    </div>
                  )}
                  {blueprint.overall_guidance.closing_message && (
                    <div className="bg-primary/5 rounded-lg p-4 mt-4">
                      <p className="text-sm italic">{blueprint.overall_guidance.closing_message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cross-feature CTAs */}
            <div className="grid md:grid-cols-3 gap-4">
              <Button variant="outline" onClick={() => navigate('/career-trajectory')} className="h-auto py-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>View Career Trajectory</span>
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </div>
              </Button>
              <Button variant="outline" onClick={() => navigate('/opportunity-radar')} className="h-auto py-3">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4" />
                  <span>Explore Opportunities</span>
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </div>
              </Button>
              <Button variant="outline" onClick={() => navigate('/interview-practice')} className="h-auto py-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Practice Interviews</span>
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </div>
              </Button>
            </div>
          </div>
        )}
      </main>
    </SidebarLayout>
  );
}
