import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, Sparkles, MessageSquare } from "lucide-react";

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
  dimension_scores?: DimensionScores;
  summary: string;
  strengths?: string[];
  risks: string[];
  interview_probes?: string[];
  recommended_next_action: string;
  fairness_note?: string;
}

interface CandidateDetails {
  id: string;
  full_name: string;
  headline: string | null;
  skills: string | null;
  years_experience: number | null;
}

interface CandidateComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCandidates: CandidateEvaluation[];
  candidatesMap: Map<string, CandidateDetails>;
}

const dimensionLabels: Record<string, string> = {
  skills_match: "Skills Match",
  experience_relevance: "Experience",
  growth_potential: "Growth Potential",
  communication_quality: "Communication",
  role_alignment: "Role Alignment",
};

export function CandidateComparisonModal({
  open,
  onOpenChange,
  selectedCandidates,
  candidatesMap,
}: CandidateComparisonModalProps) {
  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
    return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
  };

  const getDimensionBarColor = (value: number) => {
    if (value >= 8) return "bg-green-500";
    if (value >= 6) return "bg-yellow-500";
    if (value >= 4) return "bg-orange-500";
    return "bg-red-500";
  };

  const getCandidateName = (candidateId: string) => {
    return candidatesMap.get(candidateId)?.full_name || "Unknown";
  };

  const allDimensions = Object.keys(dimensionLabels);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Candidate Comparison</DialogTitle>
          <DialogDescription>
            Side-by-side comparison of {selectedCandidates.length} candidates
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Overall Scores */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCandidates.length}, 1fr)` }}>
            {selectedCandidates.map((candidate) => (
              <div key={candidate.candidate_id} className="text-center p-4 border rounded-lg">
                <h3 className="font-semibold truncate mb-2">
                  {getCandidateName(candidate.candidate_id)}
                </h3>
                <div className={`inline-flex text-3xl font-bold px-4 py-2 rounded-lg ${getScoreColor(candidate.overall_fit_score)}`}>
                  {candidate.overall_fit_score}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Overall Fit</p>
              </div>
            ))}
          </div>

          {/* Dimension Scores Comparison */}
          <div className="mt-6">
            <h4 className="font-medium mb-4">Dimension Scores</h4>
            <div className="space-y-4">
              {allDimensions.map((dimension) => (
                <div key={dimension} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {dimensionLabels[dimension]}
                  </p>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${selectedCandidates.length}, 1fr)` }}>
                    {selectedCandidates.map((candidate) => {
                      const score = candidate.dimension_scores?.[dimension as keyof DimensionScores] || 0;
                      return (
                        <div key={candidate.candidate_id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={score * 10} 
                              className="h-3 flex-1"
                            />
                            <span className="text-sm font-medium w-8">{score}/10</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths Comparison */}
          <div className="mt-6">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-500" />
              Key Strengths
            </h4>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCandidates.length}, 1fr)` }}>
              {selectedCandidates.map((candidate) => (
                <div key={candidate.candidate_id} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2 truncate">
                    {getCandidateName(candidate.candidate_id)}
                  </p>
                  {candidate.strengths?.slice(0, 3).map((strength, idx) => (
                    <div key={idx} className="text-xs flex items-start gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{strength}</span>
                    </div>
                  )) || <p className="text-xs text-muted-foreground">No strengths listed</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Risks Comparison */}
          <div className="mt-6">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Risks & Concerns
            </h4>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCandidates.length}, 1fr)` }}>
              {selectedCandidates.map((candidate) => (
                <div key={candidate.candidate_id} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2 truncate">
                    {getCandidateName(candidate.candidate_id)}
                  </p>
                  {candidate.risks.slice(0, 3).map((risk, idx) => (
                    <div key={idx} className="text-xs flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{risk}</span>
                    </div>
                  ))}
                  {candidate.risks.length === 0 && (
                    <p className="text-xs text-muted-foreground">No risks identified</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Interview Probes Comparison */}
          <div className="mt-6">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Suggested Interview Questions
            </h4>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCandidates.length}, 1fr)` }}>
              {selectedCandidates.map((candidate) => (
                <div key={candidate.candidate_id} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2 truncate">
                    {getCandidateName(candidate.candidate_id)}
                  </p>
                  {candidate.interview_probes?.slice(0, 2).map((probe, idx) => (
                    <div key={idx} className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      "{probe}"
                    </div>
                  )) || <p className="text-xs text-muted-foreground">No probes suggested</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Actions */}
          <div className="mt-6">
            <h4 className="font-medium mb-4">Recommended Actions</h4>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCandidates.length}, 1fr)` }}>
              {selectedCandidates.map((candidate) => (
                <div key={candidate.candidate_id} className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    {candidate.recommended_next_action}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
