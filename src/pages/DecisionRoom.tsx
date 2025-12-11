import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Brain, Loader2, RefreshCw, Users, AlertTriangle, CheckCircle, XCircle, ChevronRight, Sparkles, MessageSquare, ShieldCheck, GitCompare, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { CandidateComparisonModal } from "@/components/decision-room/CandidateComparisonModal";
import { exportDecisionPDF } from "@/components/decision-room/ExportDecisionPDF";
import { SnapshotHistorySelector } from "@/components/decision-room/SnapshotHistorySelector";
import { ConfidenceIndicator, ConfidenceBar } from "@/components/decision-room/ConfidenceIndicator";

interface SnapshotHistoryItem {
  id: string;
  created_at: string;
}

interface DimensionScores {
  skills_match: number;
  experience_relevance: number;
  growth_potential: number;
  communication_quality: number;
  role_alignment: number;
}

interface CandidateEvaluation {
  candidate_id: string;
  overall_fit_score: number;
  confidence?: number;
  data_completeness?: 'high' | 'medium' | 'low';
  dimension_scores?: DimensionScores;
  summary: string;
  strengths?: string[];
  risks: string[];
  interview_probes?: string[];
  recommended_next_action: string;
  fairness_note?: string;
}

interface Cluster {
  name: string;
  description: string;
  candidate_ids: string[];
}

