import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Brain, Loader2, RefreshCw, Users, AlertTriangle, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface CandidateEvaluation {
  candidate_id: string;
  overall_fit_score: number;
  summary: string;
  risks: string[];
  recommended_next_action: string;
}

interface Cluster {
  name: string;
  description: string;
  candidate_ids: string[];
}

interface GlobalSummary {
  market_insight: string;
  hiring_recommendation: string;
}

interface SnapshotData {
  clusters: Cluster[];
  candidates: CandidateEvaluation[];
  global_summary: GlobalSummary;
}

interface Snapshot {
  id: string;
  job_id: string;
  created_at: string;
  data: SnapshotData;
}

interface CandidateDetails {
  id: string;
  full_name: string;
  headline: string | null;
  skills: string | null;
  years_experience: number | null;
}

export default function DecisionRoom() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [job, setJob] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [candidates, setCandidates] = useState<Map<string, CandidateDetails>>(new Map());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateEvaluation | null>(null);

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`*, companies (name)`)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      // Fetch candidates for this job
      const { data: apps } = await supabase
        .from('applications')
        .select(`candidates (id, full_name, headline, skills, years_experience)`)
        .eq('job_id', jobId);

      if (apps) {
        const candidateMap = new Map<string, CandidateDetails>();
        apps.forEach(app => {
          if (app.candidates) {
            const c = app.candidates as unknown as CandidateDetails;
            candidateMap.set(c.id, c);
          }
        });
        setCandidates(candidateMap);
      }

      // Fetch latest snapshot
      const { data: snapshotData, error: snapshotError } = await supabase.functions.invoke('get-decision-snapshot', {
        body: null,
        headers: {},
      }).then(() => null).catch(() => null);
      
      // Use direct fetch for query params
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-decision-snapshot?jobId=${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const result = await response.json();
      if (result.success && result.exists) {
        setSnapshot(result.snapshot);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load data"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSnapshot = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-decision-snapshot', {
        body: { jobId }
      });

      if (error) throw error;
      
      if (data.success) {
        setSnapshot(data.snapshot);
        toast({
          title: "Decision Room Ready",
          description: "AI analysis complete. Review your candidates below."
        });
      } else {
        throw new Error(data.message || 'Failed to generate snapshot');
      }
    } catch (error: any) {
      console.error('Error generating snapshot:', error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Could not generate AI analysis"
      });
    } finally {
      setGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
    return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
  };

  const getClusterIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('top') || lower.includes('best')) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (lower.includes('promising') || lower.includes('potential')) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    if (lower.includes('not') || lower.includes('reject')) return <XCircle className="h-5 w-5 text-red-500" />;
    return <Users className="h-5 w-5 text-blue-500" />;
  };

  const getCandidateName = (candidateId: string) => {
    return candidates.get(candidateId)?.full_name || 'Unknown Candidate';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar userRole="recruiter" />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar userRole="recruiter" />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Job not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userRole="recruiter" />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/jobs/${jobId}`)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Job
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                AI Decision Room
              </h1>
              <p className="text-muted-foreground">
                {job.title} at {(job.companies as any)?.name || 'Company'}
              </p>
            </div>
          </div>
          
          {snapshot && (
            <Button
              onClick={generateSnapshot}
              disabled={generating}
              variant="outline"
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate Analysis
            </Button>
          )}
        </div>

        {/* No snapshot state */}
        {!snapshot && (
          <Card className="max-w-xl mx-auto mt-12">
            <CardHeader className="text-center">
              <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Generate AI Decision Summary</CardTitle>
              <CardDescription>
                Let AI analyze and cluster your candidates to help you make faster, smarter hiring decisions.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button
                onClick={generateSnapshot}
                disabled={generating}
                size="lg"
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing Candidates...
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5" />
                    Generate AI Decision Summary
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Snapshot content */}
        {snapshot && (
          <div className="space-y-6">
            {/* Metadata */}
            <p className="text-sm text-muted-foreground">
              Generated on {format(new Date(snapshot.created_at), "PPp")}
            </p>

            {/* Global Summary */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Strategic Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Market Insight</h4>
                  <p>{snapshot.data.global_summary.market_insight}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Hiring Recommendation</h4>
                  <p className="font-medium text-primary">{snapshot.data.global_summary.hiring_recommendation}</p>
                </div>
              </CardContent>
            </Card>

            {/* Clusters */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {snapshot.data.clusters.map((cluster, idx) => (
                <Card key={idx} className="h-fit">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getClusterIcon(cluster.name)}
                      {cluster.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {cluster.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {cluster.candidate_ids.map(candidateId => {
                        const evaluation = snapshot.data.candidates.find(c => c.candidate_id === candidateId);
                        if (!evaluation) return null;
                        
                        return (
                          <Sheet key={candidateId}>
                            <SheetTrigger asChild>
                              <button
                                onClick={() => setSelectedCandidate(evaluation)}
                                className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                      {getCandidateName(candidateId)}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {evaluation.recommended_next_action}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    <Badge className={getScoreColor(evaluation.overall_fit_score)}>
                                      {evaluation.overall_fit_score}
                                    </Badge>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </button>
                            </SheetTrigger>
                            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                              <SheetHeader>
                                <SheetTitle>{getCandidateName(candidateId)}</SheetTitle>
                                <SheetDescription>
                                  AI evaluation and recommendation
                                </SheetDescription>
                              </SheetHeader>
                              <div className="mt-6 space-y-6">
                                {/* Score */}
                                <div className="flex items-center gap-4">
                                  <div className={`text-4xl font-bold px-4 py-2 rounded-lg ${getScoreColor(evaluation.overall_fit_score)}`}>
                                    {evaluation.overall_fit_score}
                                  </div>
                                  <div>
                                    <p className="font-medium">Overall Fit Score</p>
                                    <p className="text-sm text-muted-foreground">Out of 100</p>
                                  </div>
                                </div>

                                {/* Summary */}
                                <div>
                                  <h4 className="font-medium mb-2">Summary</h4>
                                  <p className="text-sm text-muted-foreground">{evaluation.summary}</p>
                                </div>

                                {/* Risks */}
                                {evaluation.risks.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                      Risks & Concerns
                                    </h4>
                                    <ul className="space-y-1">
                                      {evaluation.risks.map((risk, rIdx) => (
                                        <li key={rIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                                          <span className="text-yellow-500 mt-1">•</span>
                                          {risk}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Recommended Action */}
                                <div>
                                  <h4 className="font-medium mb-2">Recommended Next Action</h4>
                                  <Badge variant="secondary" className="text-sm">
                                    {evaluation.recommended_next_action}
                                  </Badge>
                                </div>

                                {/* Candidate Details */}
                                {candidates.get(candidateId) && (
                                  <div className="pt-4 border-t">
                                    <h4 className="font-medium mb-2">Profile Details</h4>
                                    <div className="space-y-2 text-sm">
                                      {candidates.get(candidateId)?.headline && (
                                        <p><span className="text-muted-foreground">Headline:</span> {candidates.get(candidateId)?.headline}</p>
                                      )}
                                      {candidates.get(candidateId)?.skills && (
                                        <div>
                                          <span className="text-muted-foreground">Skills:</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {candidates.get(candidateId)?.skills?.split(',').slice(0, 8).map((skill, sIdx) => (
                                              <Badge key={sIdx} variant="outline" className="text-xs">
                                                {skill.trim()}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {candidates.get(candidateId)?.years_experience && (
                                        <p><span className="text-muted-foreground">Experience:</span> {candidates.get(candidateId)?.years_experience} years</p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="pt-4 border-t flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/candidate/${candidateId}`)}
                                    className="flex-1"
                                  >
                                    View Full Profile
                                  </Button>
                                </div>
                              </div>
                            </SheetContent>
                          </Sheet>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* All Candidates Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Candidates</CardTitle>
                <CardDescription>Complete list with AI scores and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {snapshot.data.candidates
                    .sort((a, b) => b.overall_fit_score - a.overall_fit_score)
                    .map((evaluation) => (
                      <div
                        key={evaluation.candidate_id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{getCandidateName(evaluation.candidate_id)}</p>
                          <p className="text-sm text-muted-foreground truncate">{evaluation.summary}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            {evaluation.recommended_next_action}
                          </Badge>
                          <Badge className={getScoreColor(evaluation.overall_fit_score)}>
                            {evaluation.overall_fit_score}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
