import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, TrendingUp, AlertCircle, CheckCircle2, Target, ArrowRight, RefreshCw } from "lucide-react";

interface FitDimensionScores {
  cognitive_fit: number;
  communication_fit: number;
  execution_fit: number;
  problem_solving_fit: number;
  culture_fit: number;
  strengths: string[];
  gaps: string[];
  recommended_next_steps: string[];
}

interface FitData {
  fit_score: number;
  fit_dimension_scores: FitDimensionScores;
  summary: string;
  createdAt: string;
}

interface RoleFitInsightPanelProps {
  jobTwinJobId: string;
}

export function RoleFitInsightPanel({ jobTwinJobId }: RoleFitInsightPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [fitData, setFitData] = useState<FitData | null>(null);
  const [noRoleDna, setNoRoleDna] = useState(false);

  useEffect(() => {
    fetchFitData();
  }, [jobTwinJobId]);

  const fetchFitData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-role-dna-fit?jobId=${jobTwinJobId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success && data.exists) {
        setFitData(data.fit);
        setNoRoleDna(false);
      } else {
        setFitData(null);
      }
    } catch (error) {
      console.error("Error fetching fit data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateFit = async () => {
    setGenerating(true);
    setNoRoleDna(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please sign in to check your fit", variant: "destructive" });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-role-dna-fit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId: jobTwinJobId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "NO_ROLE_DNA") {
          setNoRoleDna(true);
          return;
        }
        throw new Error(data.message || "Failed to evaluate fit");
      }

      if (data.success) {
        toast({ title: "Fit analysis complete" });
        await fetchFitData();
      }
    } catch (error: any) {
      console.error("Error generating fit:", error);
      toast({ 
        title: "Unable to analyze fit", 
        description: error.message || "Please try again shortly.",
        variant: "destructive" 
      });
    } finally {
      setGenerating(false);
    }
  };

  const getDimensionColor = (score: number) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const getDimensionLabel = (key: string) => {
    const labels: Record<string, string> = {
      cognitive_fit: "Cognitive Fit",
      communication_fit: "Communication Fit",
      execution_fit: "Execution Fit",
      problem_solving_fit: "Problem-Solving Fit",
      culture_fit: "Culture Fit",
    };
    return labels[key] || key;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // State: No Role DNA exists for this job
  if (noRoleDna) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Role Fit Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The recruiter has not set up Role DNA for this role yet. You can still apply or practice interviews using FuturHire.
          </p>
        </CardContent>
      </Card>
    );
  }

  // State: No fit data yet - show CTA
  if (!fitData) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Check My Fit for This Role
          </CardTitle>
          <CardDescription>
            This uses the role's deeper DNA and your profile to estimate how well you might align with the expectations here. It's a directional guide to help you decide how to prepare, not a final judgment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateFit} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Check My Fit
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // State: Fit data exists - show full panel
  const dimensionKeys = ["cognitive_fit", "communication_fit", "execution_fit", "problem_solving_fit", "culture_fit"] as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Role Fit Insight
            </CardTitle>
            <CardDescription>
              Last checked: {new Date(fitData.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={generateFit} disabled={generating} className="gap-2">
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Re-check My Fit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Role DNA Fit</span>
            <span className="text-2xl font-bold text-primary">{fitData.fit_score}/100</span>
          </div>
          <Progress value={fitData.fit_score} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            This is an AI-generated estimate of how your current profile aligns with the deeper expectations of this role. It's guidance, not a verdict.
          </p>
        </div>

        {/* Dimension Scores */}
        <div>
          <h4 className="text-sm font-medium mb-3">Fit by Dimension</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {dimensionKeys.map((key) => {
              const score = fitData.fit_dimension_scores[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getDimensionColor(score)}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{getDimensionLabel(key)}</span>
                      <span className="font-medium">{score}</span>
                    </div>
                    <Progress value={score} className="h-1.5 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths */}
        {fitData.fit_dimension_scores.strengths?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Where You're Aligned
            </h4>
            <ul className="space-y-1">
              {fitData.fit_dimension_scores.strengths.map((strength, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gaps */}
        {fitData.fit_dimension_scores.gaps?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" />
              Where You Can Grow
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              These are areas where a bit of focused practice could make you an even stronger match.
            </p>
            <ul className="space-y-1">
              {fitData.fit_dimension_scores.gaps.map((gap, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Next Steps */}
        {fitData.fit_dimension_scores.recommended_next_steps?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Suggested Next Steps
            </h4>
            <ul className="space-y-1">
              {fitData.fit_dimension_scores.recommended_next_steps.map((step, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">→</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Narrative Summary */}
        {fitData.summary && (
          <div className="p-3 bg-muted/30 rounded-lg border">
            <p className="text-sm text-muted-foreground italic">
              {fitData.summary}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center border-t pt-4">
          This insight is AI-generated and approximate. It doesn't know your whole story. Use it as one perspective, not as the final word on your potential.
        </p>
      </CardContent>
    </Card>
  );
}
