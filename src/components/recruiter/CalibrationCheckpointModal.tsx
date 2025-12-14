import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Brain, 
  Target, 
  FileWarning,
  Loader2,
  ChevronRight,
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Discrepancy {
  dimension: string;
  interviewer_score: number;
  team_average: number | null;
  role_dna_benchmark: number | null;
  deviation_from_team: number | null;
  deviation_from_benchmark: number | null;
  is_high_priority: boolean;
  coaching_question: string;
}

interface BiasFlag {
  bias_type: string;
  dimension_affected: string;
  coaching_question: string;
}

interface EvidenceGap {
  dimension: string;
  required_evidence: string;
  notes_referenced: string;
  gap_description: string;
}

interface CalibrationResult {
  has_discrepancies: boolean;
  discrepancies: Discrepancy[];
  bias_flags: BiasFlag[];
  evidence_gaps: EvidenceGap[];
  positive_confirmation?: string;
  overall_coaching_summary: string;
}

interface CalibrationCheckpointModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calibration: CalibrationResult | null;
  calibrationCheckId: string | null;
  candidateName: string;
  roleTitle: string;
  onReviseFeedback: () => void;
  onConfirmAndProceed: (justification?: string) => void;
}

export function CalibrationCheckpointModal({
  open,
  onOpenChange,
  calibration,
  calibrationCheckId,
  candidateName,
  roleTitle,
  onReviseFeedback,
  onConfirmAndProceed
}: CalibrationCheckpointModalProps) {
  const { toast } = useToast();
  const [justificationNote, setJustificationNote] = useState("");
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      // Update calibration check with action
      if (calibrationCheckId) {
        await supabase
          .from('calibration_checks')
          .update({
            interviewer_action: 'confirmed',
            justification_note: justificationNote || null,
            resolved_at: new Date().toISOString()
          })
          .eq('id', calibrationCheckId);
      }
      
      onConfirmAndProceed(justificationNote);
      toast({
        title: "Feedback confirmed",
        description: "Your rating has been recorded with your justification."
      });
    } catch (error) {
      console.error('Error confirming:', error);
      toast({
        title: "Error",
        description: "Failed to confirm feedback",
        variant: "destructive"
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleRevise = async () => {
    if (calibrationCheckId) {
      await supabase
        .from('calibration_checks')
        .update({
          interviewer_action: 'revised',
          resolved_at: new Date().toISOString()
        })
        .eq('id', calibrationCheckId);
    }
    onReviseFeedback();
  };

  if (!calibration) return null;

  const hasIssues = calibration.has_discrepancies || 
    calibration.discrepancies?.length > 0 || 
    calibration.bias_flags?.length > 0 || 
    calibration.evidence_gaps?.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasIssues ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Decision Checkpoint
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Feedback Aligned
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Reviewing feedback for <span className="font-medium">{candidateName}</span> • {roleTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* No issues - positive confirmation */}
          {!hasIssues && calibration.positive_confirmation && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {calibration.positive_confirmation}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      {calibration.overall_coaching_summary}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discrepancies */}
          {calibration.discrepancies?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" />
                Calibration Insights
              </h3>
              {calibration.discrepancies.map((disc, i) => (
                <Card key={i} className={disc.is_high_priority ? "border-amber-300" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">
                          {disc.dimension.replace(/_/g, ' ')}
                        </span>
                        {disc.is_high_priority && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            High Priority
                          </Badge>
                        )}
                      </div>
                      <span className="text-lg font-bold">{disc.interviewer_score}</span>
                    </div>
                    
                    <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                      {disc.team_average !== null && (
                        <span>
                          Team avg: <span className="font-medium">{disc.team_average}</span>
                          {disc.deviation_from_team && (
                            <span className={disc.deviation_from_team > 0 ? "text-green-600" : "text-amber-600"}>
                              {" "}({disc.deviation_from_team > 0 ? "+" : ""}{disc.deviation_from_team})
                            </span>
                          )}
                        </span>
                      )}
                      {disc.role_dna_benchmark !== null && (
                        <span>
                          Role DNA: <span className="font-medium">{disc.role_dna_benchmark}</span>
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground italic">
                      {disc.coaching_question}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Bias Flags */}
          {calibration.bias_flags?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                Bias Considerations
              </h3>
              {calibration.bias_flags.map((bias, i) => (
                <Card key={i} className="border-purple-200 dark:border-purple-900">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-purple-600">
                        {bias.bias_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        affects {bias.dimension_affected.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground italic">
                      {bias.coaching_question}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Evidence Gaps */}
          {calibration.evidence_gaps?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-blue-500" />
                Evidence Review
              </h3>
              {calibration.evidence_gaps.map((gap, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <p className="font-medium text-sm mb-1 capitalize">
                      {gap.dimension.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      <span className="font-medium">Required:</span> {gap.required_evidence}
                    </p>
                    <p className="text-sm text-muted-foreground italic">
                      {gap.gap_description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Coaching Summary */}
          {hasIssues && calibration.overall_coaching_summary && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                {calibration.overall_coaching_summary}
              </p>
            </div>
          )}

          {/* Justification (only show if there are issues) */}
          {hasIssues && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Justification Note (optional)
              </label>
              <Textarea
                value={justificationNote}
                onChange={(e) => setJustificationNote(e.target.value)}
                placeholder="If you confirm your score, add a brief justification that will be visible to the Decision Room panel..."
                rows={3}
              />
            </div>
          )}

          {/* Privacy Note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>This check is private. We aim for clarity, not perfection.</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {hasIssues ? (
            <>
              <Button variant="outline" onClick={handleRevise}>
                Revisit Feedback
              </Button>
              <Button onClick={handleConfirm} disabled={confirming}>
                {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Score
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={() => onConfirmAndProceed()}>
              Continue to Decision Room
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