interface GlobalSummary {
  market_insight: string;
  hiring_recommendation: string;
  fairness_advisory?: string;
  confidence_factors?: string;
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
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [snapshotHistory, setSnapshotHistory] = useState<SnapshotHistoryItem[]>([]);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  const toggleCompareCandidate = (candidateId: string) => {
    setCompareIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else if (newSet.size < 4) {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const selectedForComparison = snapshot?.data.candidates.filter(
    c => compareIds.has(c.candidate_id)
  ) || [];

  useEffect(() => {
    if (jobId && jobId !== ':id') {
      loadData();
    } else {
      setLoading(false);
    }
  }, [jobId]);

  const loadData = async () => {
    if (!jobId || jobId === ':id') {
      setLoading(false);
      return;
    }
    
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

      // Fetch all snapshots for history
      const { data: allSnapshots } = await supabase
        .from('job_decision_snapshots')
        .select('id, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (allSnapshots && allSnapshots.length > 0) {
        setSnapshotHistory(allSnapshots);
        
        // Load the latest snapshot details
        const { data: latestSnapshot } = await supabase
          .from('job_decision_snapshots')
          .select('*')
          .eq('id', allSnapshots[0].id)
          .single();
        
        if (latestSnapshot) {
          setSnapshot({
            id: latestSnapshot.id,
            job_id: latestSnapshot.job_id,
            created_at: latestSnapshot.created_at,
            data: latestSnapshot.snapshot_json as unknown as SnapshotData,
          });
        }
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

  const loadSnapshotById = async (snapshotId: string) => {
    setLoadingSnapshot(true);
    try {
      const { data: snapshotData, error } = await supabase
        .from('job_decision_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();

      if (error) throw error;

      if (snapshotData) {
        setSnapshot({
          id: snapshotData.id,
          job_id: snapshotData.job_id,
          created_at: snapshotData.created_at,
          data: snapshotData.snapshot_json as unknown as SnapshotData,
        });
        setCompareIds(new Set()); // Reset comparison selection
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load snapshot"
      });
    } finally {
      setLoadingSnapshot(false);
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
        // Update snapshot history
        setSnapshotHistory(prev => [
          { id: data.snapshot.id, created_at: data.snapshot.created_at },
          ...prev
        ]);
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

  if (!job || !jobId || jobId === ':id') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar userRole="recruiter" />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto mt-12">
            <CardHeader className="text-center">
              <CardTitle>Job Not Found</CardTitle>
              <CardDescription>
                Please select a job from your dashboard to access the Decision Room.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
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
            <div className="flex items-center gap-2">
              {compareIds.size >= 2 && (
                <Button
                  onClick={() => setShowComparison(true)}
                  variant="default"
                  className="gap-2"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare ({compareIds.size})
                </Button>
              )}
              <SnapshotHistorySelector
                snapshots={snapshotHistory}
                currentSnapshotId={snapshot.id}
                onSelectSnapshot={loadSnapshotById}
                loading={loadingSnapshot}
              />
              <Button
                onClick={() => exportDecisionPDF({
                  jobTitle: job.title,
                  companyName: (job.companies as any)?.name || 'Company',
                  snapshotDate: snapshot.created_at,
                  snapshotData: snapshot.data,
                  candidatesMap: candidates,
                })}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              <Button
                onClick={generateSnapshot}
                disabled={generating || loadingSnapshot}
                variant="outline"
                className="gap-2"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerate
              </Button>
            </div>
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
                {snapshot.data.global_summary.fairness_advisory && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-sm text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Fairness Advisory
                    </h4>
                    <p className="text-sm text-blue-600 dark:text-blue-300">{snapshot.data.global_summary.fairness_advisory}</p>
                  </div>
                )}
                {snapshot.data.global_summary.confidence_factors && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h4 className="font-medium text-sm text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Confidence Factors
                    </h4>
                    <p className="text-sm text-amber-600 dark:text-amber-300">{snapshot.data.global_summary.confidence_factors}</p>
                  </div>
                )}
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
                          <div key={candidateId} className="flex items-center gap-2">
                            <Checkbox
                              checked={compareIds.has(candidateId)}
                              onCheckedChange={() => toggleCompareCandidate(candidateId)}
                              disabled={!compareIds.has(candidateId) && compareIds.size >= 4}
                            />
                            <Sheet>
                              <SheetTrigger asChild>
                                <button
                                  onClick={() => setSelectedCandidate(evaluation)}
                                  className="flex-1 text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
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
                                      {evaluation.confidence !== undefined && (
                                        <ConfidenceIndicator 
                                          confidence={evaluation.confidence} 
                                          dataCompleteness={evaluation.data_completeness}
                                          size="sm"
                                          showLabel={false}
                                        />
                                      )}
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
                                {/* Score and Confidence */}
                                <div className="space-y-4">
                                  <div className="flex items-center gap-4">
                                    <div className={`text-4xl font-bold px-4 py-2 rounded-lg ${getScoreColor(evaluation.overall_fit_score)}`}>
                                      {evaluation.overall_fit_score}
                                    </div>
                                    <div>
                                      <p className="font-medium">Overall Fit Score</p>
                                      <p className="text-sm text-muted-foreground">Out of 100</p>
                                    </div>
                                  </div>
                                  {evaluation.confidence !== undefined && (
                                    <ConfidenceBar confidence={evaluation.confidence} />
                                  )}
                                  {evaluation.data_completeness && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-muted-foreground">Data:</span>
                                      <Badge variant="outline" className="capitalize">
                                        {evaluation.data_completeness} completeness
                                      </Badge>
                                    </div>
                                  )}
                                </div>

                                {/* Dimension Scores */}
                                {evaluation.dimension_scores && (
                                  <div>
                                    <h4 className="font-medium mb-3">Dimension Scores</h4>
                                    <div className="space-y-3">
                                      {Object.entries(evaluation.dimension_scores).map(([key, value]) => (
                                        <div key={key} className="space-y-1">
                                          <div className="flex justify-between text-sm">
                                            <span className="capitalize text-muted-foreground">
                                              {key.replace(/_/g, ' ')}
                                            </span>
                                            <span className="font-medium">{value}/10</span>
                                          </div>
                                          <Progress value={value * 10} className="h-2" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Summary */}
                                <div>
                                  <h4 className="font-medium mb-2">Summary</h4>
                                  <p className="text-sm text-muted-foreground">{evaluation.summary}</p>
                                </div>

                                {/* Strengths */}
                                {evaluation.strengths && evaluation.strengths.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <Sparkles className="h-4 w-4 text-green-500" />
                                      Key Strengths
                                    </h4>
                                    <ul className="space-y-1">
                                      {evaluation.strengths.map((strength, sIdx) => (
                                        <li key={sIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                                          <span className="text-green-500 mt-1">✓</span>
                                          {strength}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

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

                                {/* Interview Probes */}
                                {evaluation.interview_probes && evaluation.interview_probes.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <MessageSquare className="h-4 w-4 text-blue-500" />
                                      Interview Questions to Explore
                                    </h4>
                                    <ul className="space-y-2">
                                      {evaluation.interview_probes.map((probe, pIdx) => (
                                        <li key={pIdx} className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                                          "{probe}"
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Fairness Note */}
                                {evaluation.fairness_note && (
                                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                                    <h4 className="font-medium text-sm text-purple-700 dark:text-purple-400 mb-1 flex items-center gap-2">
                                      <ShieldCheck className="h-4 w-4" />
                                      Fairness Note
                                    </h4>
                                    <p className="text-sm text-purple-600 dark:text-purple-300">{evaluation.fairness_note}</p>
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
                          </div>
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
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          checked={compareIds.has(evaluation.candidate_id)}
                          onCheckedChange={() => toggleCompareCandidate(evaluation.candidate_id)}
                          disabled={!compareIds.has(evaluation.candidate_id) && compareIds.size >= 4}
                        />
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

      {/* Comparison Modal */}
      <CandidateComparisonModal
        open={showComparison}
        onOpenChange={setShowComparison}
        selectedCandidates={selectedForComparison}
        candidatesMap={candidates}
      />
    </div>
  );
}
