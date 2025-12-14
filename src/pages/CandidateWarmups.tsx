import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ScenarioWarmupPanel } from "@/components/warmup/ScenarioWarmupPanel";
import { 
  Sparkles, 
  Clock, 
  Lightbulb, 
  Eye, 
  EyeOff,
  History,
  ArrowLeft,
  Brain,
  Shield
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface WarmupHistoryItem {
  runId: string;
  createdAt: string;
  scenarioTitle: string;
  signals: string[];
  reflection: string[];
}

interface Scenario {
  id: string;
  title: string;
  scenario_context: string;
  choices_json: any[];
  mapped_role_dna_dimensions: string[];
  nd_safe_notes: string | null;
}

export default function CandidateWarmups() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(true);
  const [nextEligibleAt, setNextEligibleAt] = useState<string | null>(null);
  const [runsCount, setRunsCount] = useState(0);
  const [history, setHistory] = useState<WarmupHistoryItem[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [showWarmup, setShowWarmup] = useState(false);
  const [activeTab, setActiveTab] = useState("warmup");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch status
      const statusRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-scenario-warmup?action=status`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const status = await statusRes.json();
      
      if (status.success) {
        setEligible(status.eligible);
        setNextEligibleAt(status.nextEligibleAt);
        setRunsCount(status.runsCountLast30Days || 0);
      }

      // Fetch history
      const historyRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-scenario-warmup?action=history&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const historyData = await historyRes.json();

      if (historyData.success) {
        setHistory(historyData.items || []);
      }
    } catch (error) {
      console.error('Error fetching warmup data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScenario = async () => {
    setScenarioLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-scenario-warmup?action=next&department=Engineering&seniority=mid`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = await res.json();

      if (data.success && data.scenario) {
        setScenario(data.scenario);
        setShowWarmup(true);
      } else {
        toast({
          title: "No scenarios available",
          description: "Please try again later.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching scenario:', error);
    } finally {
      setScenarioLoading(false);
    }
  };

  const handleHideRun = async (runId: string) => {
    try {
      const { error } = await supabase.functions.invoke('hide-scenario-warmup', {
        body: { runId }
      });

      if (error) throw error;

      setHistory(prev => prev.filter(r => r.runId !== runId));
      toast({
        title: "Removed from history",
        description: "This warm-up has been hidden from your view."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleWarmupComplete = () => {
    setShowWarmup(false);
    setEligible(false);
    setNextEligibleAt(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    fetchData(); // Refresh history
  };

  if (loading) {
    return (
      <SidebarLayout userRole="candidate" userName={user?.user_metadata?.name}>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </main>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout userRole="candidate" userName={user?.user_metadata?.name}>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Warm-ups
          </h1>
          <p className="text-muted-foreground mt-1">
            Small scenarios that help you reflect on work style. No right or wrong answers.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="warmup">
              <Sparkles className="h-4 w-4 mr-2" />
              Try a Warm-up
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              My History ({history.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="warmup">
            {showWarmup && scenario ? (
              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowWarmup(false)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <ScenarioWarmupPanel
                  scenario={scenario}
                  onComplete={handleWarmupComplete}
                  loading={scenarioLoading}
                />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    2-minute Warm-up (Optional)
                  </CardTitle>
                  <CardDescription>
                    This helps us understand how you approach work situations. 
                    There are no right or wrong answers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Status */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    {eligible ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <p className="text-sm flex-1">
                          You can try a warm-up if you feel like it.
                        </p>
                        <Button onClick={fetchScenario} disabled={scenarioLoading}>
                          {scenarioLoading ? (
                            <>Loading...</>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Start Warm-up
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">You've already done one recently.</p>
                          {nextEligibleAt && (
                            <p className="text-xs text-muted-foreground">
                              Next available: {formatDistanceToNow(new Date(nextEligibleAt), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border">
                      <p className="text-2xl font-bold">{runsCount}</p>
                      <p className="text-xs text-muted-foreground">Warm-ups in last 30 days</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <p className="text-2xl font-bold">{history.length}</p>
                      <p className="text-xs text-muted-foreground">Total warm-ups</p>
                    </div>
                  </div>

                  {/* ND-safe messaging */}
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                    <Shield className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                    <div>
                      <p className="font-medium text-foreground mb-1">This is for reflection, not evaluation</p>
                      <ul className="space-y-0.5">
                        <li>• No right or wrong answers</li>
                        <li>• No scoring or ranking</li>
                        <li>• Take as long as you need</li>
                        <li>• Pauses are okay</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Your Work-Style Notes
                </CardTitle>
                <CardDescription>
                  Private reflections from your warm-ups. Only you can see these.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No warm-ups yet.</p>
                    <Button 
                      variant="link" 
                      onClick={() => setActiveTab('warmup')}
                      className="mt-2"
                    >
                      Try your first warm-up
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((run) => (
                      <div 
                        key={run.runId}
                        className="p-4 rounded-lg border hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h4 className="font-medium">{run.scenarioTitle}</h4>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(run.createdAt), 'MMMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleHideRun(run.runId)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </div>

                        {run.signals.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Signals
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {run.signals.map((signal, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {signal}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {run.reflection.length > 0 && (
                          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2">
                            <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                              Reflection
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {run.reflection.map((note, i) => (
                                <li key={i}>• {note}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </SidebarLayout>
  );
}
